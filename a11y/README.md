---
uid: cogitave.web.a11y
title: a11y — accessibility (WCAG 2.2 AA)
description: Accessibility conventions and CI gates for the web shell. Target is WCAG 2.2 Level AA, aligned with EN 301 549 and the European Accessibility Act, enforced as a blocking gate so every drop-in app ships accessible.
type: reference
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [ui-designer, developer, content-developer]
level: intermediate
---

# a11y — accessibility (WCAG 2.2 AA)

Accessibility is a **blocking gate**, not a review afterthought. Target: **WCAG
2.2 Level AA**, the conformance level that EN 301 549 / the European Accessibility
Act point to (EN 301 549 is being updated to reference WCAG 2.2).[^a11y]

## Conventions

- **Semantic HTML first.** Landmarks (`header`/`nav`/`main`/`footer`), one `h1`
  per page, ordered headings (matches the content block order).
- **Keyboard operable.** Everything reachable and operable by keyboard; logical
  focus order; no traps.
- **Visible focus.** Use `semantic.color.focus-ring` (WCAG 2.2 SC 2.4.13 Focus
  Appearance); never remove outlines without a replacement.
- **Contrast in tokens.** Token pairs meet AA (text 4.5:1, large text/UI 3:1); the
  semantic layer encodes accessible pairings so components can't drift.
- **Images need alt text.** Every content image carries alt text; complex images
  carry a long description (same rule as the docs `:::image` gate).
- **Motion.** Respect `prefers-reduced-motion`; `motion.*` tokens are suppressible.
- **Forms.** Programmatic labels, error identification, and instructions.
- **Targets.** Pointer targets meet WCAG 2.2 SC 2.5.8 (Target Size, minimum).

## CI gates

- Automated axe-class checks per route (contrast, roles, names, landmarks).
- Token-contrast check on the semantic pairs in
  [`design/tokens.json`](../../design/tokens.json).
- Alt-text presence on content images (blocking).

## Scope note

The EAA covers the **whole service lifecycle** (support docs, flows), not just
pages — so accessibility extends to linked docs on `learn.cogitave.com` too.[^a11y]

[^a11y]: WCAG 2.2 + European Accessibility Act / EN 301 549 alignment. <https://www.onetrust.com/blog/understanding-the-european-accessibility-act-and-wcag-22/>, <https://www.w3.org/WAI/standards-guidelines/wcag/>, <https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/>
