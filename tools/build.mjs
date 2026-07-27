/**
 * The web shell build.
 *
 * Reads site.config.yaml, discovers apps by their manifests, validates every
 * manifest and content document against the committed schemas, joins the
 * committed pricing projection, and writes a static bundle to
 * build.output.static.
 *
 * Zero runtime dependencies, Node >= 22 only (ADR-0003 in standards: build from
 * scratch - reference, not dependency). The engines named in site.config.yaml
 * (namzu build / yuva serve) are where this grows up to; this is that build,
 * written in the same from-scratch discipline as cogitave/learn's.
 *
 * HERMETIC BY DESIGN. Everything the build reads lives in this repo, so a
 * standalone clone of cogitave/web builds without the estate around it. The two
 * inputs authored elsewhere - the published prices (private corp/gtm) and the
 * DTCG design tokens (private cogitave/design) - cross the boundary as committed
 * projections written by tools/sync-estate.mjs, never as a read into another
 * tree. `--check-drift` verifies those projections where the sources are
 * reachable, and reports when it could not compare.
 *
 * Locale handling is ADR-0003 in this repo: ONE URL per page, every language
 * inside the document, no locale segment and no redirect.
 *
 * Usage:
 *   node tools/build.mjs [--out DIR] [--quiet] [--base URL] [--check-drift]
 */

import { mkdir, readFile, writeFile, rm, cp, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseYaml, parseYamlMime } from './lib/yaml.mjs';
import { tokensToCss } from './lib/tokens.mjs';
import { assertValid, assertSupported, SchemaError } from './lib/validate.mjs';
import { analyticsClient } from './lib/analytics.mjs';
import { loadPricing, loadTokens, checkDrift } from './sync-estate.mjs';
import { h, esc, join, jsonLd } from './lib/html.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------- args */

function parseArgs(argv) {
  const args = { out: null, quiet: false, base: null, liveReload: false, checkDrift: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--quiet') args.quiet = true;
    else if (argv[i] === '--live-reload') args.liveReload = true;
    else if (argv[i] === '--check-drift') args.checkDrift = true;
  }
  return args;
}

/* ------------------------------------------------------------------ inputs */

const readText = (p) => readFile(p, 'utf8');
const readJson = async (p) => JSON.parse(await readText(p));
const readYaml = async (p) => parseYaml(await readText(p), path.relative(ROOT, p));

/** Load every component module and index it by id. */
async function loadComponents() {
  const dir = path.join(ROOT, 'components');
  const components = new Map();
  for (const entry of await readdir(dir)) {
    if (!entry.endsWith('.mjs')) continue;
    const mod = await import(pathToFileURL(path.join(dir, entry)).href);
    if (!mod.id) throw new Error(`components/${entry}: missing an exported \`id\``);
    if (typeof mod.render !== 'function') throw new Error(`components/${entry}: missing an exported \`render\``);
    if (mod.schema) assertSupported(mod.schema, `components/${entry} schema`);
    components.set(mod.id, mod);
  }
  return components;
}

/** Discover apps: any apps/<slug>/app.manifest.json not excluded by the config. */
async function discoverApps(config, manifestSchema) {
  const dir = path.join(ROOT, 'apps');
  const excluded = new Set(
    (config.apps?.discovery?.exclude ?? []).map((glob) => glob.replace(/\/\*\*$/, '').replace(/\/$/, '')),
  );

  const apps = [];
  for (const slug of await readdir(dir)) {
    const appDir = path.join(dir, slug);
    if (!(await stat(appDir)).isDirectory()) continue;
    if (excluded.has(`apps/${slug}`) || slug.startsWith('_')) continue;

    const manifestPath = path.join(appDir, 'app.manifest.json');
    if (!existsSync(manifestPath)) continue;

    const manifest = await readJson(manifestPath);
    assertValid(manifest, manifestSchema, `apps/${slug}/app.manifest.json`);
    apps.push({ slug, dir: appDir, manifest });
  }

  const routes = new Map();
  for (const app of apps) {
    const existing = routes.get(app.manifest.route);
    if (existing) {
      throw new Error(`route collision: "${app.manifest.route}" is claimed by both ${existing} and ${app.slug}`);
    }
    routes.set(app.manifest.route, app.slug);
  }
  return apps;
}

/**
 * Content documents for one app, indexed by locale. A locale's document is
 * `<entry>` for the default locale and `<name>.<locale>.page.yaml` otherwise;
 * siblings share a UID, so identity is the page, not the translation.
 */
