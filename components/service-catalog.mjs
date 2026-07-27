/**
 * service-catalog - the drill-down list of what we sell.
 *
 * The one rule that matters here: THIS COMPONENT NEVER RECEIVES A PRICE FROM
 * CONTENT. Each offer names an `id`; the build hands in the resolved pricing
 * registry (corp/gtm/pricing/services-catalog.yaml) and this component formats
 * the amount. A content author cannot publish a figure the registry does not
 * carry, and a registry change lands on the page without a content edit.
 *
 * Interaction is a native <details> per category: it drills down with zero JS,
 * keyboard support and screen-reader semantics come free, and there is no
 * height-animation machinery to keep in sync.
 */

import { h, esc, join } from '../tools/lib/html.mjs';

export const id = 'service-catalog';

export const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['categories'],
  properties: {
    label: { type: 'string' },
    source: { type: 'string', description: 'Path of the pricing registry this block projects. Informational; the build resolves the registry itself.' },
    quoteLabel: { type: 'string', description: 'Shown instead of an amount for offers priced per opportunity.' },
    contact: { type: 'string', description: 'Address a quote-only offer links to.' },
    categories: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'offers'],
        properties: {
          id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$' },
          title: { type: 'string', minLength: 2 },
          badge: { type: 'string' },
          offers: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'title'],
              properties: {
                id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$', description: 'MUST exist in the pricing registry. The build fails on an unknown id.' },
                title: { type: 'string', minLength: 2 },
                summary: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

export const css = `
.catalog { padding-block: var(--space-section); }
.catalog-label {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--space-stack-sm);
}
.catalog-category { border-top: 1px solid var(--color-border); }
.catalog-category:last-of-type { border-bottom: 1px solid var(--color-border); }
.catalog-summary {
  display: flex;
  align-items: center;
  gap: var(--space-inline-md);
  padding-block: var(--dimension-space-5);
  cursor: pointer;
  list-style: none;
  color: var(--color-text);
}
.catalog-summary::-webkit-details-marker { display: none; }
.catalog-summary:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: -2px;
}
.catalog-no {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  min-width: 2.5ch;
}
.catalog-title { flex: 1; font-size: var(--font-size-lg); }
.catalog-badge {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-brand-accent);
  border: 1px solid currentColor;
  border-radius: var(--radius-pill);
  padding: 0 var(--dimension-space-2);
  margin-inline-start: var(--dimension-space-2);
}
.catalog-chev {
  flex: none;
  color: var(--color-text-muted);
  transition: rotate var(--motion-duration-normal) var(--motion-easing-standard);
}
.catalog-category[open] .catalog-chev { rotate: 90deg; }
.catalog-offers { list-style: none; margin: 0; padding: 0 0 var(--dimension-space-4); }
.catalog-offer {
  display: flex;
  align-items: baseline;
  gap: var(--space-inline-md);
  padding: var(--dimension-space-3) 0 var(--dimension-space-3) var(--dimension-space-8);
  border-top: 1px solid var(--color-border);
  color: inherit;
  text-decoration: none;
}
.catalog-offer:hover .catalog-offer-name { color: var(--color-brand-accent); }
.catalog-offer:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: -2px; }
.catalog-offer-main { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.catalog-offer-name { font-weight: var(--font-weight-medium); }
.catalog-offer-summary { font-size: var(--font-size-sm); color: var(--color-text-muted); }
.catalog-price {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-sm);
  white-space: nowrap;
  color: var(--color-text);
}
.catalog-price[data-quote] { color: var(--color-text-muted); }
@media (max-width: 40rem) {
  .catalog-offer { padding-left: var(--dimension-space-4); flex-wrap: wrap; }
}
`;

const CHEVRON =
  '<svg class="catalog-chev" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
  '<path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Format a registry price for display. Amounts are grouped with the locale's own
 * separators, which is why the locale is threaded in rather than assumed.
 */
function formatPrice(pricing, currency, locale, labels) {
  if (pricing.model === 'quote') return { text: labels.quoteLabel, quote: true };

  const amount = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(pricing.amount);

  if (pricing.model === 'recurring') {
    const period = new Intl.NumberFormat(locale) && labels.periods[pricing.period];
    return { text: `${amount}${period}`, quote: false };
  }
  return { text: amount, quote: false };
}

// Period suffixes are UI chrome, not marketing copy, so they live with the
// component rather than in the content documents.
const PERIODS = {
  en: { month: '/mo', year: '/yr' },
  tr: { month: '/ay', year: '/yıl' },
};

export function render(data, ctx) {
  const { locale, pricing } = ctx;
  if (!pricing) throw new Error('service-catalog: the pricing registry was not provided to the renderer');

  const labels = {
    quoteLabel: data.quoteLabel || 'Talk to us',
    periods: PERIODS[locale] || PERIODS.en,
  };

  const categories = data.categories.map((category, index) => {
    const offers = category.offers.map((offer) => {
      const entry = pricing.offers.get(offer.id);
      if (!entry) {
        throw new Error(
          `service-catalog: offer "${offer.id}" is not in ${pricing.source}. ` +
            'Add it to the registry, or remove it from the page - a price is never authored in content.',
        );
      }

      const price = formatPrice(entry.pricing, pricing.currency, locale, labels);
      const href = price.quote && data.contact
        ? `mailto:${data.contact}?subject=${encodeURIComponent(offer.title)}`
        : undefined;

      return h(
        'li',
        {},
        h(
          href ? 'a' : 'div',
          { class: 'catalog-offer', href },
          h(
            'span',
            { class: 'catalog-offer-main' },
            h('span', { class: 'catalog-offer-name' }, esc(offer.title)),
            offer.summary && h('span', { class: 'catalog-offer-summary' }, esc(offer.summary)),
          ),
          h('span', { class: 'catalog-price', 'data-quote': price.quote || undefined }, esc(price.text)),
        ),
      );
    });

    return h(
      'details',
      { class: 'catalog-category', name: 'service-category' },
      h(
        'summary',
        { class: 'catalog-summary' },
        h('span', { class: 'catalog-no' }, String(index + 1).padStart(2, '0')),
        h(
          'span',
          { class: 'catalog-title' },
          esc(category.title),
          category.badge && h('em', { class: 'catalog-badge' }, esc(category.badge)),
        ),
        CHEVRON,
      ),
      h('ul', { class: 'catalog-offers' }, join(offers)),
    );
  });

  return h(
    'section',
    { class: 'catalog' },
    data.label && h('h2', { class: 'catalog-label' }, esc(data.label)),
    join(categories),
  );
}
