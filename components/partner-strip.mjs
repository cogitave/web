/**
 * partner-strip - third-party marks shown on the marketing surface.
 *
 * Read this before adding a logo. A partner designation (an AWS/Microsoft/SAP
 * "Partner" badge) is EARNED status governed by corp/alliances, and showing
 * someone's mark under a label that implies a relationship we do not have is
 * both a false claim and a trademark problem. The `label` this block renders is
 * therefore content the author has to state deliberately - the component gives
 * it no default - and the site currently uses a factual one ("Deploys to")
 * rather than a relational one ("Technology partners").
 *
 * Each mark carries the owner's own name as its accessible name; we never
 * restyle or recolour a third-party logo.
 */

import { h, esc, join } from '../tools/lib/html.mjs';

export const id = 'partner-strip';

export const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'platforms'],
  properties: {
    label: {
      type: 'string',
      minLength: 2,
      description:
        'Required, deliberately. It states what the marks mean. A relational claim ("partners", "customers") needs sign-off from corp/alliances and corp/legal first.',
    },
    platforms: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, description: 'The owner\'s own name for the product. Becomes the accessible name.' },
          logo: { type: 'string', description: 'Path to the mark. Omit to render the name as text.' },
        },
      },
    },
  },
};

export const css = `
.platforms {
  display: flex;
  align-items: center;
  gap: var(--dimension-space-5);
  flex-wrap: wrap;
  padding-block: var(--dimension-space-6);
  border-top: 1px solid var(--color-border);
}
.platforms-label {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.platforms-mark { height: 20px; width: auto; opacity: 0.7; }
.platforms-text {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
`;

export function render(data) {
  const marks = data.platforms.map((platform) =>
    platform.logo
      ? h('img', {
          class: 'platforms-mark',
          src: platform.logo,
          alt: platform.name,
          loading: 'lazy',
          decoding: 'async',
        })
      : h('span', { class: 'platforms-text' }, esc(platform.name)),
  );

  return h(
    'section',
    { class: 'platforms', 'aria-label': data.label },
    h('span', { class: 'platforms-label' }, esc(data.label)),
    join(marks),
  );
}
