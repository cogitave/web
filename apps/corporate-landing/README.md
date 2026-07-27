---
uid: cogitave.web.apps.corporate-landing
title: corporate-landing — the cogitave.com homepage
description: The homepage app - what it renders, where its prices and claims come from, what was deliberately left behind when it was ported into the estate, and what still blocks it from going live.
type: reference
owner: cogitave/web
lastReviewed: 2026-07-26
products: [cogitave]
roles: [developer, content-developer, marketing-manager]
level: beginner
---

# corporate-landing — the cogitave.com homepage

Route `/` (English) and `/tr/` (Turkish), property `marketing-site`. Seven
semantic blocks: hero, service catalog, product grid, research index, the
organisation list, the platform strip and the closing call to action.

## Where its content comes from

| What | Source | Why not in the page |
|---|---|---|
| Copy, per locale | [`content/index.page.yaml`](content/index.page.yaml), [`content/index.tr.page.yaml`](content/index.tr.page.yaml) | Siblings share one UID: a translation is the same page in another language, never a fork of the structure. |
| Prices | [`corp/gtm/pricing/services-catalog.yaml`](../../../corp/gtm/pricing/services-catalog.yaml) | A number lives in a registry, not in prose. An offer id the registry does not carry fails the build. |
| Product statistics | The linked measurement (e.g. [yuva's benchmarks](https://github.com/cogitave/yuva/blob/main/docs/BENCHMARKS.md)) | A quantitative claim without an `evidence` link fails the build unless flagged `qualitative`. |
| Visual values | [`cogitave/design/tokens.json`](../../../design/tokens.json) | Components reference semantic tokens; no component hard-codes a colour or a size. |

## What was deliberately left behind

This app was ported from a standalone Vite site that lived outside the estate.
These things did not come with it, on purpose:

- **The payment modal.** It captured card number, CVV and expiry in the page's
  own DOM, and its submit handler did nothing but animate a label — no PSP call,
  no charge. Removed; checkout moves to its own property. See
  [ADR-0004](../../docs/decisions/0004-payments-off-the-marketing-surface.md).
- **GSAP and Vite.** Replaced by the shell's own build and Web Animations /
  CSS, per ADR-0003 in standards. Client JavaScript went from a bundled
  animation library to roughly 2.5 KB.
- **Google Fonts.** The site preconnected to `fonts.googleapis.com` and
  `fonts.gstatic.com`, handing the visitor's IP to a third party before any
  consent decision. The brand faces are now self-hosted; see
  [`assets/fonts/README.md`](../../assets/fonts/README.md).
- **The "99.9% SLA" figure.** Nothing in the estate commits to an availability
  target — `corp/support/data/slas.yaml` defines response and mitigation times
  only. Withheld until a real availability SLA exists.
- **The SAP mark, and the "technology partners" label.** A partner designation is
  earned status governed by [corp/alliances](../../../corp/alliances/README.md).
  The strip now says what is actually true — these are the clouds our multi-cloud
  IaC targets — and carries only marks that statement covers.
- **Forty-odd screenshot and debug scripts** (`arch-shot.mjs`, `debug-pay.mjs`,
  `sunum-slides.mjs`, …) and a committed `dist/`. Development scaffolding, not
  source.

## Open items before `status: live`

The manifest is deliberately `staged`, not `live`:

1. **`pay.cogitave.com` does not exist yet.** The closing block links to it. The
   destination has to answer before this page ships, or the link is a dead end.
2. **The research index links nowhere.** Four articles are listed with no `href`
   because none is published. They render as text rather than dead links, but the
   section promises writing that does not exist yet.
