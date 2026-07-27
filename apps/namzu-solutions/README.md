---
uid: cogitave.web.apps.namzu-solutions
title: namzu-solutions — the customer deck, as content
description: The 18-part namzu walkthrough served at /namzu and /tr/namzu - where it came from, why a presentation is modelled as a page, and what changed when it moved into the estate.
type: reference
owner: cogitave/web
lastReviewed: 2026-07-26
products: [cogitave, namzu]
roles: [developer, content-developer, marketing-manager]
level: beginner
---

# namzu-solutions — the customer deck, as content

Route `/namzu` (English) and `/tr/namzu` (Turkish). Eighteen slides covering the
opportunity, what namzu is, how it works, the use cases, a worked example,
security, transparency, the services around it, and how we work.

## Why a deck is a page

The source was a standalone 1,964-line HTML file with its own inline design
system, sitting in `public/` outside the app model. Modelled as content instead,
it gets the same properties as every other page: each slide is a block, the copy
is typed data, it is crawlable and quotable as one document, and it renders
correctly with JavaScript off. Paging is CSS scroll-snap plus arrow keys — a
`deck-slide` component, not a slide framework.

The original carried **Turkish and English side by side in every slide**. That is
why the split into locale siblings was clean rather than a translation project:
both languages already existed, and they now sit in `index.page.yaml` and
`index.tr.page.yaml` sharing one UID.

## What changed in the port

- **`anime.js` from a CDN is gone.** The deck pulled an animation library from
  `cdn.jsdelivr.net` at runtime — a third-party dependency and a supply-chain
  edge on a customer-facing page. Motion is now CSS.
- **Google Fonts is gone**, for the reason given in
  [`assets/fonts/README.md`](../../assets/fonts/README.md).
- **The bare "34× faster than Firecracker" became 11.1×, with its methodology.**
  The larger figure is real but compares *different guests* (yuva with no Linux
  to boot, against full Linux); `yuva/docs/BENCHMARKS.md` marks that caveat
  load-bearing and forbids quoting the number bare in marketing. The deck now
  carries the apples-to-apples axis-A figure — same byte-identical guest, same
  host — and links the benchmark.
- **"Up to 50× cost savings on routine work" was dropped.** It appeared on the
  closing slide with no source, on a deck whose own headline is "the numbers
  aren't ours; they're from research". Nothing in the estate substantiates it.
  Restore it with a citation, or leave it out.
- **Every other figure kept its citation.** McKinsey, Gartner, MIT, Deloitte,
  Asana, IBM, GBTA, Stanford & MIT (QJE 2025), Cui et al. (2024), Harvard &
  Wharton (NBER 2025), Siemens, OWASP. The build enforces this: a statistic
  without a `source` or an explicit `qualitative` flag fails.

## Open items

- The old URL `/namzu-otonom-ajan-cozumleri` (and its `.html` form) redirects
  here via `redirects` in [`site.config.yaml`](../../site.config.yaml). A host
  that supports real 301s should serve those stubs as 301s.
