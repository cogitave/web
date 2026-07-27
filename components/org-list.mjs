/**
 * org-list - the GitHub organisations and what each one holds.
 *
 * Mirrors cogitave/bootstrap/estate.yaml `orgs[]`. If the estate gains or
 * renames an org, this block is the marketing-side projection that has to move
 * with it.
 */

import { h, esc, join } from '../tools/lib/html.mjs';

export const id = 'org-list';

export const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['orgs'],
  properties: {
    label: { type: 'string' },
    orgs: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'body'],
        properties: {
          name: { type: 'string', minLength: 1 },
          body: { type: 'string', minLength: 1 },
          href: { type: 'string' },
        },
      },
    },
  },
};

export const css = `
.orgs { padding-block: var(--space-section); }
.orgs-label {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--space-stack-sm);
}
.orgs-list {
  display: grid;
  gap: var(--dimension-space-4);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  margin: 0;
}
.orgs-list div { display: flex; flex-direction: column; gap: 2px; }
.orgs-name {
  font-family: var(--text-code-font-family);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}
.orgs-body { font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0; }
`;

export function render(data) {
  const items = data.orgs.map((org) =>
    h(
      'div',
      {},
      h(
        'dt',
        { class: 'orgs-name' },
        org.href ? h('a', { href: org.href }, esc(org.name)) : esc(org.name),
      ),
      h('dd', { class: 'orgs-body' }, esc(org.body)),
    ),
  );

  return h(
    'section',
    { class: 'orgs' },
    data.label && h('h2', { class: 'orgs-label' }, esc(data.label)),
    h('dl', { class: 'orgs-list' }, join(items)),
  );
}