async function loadContent(app, config, pageSchema) {
  const root = path.join(app.dir, app.manifest.content.root);
  const entry = app.manifest.content.entry ?? 'index.page.yaml';
  const locales = app.manifest.i18n?.locales ?? config.i18n.locales;

  const documents = new Map();
  for (const locale of locales) {
    // Convention: the entry file holds the PRIMARY locale, siblings are
    // `<name>.<locale>.page.yaml`. All of them render into the same page.
    const file =
      locale === config.i18n.primaryLocale
        ? path.join(root, entry)
        : path.join(root, entry.replace(/\.page\.yaml$/, `.${locale}.page.yaml`));

    if (!existsSync(file)) throw new Error(`${app.slug}: no content document for locale "${locale}" (looked for ${path.relative(ROOT, file)})`);

    const rel = path.relative(ROOT, file);
    const { mime, data } = parseYamlMime(await readText(file), rel);
    if (mime !== 'Page') throw new Error(`${rel}: expected \`### YamlMime:Page\`, got "${mime}"`);
    assertValid(data, pageSchema, rel);

    if (data.locale !== locale) {
      throw new Error(`${rel}: declares locale "${data.locale}" but sits in the "${locale}" slot`);
    }
    documents.set(locale, data);
  }

  const uids = new Set([...documents.values()].map((d) => d.uid));
  if (uids.size > 1) {
    throw new Error(
      `${app.slug}: locale siblings must share one UID (found ${[...uids].join(', ')}). ` +
        'A translation is the same page in another language, not a different page.',
    );
  }
  return documents;
}

/* ------------------------------------------------------------------ routing */

/**
 * ADR-0003: ONE endpoint per page. A page's URL is its route, full stop - the
 * locale is not part of it, because every locale is inside the document.
 */
const routeFor = (route) => (route === '/' ? '/' : `${route.replace(/\/$/, '')}/`);

const outputPathFor = (urlPath) => path.join(urlPath.replace(/^\/|\/$/g, ''), 'index.html');

/* ------------------------------------------------------------------- render */

const LIVE_RELOAD = `
<script>
// Dev only: injected by --live-reload, never present in a production build.
(() => {
  const source = new EventSource('/_dev/reload');
  source.addEventListener('reload', () => location.reload());
  source.addEventListener('error', () => setTimeout(() => location.reload(), 1000));
})();
</script>`;

