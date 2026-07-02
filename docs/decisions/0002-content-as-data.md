---
uid: cogitave.web.adr.0002
title: ADR-0002 — Marketing content is typed content-as-data
description: Decision to model marketing content as typed, schema-validated structured data (semantic blocks) reusing the docs/learn conventions, instead of hand-written HTML/MDX or a layout-coupled page builder.
type: explanation
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [developer, content-developer]
level: intermediate
status: accepted
---

# ADR-0002 — Marketing content is typed content-as-data

- **Status:** accepted
- **Date:** 2026-06-28
- **Deciders:** cogitave/web, cogitave/platform

## Context and Problem Statement

Marketing content must render on the web, be quoted accurately by AI answer
engines, stay consistent with the rest of the estate, and be editable/reviewable/
translatable without touching code. How should we represent a page's content?

## Decision Drivers

- **Channel- and AI-portability:** machines need clearly labeled fields and
  semantic structure to interpret and quote content.
- **Consistency with the estate:** reuse the docs/learn typed-document model
  (YamlMime discriminator, schema-DSL, UID graph, prose-in-includes) rather than
  invent a parallel one.
- **Separation of content from layout:** model by meaning, not by page layout.
- **Certification-grade validation:** content is a blocking, schema-validated gate.

## Considered Options

1. **Typed content-as-data** — `*.page.yaml` typed documents, semantic blocks,
   schema-validated, prose in `includes/*.md`.
2. **Hand-written HTML/MDX per page** (content coupled to markup/components).
3. **Layout-coupled visual page builder** (content modeled as page layout).

## Decision Outcome

Chosen: **option 1.** A page is a typed `### YamlMime:Page` document with an
immutable `cogitave.web.*` UID and an ordered list of **semantic blocks**; each
block's `type` resolves to a shared component and its `data` validates against
that component's sub-schema. Long prose lives in separate `includes/*.md`. This
mirrors the [documentation standard](../../../standards/docs/standards/documentation.md)
exactly (typed documents, schema validates AND interprets, UID graph,
prose-in-includes) so the marketing tier and the docs tier share one mental model
and one validation discipline.

Option 2 couples content to markup (poor reuse, weak machine semantics, hard to
translate). Option 3 models layout instead of meaning, which breaks multi-channel
and AI-answer reuse.

## Consequences

- Good: the same typed model emits HTML for humans and clean structured signals
  (JSON-LD, `llms.txt`) for AI crawlers.
- Good: content is reviewable as data, reusable across pages/channels, and
  locale-ready; prose is editable without touching structure.
- Good: one validation discipline and UID graph shared with docs/learn.
- Risk: requires maintaining component sub-schemas and a content validator; this
  is the same investment already made for the docs engine, reused here.
- Risk: authors must think in semantic blocks, not pixels; mitigated by the
  `_template` stub and the [adding-an-app](../adding-an-app.md) guide.

## More Information

- Structured/headless content 2026: <https://www.storyblok.com/mp/structured-content>, <https://buttercms.com/blog/structured-content/>
- Structured data for AI/SEO: <https://www.gwcontent.com/blogs/news/structured-data-for-seo>
