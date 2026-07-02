---
uid: cogitave.web.components
title: components — shared, token-driven UI
description: The shared UI library for the web shell. Components are token-driven and accessible; each owns a content sub-schema so content-as-data blocks validate against the component that renders them.
type: reference
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [developer, ui-designer]
level: intermediate
---

# components — shared, token-driven UI

Shared UI consumed by every app. Apps reference components by id in their
manifest (`components: ["hero", ...]`) and by block `type` in content; they do
not fork or re-implement UI.

## Contract (per component)

Each component `components/<type>/` is expected to provide:

| File | Purpose |
|---|---|
| `<type>.schema.json` | Sub-schema for the block `data` it accepts. The content validator dispatches on block `type` → this schema (the slot for content-as-data). |
| `<type>.<ext>` | The implementation (renders `data` using **semantic** design tokens only). |
| `README.md` | Usage, props, a11y notes, example block. |

> [!NOTE]
> This folder ships **conventions + the contract**, not the full component set —
> components are authored as apps need them. Suggested starter set referenced by
> the template: `hero`, `feature-grid`, `cta`, `faq`, `rich-text`, `logo-wall`,
> `testimonial`.

## Rules

- **Tokens only.** No literal colors/spacing/type; consume `semantic.*` from
  [`design/tokens.json`](../design/tokens.json).
- **Accessible by construction.** Semantic HTML, keyboard operable, visible focus,
  contrast within tokens — see [`a11y/`](../a11y/).
- **Content from data.** A component renders the block `data`; it never embeds
  marketing copy (copy lives in [content](../content/)).
- **Render-mode aware.** Interactive components are island-friendly so a `static`
  page can hydrate only what it must.
