/**
 * deck-slide - one slide of a presentation, as content.
 *
 * A deck is a page whose blocks happen to be slides: each slide is a block, the
 * content model is the same typed data as any other page, and the deck reads as
 * a normal document with JavaScript off. Navigation is CSS scroll-snap plus a
 * keyboard handler, so paging works without a slide framework and the whole deck
 * is still one crawlable, quotable page.
 *
 * The honesty gate from product-grid applies here too, and this deck is where it
 * earns its keep: the source presentation cites McKinsey, Gartner, MIT, IBM,
 * GBTA, Stanford/MIT (QJE 2025), Harvard/Wharton (NBER 2025), Siemens and OWASP.
 * Every one of those numbers must keep its `source`; a statistic without one -
 * or without an explicit `qualitative` flag - fails the build.
 */

import { h, esc, join } from '../tools/lib/html.mjs';

export const id = 'deck-slide';

const stat = {
  type: 'object',
  additionalProperties: false,
  required: ['value', 'label'],
  properties: {
    value: { type: 'string', minLength: 1 },
    label: { type: 'string', minLength: 1 },
    body: { type: 'string' },
    qualitative: {
      type: 'boolean',
      description: 'Set only when the value is a figure of speech, a target, or a design property rather than a measurement.',
    },
    source: {
      type: 'object',
      additionalProperties: false,
      required: ['cite'],
      properties: {
        cite: { type: 'string', minLength: 2, description: 'Who measured it, and where. Rendered next to the figure.' },
        href: { type: 'string' },
      },
    },
  },
};

export const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['kicker', 'title'],
  properties: {
    kicker: { type: 'string', minLength: 1, description: 'The section label above the title.' },
    title: { type: 'string', minLength: 2 },
    lead: { type: 'string' },
    variant: { enum: ['cover', 'standard', 'close'] },
    stats: { type: 'array', items: stat },
    cards: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'body'],
        properties: {
          marker: { type: 'string', description: 'The 01/A/SAP style index or label on the card.' },
          title: { type: 'string', minLength: 1 },
          body: { type: 'string', minLength: 1 },
          tag: { type: 'string' },
        },
      },
    },
    flow: {
      type: 'array',
      description: 'An ordered pipeline. Rendered as a list with separators, so the order survives without the arrows being read out.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label'],
        properties: {
          label: { type: 'string', minLength: 1 },
          detail: { type: 'string' },
        },
      },
    },
    contact: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label'],
        properties: {
          label: { type: 'string', minLength: 1 },
          href: { type: 'string' },
        },
      },
    },
  },
};

export const css = `
.deck { counter-reset: slide; }
.slide {
  min-height: 100svh;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--dimension-space-5);
  padding-block: var(--dimension-space-16);
  border-top: 1px solid var(--color-border);
}
.slide:first-child { border-top: 0; }
.slide-index {
  counter-increment: slide;
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
.slide-index::before { content: counter(slide, decimal-leading-zero) " / "; }
.slide-kicker {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-brand-accent);
  margin: 0;
}
.slide-title {
  font-size: clamp(var(--font-size-2xl), 5vw, var(--font-size-5xl));
  font-weight: var(--font-weight-semibold);
  line-height: var(--font-lineHeight-tight);
  letter-spacing: -0.015em;
  margin: 0;
  max-width: 18ch;
  text-wrap: balance;
}
.slide--cover .slide-title, .slide--close .slide-title { max-width: 22ch; }
.slide-lead {
  color: var(--color-text-muted);
  max-width: 62ch;
  margin: 0;
  text-wrap: pretty;
}
.slide-stats {
  display: grid;
  gap: var(--dimension-space-5);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  margin: 0;
}
.slide-stat { display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--color-border-strong); padding-top: var(--dimension-space-3); }
.slide-stat-value {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  letter-spacing: -0.02em;
}
.slide-stat-label { font-weight: var(--font-weight-medium); }
.slide-stat-body, .slide-stat-source { font-size: var(--font-size-sm); color: var(--color-text-muted); text-wrap: pretty; }
.slide-stat-source { font-family: var(--text-code-font-family); font-size: var(--font-size-xs); }
.slide-cards {
  display: grid;
  gap: var(--dimension-space-5);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  margin: 0;
}
.slide-card { display: flex; flex-direction: column; gap: var(--dimension-space-2); }
.slide-card-marker {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.1em;
  color: var(--color-brand-accent);
}
.slide-card-title { font-weight: var(--font-weight-medium); margin: 0; }
.slide-card-body { font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0; text-wrap: pretty; }
.slide-card-tag {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.slide-flow { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--dimension-space-4); }
.slide-flow li {
  flex: 1 1 12rem;
  border-inline-start: 2px solid var(--color-brand-accent);
  padding-inline-start: var(--dimension-space-3);
}
.slide-flow-label { font-family: var(--text-code-font-family); font-size: var(--font-size-sm); display: block; }
.slide-flow-detail { font-size: var(--font-size-xs); color: var(--color-text-muted); }
.slide-contact { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--dimension-space-5); font-family: var(--text-code-font-family); font-size: var(--font-size-sm); }
@media (min-width: 60rem) {
  .deck-scroll { scroll-snap-type: y proximity; }
}
`;

