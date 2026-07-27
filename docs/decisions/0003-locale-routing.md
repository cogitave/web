---
uid: cogitave.web.adr.0003
title: ADR-0003 — One URL per page; every language ships inside the document
description: Decision to serve a single endpoint per page with all locales in the same document, switched client-side and never redirected, accepting single-language search targeting in exchange for URLs that cannot leak.
type: explanation
owner: cogitave/web
lastReviewed: 2026-07-26
products: [cogitave]
roles: [developer, content-developer]
level: intermediate
status: accepted
---

# ADR-0003 — One URL per page; every language ships inside the document

- **Status:** accepted
- **Date:** 2026-07-26
- **Deciders:** cogitave/web, cogitave/marketing

> **Revision note.** An earlier draft of this ADR chose subdirectory routing with
> as-needed prefixing (`/` English, `/tr/` Turkish). That draft optimised for
> multi-language organic search, which is not what this property competes on, and
> it split one page into two endpoints — the outcome the business explicitly did
> not want. This version supersedes it. The trade it gives up is recorded in
> "Consequences" so the reversal is an informed one, not a forgotten one.

## Context and Problem Statement

The property serves Turkish and English and should stay open to more languages.
The question is what a localized page's **URL** is.

The observation that started this: modern sites frequently show no language
segment at all. That observation is correct, and the reason splits cleanly:

- Sites that **compete for organic search in several languages** (Apple, Stripe,
  Booking) almost always give each language its own URL, because the URL is what
  ranks. A Turkish query should meet a Turkish `<title>`.
- Sites that **do not** — company sites, product UIs, bilingual firms serving one
  country — commonly serve one URL and switch language in the page.

Cogitave is the second case today. The primary market is Turkey; the
English-reading audience arrives through GitHub and the OSS surface rather than
by searching English marketing terms. The customer presentation this property
inherited was *already* bilingual inside a single document.

## Decision Drivers

- **One page, one address.** A page a person shares should be the page they saw,
  in the language they choose, without a segment to strip or to explain.
- **No redirect and no negotiation.** The URL requested is the URL served.
- **Nothing hidden from crawlers.** Whatever the URL scheme, all language content
  must be in the response — never fetched later, never chosen by header.
- **Reversibility.** The decision must not be baked into the content model.
- **Static-first.** The property prerenders; locale must not become a per-request
  decision that forces `Vary` and defeats CDN caching.

## Considered Options

1. **One URL per page, every locale in the document**, switched client-side.
2. **Subdirectory per locale** (`/`, `/tr/`) with as-needed prefixing.
3. **One URL, language chosen by `Accept-Language`/IP/cookie** at request time.
4. **One URL, other languages fetched by JavaScript** on demand.

## Decision Outcome

Chosen: **option 1.**

- **A page's URL is its route.** `/` and `/namzu/`. There is no `/tr/` or `/en/`
  segment and no locale route.
- **Every locale is in the response.** Each is wrapped in a region carrying its
  own `lang` (WCAG 2.2 SC 3.1.2, Language of Parts), so a screen reader switches
  voice correctly and a crawler reads every language.
- **The switcher toggles; it does not navigate.** Buttons, not links: no request,
  no URL change, no history entry. The choice is stored in `localStorage` and
  restored on the next visit.
- **We never guess.** No `Accept-Language` sniffing, no `navigator.language`, no
  geolocation. Absent an explicit stored choice, the primary locale stays.
- **`primaryLocale: tr`** — Turkish paints first and is the document's `lang`.
- **No `hreflang`.** It annotates a set of alternate URLs; there is one URL per
  page, so emitting it would assert routes that do not exist.
- **Canonical is computed, never authored.** One URL per page means an authored
  canonical can only drift; the build derives it from origin plus route.

Option 3 is the one to avoid: Google's multi-regional guidance explicitly warns
against redirecting between language versions and against IP analysis, and a
cookie-chosen language at a fixed URL needs `Vary: Cookie` or a CDN will serve
the wrong language from cache. Option 4 hides everything but the default from
crawlers. Option 2 is the right answer for a different business than this one —
see below.

## Consequences

- Good: one address per page. Nothing to strip, redirect, or explain; none of the
  as-needed prefixing failure modes (prefixed-to-unprefixed redirect chains,
  `x-default` pointing at the wrong URL) can occur, because there is no prefix.
- Good: no `hreflang` to maintain — the single most commonly broken part of
  international SEO.
- Good: static output, one artifact per page, no `Vary`, no mis-cached language.
- **Cost, and it is the real one: one `<title>` and one meta description per
  page.** The English copy is in the document and is crawlable, but the page can
  only *target* one language in search. We are not competing for English-language
  organic search on this property; the day that changes, this becomes the wrong
  decision.
- Cost: page weight carries every language. Acceptable at two locales on a static
  page; revisit before adding a third.
- **Reversible by construction.** Content stays locale-keyed sibling documents
  sharing one UID, exactly as it would under option 2. Switching to per-locale
  URLs is a change to `i18n.strategy` and the build's routing, not a content
  rewrite.

## Revisit when

- English-language content marketing becomes a channel we measure.
- A third locale lands, making the weight-per-page trade material.
- Per-language analytics or campaign targeting is needed at the URL level.

## More Information

- Google, managing multi-regional and multilingual sites (URL structures; avoid
  automatic language redirects; do not use IP analysis):
  <https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites>
- WCAG 2.2 SC 3.1.2, Language of Parts:
  <https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html>
- Locale detection strategies, including the `Vary: Cookie` caching caveat:
  <https://simplelocalize.io/blog/posts/locale-detection-strategies/>
