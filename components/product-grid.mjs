/**
 * product-grid - the core products, each with one headline statistic.
 *
 * The honesty rule is enforced here, in code, not in review: a `stat` must
 * either carry an `evidence` link or be explicitly flagged `qualitative`. A bare
 * comparative number - the exact thing yuva/docs/BENCHMARKS.md section 6
 * forbids in marketing - cannot reach the page, because the build throws.
 */

import { h, esc, join } from '../tools/lib/html.mjs';

export const id = 'product-grid';

export const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['products'],
  properties: {
    label: { type: 'string' },
    products: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'body'],
        properties: {
          id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$' },
          category: { type: 'string' },
          name: { type: 'string', minLength: 1 },
          slogan: { type: 'string' },
          body: { type: 'string', minLength: 1 },
          tag: { type: 'string' },
          features: { type: 'array', items: { type: 'string' } },
          stat: {
            type: 'object',
            additionalProperties: false,
            required: ['value', 'label'],
            properties: {
              value: { type: 'string' },
              label: { type: 'string' },
              qualitative: {
                type: 'boolean',
                description:
                  'Set only when the value is a figure of speech rather than a measurement. A qualitative stat needs no evidence; a quantitative one does.',
              },
              evidence: {
                type: 'object',
                additionalProperties: false,
                required: ['href', 'label'],
                properties: {
                  href: { type: 'string' },
                  label: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const css = `
.products { padding-block: var(--space-section); }
.products-label {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--space-stack-sm);
}
.products-grid {
  display: grid;
  gap: var(--dimension-space-5);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
}
.product {
  display: flex;
  flex-direction: column;
  gap: var(--dimension-space-3);
  padding: var(--dimension-space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
}
.product-category {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.product-name {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--font-lineHeight-tight);
  margin: 0;
}
.product-slogan { color: var(--color-brand-accent); font-size: var(--font-size-sm); margin: 0; }
.product-body { color: var(--color-text-muted); margin: 0; }
.product-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-block: var(--dimension-space-3);
  border-block: 1px solid var(--color-border);
}
.product-stat-value {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  line-height: 1;
}
.product-stat-label {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-wrap: pretty;
}
.product-stat-evidence { font-size: var(--font-size-xs); color: var(--color-link); }
.product-features { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--dimension-space-2); }
.product-features li {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  padding-inline-start: var(--dimension-space-4);
  position: relative;
}
.product-features li::before {
  content: "";
  position: absolute;
  inset-inline-start: 0;
  top: 0.55em;
  width: 5px;
  height: 1px;
  background: var(--color-brand-accent);
}
.product-tag {
  margin-block-start: auto;
  align-self: flex-start;
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  padding: 2px var(--dimension-space-2);
}
`;

function renderStat(stat, product) {
  if (!stat) return '';

  if (!stat.evidence && !stat.qualitative) {
    throw new Error(
      `product-grid: the "${product.name}" stat "${stat.value}" has no evidence link. ` +
        'Attach `evidence` pointing at the measurement, or mark it `qualitative: true` if it is a figure of speech. ' +
        'A bare quantitative marketing claim is refused at build time (see corp/marketing/governance/claims-and-review.md).',
    );
  }

  return h(
    'div',
    { class: 'product-stat' },
    h('b', { class: 'product-stat-value' }, esc(stat.value)),
    h('span', { class: 'product-stat-label' }, esc(stat.label)),
    stat.evidence &&
      h(
        'a',
        { class: 'product-stat-evidence', href: stat.evidence.href, rel: 'noopener' },
        esc(stat.evidence.label),
      ),
  );
}

export function render(data) {
  const cards = data.products.map((product) =>
    h(
      'article',
      { class: 'product', id: `product-${product.id}` },
      product.category && h('span', { class: 'product-category' }, esc(product.category)),
      h('h3', { class: 'product-name' }, esc(product.name)),
      product.slogan && h('p', { class: 'product-slogan' }, esc(product.slogan)),
      h('p', { class: 'product-body' }, esc(product.body)),
      renderStat(product.stat, product),
      product.features?.length &&
        h('ul', { class: 'product-features' }, join(product.features.map((f) => h('li', {}, esc(f))))),
      product.tag && h('span', { class: 'product-tag' }, esc(product.tag)),
    ),
  );

  return h(
    'section',
    { class: 'products' },
    data.label && h('h2', { class: 'products-label' }, esc(data.label)),
    h('div', { class: 'products-grid' }, join(cards)),
  );
}
