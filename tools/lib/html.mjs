/**
 * HTML emission helpers.
 *
 * Escaping is the point of this module: every value that reaches the output
 * passes through `esc` or `attr`, so content-as-data can carry apostrophes,
 * ampersands and angle brackets without a component author having to think
 * about it. Components build strings with `h` and template literals rather than
 * a virtual DOM - the output is static HTML, there is nothing to diff.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for an HTML text node or a quoted attribute value. */
export const esc = (value) =>
  value === null || value === undefined ? '' : String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

/**
 * Render an attribute map. `false`, `null` and `undefined` drop the attribute;
 * `true` renders it bare (`hidden`), which is what boolean attributes mean.
 */
export const attr = (attrs = {}) =>
  Object.entries(attrs)
    .filter(([, v]) => v !== false && v !== null && v !== undefined)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
    .join('');

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'source', 'track', 'wbr',
]);

/**
 * `h('a', { href }, 'text')` -> `<a href="...">text</a>`.
 * Children are joined as-is: they are already-rendered HTML, so a component
 * composes by nesting `h` calls and escapes leaf text with `esc` itself.
 */
export function h(tag, attrs = {}, ...children) {
  const open = `<${tag}${attr(attrs)}>`;
  if (VOID_ELEMENTS.has(tag)) return open;
  return `${open}${children.flat(Infinity).filter(Boolean).join('')}</${tag}>`;
}

/** Join rendered fragments, dropping empties. */
export const join = (...parts) => parts.flat(Infinity).filter(Boolean).join('');

/** Serialize a JSON-LD object into a script tag, safe against `</script>`. */
export const jsonLd = (data) =>
  h(
    'script',
    { type: 'application/ld+json' },
    JSON.stringify(data, null, 2).replace(/</g, '\\u003c'),
  );

/** A stable, URL-safe id from arbitrary text (for in-page anchors). */
export const slug = (text) =>
  String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
