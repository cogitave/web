---
uid: cogitave.web.apps.template
title: _template — copy to start a new app
description: The starter app for the web shell. Copy this folder to apps/<your-app>/, edit the manifest, and replace the content-as-data stub. It is excluded from discovery and never deploys.
type: how-to
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [developer, content-developer]
level: beginner
---

# _template — copy to start a new app

This is the canonical starting point for a drop-in. **Copy the whole folder** to
`apps/<your-app>/`, then:

1. Edit [`app.manifest.json`](app.manifest.json) — set `id`, `kind`, `route`,
   `render.mode`, `components`, `seo`, `analytics`, `owner`, `status`. Change
   `noindex` to `false` and set a real `route` (the template uses `/_template`
   with `noindex: true`).
2. Replace [`content/index.page.yaml`](content/index.page.yaml) with your typed
   content-as-data; keep prose in `content/includes/*.md`.
3. Register the route in [`site.config.yaml`](../../site.config.yaml).

> [!IMPORTANT]
> `_template/` itself is excluded from discovery (`apps.discovery.exclude`) and
> from indexing (`robots.txt` disallows `/_template/`). It never ships.

Full steps: [`docs/adding-an-app.md`](../../docs/adding-an-app.md).