function renderHead({ doc, app, config, locale, urlPath, structuredData, args }) {
  const origin = args.base ?? config.domains.canonicalOrigin;
  const canonical = doc.seo?.canonical ?? `${origin}${urlPath}`;
  const title = doc.seo?.metaTitle ?? doc.title;
  const description = doc.seo?.metaDescription ?? doc.description;

  // No hreflang. It annotates a set of alternate URLs; with one URL per page
  // there is no set, and emitting it would assert routes that do not exist.
  // The head therefore speaks the primary locale; the other locales are in the
  // body, each marked with its own `lang` (WCAG 2.2 SC 3.1.2).
  const hreflang = [];

  return join(
    h('meta', { charset: 'utf-8' }),
    h('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }),
    h('title', {}, esc(title)),
    h('meta', { name: 'description', content: description }),
    h('link', { rel: 'canonical', href: canonical }),
    h('meta', { name: 'robots', content: app.manifest.seo?.noindex ? 'noindex, nofollow' : 'index, follow' }),
    h('link', { rel: 'icon', type: 'image/svg+xml', href: '/assets/brand/favicon.svg' }),
    // Preload only the two faces that render above the fold; the rest load on
    // demand. Same-origin, so no `crossorigin` mismatch and no third-party hop.
    h('link', { rel: 'preload', as: 'font', type: 'font/woff2', href: '/assets/fonts/cg-pro-text-400.woff2', crossorigin: 'anonymous' }),
    h('link', { rel: 'preload', as: 'font', type: 'font/woff2', href: '/assets/fonts/cg-mono-400.woff2', crossorigin: 'anonymous' }),
    h('link', { rel: 'stylesheet', href: '/assets/style.css' }),
    hreflang,
    h('meta', { property: 'og:type', content: 'website' }),
    h('meta', { property: 'og:site_name', content: 'Cogitave' }),
    h('meta', { property: 'og:title', content: title }),
    h('meta', { property: 'og:description', content: description }),
    h('meta', { property: 'og:url', content: canonical }),
    h('meta', { property: 'og:locale', content: locale }),
    doc.seo?.ogImage && h('meta', { property: 'og:image', content: `${origin}${doc.seo.ogImage}` }),
    h('meta', { name: 'twitter:card', content: 'summary_large_image' }),
    structuredData.map((data) => jsonLd(data)),
  );
}

/**
 * The switcher toggles which locale is shown. It is buttons, not links: nothing
 * navigates, the URL never changes, and no request is made. With JavaScript off
 * the buttons do nothing and the primary locale stays visible - which is why
 * every locale is in the document rather than fetched.
 */
function renderLocaleSwitcher(locales, primary) {
  if (locales.length < 2) return '';
  const buttons = locales.map((l) =>
    h(
      'button',
      {
        type: 'button',
        class: 'locale-switch-option',
        'data-locale-switch': l,
        'aria-pressed': String(l === primary),
        lang: l,
      },
      esc(l.toUpperCase()),
    ),
  );
  return h('nav', { class: 'locale-switch', 'aria-label': 'Language / Dil' }, join(buttons));
}

/** Render one locale's blocks. */
function renderBlocks(context) {
  const { doc, app, config, locale, components, pricing } = context;

  const used = new Set();
  const body = doc.blocks
    .map((block) => {
      const component = components.get(block.type);
      if (!component) {
        throw new Error(
          `${doc.uid} (${locale}): no component for block type "${block.type}". ` +
            `Known types: ${[...components.keys()].sort().join(', ')}`,
        );
      }
      if (!app.manifest.components?.includes(block.type)) {
        throw new Error(
          `${app.slug}: block type "${block.type}" is used by the content but not declared in the manifest \`components\`.`,
        );
      }
      if (component.schema) {
        assertValid(block.data ?? {}, component.schema, `${doc.uid} (${locale}) block "${block.type}"`);
      }
      used.add(block.type);
      const rendered = component.render(block.data ?? {}, { locale, config, pricing, doc, app });
      // Anchor ids must stay unique across locale regions in one document, so
      // they are namespaced by locale. Cross-locale, the anchor is the same
      // section; the switcher preserves the fragment.
      return block.id ? rendered.replace(/^<(\w+)/, `<$1 id="${esc(`${locale}-${block.id}`)}"`) : rendered;
    })
    .join('\n');

  return { body, used };
}

/**
 * Render one PAGE containing every locale.
 *
 * All locales live in the same document, each wrapped in a region carrying its
 * own `lang`, so a screen reader switches voice correctly (WCAG 2.2 SC 3.1.2,
 * Language of Parts) and a crawler sees every language rather than only the one
 * that happened to be negotiated. Non-primary locales are `hidden` on first
 * paint; the switcher unhides one and hides the rest.
 */
async function renderPage(context) {
  const { documents, app, config, urlPath, components, pricing, args, structured } = context;

  const primary = config.i18n.primaryLocale;
  const locales = [...documents.keys()];
  const used = new Set();

  const regions = locales.map((locale) => {
    const doc = documents.get(locale);
    const rendered = renderBlocks({ doc, app, config, locale, components, pricing });
    for (const type of rendered.used) used.add(type);
    return h(
      'div',
      {
        class: 'locale-region',
        lang: locale,
        'data-locale': locale,
        hidden: locale !== primary,
      },
      rendered.body,
    );
  });

  const doc = documents.get(primary);
  const structuredData = (doc.seo?.structuredData ?? []).map((name) => {
    const data = structured.get(name);
    if (!data) throw new Error(`${doc.uid}: unknown structured-data id "${name}" (seo/structured-data/${name}.jsonld)`);
    return data;
  });

  const head = renderHead({ doc, app, config, locale: primary, urlPath, structuredData, args });

  const html = join(
    '<!doctype html>',
    h(
      'html',
      { lang: primary, 'data-theme': 'dark' },
      h('head', {}, head),
      h(
        'body',
        {},
        h('a', { class: 'skip-link', href: '#main' }, 'Ana içeriğe geç / Skip to content'),
        h(
          'div',
          { class: 'frame' },
          h(
            'header',
            { class: 'topbar' },
            h('a', { class: 'wordmark', href: urlPath, 'aria-label': 'Cogitave' }, 'cogitave'),
            renderLocaleSwitcher(locales, primary),
          ),
          h('main', { id: 'main' }, join(regions)),
        ),
        h('script', { type: 'module', src: '/assets/app.js' }),
        args.liveReload ? LIVE_RELOAD : '',
      ),
    ),
  );

  return { html, used };
}

/* -------------------------------------------------------------------- shell */

/**
 * Self-hosted brand faces. No third-party font CDN: an external stylesheet would
 * hand the visitor's IP to another origin before any consent decision is made,
 * and it puts a render-blocking request on someone else's uptime. The files and
 * the licence position are documented in assets/fonts/README.md.
 * `font-display: swap` keeps text visible during load (CWV: no invisible text).
 */
const FONT_FACES = [
  { family: 'CG Pro', weight: 400, style: 'normal', file: 'cg-pro-text-400.woff2' },
  { family: 'CG Pro', weight: 500, style: 'normal', file: 'cg-pro-text-500.woff2' },
  { family: 'CG Pro', weight: 400, style: 'italic', file: 'cg-pro-text-400-italic.woff2' },
  { family: 'CG Pro', weight: 500, style: 'italic', file: 'cg-pro-text-500-italic.woff2' },
  { family: 'CG Pro Display', weight: 500, style: 'normal', file: 'cg-pro-display-500.woff2' },
  { family: 'CG Mono', weight: 400, style: 'normal', file: 'cg-mono-400.woff2' },
  { family: 'CG Mono', weight: 500, style: 'normal', file: 'cg-mono-500.woff2' },
];

const FONT_CSS = FONT_FACES.map(
  ({ family, weight, style, file }) => `@font-face {
  font-family: "${family}";
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url("/assets/fonts/${file}") format("woff2");
}`,
).join('\n');

/**
 * The locale switcher.
 *
 * Toggles which locale region is visible. It does NOT navigate, change the URL,
 * fetch anything, or redirect - every locale is already in the document. The
 * choice is stored so a returning visitor keeps it, and `<html lang>` is updated
 * so assistive tech follows. Nothing here reads Accept-Language or geolocation:
 * we never guess a visitor's language, we let them pick.
 */
const localeSwitchJs = (locales, primary) => `
{
  const LOCALES = ${JSON.stringify(locales)};
  const KEY = 'cogitave.locale';
  const regions = new Map(LOCALES.map((l) => [l, [...document.querySelectorAll('[data-locale="' + l + '"]')]]));
  const buttons = [...document.querySelectorAll('[data-locale-switch]')];

  const apply = (locale, persist) => {
    if (!regions.has(locale)) return;
    for (const [l, nodes] of regions) for (const node of nodes) node.hidden = l !== locale;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.localeSwitch === locale));
    document.documentElement.lang = locale;
    if (persist) { try { localStorage.setItem(KEY, locale); } catch {} }
  };

  for (const button of buttons) {
    button.addEventListener('click', () => apply(button.dataset.localeSwitch, true));
  }

  // Restore a previous explicit choice. Absent one, the primary locale stays -
  // we do not sniff navigator.language, because a guess that silently swaps the
  // page is the behaviour ADR-0003 rules out.
  try {
    const stored = localStorage.getItem(KEY);
    if (stored && stored !== ${JSON.stringify(primary)}) apply(stored, false);
  } catch {}
}
`;

const SHELL_CSS = `
/* Shell chrome. Every value is a semantic token - no raw colours, no magic numbers. */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--text-body-font-family);
  font-size: var(--text-body-font-size);
  line-height: var(--text-body-line-height);
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; }
img { max-width: 100%; }
.frame {
  max-width: var(--dimension-size-container-xl);
  margin-inline: auto;
  padding-inline: var(--dimension-space-6);
}
.skip-link {
  position: absolute;
  inset-inline-start: -9999px;
  padding: var(--dimension-space-3) var(--dimension-space-4);
  background: var(--color-surface-raised);
}
.skip-link:focus { inset-inline-start: var(--dimension-space-4); top: var(--dimension-space-4); z-index: 10; }
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dimension-space-4);
  padding-block: var(--dimension-space-6);
}
.wordmark {
  font-family: var(--text-code-font-family);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.02em;
  text-decoration: none;
}
.locale-switch {
  display: flex;
  gap: var(--dimension-space-2);
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
}
.locale-switch-option {
  appearance: none;
  background: none;
  border: 0;
  padding: 2px var(--dimension-space-2);
  border-radius: var(--radius-pill);
  font: inherit;
  color: var(--color-text-muted);
  cursor: pointer;
}
.locale-switch-option:hover { color: var(--color-text); }
.locale-switch-option[aria-pressed="true"] {
  color: var(--color-text);
  background: var(--color-surface-raised);
}
/* With no JavaScript the buttons cannot do anything, so they should not look
   like they can. The .js class is set by the switcher script itself. */
html:not(.js) .locale-switch { display: none; }
[data-locale][hidden] { display: none; }
:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

/* --------------------------------------------------------------------- SEO */

// One URL per page, so no xhtml:link alternates - there is nothing to alternate
// between. Every locale is inside the document the <loc> points at.
const sitemapXml = (origin, entries) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  entries.map(({ urlPath }) => `  <url>\n    <loc>${origin}${urlPath}</loc>\n  </url>\n`).join('') +
  `</urlset>\n`;

const llmsTxt = (origin, config, pages) =>
  join(
    `# Cogitave\n\n`,
    `> ${config.property.description}\n\n`,
    `Canonical origin: ${origin}\n`,
    `Languages: ${config.i18n.locales.join(', ')}. Each page is a single URL that `,
    `contains every language, marked up with per-section \`lang\` attributes; `,
    `there are no per-language URLs.\n\n`,
    `## Pages\n\n`,
    pages.map(({ urlPath, doc }) => `- [${doc.title}](${origin}${urlPath}): ${doc.description}\n`).join(''),
  );

