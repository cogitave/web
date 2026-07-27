/**
 * Minimal YAML subset parser for the web shell's content-as-data and configs.
 *
 * Deliberately NOT a general YAML implementation. It supports exactly the
 * constructs `site.config.yaml`, `app.manifest.json`'s sibling documents and the
 * `*.page.yaml` corpus use, and fails loudly on anything else rather than
 * guessing:
 *
 *   - `### YamlMime:<Type>` type directive on line 1 (page documents)
 *   - `key: value` scalars (bare, single- and double-quoted)
 *   - nested mappings by indentation
 *   - block sequences (`- item`) of scalars and of mappings
 *   - block scalars: literal (`|`, `|-`, `|+`) and folded (`>`, `>-`, `>+`)
 *   - flow collections on one line: `{ a: 1, b: two }` and `[a, b, c]`
 *   - `true`/`false`, integers, floats, and `null`/`~`; everything else is a string
 *   - `#` line comments
 *
 * Anchors, aliases, multi-line flow collections, multi-document streams, tags,
 * and complex keys are not supported: none appear in the corpus, and silently
 * mis-parsing them would be worse than refusing.
 *
 * Relationship to `learn`. cogitave/learn ships a sibling parser for its own
 * corpus. This one is a superset (it adds flow collections and folded scalars,
 * both of which the web content model needs and the learn corpus does not use).
 * They are duplicated on purpose for now: each mirrored repo must stand alone on
 * GitHub, so a cross-repo relative import is not available, and
 * cogitave/primitives does not publish a package yet. Promoting one shared
 * parser into primitives is tracked as follow-up work — see docs/architecture.md.
 *
 * Rationale for writing this rather than depending on a YAML library:
 * ADR-0003 in standards (build from scratch - reference, not dependency).
 */

const MIME_RE = /^###\s*YamlMime:([A-Za-z][A-Za-z0-9]*)\s*$/;
const KEY_RE = /^([A-Za-z_$][A-Za-z0-9_.\-]*)\s*:(?:\s+(.*))?$/;
const BLOCK_MARKER_RE = /^([|>])([-+]?)$/;

export class YamlError extends Error {
  constructor(message, file, line) {
    super(`${file}:${line}: ${message}`);
    this.name = 'YamlError';
    this.file = file;
    this.line = line;
  }
}

/**
 * Parse a typed document whose first meaningful line is `### YamlMime:<Type>`.
 * Returns `{ mime, data }`.
 */
export function parseYamlMime(text, file = '<memory>') {
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  const match = lines[i] !== undefined && MIME_RE.exec(lines[i].trim());
  if (!match) {
    throw new YamlError('expected a `### YamlMime:<Type>` directive on the first line', file, i + 1);
  }
  const body = lines.slice(i + 1).join('\n');
  return { mime: match[1], data: parseYaml(body, file, i + 1) };
}

/** Parse a plain YAML document (no mime directive). */
export function parseYaml(text, file = '<memory>', lineOffset = 0) {
  const ctx = { lines: text.split(/\r?\n/), file, offset: lineOffset };
  const start = nextMeaningful(ctx, 0);
  if (start === -1) return {};
  return parseBlock(ctx, start, indentOf(ctx.lines[start])).value;
}

/* ------------------------------------------------------------------ helpers */

const isSkippable = (line) => {
  const t = line.trim();
  return t === '' || t.startsWith('#') || t === '---';
};

const indentOf = (line) => line.length - line.trimStart().length;

function nextMeaningful(ctx, from) {
  for (let i = from; i < ctx.lines.length; i++) {
    if (!isSkippable(ctx.lines[i])) return i;
  }
  return -1;
}

const fail = (ctx, i, message) => {
  throw new YamlError(message, ctx.file, ctx.offset + i + 1);
};

/* -------------------------------------------------------------------- block */

/** Dispatch a block at `start`/`indent` to a mapping or a sequence. */
function parseBlock(ctx, start, indent) {
  const line = ctx.lines[start].trim();
  return line.startsWith('- ') || line === '-'
    ? parseSequence(ctx, start, indent)
    : parseMapping(ctx, start, indent);
}

