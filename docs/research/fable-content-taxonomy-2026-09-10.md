# Independent Fable review — raw findings

Review of commit 4718ba2 and the explicitly identified local corrections, requested 2026-09-10. Claude CLI model metadata confirmed `claude-fable-5-1`, medium effort. Read-only tools; no web access. These are review leads, not verified guidance. See [the verified assessment](../fable-content-taxonomy-review-2026-09-10.md) for corrections and decisions.

**Verdict: keep the five areas (Option A), but with four structural changes, and don't publish before them.** The journey questions ("Can agents find you / understand you / act with permission / get things done / pay?") are the right teaching spine for Jo and Adam and match the product-journeys method. The problems are inside the areas, not between them: Usability is too big to teach priority, four cards exist because Ora names a protocol rather than because a reader needs the advice, the Auth area sends a product reader to a machine-to-machine page, and the glossary's categories contradict the docs. Option B would add a second axis (universal vs integration) that the existing `applies` field can carry more cheaply if it becomes a typed tier. I'd switch to B only if user testing showed readers filter by product type first, or if Usability can't be brought under about 18 cards, in which case split it into "on your website" and "through integrations".

## Ranked findings

1. **Usability is 23 of 56 cards with no priority signal.** It mixes site concerns (accessible UI, missing pages) with integration builds (MCP, CLI, SDKs, A2A delegation). Only one card is "Start here". The `applies` field is free text with around thirty distinct values ("For public pages", "For public content", "If you offer integrations", "If you distribute integrations"). Reader decision affected: what to do first. Fix: make `applies` a typed tier (Foundation / Conditional / Emerging) plus a short condition string, order every area Foundation first, and shrink Usability by the mergers below.

2. **Scanner-driven cards inflate niche protocols into recommendations.** The coverage doc records 14 cards added to map checks. `verifiable-trust` (ARD trust manifests), `agent-plugins`, `natural-language-search` (NLWeb `/ask`), `mcp-resources` and `signed-bot-identity` are a named protocol, not missing advice. `verifiable-trust`'s "what" is unreadable for the stated audience. Fix: fold `verifiable-trust` and `natural-language-search` into `catalogs`, `mcp-resources` into `mcp`, `agent-plugins` into `distribution`. Keep the old IDs as anchors so the coverage JSON still resolves.

3. **The Auth area's entry card lands on the wrong page.** `auth-onboarding` promises "a delegated flow such as OAuth" but links to a page titled for Client Credentials and M2M, and the authentication index describes that page as "default for standalone agent services and machine-to-machine access". The single sentence about Authorization Code with PKCE exists only in the uncommitted local edit. Two gaps behind it: no card states the universal decision (which actions are public, which need a customer's permission, which run as your own service), and API keys, which the docs cover and which most existing apps will actually offer first, are absent. Fix: point the card at the authentication index, rewrite that index's "Choose a path" to start from the acting identity, and add the decision to `auth-onboarding` or a new foundation card. This conclusion depends on the local corrections landing.

4. **Discoverability and Understandability leak into each other.** `identity` (JSON-LD `sameAs`, About and Contact pages) sits in Discoverability while `structured-data` and `page-metadata` sit in Understandability; `public-docs` ("explain setup requirements") overlaps `product-purpose`; `catalogs` and `natural-language-search` link to the same doc from different areas. Fix: adopt the boundary map below and move `page-metadata` (canonical and alternate URLs are about arriving at the right page) to Discoverability beside `sitemaps`.

5. **Payment cards are more confident than their own docs.** `checkout` says "through a supported integration such as UCP or ACP"; the agentic-commerce page says ACP is deflating, tells merchants to ride the platform integration rather than hand-build, and says "watch, not build" for AP2. `machine-payments` names MPP and x402 without distinguishing them, and the glossary defines both as "an HTTP 402 payment protocol". Fix: reword `checkout` to "the checkout path your commerce platform and the agent host already support", mark all three payment cards Emerging, and give MPP and x402 one differentiating sentence each after verification.

6. **Glossary categories and the A2A entry contradict the docs.** `a2a` is filed under "Ops & Lifecycle", calls A2A "Google's" while the A2A page says Linux Foundation AAIF, and cites "ACP (Agent Communication Protocol)" as a live peer while the same glossary defines ACP as the commerce protocol and the docs call IBM's ACP dead. "Agent Readiness" as a category holds robots.txt next to Grounding and Guardrails, and is the name of the whole subject. Fix: recategorise per the map below and rewrite the `a2a` detail.

7. **Cards lead straight into internal inconsistencies.** The A2A card path is `/.well-known/agent.json` in the A2A, comparison and protocols pages but `agent-card.json` in well-known-endpoints and the AEO checklist. The NLWeb example on well-known-endpoints uses `q` and returns `answer`/`confidence`, while catalogs-and-feeds says the reference uses a `query` argument and warns that a route named `/ask` isn't compatibility. The `acp.json` example on well-known-endpoints has a capability shape unrelated to the ACP page. Fix: reconcile after the currency queue is checked.

