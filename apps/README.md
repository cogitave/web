---
uid: cogitave.web.apps
title: apps — the drop-in slot
description: Where apps, landing pages, and campaigns drop into the web shell. Each is a folder with a schema-validated app.manifest.json plus content-as-data; the shell discovers and routes them with no shell code changes.
type: reference
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [developer, content-developer]
level: beginner
---

# apps — the drop-in slot

Every app / landing page / campaign lives here as `apps/<slug>/`. This is **the
slot**: a folder + a validated manifest + content-as-data, nothing structural.

## Layout

```
apps/
├─ app.manifest.schema.json   # THE CONTRACT — every manifest validates against this (blocking CI gate)
├─ _template/                 # copy this to start a new app (excluded from discovery + deploy)
│  ├─ app.manifest.json
│  └─ content/index.page.yaml
└─ <your-app>/                # your drop-in
   ├─ app.manifest.json
   └─ content/…
```

## Rules

- A folder is an app **iff** it has a valid `app.manifest.json`. Discovery glob:
  `apps/*/app.manifest.json` (excludes `_template/`).
- `id` is kebab-case and immutable; `route` is unique across all apps.
- `property` must equal a `properties[].name` in
  [`cogitave/bootstrap/domains.yaml`](../../bootstrap/domains.yaml) (today: `marketing-site`).
- `kind`: `app` (multi-route) · `landing` (single page) · `campaign` (time-boxed,
  carries `schedule`).
- Apps consume **shared** [`components/`](../components/) and **semantic** design
  tokens; they do not fork UI or hard-code values.

How-to: [`docs/adding-an-app.md`](../docs/adding-an-app.md). Why:
[`docs/decisions/0001`](../docs/decisions/0001-web-platform-shell.md).
