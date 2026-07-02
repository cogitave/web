---
uid: cogitave.web.adr.0001
title: ADR-0001 — Web platform is a shell with drop-in apps
description: Decision to build the marketing site as a stable shell plus schema-validated drop-in apps (manifest slot), edge-first and multi-cloud-portable, instead of a monolithic site or an off-the-shelf framework.
type: explanation
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [developer, solution-architect]
level: intermediate
status: accepted
---

# ADR-0001 — Web platform is a shell with drop-in apps

- **Status:** accepted
- **Date:** 2026-06-28
- **Deciders:** cogitave/web, cogitave/platform

## Context and Problem Statement

We need cogitave.com to grow continuously — new product pages, launches, and
time-boxed campaigns — without each addition reworking the site or blocking on
the core team. How do we structure the marketing platform so apps/pages/campaigns
"drop in," while staying build-from-scratch, MCP-native, and certification-grade?

## Decision Drivers

- **Drop-in extensibility:** add a page without editing shared code.
- **Build-from-scratch ethos:** engines are ours; specs are reference, not lock-in
  ([standards ADR-0003](../../../standards/docs/decisions/0003-build-from-scratch-reference-not-dependency.md)).
- **Performance-first** and good Core Web Vitals for marketing/SEO.
- **Multi-cloud portability** (no platform lock-in; infra chooses providers).
- **Auditable boundary** between shell and app (a reviewer can see the contract).

## Considered Options

1. **Shell + schema-validated drop-in apps** (a manifest slot; content-as-data).
2. **Monolithic hand-built site** (every page edits shared code).
3. **Off-the-shelf framework/SaaS site builder** as the platform (not just reference).

## Decision Outcome

Chosen: **option 1.** The shell owns routing, render targets, shared components,
design tokens, and cross-cutting defaults. Each app is a folder under `apps/`
with an `app.manifest.json` validated by `apps/app.manifest.schema.json` (the
slot contract) and typed content-as-data. Rendering is a **per-route spectrum**
(static → island → edge-ssr), edge-first, emitted as a portable
static-bundle + request/response edge contract so the same artifact deploys to
any cloud.

Option 2 does not scale to many contributors and campaigns. Option 3 violates the
build-from-scratch ethos and creates lock-in; off-the-shelf frameworks remain
**reference** (DTCG, islands/edge patterns, schema.org), not the platform.

## Consequences

- Good: adding an app is folder + manifest + content; the boundary is a schema
  (blocking CI gate), so additions are safe and auditable.
- Good: static/island-first gives strong Core Web Vitals; edge-SSR is opt-in.
- Good: provider-agnostic artifact → multi-cloud, atomic content-addressed
  releases with instant rollback.
- Risk: the shell must keep the manifest + component sub-schemas stable; breaking
  changes need versioning and migration (same discipline as the docs Schema-DSL).
- Risk: a per-route render spectrum adds build complexity; mitigated by a
  `static` default and CI perf budgets.

## More Information

- [Architecture](../architecture.md) · [Adding an app](../adding-an-app.md)
- Rendering 2026 (hybrid/islands/edge): <https://nuxtseo.com/learn-seo/nuxt/routes-and-rendering/rendering>
