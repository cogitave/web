/**
 * Materialise the estate-owned inputs this repo needs, into this repo.
 *
 * Why this exists. cogitave/web is PUBLIC and stands alone on GitHub, but two of
 * its inputs are authored in other repos that are PRIVATE:
 *
 *   - the published prices, owned by corp/gtm
 *   - the DTCG design tokens, owned by cogitave/design
 *
 * A build that reaches across those boundaries is broken twice over: it fails
 * the moment cogitave/web is cloned by itself, and it couples public output to
 * private trees. So the estate keeps the canonical sources and this script
 * writes committed PROJECTIONS of them into web. That is the estate's standing
 * pattern - one canonical model, many projections (Solution Blueprint section 6)
 * - applied to a repo boundary.
 *
 * Only what the site already exposes crosses: prices printed on the page, and
 * token values that reach the stylesheet either way. Engagement types, SLA
 * profiles, margin commentary and withheld-claim notes stay in corp.
 *
 * The token projection is a stand-in for the published design package that
 * design/README.md anticipates ("the web shell consumes the published design
 * package at build"). When @cogitave/design publishes, this becomes a dependency
 * and the vendored copy goes away.
 *
 * Run in the estate, where the canonical sources are reachable:
 *   npm run sync:estate
 *
 * The build never runs this - it reads the committed projections, so
 * `npm run build` works in a standalone clone. `npm run check` additionally
 * verifies the projections are current WHEN the sources are reachable, and says
 * plainly when they are not, so a green check never implies a comparison that
 * did not happen.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseYaml } from './lib/yaml.mjs';
import { assertValid, assertSupported } from './lib/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ESTATE_SIBLING = path.resolve(ROOT, '..');

/* ------------------------------------------------------------------ sources */

const PRICING_SOURCE = path.join(ESTATE_SIBLING, 'corp', 'gtm', 'pricing', 'services-catalog.yaml');
const PRICING_SCHEMA = path.join(ESTATE_SIBLING, 'corp', 'gtm', 'pricing', 'schema', 'services-catalog.schema.json');
const TOKENS_SOURCE = path.join(ESTATE_SIBLING, 'design', 'tokens.json');

/* -------------------------------------------------------------- projections */

export const PRICING_PROJECTION = path.join(ROOT, 'content', 'pricing', 'services-catalog.published.yaml');
export const TOKENS_PROJECTION = path.join(ROOT, 'design', 'tokens.json');

const GENERATED_NOTE = 'GENERATED - do not edit. Run `npm run sync:estate` in the estate.';

/* ------------------------------------------------------------------ pricing */

const pricingReachable = () => existsSync(PRICING_SOURCE);

async function readPricingRegistry() {
  const registry = parseYaml(await readFile(PRICING_SOURCE, 'utf8'), 'services-catalog.yaml');
  const schema = JSON.parse(await readFile(PRICING_SCHEMA, 'utf8'));
  assertSupported(schema, 'services-catalog.schema.json');
  assertValid(registry, schema, 'corp/gtm/pricing/services-catalog.yaml');
  return registry;
}

/**
 * Reduce the registry to the fields the page renders. Deterministic: the same
 * registry always produces byte-identical YAML, so drift is an exact comparison.
 */
export function projectPricing(registry) {
  const lines = [
    `# ${GENERATED_NOTE}`,
    '#',
    '# The PUBLIC projection of corp/gtm/pricing/services-catalog.yaml, which is',
    '# the canonical source and lives in a private repo. Only what the page',
    '# already shows crosses the boundary: offer id, pricing model, amount,',
    '# period. Engagement types, SLA profiles and internal notes deliberately do',
    '# not.',
    '#',
    '# Editing a price here does nothing durable: the next sync overwrites it,',
    '# and `npm run check` fails inside the estate the moment this file and the',
    '# registry disagree. Change the registry.',
    '',
    `currency: ${registry.currency}`,
    'offers:',
  ];

  const offers = registry.categories
    .flatMap((category) => category.offers)
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const offer of offers) {
    const parts = [`model: ${offer.pricing.model}`];
    if (offer.pricing.amount !== undefined) parts.push(`amount: ${offer.pricing.amount}`);
    if (offer.pricing.period) parts.push(`period: ${offer.pricing.period}`);
    lines.push(`  ${offer.id}: { ${parts.join(', ')} }`);
  }

  return `${lines.join('\n')}\n`;
}

