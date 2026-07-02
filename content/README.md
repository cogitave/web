---
uid: cogitave.web.content
title: content — content-as-data model
description: The structured content model for the web shell. Pages are typed, schema-validated YAML modeled on meaning (semantic blocks) not layout, reusing the docs/learn conventions so content stays portable to web and AI surfaces.
type: reference
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [content-developer, developer]
level: intermediate
---

# content — content-as-data model

Marketing content is **structured data**, modeled on meaning, not layout — the
2026 best practice for multi-channel and AI-answer reuse.[^1] The model reuses
the docs/learn conventions so the whole estate shares one mental model.

## The model

- **Per-app content** lives in `apps/<slug>/content/` (page documents) — this
  folder holds the **shared model + schemas**.
- A page is a typed document: first line `### YamlMime:Page` (the same typed-
  document discriminator as the docs engine), validated by
  [`schemas/page.schema.json`](schemas/page.schema.json).
- Identity is an immutable `cogitave.web.*` **UID**, decoupled from the route.
- Body = ordered **semantic blocks**; each block `type` resolves to a shared
  [component](../components/) and its `data` validates against that component's
  sub-schema.
- **Prose lives in separate `includes/*.md`** (never inline in the data) — exactly
  the docs `includes/` convention.

## Consistency with docs/learn

| Docs/learn | Web content |
|---|---|
| `### YamlMime:Module` etc. | `### YamlMime:Page` |
| immutable dotted UID | immutable `cogitave.web.*` UID |
| schema validates AND interprets | `page.schema.json` + component sub-schemas |
| prose in `includes/` | prose in `includes/` |
| broken-xref/link = blocking | content-schema + broken-include = blocking |

This is recorded in [`docs/decisions/0002`](../docs/decisions/0002-content-as-data.md).

[^1]: Storyblok / ButterCMS — structured content for the AI era (model by meaning, modular blocks). <https://www.storyblok.com/mp/structured-content>, <https://buttercms.com/blog/structured-content/>
