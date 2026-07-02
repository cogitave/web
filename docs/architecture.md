---
uid: cogitave.web.architecture
title: Web platform architecture
description: How the marketing/web shell is structured - the shell/app split, the content-as-data flow, the rendering spectrum, build/deploy targets, and the cross-cutting concerns (SEO, analytics, i18n, a11y, tokens).
type: explanation
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [developer, solution-architect]
level: intermediate
---

# Web platform architecture

This explains the *why* and *how* of the web shell. For the contributor
how-to see [adding-an-app](adding-an-app.md); for decisions see
[decisions/](decisions/).

## 1. Shell / app split

The platform is a **shell** (stable core) plus **apps** (drop-ins). The shell
owns routing, render targets, shared components, design tokens, and the
cross-cutting defaults (SEO/analytics/i18n/a11y). An app owns its **content +
manifest** and nothing structural. This is the standard "core, ready for apps to
drop in": adding a page never edits the shell.

The boundary is a **schema** — `apps/app.manifest.schema.json`. The manifest
both *validates and interprets* (same Schema-DSL principle as the docs engine):
the build reads the manifest to know the route, render mode, content root, and
component set. Invalid manifest = blocked PR.

## 2. Content-as-data flow

Content is **structured data, modeled on meaning, not layout** — the 2026
content best practice for multi-channel and AI-answer surfaces.[^content][^structured]
A page is a typed `*.page.yaml` (first line `### YamlMime:Page`, the same typed-
document discriminator the docs/learn engine uses), a sequence of semantic
**blocks** (`hero`, `feature-grid`, `cta`, `faq`, `rich-text`, …). Each block's
`type` resolves to a shared component; its `data` validates against that
component's sub-schema. Long prose lives in a separate `includes/*.md`, exactly
like the docs `includes/` convention. See [decisions/0002](decisions/0002-content-as-data.md).

```
apps/<slug>/content/index.page.yaml   # typed, schema-validated, blocks=data
        │  blocks[].type → component
        ▼
components/<type>/                     # renders data with design tokens
        │
        ▼
build (namzu) → static HTML + edge handler
```

This keeps content portable: the same typed model emits HTML for humans and
clean structured signals (JSON-LD, `llms.txt`) for AI crawlers.[^seo]

## 3. Rendering spectrum (per route)

There is no single site-wide rendering mode. Following the 2026 hybrid /
islands consensus, each app picks the **least dynamic mode that works**:[^render][^islands]

| Mode | Use when | Notes |
|---|---|---|
| `static` | Content rarely changes (most marketing pages). | Default. Prerendered HTML at the CDN edge; best Core Web Vitals. |
| `island` | Mostly static + small interactive widgets. | Ship HTML; hydrate only the islands (keeps JS budget low). |
| `edge-ssr` | Per-request personalization / freshness. | Edge function near the user; use sparingly. |

Edge rendering is the 2026 default substrate (edge handles a majority of SSR
workloads), so static-first + edge-SSR-where-needed is both fast and portable.[^render]

## 4. Build & deploy (multi-cloud-portable)

- **Build** (`namzu`/TS) transforms tokens, validates manifests + content,
  and emits two artifacts: a static bundle (`_site/`) and a portable edge
  handler (`_edge/`, a plain request→response contract).
- **Serve** (`yuva`/Rust) runs the edge handler; build is decoupled from serve
  (same split as the docs engine).
- **Portability:** because the artifact is "static files + a request/response
  edge contract," the *same* output deploys to any edge/static target. Provider
  selection is an infra concern ([`cogitave/infra`](../../infra/));
  the shell stays provider-agnostic. Releases are content-addressed and atomic
  (instant rollback).

## 5. Cross-cutting concerns

- **Design tokens** ([`design/`](../design/)) — DTCG single source; primitives →
  semantic aliases → CSS vars at build. Components never hard-code values.[^tokens]
- **SEO** ([`seo/`](../seo/)) — canonical origin (www→apex redirect), generated
  `sitemap.xml`, `robots.txt` (incl. AI-crawler policy), JSON-LD structured
  data, and a curated `llms.txt`.[^seo]
- **Analytics** ([`analytics/`](../analytics/)) — cookieless + aggregate by
  default (no banner needed); only the `marketing` category needs consent;
  equal-prominence accept/reject; server-side ingest.[^privacy]
- **i18n** ([`i18n/`](../i18n/)) — English-only today; sub-path locale strategy
  so adding a locale is additive.
- **a11y** ([`a11y/`](../a11y/)) — WCAG 2.2 AA as a blocking gate (EN 301 549 /
  European Accessibility Act alignment).[^a11y]
- **Secrets** — no secrets in-repo; `dotenvx` encrypted `.env` (committed
  ciphertext), private key only in the deploy secret store — also keeps secrets
  out of AI agent context.[^env]

## 6. MCP-native & evidence

Per the org standard, the build intermediates (manifest registry, content model,
token set, sitemap) are exposed as MCP resources so agents and humans query the
same model; CI gates (schema, a11y, links, perf budgets) produce auditable
evidence. See the [observability standard](../../standards/docs/standards/observability.md).

## Sources

[^content]: Sanity / Storyblok / Hygraph — content-as-data and structured content for 2026 (model by meaning, modular reusable components). <https://www.sanity.io/top-5-headless-cms-platforms-2026>, <https://www.storyblok.com/mp/structured-content>, <https://hygraph.com/headless-cms>
[^structured]: ButterCMS — Structured Content 101. <https://buttercms.com/blog/structured-content/>
[^render]: "Rendering for SEO in 2026: Hybrid, Islands, and Edge" (Nuxt SEO); "SSR vs Client: The 2026 Verdict". <https://nuxtseo.com/learn-seo/nuxt/routes-and-rendering/rendering>, <https://www.jasminedirectory.com/blog/server-side-rendering-ssr-vs-client-side-the-2026-verdict/>
[^islands]: Islands architecture (Astro-style) projected to power 30–40% of new content-heavy projects. <https://www.jasminedirectory.com/blog/javascript-seo-in-2026-rendering-strategies-for-modern-frameworks/>
[^tokens]: W3C Design Tokens Community Group — first stable spec (2025.10), `$value`/`$type`, parser-agnostic. <https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/>, <https://www.designtokens.org/tr/drafts/format/>
[^seo]: SEO/GEO in 2026 — JSON-LD structured data, sitemaps for RAG, and `llms.txt` as a curated AI table of contents. <https://www.gwcontent.com/blogs/news/structured-data-for-seo>, <https://witscode.com/guides/ai-llm-seo>
[^privacy]: Cookieless / consent best practices 2026 — first-party + server-side, equal-prominence reject, default-deny. <https://www.digitalapplied.com/blog/data-privacy-marketing-2026-cookieless-strategy>, <https://secureprivacy.ai/blog/global-cookie-consent-trends-2026>, <https://matomo.org/blog/2026/01/privacy-regulations-changes-2026-analytics/>
[^a11y]: WCAG 2.2 + European Accessibility Act / EN 301 549. <https://www.onetrust.com/blog/understanding-the-european-accessibility-act-and-wcag-22/>, <https://www.w3.org/WAI/standards-guidelines/wcag/>
[^env]: dotenvx — encrypted `.env` (ECIES/AES-256), keeps secrets out of git and AI agent context. <https://dotenvx.com/>, <https://github.com/dotenvx/dotenvx>
