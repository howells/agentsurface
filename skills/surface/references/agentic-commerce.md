# Agentic Commerce

## Summary

Agentic commerce is not a scorecard dimension - it is the existing ten dimensions (mainly Discovery & AEO, API Surface/MCP Server/Tool Design, Authentication, Error Handling, Testing) applied to a purchase task. Use this reference when auditing or scaffolding a merchant, marketplace, or commerce-platform surface. The canonical explanation for every claim here is `src/content/docs/agentic-commerce/` - read the relevant page before writing findings or generating code; this file is the condensed, audit-oriented version.

Five layers, each depending on the one before it: product data agents can find and trust → checkout agents can complete → payment authority → trust and risk → after the order. A gap in an earlier layer breaks everything above it - don't score checkout integration quality if the product feed carries the wrong price.

## Detecting a commerce surface

Activate this reference only when agent-mediated commerce is a real product surface - an ecommerce storefront, marketplace, or a product/service a shopping agent could plausibly buy. Detect it via:

- `schema.org/Product` + `Offer` JSON-LD on product pages
- A product feed for Google Merchant Center or OpenAI/ChatGPT commerce (feed files, feed-generation code, or upload jobs to `developers.openai.com/commerce`)
- Shopify (`@shopify/*` packages, `shopify.dev` references, Liquid/Hydrogen storefront), or another commerce platform's SDK
- Checkout session code referencing UCP (`ucp.dev`), ACP (`agenticcommerce.dev`, `/checkout_sessions`, `/.well-known/acp.json`), or a payment provider's agent primitives (Stripe Shared Payment Tokens, Link)
- Cart, checkout, or order API routes/tools, and order-lifecycle webhooks (`order.created`, `payment.succeeded`)

Do not penalize a non-commerce product for missing any of this - record it not applicable.

## Evidence to gather, by layer

**Product data** (`src/content/docs/agentic-commerce/product-data.mdx`)

- `Product`/`Offer` JSON-LD: required `price`, `priceCurrency` or `priceSpecification`, `availability`; recommended `sku`/`gtin`/`mpn`/`brand`, `shippingDetails`, `hasMerchantReturnPolicy`, `aggregateRating`
- Merchant feed files or generation jobs, and which spec they target (Google Merchant Center vs OpenAI product feed - the two overlap but are not the same file)
- A catalog API (UCP catalog capability, or a platform-native one) versus a feed-only integration
- Whether the page, the feed, and the catalog API agree on price and availability for the same SKU - check one real item, don't just validate schema

**Checkout** (`checkout-protocols.mdx`)

- Which protocol is implemented: UCP (`/.well-known/ucp`), ACP (`/.well-known/acp.json`, `checkout_sessions` flow), a platform SDK (e.g. Shopify Checkout Kit), or a hand-rolled flow
- `Idempotency-Key` on session/order creation; structured cancellation with reason codes; capability negotiation before payment is attempted
- Whether the integration rides an existing platform feature versus a custom-built competing checkout surface (a red flag when a platform integration already exists)

**Payments** (`payments.mdx`)

- The mandate model: is spending authority a signed, scoped, revocable object (amount cap, merchant scope, expiry), or an ambient stored credential?
- Which rail: AP2 mandate, a card-network scheme (Visa Trusted Agent Protocol / Mastercard Agent Pay), Stripe Shared Payment Tokens, or MPP/x402 for per-request payment
- Human-present vs human-not-present: does the control tightness (approval step vs mandate scoping) match which shape the flow actually is?

**Trust and risk** (`trust-and-risk.mdx`)

- Signed-agent verification at checkout: Web Bot Auth headers (`Signature-Input`/`Signature`/`Signature-Agent`), Visa Trusted Agent Protocol, or Cloudflare's signed-agents category - versus bot management that blanket-blocks all automated traffic
- Approval thresholds tied to authorization shape (human-present vs not), not to a generic bot score alone
- A published agent terms-of-use page, separate from general ToS and from `robots.txt`

**Orders and after purchase** (`orders-and-after-purchase.mdx`)

- `get_order`-style status operation, not just an emailed receipt
- Order/payment webhooks: discriminated `event_type`, `idempotency_key`, signed per Standard Webhooks - see `references/api-surface.md` for the general webhook rubric, applied here to order events
- Idempotent order creation - see `references/authentication.md` for the idempotency-key mechanics
- Returns/refunds as a callable operation with a defined contract and structured errors, not a support-ticket fallback

## Scoring notes

Score findings against the dimension that owns the root cause, not a separate commerce score:

| Finding                                                                                | Dimension                                                           |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Product page, feed, and catalog API disagree on price/availability                     | Retrievability (or Discovery & AEO if the data is missing outright) |
| No callable checkout/cart/order operation, only an HTML flow                           | API Surface / MCP Server / Tool Design                              |
| Spending authority is an ambient credential, not a scoped mandate                      | Authentication                                                      |
| Checkout session creation isn't idempotent, or a failed payment gives no recovery path | Error Handling                                                      |
| No sandbox/test environment for checkout and payment failure                           | Testing                                                             |
| Product feed absent, stale, or not linked from discovery surfaces                      | Discovery & AEO                                                     |

## Platform note: Shopify

Shopify ships most of this as platform features (`shopify.mdx`): UCP support, Storefront/Checkout/Customer Account/Dev MCP servers, WebMCP on Liquid and Hydrogen, Catalog API, and the product-page audit are automatic or near-zero-config. When auditing a Shopify-based project, check platform feature status and data accuracy first rather than assuming a gap needs custom implementation - most "missing" commerce surface on Shopify is a configuration or data-quality problem, not a build task.

## Related references

- `references/api-surface.md` - webhook and idempotency-key design generally
- `references/authentication.md` - the mandate as a specialization of scoped agent identity
- `references/discovery-aeo.md` - commerce signal detection within Dimension 4
- Canonical docs: `src/content/docs/agentic-commerce/`
