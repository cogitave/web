---
uid: cogitave.web.design
title: design — token consumption for the web shell
description: How the cogitave.com web shell consumes the published design package - semantic tokens transformed to CSS variables at build. The canonical DTCG token source lives in the design repo; this folder holds only the web-side transform config, never token values.
type: reference
owner: cogitave/web
lastReviewed: 2026-07-02
products: [cogitave]
roles: [ui-designer, developer]
level: intermediate
---

# design — token consumption (web shell)

The canonical DTCG token source is the
[`design` repo](../../design/README.md) — **promoted from this folder** at
Day 0 (this was the bootstrap seed;
[ADR-0029](../../standards/docs/decisions/0029-design-token-home-and-status-page-isolation.md)).

The web shell **consumes** the published design package at build: semantic
tokens are transformed to CSS variables by our own `namzu`/TS transform
([design-system standard](../../standards/docs/standards/design-system.md)).
Components style from `semantic.*` only — never a literal hex/px, and never a
vendored copy of `tokens.json` (a copy here would be restatement drift).

This folder holds only web-side transform configuration.
