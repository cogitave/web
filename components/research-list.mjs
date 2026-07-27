/**
 * research-list - the writing index.
 *
 * Dates are authored as `YYYY-MM` and rendered through Intl in the page's own
 * locale, so a Turkish reader gets "Temmuz 2026" from the same data an English
 * reader gets "July 2026" from. The machine-readable value stays in <time
 * datetime>, which is what a crawler and an AI answer engine read.
 */

import { h, esc, join } from '../tools/lib/html.mjs';

export const id = 'research-list';

export const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['articles'],
  properties: {
    label: { type: 'string' },
    moreLabel: { type: 'string' },
    moreHref: { type: 'string' },
    articles: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'title'],
        properties: {
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
          tag: { type: 'string' },
          title: { type: 'string', minLength: 2 },
          excerpt: { type: 'string' },
          href: { type: 'string', description: 'Omit while the article is unpublished; the row then renders as text, not a dead link.' },
        },
      },
    },
  },
};

export const css = `
.research { padding-block: var(--space-section); }
.research-label {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--space-stack-sm);
}
.research-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-inline-md);
  align-items: baseline;
  padding-block: var(--dimension-space-5);
  border-top: 1px solid var(--color-border);
}
.research-row:last-child { border-bottom: 1px solid var(--color-border); }
.research-date, .research-tag {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}
.research-tag { letter-spacing: 0.1em; text-transform: uppercase; }
.research-title { font-size: var(--font-size-lg); font-weight: var(--font-weight-medium); margin: 0 0 4px; }
.research-title a { color: inherit; }
.research-excerpt { font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0; text-wrap: pretty; }
.research-more {
  display: inline-block;
  margin-top: var(--dimension-space-5);
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
@media (max-width: 40rem) {
  .research-row { grid-template-columns: 1fr; }
  .research-tag { order: -1; }
}
`;

const formatMonth = (value, locale) => {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
};

export function render(data, ctx) {
  const rows = data.articles.map((article) =>
    h(
      'article',
      { class: 'research-row' },
      h('time', { class: 'research-date', datetime: article.date }, esc(formatMonth(article.date, ctx.locale))),
      h(
        'div',
        {},
        h(
          'h3',
          { class: 'research-title' },
          article.href ? h('a', { href: article.href }, esc(article.title)) : esc(article.title),
        ),
        article.excerpt && h('p', { class: 'research-excerpt' }, esc(article.excerpt)),
      ),
      article.tag && h('span', { class: 'research-tag' }, esc(article.tag)),
    ),
  );

  return h(
    'section',
    { class: 'research' },
    data.label && h('h2', { class: 'research-label' }, esc(data.label)),
    join(rows),
    data.moreLabel &&
      (data.moreHref
        ? h('a', { class: 'research-more', href: data.moreHref }, esc(data.moreLabel))
        : h('p', { class: 'research-more' }, esc(data.moreLabel))),
  );
}