/* -------------------------------------------------------------------- build */

export async function build(argv = []) {
  const args = parseArgs(argv);
  const started = process.hrtime.bigint();
  const log = (message) => { if (!args.quiet) console.log(message); };

  // Drift gate: only meaningful where the canonical registry is reachable. It
  // reports when it could NOT compare, so a green run never implies a check that
  // did not happen.
  if (args.checkDrift) {
    const drift = await checkDrift();
    log(
      drift.checked
        ? '  drift  pricing projection matches the registry'
        : `  drift  SKIPPED — ${drift.reason}`,
    );
  }

  const config = await readYaml(path.join(ROOT, 'site.config.yaml'));
  const outDir = path.resolve(ROOT, args.out ?? config.build.output.static.dir);
  const origin = args.base ?? config.domains.canonicalOrigin;

  const manifestSchema = await readJson(path.join(ROOT, 'apps', 'app.manifest.schema.json'));
  const pageSchema = await readJson(path.join(ROOT, 'content', 'schemas', 'page.schema.json'));
  assertSupported(manifestSchema, 'app.manifest.schema.json');
  assertSupported(pageSchema, 'page.schema.json');

  const [components, pricing, apps] = await Promise.all([
    loadComponents(),
    loadPricing(),
    discoverApps(config, manifestSchema),
  ]);

  // Structured data, read once and embedded per page by id.
  const structured = new Map();
  const sdDir = path.join(ROOT, 'seo', 'structured-data');
  if (existsSync(sdDir)) {
    for (const file of await readdir(sdDir)) {
      if (!file.endsWith('.jsonld')) continue;
      structured.set(path.basename(file, '.jsonld'), await readJson(path.join(sdDir, file)));
    }
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const pages = [];
  const usedComponents = new Set();

  for (const app of apps) {
    if (app.manifest.status === 'planned' || app.manifest.status === 'archived') {
      log(`  skip  ${app.slug} (status: ${app.manifest.status})`);
      continue;
    }

    const documents = await loadContent(app, config, pageSchema);
    const locales = [...documents.keys()];
    const urlPath = routeFor(app.manifest.route);

    // One page, every locale inside it.
    const { html, used } = await renderPage({
      documents, app, config, urlPath, components, pricing, args, structured,
    });
    for (const type of used) usedComponents.add(type);

    const file = path.join(outDir, outputPathFor(urlPath));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, html);

    const primaryDoc = documents.get(config.i18n.primaryLocale);
    pages.push({ urlPath, doc: primaryDoc, app, locales });
    log(`  page  ${urlPath.padEnd(10)} ${primaryDoc.uid} [${locales.join(' + ')}]`);
  }

  if (!pages.length) throw new Error('nothing was built: no app reached a buildable status');

  // Assets: tokens + shell + only the components actually used.
  const tokenTree = await loadTokens();
  const themes = Object.fromEntries(
    Object.entries(tokenTree.themes ?? {}).filter(([key]) => !key.startsWith('$')),
  );
  const componentCss = [...usedComponents]
    .sort()
    .map((type) => components.get(type).css)
    .filter(Boolean)
    .join('\n');
  const componentJs = [...usedComponents]
    .sort()
    .map((type) => components.get(type).js)
    .filter(Boolean)
    .join('\n');

  await mkdir(path.join(outDir, 'assets'), { recursive: true });
  await writeFile(
    path.join(outDir, 'assets', 'style.css'),
    join(FONT_CSS, '\n', tokensToCss(tokenTree, { themes }), SHELL_CSS, componentCss),
  );
  // Analytics: the declared event allowlist is the union across built apps, and
  // the endpoint comes from the environment - unset means no client is emitted.
  const consent = config.analytics?.consent
    ? await readJson(path.join(ROOT, config.analytics.consent))
    : null;
  const declaredEvents = [...new Set(apps.flatMap((app) => app.manifest.analytics?.events ?? []))].sort();
  const analyticsJs = consent
    ? analyticsClient({
        events: declaredEvents,
        consent,
        endpoint: process.env.ANALYTICS_INGEST_URL ?? null,
      })
    : '';

  const switcherJs =
    config.i18n.locales.length > 1
      ? join("document.documentElement.classList.add('js');\n", localeSwitchJs(config.i18n.locales, config.i18n.primaryLocale))
      : '';

  await writeFile(
    path.join(outDir, 'assets', 'app.js'),
    join(switcherJs, componentJs, analyticsJs) || '// no client behaviour on this build\n',
  );

  if (existsSync(path.join(ROOT, 'assets'))) {
    await cp(path.join(ROOT, 'assets'), path.join(outDir, 'assets'), { recursive: true });
  }

  // Redirect stubs. A moved URL keeps working: the stub carries a canonical
  // pointing at the destination (so a crawler consolidates rather than indexing
  // the stub), a meta refresh, and a real link for anyone who lands with JS and
  // redirects blocked. `noindex` keeps the stub itself out of results.
  for (const redirect of config.redirects ?? []) {
    const target = pages.find((page) => page.urlPath === redirect.to);
    if (!target) {
      throw new Error(
        `redirect "${redirect.from}" points at "${redirect.to}", which this build does not emit. ` +
          'A redirect to a 404 is worse than the 404 it replaces.',
      );
    }

    const stub = join(
      '<!doctype html>',
      h(
        'html',
        { lang: 'en' },
        h(
          'head',
          {},
          h('meta', { charset: 'utf-8' }),
          h('meta', { name: 'robots', content: 'noindex, follow' }),
          h('link', { rel: 'canonical', href: `${origin}${redirect.to}` }),
          h('meta', { 'http-equiv': 'refresh', content: `0; url=${redirect.to}` }),
          h('title', {}, 'Moved'),
        ),
        h('body', {}, h('p', {}, 'This page has moved to ', h('a', { href: redirect.to }, esc(redirect.to)), '.')),
      ),
    );

    const file = path.join(outDir, redirect.from.replace(/^\//, '').endsWith('.html')
      ? redirect.from.replace(/^\//, '')
      : path.join(redirect.from.replace(/^\/|\/$/g, ''), 'index.html'));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, stub);
    log(`  moved ${redirect.from} -> ${redirect.to}`);
  }

  // SEO surfaces.
  if (config.seo?.sitemap?.generate) {
    await writeFile(path.join(outDir, 'sitemap.xml'), sitemapXml(origin, pages));
  }
  if (config.seo?.llmsTxt?.generate) {
    await writeFile(path.join(outDir, 'llms.txt'), llmsTxt(origin, config, pages));
  }
  if (config.seo?.robots && existsSync(path.join(ROOT, config.seo.robots))) {
    const robots = (await readText(path.join(ROOT, config.seo.robots))).trimEnd();
    // The committed file may already declare the sitemap; appending a second
    // line is not an error to a crawler, but it is a signal the two sources
    // disagree about who owns the directive. Only add it if it is missing.
    const sitemapLine = `Sitemap: ${origin}/sitemap.xml`;
    const needsSitemap = config.seo.sitemap?.generate && !/^\s*Sitemap:/im.test(robots);
    await writeFile(
      path.join(outDir, 'robots.txt'),
      needsSitemap ? `${robots}\n\n${sitemapLine}\n` : `${robots}\n`,
    );
  }

  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  log(`\n  ${pages.length} pages, ${usedComponents.size} components -> ${path.relative(ROOT, outDir)}/ in ${ms.toFixed(0)}ms`);

  return { outDir, pages, config, components: usedComponents };
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  build(process.argv.slice(2)).catch((error) => {
    console.error(`\n${error instanceof SchemaError ? '' : `${error.name}: `}${error.message}\n`);
    process.exit(1);
  });
}
