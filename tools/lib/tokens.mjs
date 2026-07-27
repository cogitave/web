/**
 * DTCG design-token transform: design/tokens.json -> CSS custom properties.
 *
 * The token file is authored in the W3C Design Tokens Community Group format so
 * the FORMAT is parser-agnostic; the transform is ours (ADR-0003 in standards:
 * build from scratch - reference, not dependency). Nothing here is specific to
 * this site: it resolves any DTCG tree of the shapes the file actually uses.
 *
 * What it handles:
 *   - `$value` leaves nested under group objects, with `$type` inherited from
 *     the nearest ancestor that declares one
 *   - alias references `{group.path.to.token}`, resolved transitively with a
 *     cycle guard
 *   - the value shapes in use: color (hex), dimension/duration ({value, unit}),
 *     fontFamily (array), fontWeight/number (scalar), cubicBezier (4-array),
 *     and `typography` composites, which expand into one custom property per
 *     sub-field (`--text-display-font-size`, ...) because CSS has no composite
 *     custom property
 *   - a theme overlay: `themes.<name>` re-points semantic aliases, emitted under
 *     `[data-theme="<name>"]` and mirrored into `prefers-color-scheme`
 *
 * Naming: `semantic.color.text` becomes `--color-text`; the `semantic.` prefix
 * is dropped because semantic tokens ARE the contract components consume.
 * Primitives keep their full path (`--color-neutral-900`) and exist mainly so a
 * semantic alias has something to point at.
 */

const ALIAS_RE = /^\{([A-Za-z0-9_.\-]+)\}$/;
const META_KEYS = new Set(['$schema', '$description', '$type', '$value', '$extensions', '$deprecated']);

export class TokenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TokenError';
  }
}

/**
 * Flatten a DTCG tree into `Map<dottedPath, { type, value }>`.
 * `$type` inherits down the tree per the DTCG spec.
 */
export function flattenTokens(tree, { skip = [] } = {}) {
  const out = new Map();

  const walk = (node, path, inheritedType) => {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return;
    const type = node.$type ?? inheritedType;

    if ('$value' in node) {
      out.set(path.join('.'), { type, value: node.$value });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (META_KEYS.has(key)) continue;
      if (path.length === 0 && skip.includes(key)) continue;
      walk(child, [...path, key], type);
    }
  };

  walk(tree, [], undefined);
  return out;
}

/** Resolve `{alias}` references against a flattened map. */
export function resolveAliases(tokens) {
  const resolved = new Map();

  const resolve = (path, seen) => {
    if (resolved.has(path)) return resolved.get(path);
    const token = tokens.get(path);
    if (!token) throw new TokenError(`unknown token reference: {${path}}`);
    if (seen.has(path)) {
      throw new TokenError(`circular token alias: ${[...seen, path].join(' -> ')}`);
    }

    const next = new Set(seen).add(path);
    const value = resolveValue(token.value, next);
    const entry = { type: token.type, value };
    resolved.set(path, entry);
    return entry;
  };

  const resolveValue = (value, seen) => {
    if (typeof value === 'string') {
      const alias = ALIAS_RE.exec(value.trim());
      return alias ? resolve(alias[1], seen).value : value;
    }
    if (Array.isArray(value)) return value.map((v) => resolveValue(v, seen));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveValue(v, seen)]));
    }
    return value;
  };

  for (const path of tokens.keys()) resolve(path, new Set());
  return resolved;
}

/** `semantic.color.text` -> `--color-text`; `color.neutral.900` -> `--color-neutral-900`. */
export function cssName(path) {
  const trimmed = path.startsWith('semantic.') ? path.slice('semantic.'.length) : path;
  return `--${trimmed.replace(/\./g, '-')}`;
}

/** Render one resolved token value as a CSS value string. */
export function cssValue(type, value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if ('hex' in value) return value.hex;
    if ('value' in value && 'unit' in value) return `${value.value}${value.unit}`;
    throw new TokenError(`unsupported object token value: ${JSON.stringify(value)}`);
  }
  if (Array.isArray(value)) {
    if (type === 'cubicBezier') return `cubic-bezier(${value.join(', ')})`;
    // fontFamily: quote any family containing a space.
    return value.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');
  }
  return String(value);
}

const TYPOGRAPHY_FIELDS = {
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
};

/** Emit `--name: value;` declaration lines for a resolved token map. */
function declarations(resolved, indent = '  ') {
  const lines = [];
  for (const [path, { type, value }] of resolved) {
    const name = cssName(path);
    if (type === 'typography' && value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [field, suffix] of Object.entries(TYPOGRAPHY_FIELDS)) {
        if (!(field in value)) continue;
        lines.push(`${indent}${name}-${suffix}: ${cssValue(undefined, value[field])};`);
      }
      continue;
    }
    lines.push(`${indent}${name}: ${cssValue(type, value)};`);
  }
  return lines;
}

/**
 * Build the stylesheet.
 *
 * `themes` is `{ <name>: { <semantic dotted path>: <value or {alias}> } }`.
 * Each theme is emitted twice: under `[data-theme="<name>"]` (explicit choice)
 * and inside `@media (prefers-color-scheme: <name>)` scoped to
 * `:root:not([data-theme])` so an explicit choice always wins over the OS.
 */
export function tokensToCss(tree, { themes = {} } = {}) {
  const flat = flattenTokens(tree, { skip: ['themes'] });
  const resolved = resolveAliases(flat);

  const out = [
    '/* GENERATED from design/tokens.json by tools/lib/tokens.mjs - do not edit. */',
    ':root {',
    ...declarations(resolved),
    '}',
  ];

  for (const [name, overrides] of Object.entries(themes)) {
    const themed = new Map(flat);
    for (const [path, value] of Object.entries(overrides)) {
      if (!flat.has(path)) throw new TokenError(`theme "${name}" overrides unknown token: ${path}`);
      themed.set(path, { type: flat.get(path).type, value });
    }
    const themeResolved = resolveAliases(themed);

    // Only emit what actually differs from the base, so the overlay stays small
    // and readable in devtools.
    const changed = new Map();
    for (const [path, entry] of themeResolved) {
      const base = resolved.get(path);
      if (JSON.stringify(base.value) !== JSON.stringify(entry.value)) changed.set(path, entry);
    }

    out.push('', `[data-theme="${name}"] {`, ...declarations(changed), '}');
    out.push(
      '',
      `@media (prefers-color-scheme: ${name}) {`,
      '  :root:not([data-theme]) {',
      ...declarations(changed, '    '),
      '  }',
      '}',
    );
  }

  return `${out.join('\n')}\n`;
}