8. **Reading sequence breaks the map.** The overview links to card anchors, but the 53-term glossary carousel sits between map and cards. The docs have no landing page per area, so a card click drops the reader into an 11-dimension sidebar with no way back to "which of the five was I in". Fix: order map, cards, glossary, then "put the guide to work"; add an area-to-docs-section table to getting-started.

## Boundary map, moves and glossary

**Area definitions I'd publish.**

- Discoverability: how an agent arrives and what it's allowed to fetch. Reachability, addresses, entry points, listings.
- Understandability: what an agent can learn once it's there. Content, facts, terms, contracts and their meaning.
- Auth & identity: who is acting, on whose behalf, with what permission, and how that's revoked.
- Usability: doing the task, recovering from failure, and proving the result.
- Payments: spending authority, checkout and settlement, and confirmed delivery.

**Card moves (IDs unchanged).**

| Card                                          | Action                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page-metadata`                               | Understandability to Discoverability                                                                                                                    |
| `verifiable-trust`, `natural-language-search` | merge into `catalogs`                                                                                                                                   |
| `mcp-resources`                               | merge into `mcp`                                                                                                                                        |
| `agent-plugins`                               | merge into `distribution`                                                                                                                               |
| `signed-bot-identity`                         | receiver half into `crawler-access`; keep sender half in docs only                                                                                      |
| `missing-pages`                               | relink to the error-handling section, not content-negotiation                                                                                           |
| new `consistent-facts`                        | Understandability, Foundation: one source of truth across page, JSON-LD, Markdown, feed and API. Genuine missing advice, straight from product-journeys |
| `webhooks`                                    | optional new card beside `jobs-and-bulk`; a glossary term and doc page already exist                                                                    |

**Glossary must-fix.** Add NLWeb, AGENTS.md (context files), well-known endpoints, and browser agent / accessibility tree, since cards use each without a definition. Rewrite `a2a`, differentiate `mpp` from `x402`, move `a2a` to Agent Infrastructure, rename "Agent Readiness" to something like "Web & Content" (AEO, llms.txt, JSON-LD, robots.txt, Markdown, Content negotiation), move Grounding and Guardrails to Agent Infrastructure, and move idempotency, rate limits, sandbox and prompt injection out of "Ops & Lifecycle" into a reliability bucket. The older entries date themselves with model and vendor names (GPT-4, text-embedding-3-large, Cohere Embed v3, Pinecone) and the "¾ of a word" token claim; trim to concept-only. Optional additions: sitemap, canonical URL, Streamable HTTP, approval / human-in-the-loop, PKCE, Arazzo.

## Currency queue, and what to keep

Claims I can't verify locally, each with the page carrying it and where to check:

- UCP announcement 2026-01-11, Tech Council 2026-04-24, "8,000+ stores" (agentic-commerce): https://ucp.dev/
- AP2 donated to FIDO 2026-04-28, spec v0.2.0, "Human Not Present" (agentic-commerce): https://ap2-protocol.org/
- x402 under Linux Foundation April 2026, Coinbase 169M payments, Cloudflare Monetization Gateway waitlist 2026-07-01 (agentic-commerce): https://x402.org/ and https://blog.cloudflare.com/monetization-gateway/
- ACP Instant Checkout shutdown March 2026, spec 2026-04-17 (acp, comparison): https://developers.openai.com/commerce
- MPP ownership and settlement model, needed to differentiate from x402 (mpp): https://mpp.dev/overview
- A2A v1.0.1 dated 2026-05-28, card path `agent.json` vs `agent-card.json`, governance (a2a, well-known): https://a2a-protocol.org/latest/specification/
- MCP revision 2026-07-28 as current (comparison, mcp): https://modelcontextprotocol.io/specification/2026-07-28/
- WebMCP draft dated 2026-08-26, Chrome 149 origin trial (webmcp): https://webmachinelearning.github.io/webmcp/ and https://developer.chrome.com/docs/ai/webmcp
- NLWeb request contract, `query` vs `q` (well-known, catalogs): https://github.com/nlweb-ai/NLWeb/blob/main/docs/nlweb-rest-api.md
- Agent Skills discovery schema 0.2.0 (well-known): https://schemas.agentskills.io/discovery/0.2.0/schema.json
- auth.md endpoint field names and ID-JAG placement (auth-md): https://github.com/workos/auth.md
- `/.well-known/ai`, `agents.txt` and `agents.json` still being live drafts (well-known): IETF datatracker and https://wildcard.ai
- Ora catalogue 125 vs HTML methodology 119 (coverage doc): https://ora.ai/methodology and https://ora.ai/api/checks
- The structured-data page was last verified 2026-06-02, is linked from two cards, and trips the 120-day gate around 2026-09-30.

**Keep as is.** The what / why / applies card shape. The qualifying "why" lines that stop the page reading as a checklist (llms.txt guarantees nothing, tool hints grant no permission, a prepared cart isn't spending permission). The seven "Start here" cards, which are already the foundations list for an existing website and should be surfaced as such. The adaptation notes in the coverage doc. Product-journeys as the evaluation method and the "surface score is not a scanner score" stance. The new glossary entries' habit of ending with what the term does not mean. Stable IDs and the data-driven counts.