function parseMapping(ctx, start, indent) {
  const out = {};
  let i = start;

  while (i < ctx.lines.length) {
    const raw = ctx.lines[i];
    if (isSkippable(raw)) { i++; continue; }

    const ind = indentOf(raw);
    if (ind < indent) break;
    if (ind > indent) fail(ctx, i, `unexpected indent (expected ${indent}, got ${ind})`);

    const match = KEY_RE.exec(raw.trim());
    if (!match) fail(ctx, i, `expected \`key: value\`, got: ${raw.trim()}`);

    const key = match[1];
    const rest = (match[2] ?? '').trim();
    const withoutComment = stripComment(rest);

    const blockMarker = BLOCK_MARKER_RE.exec(withoutComment);
    if (blockMarker) {
      const block = parseBlockScalar(ctx, i + 1, indent, blockMarker[1], blockMarker[2]);
      out[key] = block.value;
      i = block.next;
      continue;
    }

    if (withoutComment !== '') {
      out[key] = parseFlowOrScalar(ctx, i, withoutComment);
      i++;
      continue;
    }

    // Empty value: either a nested block, or an explicit null.
    const next = nextMeaningful(ctx, i + 1);
    if (next === -1 || indentOf(ctx.lines[next]) <= indent) {
      // A sequence may sit at the SAME indent as its key - that is legal YAML.
      if (next !== -1 && indentOf(ctx.lines[next]) === indent && ctx.lines[next].trim().startsWith('-')) {
        const seq = parseSequence(ctx, next, indent);
        out[key] = seq.value;
        i = seq.next;
        continue;
      }
      out[key] = null;
      i = i + 1;
      continue;
    }

    const nested = parseBlock(ctx, next, indentOf(ctx.lines[next]));
    out[key] = nested.value;
    i = nested.next;
  }

  return { value: out, next: i };
}

function parseSequence(ctx, start, indent) {
  const out = [];
  let i = start;

  while (i < ctx.lines.length) {
    const raw = ctx.lines[i];
    if (isSkippable(raw)) { i++; continue; }

    const ind = indentOf(raw);
    if (ind < indent) break;
    if (ind > indent) fail(ctx, i, `unexpected indent in sequence (expected ${indent}, got ${ind})`);

    const trimmed = raw.trim();
    if (!trimmed.startsWith('-')) break;

    const rest = stripComment(trimmed.slice(1).trim());

    if (rest === '') {
      // `-` alone: the item is the nested block that follows.
      const next = nextMeaningful(ctx, i + 1);
      if (next === -1 || indentOf(ctx.lines[next]) <= ind) {
        out.push(null);
        i++;
        continue;
      }
      const item = parseBlock(ctx, next, indentOf(ctx.lines[next]));
      out.push(item.value);
      i = item.next;
      continue;
    }

    const blockMarker = BLOCK_MARKER_RE.exec(rest);
    if (blockMarker) {
      const block = parseBlockScalar(ctx, i + 1, ind, blockMarker[1], blockMarker[2]);
      out.push(block.value);
      i = block.next;
      continue;
    }

    // `- key: value` starts an inline mapping whose indent is the column the
    // key begins at; subsequent sibling keys line up under it.
    if (KEY_RE.test(rest)) {
      const keyIndent = raw.indexOf('-') + raw.slice(raw.indexOf('-') + 1).search(/\S/) + 1;
      const synthetic = { ...ctx, lines: [...ctx.lines] };
      synthetic.lines[i] = ' '.repeat(keyIndent) + rest;
      const item = parseMapping(synthetic, i, keyIndent);
      out.push(item.value);
      i = item.next;
      continue;
    }

    out.push(parseFlowOrScalar(ctx, i, rest));
    i++;
  }

  return { value: out, next: i };
}

/**
 * Block scalar. `style` is `|` (literal - newlines kept) or `>` (folded - each
 * run of non-empty lines joins with a space). `chomp` is '' (clip), '-' (strip)
 * or '+' (keep).
 */
function parseBlockScalar(ctx, start, parentIndent, style, chomp) {
  const collected = [];
  let i = start;
  let blockIndent = null;

  while (i < ctx.lines.length) {
    const raw = ctx.lines[i];
    if (raw.trim() === '') { collected.push(''); i++; continue; }
    const ind = indentOf(raw);
    if (ind <= parentIndent) break;
    if (blockIndent === null) blockIndent = ind;
    collected.push(raw.slice(blockIndent));
    i++;
  }

  while (collected.length && collected[collected.length - 1] === '') collected.pop();

  let value;
  if (style === '|') {
    value = collected.join('\n');
  } else {
    // Folded: blank lines become paragraph breaks, other newlines become spaces.
    const paragraphs = [];
    let current = [];
    for (const line of collected) {
      if (line === '') { paragraphs.push(current.join(' ')); current = []; }
      else current.push(line.trim());
    }
    paragraphs.push(current.join(' '));
    value = paragraphs.filter((p, idx) => p !== '' || idx === 0).join('\n\n');
  }

  if (chomp !== '-') value += '\n';
  if (chomp === '-') value = value.replace(/\n+$/, '');

  return { value, next: i };
}