/**
 * Keyboard paging. Progressive: the deck is a scrollable document first, and
 * this only adds arrow/page keys on top. No slide framework, no CDN script.
 */
export const js = `
{
  const slides = [...document.querySelectorAll('.slide')];
  if (slides.length > 1) {
    const go = (delta) => {
      const middle = innerHeight / 2;
      const current = slides.findIndex((s) => s.getBoundingClientRect().bottom > middle);
      const next = slides[Math.min(Math.max(current + delta, 0), slides.length - 1)];
      next?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    addEventListener('keydown', (e) => {
      // Never hijack keys while the visitor is typing or using a control.
      if (e.target.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
    });
  }
}
`;

function renderStat(item, context) {
  if (!item.source && !item.qualitative) {
    throw new Error(
      `deck-slide: the statistic "${item.value} ${item.label}" on slide "${context}" has no source. ` +
        'Attach `source.cite` (who measured it), or mark it `qualitative: true` if it is a design property rather than a measurement. ' +
        'This deck headlines published research; an unsourced figure beside sourced ones is the one that discredits the rest.',
    );
  }

  const cite = item.source
    ? h(
        'span',
        { class: 'slide-stat-source' },
        item.source.href
          ? h('a', { href: item.source.href, rel: 'noopener' }, esc(item.source.cite))
          : esc(item.source.cite),
      )
    : '';

  return h(
    'div',
    { class: 'slide-stat' },
    h('b', { class: 'slide-stat-value' }, esc(item.value)),
    h('span', { class: 'slide-stat-label' }, esc(item.label)),
    item.body && h('span', { class: 'slide-stat-body' }, esc(item.body)),
    cite,
  );
}

export function render(data) {
  const variant = data.variant ?? 'standard';
  // The cover slide carries the page's h1; every other slide is an h2 under it.
  // A deck with no h1 is a document with no title as far as assistive tech and
  // crawlers are concerned, which is what the a11y gate caught here.
  const titleTag = variant === 'cover' ? 'h1' : 'h2';

  return h(
    'section',
    { class: `slide slide--${variant}`, 'aria-label': data.kicker },
    h('p', { class: 'slide-index' }, esc(data.kicker)),
    h(titleTag, { class: 'slide-title' }, esc(data.title)),
    data.lead && h('p', { class: 'slide-lead' }, esc(data.lead)),
    data.stats?.length &&
      h('div', { class: 'slide-stats' }, join(data.stats.map((s) => renderStat(s, data.kicker)))),
    data.cards?.length &&
      h(
        'div',
        { class: 'slide-cards' },
        join(
          data.cards.map((card) =>
            h(
              'article',
              { class: 'slide-card' },
              card.marker && h('span', { class: 'slide-card-marker' }, esc(card.marker)),
              h('h3', { class: 'slide-card-title' }, esc(card.title)),
              h('p', { class: 'slide-card-body' }, esc(card.body)),
              card.tag && h('span', { class: 'slide-card-tag' }, esc(card.tag)),
            ),
          ),
        ),
      ),
    data.flow?.length &&
      h(
        'ol',
        { class: 'slide-flow' },
        join(
          data.flow.map((step) =>
            h(
              'li',
              {},
              h('span', { class: 'slide-flow-label' }, esc(step.label)),
              step.detail && h('span', { class: 'slide-flow-detail' }, esc(step.detail)),
            ),
          ),
        ),
      ),
    data.contact?.length &&
      h(
        'ul',
        { class: 'slide-contact' },
        join(
          data.contact.map((item) =>
            h('li', {}, item.href ? h('a', { href: item.href }, esc(item.label)) : esc(item.label)),
          ),
        ),
      ),
  );
}
