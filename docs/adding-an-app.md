---
uid: cogitave.web.adding-an-app
title: Adding an app, landing page, or campaign
description: The contributor how-to for dropping a new app, landing page, or campaign into the web shell - copy the template, fill the schema-validated manifest, author content-as-data, register the route, and pass the CI gates.
type: how-to
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [developer, content-developer]
level: beginner
---

# Adding an app, landing page, or campaign

This is the **slot convention**. Adding a property is a folder + a validated
manifest — you never edit the shell. For the architecture behind it, see
[architecture](architecture.md).

> [!TIP]
> `app` = multi-route experience · `landing` = single marketing page ·
> `campaign` = time-boxed page (carries a `schedule`).

## Prerequisites

- Read the [overview](../README.md) and this repo's design tokens
  ([`design/README.md`](../design/README.md)).
- An `id` (kebab-case, stable, immutable) and a `route` (unique across apps).

## Steps

### 1. Copy the template

Copy [`apps/_template/`](../apps/_template/) to `apps/<your-app>/`. You get:

```
apps/<your-app>/
├─ app.manifest.json          # the slot contract
└─ content/
   ├─ index.page.yaml         # typed content-as-data
   └─ includes/overview.md    # prose, kept apart from data
```

### 2. Fill the manifest

Edit `app.manifest.json`. It validates against
[`apps/app.manifest.schema.json`](../apps/app.manifest.schema.json) — a blocking
CI gate. Minimum required: `id`, `kind`, `title`, `route`, `property`, `render`,
`content`, `owner`, `status`.

```jsonc
{
  "$schema": "../app.manifest.schema.json",
  "id": "launch-yuva-2",
  "kind": "campaign",
  "title": "yuva 2.0 launch",
  "route": "/yuva-2",
  "property": "marketing-site",            // must match cogitave/bootstrap/domains.yaml
  "render": { "mode": "static" },          // static | island | edge-ssr
  "content": { "root": "content/", "entry": "index.page.yaml" },
  "components": ["hero", "feature-grid", "cta"],
  "seo": { "structuredData": ["organization"] },
  "i18n": { "locales": ["en"] },
  "analytics": { "events": ["cta_click"] },// privacy-safe, no PII
  "schedule": { "start": "2026-07-01T00:00:00Z", "end": "2026-08-01T00:00:00Z" },
  "owner": "cogitave/web",
  "status": "staged"
}
```

Pick the **least dynamic** `render.mode` that works (prefer `static`; see the
[rendering spectrum](architecture.md#3-rendering-spectrum-per-route)).

### 3. Author content as data

Write `content/index.page.yaml` as typed, structured data validated by
[`content/schemas/page.schema.json`](../content/schemas/page.schema.json):

- First line is the type discriminator `### YamlMime:Page`.
- `uid` is an immutable `cogitave.web.*` dotted id.
- `blocks[]` are **semantic** (`type` carries meaning; layout is the component's
  job). Reference only `components` declared in the manifest.
- Long prose goes in `includes/*.md`, never inline in the data.

### 4. Register the route

Discovery is automatic (`apps/*/app.manifest.json`), but add an explicit entry to
`apps.registry` in [`site.config.yaml`](../site.config.yaml) to pin the
route/property and control rollout via `status`:

```yaml
- { id: launch-yuva-2, manifest: apps/launch-yuva-2/app.manifest.json, route: /yuva-2, property: marketing-site, status: staged }
```

### 5. Pass the gates, then ship

CI runs (all blocking unless noted):

- **manifest-schema** — `app.manifest.json` validates; `route` is unique.
- **content-schema** — every `*.page.yaml` validates; blocks reference declared components; includes resolve.
- **tokens** — no hard-coded colors/spacing; only `semantic.*` tokens used.
- **a11y** — WCAG 2.2 AA (contrast, focus visible, alt text). See [`a11y/`](../a11y/).
- **seo** — title/description present, canonical set, JSON-LD valid.
- **privacy** — declared analytics events only; no PII; consent honored.
- **perf budgets** — LCP/CLS/INP + per-route JS budget (see `build.budgets`).

On merge, the edge-first, multi-cloud deploy promotes the new artifact
atomically.

## Checklist

- [ ] Folder copied from `_template/`; `id` and `route` are unique.
- [ ] `app.manifest.json` validates; `property` matches `cogitave/bootstrap/domains.yaml`.
- [ ] `*.page.yaml` validates; prose in `includes/`.
- [ ] Only semantic design tokens used.
- [ ] Registered in `site.config.yaml` with the right `status`.
- [ ] a11y + SEO + privacy + perf gates green.
- [ ] Docs/CHANGELOG updated (docs-as-code gate).