/** Load the committed price projection into the shape the renderer wants. */
export async function loadPricing() {
  if (!existsSync(PRICING_PROJECTION)) {
    throw new Error(
      `pricing projection missing at ${path.relative(ROOT, PRICING_PROJECTION)}. ` +
        'Run `npm run sync:estate` in the estate to generate it. ' +
        'The build refuses to emit a service catalog with no price source.',
    );
  }
  const data = parseYaml(await readFile(PRICING_PROJECTION, 'utf8'), 'services-catalog.published.yaml');
  const offers = new Map(Object.entries(data.offers ?? {}).map(([id, pricing]) => [id, { id, pricing }]));
  return { source: 'content/pricing/services-catalog.published.yaml', currency: data.currency, offers };
}

/* ------------------------------------------------------------------- tokens */

const tokensReachable = () => existsSync(TOKENS_SOURCE);

/** Vendor the DTCG tree verbatim, with provenance recorded inside it. */
export function projectTokens(source) {
  const tree = JSON.parse(source);
  const withProvenance = {
    $comment: `${GENERATED_NOTE} Canonical source: cogitave/design/tokens.json.`,
    ...tree,
  };
  return `${JSON.stringify(withProvenance, null, 2)}\n`;
}

/** Load the committed token projection. */
export async function loadTokens() {
  if (!existsSync(TOKENS_PROJECTION)) {
    throw new Error(
      `design tokens missing at ${path.relative(ROOT, TOKENS_PROJECTION)}. ` +
        'Run `npm run sync:estate` in the estate to generate them.',
    );
  }
  return JSON.parse(await readFile(TOKENS_PROJECTION, 'utf8'));
}

/* -------------------------------------------------------------------- drift */

const normalise = (text) => text.replace(/\r\n/g, '\n');

/**
 * Verify every projection against its canonical source. Only meaningful inside
 * the estate; outside it the sources are absent by design, and this reports that
 * rather than passing silently.
 */
export async function checkDrift() {
  const skipped = [];
  const stale = [];

  if (pricingReachable()) {
    const expected = projectPricing(await readPricingRegistry());
    const actual = existsSync(PRICING_PROJECTION) ? await readFile(PRICING_PROJECTION, 'utf8') : '';
    if (expected !== normalise(actual)) stale.push('pricing');
  } else {
    skipped.push('pricing');
  }

  if (tokensReachable()) {
    const expected = projectTokens(await readFile(TOKENS_SOURCE, 'utf8'));
    const actual = existsSync(TOKENS_PROJECTION) ? await readFile(TOKENS_PROJECTION, 'utf8') : '';
    if (expected !== normalise(actual)) stale.push('design tokens');
  } else {
    skipped.push('design tokens');
  }

  if (stale.length) {
    throw new Error(
      `committed projection is stale: ${stale.join(', ')}. ` +
        'Run `npm run sync:estate` and commit the result.',
    );
  }

  return {
    checked: skipped.length === 0,
    reason: skipped.length ? `${skipped.join(' and ')} source not reachable (standalone clone)` : null,
  };
}

/* --------------------------------------------------------------------- main */

async function main() {
  if (!pricingReachable() || !tokensReachable()) {
    throw new Error(
      'canonical sources are not reachable. This script only runs inside the estate, ' +
        'where corp/gtm and design sit alongside web.',
    );
  }

  const pricing = projectPricing(await readPricingRegistry());
  await mkdir(path.dirname(PRICING_PROJECTION), { recursive: true });
  await writeFile(PRICING_PROJECTION, pricing);
  const offerCount = pricing.split('\n').filter((line) => line.startsWith('  ')).length;
  console.log(`  ${String(offerCount).padStart(3)} offers -> ${path.relative(ROOT, PRICING_PROJECTION)}`);

  const tokens = projectTokens(await readFile(TOKENS_SOURCE, 'utf8'));
  await mkdir(path.dirname(TOKENS_PROJECTION), { recursive: true });
  await writeFile(TOKENS_PROJECTION, tokens);
  console.log(`  ${String(tokens.split('\n').length).padStart(3)} lines  -> ${path.relative(ROOT, TOKENS_PROJECTION)}`);
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`\n${error.message}\n`);
    process.exit(1);
  });
}
