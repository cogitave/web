---
uid: cogitave.web.design
title: design — tokens + brand (design-system single source)
description: The design-system single source for the web shell. Tokens are authored in the W3C DTCG format (primitives plus a semantic alias layer) and transformed to CSS variables at build; components consume semantic tokens only.
type: reference
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [ui-designer, developer]
level: intermediate
---

# design — tokens + brand

[`tokens.json`](tokens.json) is the **single source of truth** for the design
system. It is authored in the **W3C Design Tokens Community Group (DTCG)**
format, whose first stable version landed in 2025.10.[^dtcg] We use the spec as
**reference** — the transform engine is ours (`namzu`/TS); the format is
parser-agnostic so the tokens stay portable across tools.[^dtcg]

## Two layers

1. **Primitives** — raw palette/scale: `color.*`, `dimension.*`, `font.*`,
   `motion.*`. Each token has `$type` + `$value` (DTCG: color objects with
   `colorSpace`/`components`/`hex`; dimensions/durations as `{value, unit}`).[^dtcg]
2. **Semantic** — `semantic.*` aliases (curly-brace references like
   `{color.brand.primary}`) that components actually consume:
   `color.background`, `color.text`, `color.action`, `color.focus-ring`,
   `space.section`, `radius.card`, `text.heading`, …

> [!IMPORTANT]
> Components and content reference **semantic** tokens only. Never hard-code a hex
> or px, and never reach past `semantic.*` into a primitive. Re-theming (e.g.
> dark mode) = re-pointing the semantic aliases, nothing else.

## Build & usage

- The build transforms `tokens.json` → CSS custom properties (and a JSON map for
  tooling); see `build.designTokens` in [`site.config.yaml`](../site.config.yaml).
- A CI **tokens** gate fails any component that uses a literal value instead of a
  token.
- Naming is keyword-based and flat, per the
  [naming convention](../../standards/docs/standards/documentation.md)
  ethos; no redundant prefixes.

## Brand

- Voice: agent-native, from-scratch, standards-first (see the
  [org profile](../../.github/profile/README.md)).
- Primary = Cogitave indigo (`color.brand.primary`); accent = cyan
  (`color.brand.accent`) for agent/edge signal.
- Contrast: body text pairs (`color.text` on `color.background`) target WCAG AA+
  (see [`a11y/`](../a11y/)).

[^dtcg]: W3C Design Tokens Community Group — first stable specification (2025-10-28); `$type`/`$value`, color/dimension value shapes, alias syntax. <https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/>, <https://www.designtokens.org/tr/drafts/format/>
