/**
 * cta - the closing call to action.
 *
 * The `secondary` slot is where the old "pay here" dock landed. It is a LINK to
 * the payments property and nothing more: no form, no card field, no amount.
 * See docs/decisions/0004-payments-off-the-marketing-surface.md - putting a
 * checkout back on this page is the thing that ADR exists to prevent.
 */

import { h, esc } from '../tools/lib/html.mjs';

export const id = 'cta';

const link = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'href'],
  properties: {
    label: { type: 'string', minLength: 1 },
    href: { type: 'string', minLength: 1 },
  },
};

export const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['headline'],
  properties: {
    headline: { type: 'string', minLength: 2 },
    body: { type: 'string' },
    cta: link,
    secondary: link,
  },
};

export const css = `
.cta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--dimension-space-4);
  padding-block: var(--space-section);
  border-top: 1px solid var(--color-border);
}
.cta-headline {
  font-size: clamp(var(--font-size-2xl), 3.2vw, var(--text-heading-font-size));
  font-weight: var(--font-weight-semibold);
  line-height: var(--font-lineHeight-snug);
  margin: 0;
  max-width: var(--dimension-size-container-sm);
  text-wrap: balance;
}
.cta-body { color: var(--color-text-muted); margin: 0; max-width: var(--dimension-size-container-sm); }
.cta-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--dimension-space-4); }
.cta-primary {
  display: inline-block;
  padding: var(--dimension-space-3) var(--dimension-space-6);
  background: var(--color-action);
  color: var(--color-action-foreground);
  border-radius: var(--radius-control);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
}
.cta-primary:hover { background: var(--color-brand-accent); }
.cta-secondary {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
.cta-secondary:hover { color: var(--color-text); }
.cta-primary:focus-visible, .cta-secondary:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
`;

export function render(data) {
  const actions = [
    data.cta &&
      h('a', { class: 'cta-primary', href: data.cta.href, 'data-event': 'cta_click' }, esc(data.cta.label)),
    data.secondary &&
      h(
        'a',
        { class: 'cta-secondary', href: data.secondary.href, 'data-event': 'cta_click' },
        esc(data.secondary.label),
      ),
  ].filter(Boolean);

  return h(
    'section',
    { class: 'cta' },
    h('h2', { class: 'cta-headline' }, esc(data.headline)),
    data.body && h('p', { class: 'cta-body' }, esc(data.body)),
    actions.length && h('div', { class: 'cta-actions' }, actions.join('')),
  );
}