/* --------------------------------------------------------------------- flow */

function parseFlowOrScalar(ctx, i, text) {
  if (text.startsWith('{') || text.startsWith('[')) {
    const { value, rest } = parseFlow(ctx, i, text);
    if (rest.trim() !== '') fail(ctx, i, `trailing content after flow collection: ${rest.trim()}`);
    return value;
  }
  return parseScalar(text);
}

/**
 * A quote character opens a quoted scalar only at the START of a scalar - that
 * is, at the beginning, or after a structural character. Mid-token it is an
 * ordinary apostrophe, as in `the operator's equipment`. Treating every quote as
 * an opener is the classic way a hand-written scanner swallows the rest of a
 * line and reports "unterminated".
 */
const opensScalar = (text, position) => {
  for (let p = position - 1; p >= 0; p--) {
    const ch = text[p];
    if (ch === ' ' || ch === '\t') continue;
    return ch === '{' || ch === '[' || ch === ',' || ch === ':';
  }
  return true;
};

/** Parse a single-line flow collection. Returns the value and any remainder. */
function parseFlow(ctx, i, text) {
  const open = text[0];
  const close = open === '{' ? '}' : ']';
  const isMap = open === '{';
  const items = [];
  let buf = '';
  let depth = 0;
  let quote = null;
  let end = -1;

  const flush = () => {
    const token = buf.trim();
    buf = '';
    if (token !== '') items.push(token);
  };

  for (let p = 0; p < text.length; p++) {
    const ch = text[p];

    if (quote) {
      buf += ch;
      if (ch === quote && text[p - 1] !== '\\') quote = null;
      continue;
    }
    if ((ch === '"' || ch === "'") && opensScalar(text, p)) { quote = ch; buf += ch; continue; }

    if (ch === '{' || ch === '[') {
      depth++;
      if (depth === 1) continue;      // skip the outer opener
      buf += ch;
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) { flush(); end = p; break; }
      buf += ch;
      continue;
    }
    if (ch === ',' && depth === 1) { flush(); continue; }
    buf += ch;
  }

  if (end === -1) fail(ctx, i, `unterminated flow collection (expected \`${close}\`)`);

  const value = isMap ? {} : [];
  for (const token of items) {
    if (!isMap) { value.push(parseFlowOrScalar(ctx, i, token)); continue; }
    const match = KEY_RE.exec(token);
    if (!match) fail(ctx, i, `expected \`key: value\` inside a flow mapping, got: ${token}`);
    value[match[1]] = parseFlowOrScalar(ctx, i, (match[2] ?? '').trim());
  }

  return { value, rest: text.slice(end + 1) };
}

/* ------------------------------------------------------------------ scalars */

/** Strip a trailing `#` comment that is not inside quotes. */
function stripComment(text) {
  let quote = null;
  for (let p = 0; p < text.length; p++) {
    const ch = text[p];
    if (quote) { if (ch === quote && text[p - 1] !== '\\') quote = null; continue; }
    if ((ch === '"' || ch === "'") && opensScalar(text, p)) { quote = ch; continue; }
    if (ch === '#' && (p === 0 || /\s/.test(text[p - 1]))) return text.slice(0, p).trimEnd();
  }
  return text;
}

function parseScalar(raw) {
  const text = raw.trim();
  if (text === '') return '';
  if (text.startsWith('"') && text.endsWith('"') && text.length > 1) {
    return unescapeDouble(text.slice(1, -1));
  }
  if (text.startsWith("'") && text.endsWith("'") && text.length > 1) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === 'null' || text === '~') return null;
  if (/^-?\d+$/.test(text)) return Number.parseInt(text, 10);
  if (/^-?\d*\.\d+$/.test(text)) return Number.parseFloat(text);
  return text;
}

function unescapeDouble(s) {
  return s.replace(/\\(["\\/bfnrt]|u[0-9a-fA-F]{4})/g, (_, esc) => {
    switch (esc[0]) {
      case '"': return '"';
      case '\\': return '\\';
      case '/': return '/';
      case 'b': return '\b';
      case 'f': return '\f';
      case 'n': return '\n';
      case 'r': return '\r';
      case 't': return '\t';
      default: return String.fromCharCode(Number.parseInt(esc.slice(1), 16));
    }
  });
}
