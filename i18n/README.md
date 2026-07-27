---
uid: cogitave.web.i18n
title: i18n — localization conventions
description: Localization conventions for the web shell - how marketing locales are routed as subdirectories with the default locale unprefixed, why the site never redirects on language, and how a new locale is added as content rather than routing work.
type: reference
owner: cogitave/web
lastReviewed: 2026-07-26
products: [cogitave]
roles: [content-developer, developer]
level: beginner
---

# i18n — localization conventions

> [!IMPORTANT]
> The estate is **English-only** for code, docs, and identifiers
> ([AGENTS.md](../../../AGENTS.md) rule 1). That governs the *repository*: file
> names, identifiers, schemas, comments, commits and every document in this tree
> stay English regardless of how many locales ship. This folder is about end-user
> **marketing** locales, which are a product decision — taken in
> [ADR-0003](../docs/decisions/0003-locale-routing.md) for `en` and `tr`.

## Routing

Fixed by [ADR-0003](../docs/decisions/0003-locale-routing.md); that ADR is the
authority and carries the reasoning, the trade-off and the sources. The short
form:

- **One URL per page.** `/` and `/namzu/`. There is **no** `/tr/` or `/en/`
  segment and no locale route — every language is inside the same document.
- **`primaryLocale: tr`**, `locales: [tr, en]` (see
  [`site.config.yaml`](../site.config.yaml) `i18n`). Turkish paints first and is
  the document's `lang`; each other locale's region carries its own `lang`
  (WCAG 2.2 SC 3.1.2), so assistive tech and crawlers both read it correctly.
- **The switcher toggles, it does not navigate.** Buttons, not links: no request,
  no URL change, no history entry. The choice is stored and restored next visit.
- **We never guess a language.** No `Accept-Language`, no `navigator.language`,
  no geolocation, no redirect. Absent an explicit choice, the primary locale
  stays.
- **No `hreflang`, and canonical is computed.** `hreflang` describes alternate
  URLs and there are none; an authored canonical could only drift from the single
  real URL, so the build derives it.

> [!NOTE]
> The cost of this is one `<title>` and one meta description per page, so the
> page targets one language in search even though both are crawlable. That is
> accepted deliberately — see the ADR's "Revisit when". Because content stays
> locale-keyed siblings sharing a UID, moving to per-locale URLs later is a
> config and routing change, not a content rewrite.

## Conventions

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
