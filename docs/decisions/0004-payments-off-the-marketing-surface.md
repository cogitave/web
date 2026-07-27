---
uid: cogitave.web.adr.0004
title: ADR-0004 — Payments leave the marketing surface for their own origin
description: Decision to remove card capture from cogitave.com and move checkout to a separate payments property using the PSP's hosted checkout, keeping card data out of every Cogitave-authored page and the marketing site out of PCI DSS scope.
type: explanation
owner: cogitave/web
lastReviewed: 2026-07-26
products: [cogitave]
roles: [developer, content-developer]
level: intermediate
status: accepted
---

# ADR-0004 — Payments leave the marketing surface for their own origin

- **Status:** accepted
- **Date:** 2026-07-26
- **Deciders:** cogitave/web, cogitave/leadership

## Context and Problem Statement

The corporate landing page that this app was ported from shipped a payment modal
directly in the homepage. It rendered a card form — cardholder name, PAN, expiry
and CVV — with a live card preview bound to the inputs, a plan/VAT summary, and a
"Pay with iyzico" button, reachable from a "pay here" dock and from every priced
offer in the service catalog.

Two facts about that implementation drove this decision.

1. **It was not connected to anything.** The submit handler called
   `preventDefault()`, animated the button label to "redirecting you to iyzico…",
   waited 2.4 seconds and restored the original label. There was no request, no
   PSP call, no charge. A visitor could type a real card number into a form that
   did nothing with it — and receive a visual cue suggesting a payment was under
   way. A source comment described the form as design/preview and noted that in
   production a backend would call `CheckoutFormInitialize` and mount the
   returned content, but that backend does not exist.
2. **Capturing card data in our own DOM is a scope decision nobody recorded.**
   When the page a customer types a PAN into is a page we author and deploy, that
   page — and the systems that serve it — fall inside PCI DSS scope. That is the
   difference between the lightest self-assessment (all card data handled by a
   PSP-hosted page) and the far heavier obligations that apply once our own
   markup touches cardholder data. A marketing site is exactly the property least
   suited to carrying that obligation: it changes constantly, it is edited by
   people writing copy, and it exists to be crawled.

## Decision Drivers

- **Never present a payment affordance that does not take a payment.** A form
  that accepts card details and discards them is worse than no form.
- **Keep cardholder data out of every page we author.** The PSP's hosted checkout
  exists for this; using an embedded form we control forfeits its main benefit.
- **Minimise PCI scope by construction, not by policy.** Scope should be a
  consequence of the architecture, not a rule someone has to remember.
- **Separate failure domains and change cadence.** Marketing copy ships
  constantly; a checkout should not.
- **One source for a price.** The old page carried prices twice — in the markup
  and in a client-side `PLANS` map — with a hard-coded tax rate in a third place.

## Considered Options

1. **Hosted checkout on a separate payments property**, the landing links out.
2. **Hosted/embedded checkout iframe on the marketing page** — PSP-hosted fields
   inside our page.
3. **Keep the form, wire it to a backend** — our markup captures card data and
   posts it.
4. **Remove payment entirely**, invoice out of band.

## Decision Outcome

Chosen: **option 1.**

- **Card capture is removed from the marketing site and is not ported.** The
  payment modal, the card preview, the plan/VAT calculation and every
  `data-open-payment` trigger are gone from the app.
- **Checkout moves to its own property, `payments-surface`**, registered in
  [`cogitave/bootstrap/domains.yaml`](../../../bootstrap/domains.yaml) at
  `pay.cogitave.com` with `status: planned`. It has its own origin, its own
  deploy cadence and its own source repo (unset until the surface is built).
- **The landing keeps exactly one affordance:** a secondary link on the contact
  block reading "already a customer? pay here", pointing at that property. It
  states where to pay; it does not take a payment.
- **Amounts come from the registry.** The catalog block references offer ids in
  [`corp/gtm/pricing/services-catalog.yaml`](../../../corp/gtm/pricing/services-catalog.yaml);
  tax is derived at checkout by corp/finance billing, never by a client-side
  constant.

Option 2 is a legitimate end state and is the likely shape of the payments
surface itself, but it does not belong on the marketing origin — putting it there
keeps the marketing property in the blast radius of every checkout change.
Option 3 is the option that creates the obligation this ADR exists to avoid.
Option 4 gives up self-service collection the business wants.

## Consequences

- Good: no Cogitave-authored page handles cardholder data; the marketing site
  stays on the lightest PCI footing available.
- Good: no visitor can enter card details into a control that does not charge.
- Good: prices have one source, so the page, a quote and an invoice cannot drift.
- Cost: self-service payment is unavailable until the payments surface is built.
  The link is live-looking on a page that ships before the destination exists, so
  the app stays `status: staged` until `pay.cogitave.com` answers.
- Cost: a second property to operate, monitor and secure.

## More Information

- PCI DSS scope and the SAQ A vs SAQ A-EP distinction for e-commerce
  integrations: <https://www.pcisecuritystandards.org/document_library/>
- iyzico hosted checkout form: <https://docs.iyzico.com/>
- [ADR-0002 — content-as-data](0002-content-as-data.md) (why a price is registry
  data, not markup)
