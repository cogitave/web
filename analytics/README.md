---
uid: cogitave.web.analytics
title: analytics — privacy-respecting + consent
description: Privacy-respecting analytics for the web shell - cookieless aggregate measurement by default (no banner needed), consent-gated marketing category, equal-prominence reject, and first-party server-side ingest with no PII.
type: reference
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [developer, content-developer]
level: intermediate
---

# analytics — privacy-respecting + consent

Measurement here is **privacy-first by construction**. The model lives in
[`consent.config.json`](consent.config.json).

## Principles (2026)

- **Default-deny.** Nothing that can identify a visitor runs before opt-in.[^priv]
- **Cookieless + aggregate baseline.** The `analytics` category uses no cookies,
  no cross-site identifiers, and no PII, so it is not joinable to an individual
  and runs **without a consent banner**. Only the `marketing` category (campaign
  attribution / remarketing) requires explicit consent.[^priv]
- **Equal prominence.** Reject must be as easy as accept (identical size/contrast/
  position) — a 2026 compliance baseline.[^consent]
- **Honor signals.** Respect Global Privacy Control and Do Not Track.
- **Server-side, first-party ingest.** Events go to a first-party endpoint
  (`ANALYTICS_INGEST_URL`); this recovers signal lost to ad-blockers **without**
  fingerprinting users.[^priv]
- **Declared events only.** An app may emit only the events listed in its
  `app.manifest.json` `analytics.events`; no PII fields (see `doNotCollect`).

## Why not cookie-based product analytics?

Cookie/identifier-based tracking forces a banner, degrades performance and trust,
and 67% of consent setups already fail compliance audits.[^consent] Aggregate,
cookieless measurement gives us the marketing signal we need (page/section
engagement, conversions) while staying certification-grade and EAA-friendly.

[^priv]: Cookieless / privacy-first analytics 2026 — first-party + server-side, modeled aggregates, default-deny. <https://www.digitalapplied.com/blog/data-privacy-marketing-2026-cookieless-strategy>, <https://matomo.org/blog/2026/01/privacy-regulations-changes-2026-analytics/>
[^consent]: Consent compliance 2026 — equal prominence; majority of setups non-compliant. <https://secureprivacy.ai/blog/global-cookie-consent-trends-2026>, <https://www.abstraktmg.com/cookie-consent-compliance/>
