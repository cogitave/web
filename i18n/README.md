---
uid: cogitave.web.i18n
title: i18n — localization conventions
description: Localization conventions for the web shell. The site is English-only today per the org English-only rule, but the content-as-data model and routing are locale-ready so adding a locale later is additive, not a rewrite.
type: reference
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [content-developer, developer]
level: beginner
---

# i18n — localization conventions

> [!IMPORTANT]
> The estate is **English-only** for code, docs, and identifiers
> ([AGENTS.md](../../../AGENTS.md) rule 1). That governs the *repository*. This
> folder is about end-user **marketing** locales, which are a future product
> decision — the shell is built locale-ready so that decision is additive.

## Conventions

- **`defaultLocale: en`**, `locales: [en]` today (see
  [`site.config.yaml`](../site.config.yaml) `i18n`).
- **Sub-path strategy** when locales > 1: `/<locale>/...` (e.g. `/de/yuva-2`).
  Each localized route gets its own canonical + `hreflang` alternates.
- **Content is locale-keyed, not duplicated structure.** A page document carries
  `locale`; translations are sibling documents sharing the **same UID** with a
  different `locale`. Because content is data (not HTML), translation never forks
  layout.
- **Locale-safe tokens.** Design tokens are locale-agnostic; only `font.family`
  may extend for non-Latin scripts.
- **No-loc terms.** Brand/product names (`Cogitave`, `yuva`, `namzu`, `MCP`) are
  never translated.

Adding a locale = add locale-keyed content documents + extend `i18n.locales`. No
shell change.
