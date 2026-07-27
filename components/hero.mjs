/**
 * hero - the opening statement.
 *
 * The headline types itself through `phrases`. The phrases are CONTENT, not
 * decoration: under prefers-reduced-motion the first phrase renders statically
 * and the rest are still in the DOM for assistive tech, so the motion never
 * carries meaning the text does not (a11y/README, WCAG 2.2 2.3.3).
 */

import { h, esc, join } from '../tools/lib/html.mjs';

export const id = 'hero';

export const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['phrases'],
  properties: {
    eyebrow: { type: 'string' },
    ariaLabel: { type: 'string', description: 'Accessible name for the h1, since its visible text animates.' },
    phrases: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1 },
      description: 'Typed in sequence. The first is what renders without JS and under reduced motion.',
    },
  },
};

export const css = `
.hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-stack-sm);
  min-height: 46vh;
  padding-block: var(--space-section);
}
.hero-eyebrow {
  font-family: var(--text-code-font-family);
  font-size: var(--font-size-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.hero-line {
  font-family: var(--text-code-font-family);
  font-size: clamp(var(--font-size-xl), 4.2vw, var(--font-size-4xl));
  font-weight: var(--font-weight-regular);
  line-height: var(--font-lineHeight-snug);
  color: var(--color-text);
  margin: 0;
  text-wrap: balance;
}
.hero-prompt { color: var(--color-brand-accent); }
.hero-cursor {
  display: inline-block;
  width: 0.6ch;
  height: 1.1em;
  translate: 0 0.18em;
  background: var(--color-brand-accent);
  animation: hero-blink 1.1s steps(2, start) infinite;
}
@keyframes hero-blink { to { visibility: hidden; } }
@media (prefers-reduced-motion: reduce) {
  .hero-cursor { animation: none; }
}
`;

/**
 * Typewriter. Vanilla Web APIs only - no animation library (ADR-0003).
 * Bails out entirely under reduced motion, leaving the server-rendered phrase.
 */
export const js = `
for (const el of document.querySelectorAll('[data-hero-type]')) {
  const phrases = JSON.parse(el.dataset.heroType);
  const out = el.querySelector('[data-hero-text]');
  if (!phrases.length || !out) continue;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) continue;

  let phrase = 0, char = 0, deleting = false;
  const tick = () => {
    const current = phrases[phrase];
    if (!deleting) {
      out.textContent = current.slice(0, ++char);
      if (char === current.length) { deleting = true; return setTimeout(tick, 2200); }
      return setTimeout(tick, 42 + Math.random() * 48);
    }
    out.textContent = current.slice(0, --char);
    if (char === 0) { deleting = false; phrase = (phrase + 1) % phrases.length; return setTimeout(tick, 420); }
    setTimeout(tick, 22);
  };
  setTimeout(tick, 900);
}
`;

export function render(data) {
  const [first] = data.phrases;

  return h(
    'section',
    { class: 'hero' },
    data.eyebrow && h('p', { class: 'hero-eyebrow' }, esc(data.eyebrow)),
    h(
      'h1',
      {
        class: 'hero-line',
        'aria-label': data.ariaLabel || undefined,
        'data-hero-type': JSON.stringify(data.phrases),
      },
      join(
        h('span', { class: 'hero-prompt', 'aria-hidden': 'true' }, '&gt;&nbsp;'),
        // Server-rendered first phrase: the page reads correctly with JS off,
        // with JS failed, and under reduced motion.
        h('span', { 'data-hero-text': '' }, esc(first)),
        h('span', { class: 'hero-cursor', 'aria-hidden': 'true' }),
      ),
    ),
  );
}
