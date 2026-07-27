/**
 * Development server with live reload.
 *
 * Watches every input the build actually reads - content, components, the shell
 * config, the schemas, the design tokens and the pricing registry in corp/gtm -
 * rebuilds on change, and pushes a reload over Server-Sent Events. No bundler,
 * no websocket library, no dependency: `node:http` plus `fs.watch` plus a
 * six-line client snippet the build injects only under `--live-reload`
 * (ADR-0003 in standards: build from scratch - reference, not dependency).
 *
 * Why SSE rather than a websocket: the traffic is one-way (server tells the page
 * to reload), EventSource reconnects on its own, and it needs no handshake code.
 *
 * Build failures are SHOWN, not swallowed. A failed rebuild keeps the last good
 * bundle on disk but serves an error overlay, so a schema violation or a missing
 * registry entry appears in the browser instead of silently serving a stale page
 * that no longer matches the source.
 *
 * Usage: node tools/serve.mjs [--port 4173] [--host 127.0.0.1]
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync, watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from './build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ESTATE = path.resolve(ROOT, '..', '..');
const OUT = path.join(ROOT, '.cache', 'dev');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonld': 'application/ld+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** Inputs the build reads. A change under any of these triggers a rebuild. */
const WATCHED = [
  path.join(ROOT, 'apps'),
  path.join(ROOT, 'components'),
  path.join(ROOT, 'content'),
  path.join(ROOT, 'seo'),
  path.join(ROOT, 'assets'),
  path.join(ROOT, 'tools'),
  path.join(ROOT, 'site.config.yaml'),
  path.join(ESTATE, 'cogitave', 'design', 'tokens.json'),
  path.join(ESTATE, 'cogitave', 'corp', 'gtm', 'pricing'),
];

function parseArgs(argv) {
  const args = { port: 4173, host: '127.0.0.1' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port') args.port = Number(argv[++i]);
    else if (argv[i] === '--host') args.host = argv[++i];
  }
  return args;
}

/* ------------------------------------------------------------------- state */

const clients = new Set();
let lastError = null;
let building = false;
let queued = false;

const notify = (event) => {
  for (const res of clients) res.write(`event: ${event}\ndata: ${Date.now()}\n\n`);
};

async function rebuild(reason) {
  if (building) { queued = true; return; }
  building = true;

  const started = Date.now();
  try {
    await build(['--out', OUT, '--quiet', '--live-reload', '--base', '']);
    lastError = null;
    console.log(`  rebuilt (${reason}) in ${Date.now() - started}ms`);
  } catch (error) {
    lastError = error;
    console.error(`\n  build failed (${reason}):\n  ${error.message.split('\n').join('\n  ')}\n`);
  } finally {
    building = false;
    notify('reload');
    if (queued) { queued = false; await rebuild('coalesced change'); }
  }
}

/* ----------------------------------------------------------------- overlay */

const escapeHtml = (s) =>
  String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const errorPage = (error) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Build failed</title>
<style>
  body { margin:0; background:#0a0a0f; color:#f8fafc;
         font:14px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding:2rem; }
  h1 { font-size:1rem; letter-spacing:.14em; text-transform:uppercase; color:#f87171; margin:0 0 1.5rem; }
  pre { white-space:pre-wrap; background:#12131a; border:1px solid #22232c; border-radius:8px;
        padding:1.25rem; margin:0; }
  p { color:#94a3b8; margin-top:1.5rem; }
</style></head>
<body>
  <h1>Build failed</h1>
  <pre>${escapeHtml(error.message)}</pre>
  <p>Fix the source and save — this page reloads itself.</p>
  <script>
    const source = new EventSource('/_dev/reload');
    source.addEventListener('reload', () => location.reload());
  </script>
</body></html>
`;

/* ------------------------------------------------------------------ server */

/**
 * Map a URL path to a file in the build output, honouring directory indexes.
 *
 * The candidate must be a FILE. Checking only for existence matches directories
 * too, and handing a directory to readFile throws EISDIR — which, in a request
 * handler, takes the whole dev server down on one bad URL.
 */
const isFile = (candidate) => {
  try {
    return existsSync(candidate) && statSync(candidate).isFile();
  } catch {
    return false;
  }
};

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  if (clean.includes('..')) return null;

  const candidates = clean.endsWith('/')
    ? [path.join(OUT, clean, 'index.html')]
    : [path.join(OUT, clean), path.join(OUT, clean, 'index.html'), `${path.join(OUT, clean)}.html`];

  return candidates.find(isFile) ?? null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('  building…');
  await rebuild('startup');

  // One bad request must never take the dev server down: an unhandled rejection
  // in the handler would kill the process mid-session and look like the build
  // hanging. Every request is wrapped, and a failure is reported, not fatal.
  const server = createServer((req, res) => {
    handle(req, res).catch((error) => {
      console.error(`  request failed (${req.url}): ${error.message}`);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`500 — ${error.message}`);
    });
  });

  const handle = async (req, res) => {
    if (req.url.startsWith('/_dev/reload')) {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });
      res.write('retry: 500\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    if (lastError) {
      res.writeHead(500, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      res.end(errorPage(lastError));
      return;
    }

    const file = resolveFile(req.url);
    if (!file) {
      res.writeHead(404, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      res.end(
        '<!doctype html><meta charset="utf-8"><title>404</title>' +
          `<body style="background:#0a0a0f;color:#94a3b8;font:14px ui-monospace,monospace;padding:2rem">` +
          `404 — no route for <code>${escapeHtml(req.url)}</code>` +
          `<script>new EventSource('/_dev/reload').addEventListener('reload',()=>location.reload())</script>`,
      );
      return;
    }

    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',    // dev: never cache, the bundle changes constantly
    });
    res.end(await readFile(file));
  };

  // Debounced watching: an editor save can emit several events for one write,
  // and a rebuild triggered per event would thrash.
  let timer = null;
  const onChange = (file) => {
    if (file && (file.includes('.cache') || file.includes('_site') || file.endsWith('~'))) return;
    clearTimeout(timer);
    timer = setTimeout(() => rebuild(file ? path.basename(file) : 'change'), 60);
  };

  for (const target of WATCHED) {
    if (!existsSync(target)) continue;
    try {
      watch(target, { recursive: true }, (_event, file) => onChange(file));
    } catch {
      watch(target, (_event, file) => onChange(file));   // non-recursive fallback
    }
  }

  server.listen(args.port, args.host, () => {
    console.log(`\n  cogitave.com dev server`);
    console.log(`  http://${args.host}:${args.port}/      (en)`);
    console.log(`  http://${args.host}:${args.port}/tr/   (tr)`);
    console.log(`  watching ${WATCHED.filter((t) => existsSync(t)).length} inputs — live reload on\n`);
  });
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
