# Agentic Commerce

Not a dimension: the ten dimensions applied to a purchase task. Use it when
agent-mediated buying is a real surface (a storefront, a marketplace, anything
a shopping agent could buy). Otherwise record commerce as not applicable.

Five layers, each depending on the one before: product data an agent can trust,
checkout it can complete, payment authority, trust and risk, after the order.
A gap low down breaks everything above it: don't grade checkout when the feed
has the wrong price.

## Detect

- `schema.org/Product` and `Offer` JSON-LD on product pages
- A Google Merchant Center or OpenAI product feed, or the code that builds it
- Shopify (`@shopify/*`, Liquid, Hydrogen) or another platform SDK
- UCP (`/.well-known/ucp`), ACP (`/checkout_sessions`), Stripe Shared Payment
  Tokens, the Onelink Agent Wallet
- Cart, checkout and order routes or tools; order and payment webhooks

## Product data

- `Offer` needs `price` with `priceCurrency` (or `priceSpecification`). Include
  `availability` (Google calls it recommended; feeds need it), `sku`/`gtin`/
  `mpn`/`brand`, `shippingDetails`, `hasMerchantReturnPolicy`.
- A stable `item_id` per variant, with variants linked through `ProductGroup`
  and `hasVariant` (or `isVariantOf`, `inProductGroupWithID`), so the agent buys
  the exact size it chose.
- Google and OpenAI feeds overlap but are different files. OpenAI's feed: nine
  required fields, the Stable (not Draft) schema, US by default (other markets
  need confirmed setup), Parquet preferred (`jsonl.gz`, `csv.gz`, `tsv.gz`
  accepted), prices in major units (`amount CURRENCY`). Shopify Catalog's
  `list_price` is in minor units, so convert explicitly.
- ChatGPT now focuses on discovery; purchase happens on the merchant's site or
  the merchant's own ChatGPT app. OpenAI's in-ChatGPT checkout guide describes
  the ACP spec, not a live surface.
- Check that the page, the feed and the catalog API agree on price and stock for
  one real SKU. Schema validation alone doesn't show that.
- Re-check price, stock and delivery eligibility against live state before any
  commitment; a feed or cached page is a snapshot.

## Checkout

- Which protocol: UCP, ACP (the 2026-04-17 release defines no discovery
  document), a platform SDK such as Shopify Checkout Kit, or a hand-rolled flow.
  A custom checkout competing with an existing platform integration is a red
  flag.
- `Idempotency-Key` on session and order creation; capability negotiation before
  payment; structured cancellation reasons where supported (ACP's optional
  `intent_trace`).

## Payment authority

- Spending authority should be a signed, scoped, revocable mandate (amount cap,
  merchant scope, expiry), not an ambient stored card.
- Rails: AP2 mandates, Visa Trusted Agent Protocol, Mastercard Agent Pay, Stripe
  Shared Payment Tokens, or MPP/x402 for per-request payment.
- Match the controls to the shape: an approval step when a human is present,
  mandate scoping when not.

## Trust and risk

- Verify signed agents rather than blanket-blocking automation: Web Bot Auth
  (`Signature-Input`, `Signature`, and `Signature-Agent` as a Structured Fields
  dictionary in the current draft), Visa TAP, or Cloudflare's signed-agents
  category.
- Approval thresholds tied to the authorization shape, not a generic bot score.
- A published agent terms-of-use page, separate from the general terms and from
  robots.txt.

## After the order

- A `get_order` status operation, not only an emailed receipt.
- Order and payment webhooks with a discriminated `event_type` and a unique
  `event_id` (distinct from the checkout `Idempotency-Key`), signed per Standard
  Webhooks (`webhook-id`, `webhook-timestamp`, `webhook-signature`) on your own
  API. Platform integrations use the provider's signing; Shop MCP has no
  webhooks, so poll `get_checkout`.
- Returns and refunds as a callable operation with structured errors, not a
  support ticket.

## Where findings go

| Finding                                                        | Dimension                                     |
| -------------------------------------------------------------- | --------------------------------------------- |
| Page, feed and API disagree on price or stock                  | Retrievability (Discovery if data is missing) |
| Only an HTML checkout; no callable cart, checkout or order     | API Surface, MCP Server or Tool Design        |
| Ambient credential instead of a scoped mandate                 | Authentication                                |
| Non-idempotent checkout, or no recovery after a failed payment | Error Handling                                |
| No sandbox for checkout and payment failures                   | Testing                                       |
| Feed absent, stale or unlinked from discovery                  | Discovery & AEO                               |

## Shopify

Shopify ships much of this: UCP, the Catalog, Cart, Checkout, Order and Shop MCP
servers, WebMCP on Liquid and Hydrogen, and a product-page audit. Treat feature
existence, developer access, merchant eligibility and buyer authorization as
separate statuses. A Catalog listing doesn't imply native checkout: results with
`eligible.native_checkout=false` check out on the brand's site. On Shopify, most
"missing" commerce surface is configuration or data quality, not a build task.

The Global Catalog REST API (`discover.shopifyapps.com/global/...`) stopped
serving on 2026-11-02, saved catalogs included. Flag any caller and move it to
Global Catalog MCP (`https://catalog.shopify.com/api/ucp/mcp`, with
`meta.ucp-agent.profile` on every request).

Canonical detail: https://agentsurface.dev/docs/agentic-commerce.
