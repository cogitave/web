---
uid: cogitave.web.seo
title: seo — metadata, sitemap, robots, structured data
description: SEO and AI-discoverability conventions for the web shell - one canonical origin, generated sitemap, an AI-crawler-aware robots.txt, schema.org JSON-LD structured data, and a curated llms.txt for AI answer engines.
type: reference
owner: cogitave/web
lastReviewed: 2026-06-28
products: [cogitave]
roles: [content-developer, developer]
level: intermediate
---

# seo — metadata, sitemap, robots, structured data

In 2026, SEO is also **GEO** (generative-engine optimization): structured data is
the channel through which AI systems interpret and quote the site, and `llms.txt`
plus `robots.txt` decide what AI crawlers may read.[^seo][^llms]

## Conventions

- **One canonical origin.** `www` redirects to the apex; every page sets a
  `canonical` (configured in [`site.config.yaml`](../site.config.yaml)
  `domains.canonicalOrigin`). Avoids duplicate-content dilution.
- **Metadata from content.** Page `title`/`description` come from the typed
  content document (`description` reuses the docs 75–300 char window); `seo.*`
  in the manifest/page can override.
- **Sitemap.** `sitemap.xml` is generated from the apps registry + content (fresh
  `lastmod`); sitemaps also help RAG/AI crawlers prioritize canonical pages.[^seo]
- **Structured data (JSON-LD).** Authored under
  [`structured-data/`](structured-data/) and embedded per page via
  `seo.structuredData`. JSON-LD is Google's recommended format and the easiest for
  AI crawlers to parse.[^seo] Starter: [`organization.jsonld`](structured-data/organization.jsonld)
  (the entity foundation). Add `Article`/`BlogPosting`, `FAQPage`, `Product`,
  `BreadcrumbList`, `WebSite` as pages need them.
- **robots.txt.** [`robots.txt`](robots.txt) is the build-time source; it allows
  general crawlers, disallows `/_template/`, and explicitly lists AI crawlers
  (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended).[^llms]
- **llms.txt.** A curated table of contents for AI answer engines (Jeremy Howard's
  proposal), generated and served at `/llms.txt` — point models at the pages we
  most want quoted; keep it factual and current.[^llms] Consistent with the docs
  engine, which also emits `llms.txt`.

## CI gates

`title`/`description` present and within length; `canonical` set; JSON-LD parses
and validates against its schema.org type; sitemap entries resolve.

[^seo]: Structured data / JSON-LD for SEO + AI search 2026; sitemaps for RAG. <https://www.gwcontent.com/blogs/news/structured-data-for-seo>, <https://technovapartners.com/en/insights/structured-data-schema-seo-2026>
[^llms]: `llms.txt` as a curated AI table of contents; robots.txt as AI-crawler policy. <https://witscode.com/guides/ai-llm-seo>, <https://daviddacruz.dev/blog/seo-complete-guide>
