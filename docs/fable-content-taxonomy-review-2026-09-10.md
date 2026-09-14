# Content and taxonomy review — 2026-09-10

## Question and verdict

**Question given to Fable:** Does the five-area taxonomy teach informed product and business readers how to make an existing website or app work with agents, or should it be materially reorganized before publication? Assess all 56 cards, all 53 glossary terms, the learning path into the docs, and currency. Exclude styling and layout.

**Fable's verdict:** retain the five areas, but clarify priority and category boundaries, correct the glossary, and reconcile contradictory references before publication. It favors targeted restructuring over a new taxonomy.

**Lead assessment:** agree with retaining the five areas and correcting the content before deployment. Do not automatically adopt Fable's mergers, its arbitrary card-count target, or its proposal to label all payments emerging. Implementation choices and maturity are separate from the underlying requirement. Several findings are sound; some details and proposed remedies need correction below.

Lane check returned `lane-ok` with model metadata `claude-fable-5-1`. The review used the Claude CLI at medium effort with Read/Glob/Grep only and a ten-minute process-group timeout; it completed successfully in about 221 seconds. No substituted model or lane failure. [Raw independent response](research/fable-content-taxonomy-2026-09-10.md).

## Verified findings, in recommended correction order

### 1. Correct contradictory technical references before presenting them as implementation guidance

Fable correctly identified contradictory A2A discovery paths and incompatible NLWeb examples.

- [A2A guide](../src/content/docs/protocols/a2a.mdx) repeatedly directs readers to `/.well-known/agent.json` and calls `agent-card.json` a fallback. [Well-known endpoints](../src/content/docs/discovery/well-known-endpoints.mdx) uses `agent-card.json`. The current [official A2A specification, section 8.2](https://a2a-protocol.org/latest/specification/#82-discovery-mechanisms) specifies `/.well-known/agent-card.json`; section 14.3 uses the same suffix. Correct the A2A guide and comparisons consistently. The official page labels its latest release 1.0.0 while our guide claims 1.0.1; verify the release tag before changing version claims.
- The well-known page's NLWeb example uses `GET /ask?q=...` and a bespoke answer/confidence response, while [catalogs and feeds](../src/content/docs/discovery/catalogs-and-feeds.mdx) describes the reference contract. The [NLWeb reference](https://github.com/nlweb-ai/NLWeb/blob/main/docs/nlweb-rest-api.md) requires `query`, offers list/summarize/generate modes, and defaults streaming to true. Our example should follow a pinned implementation or be explicitly labeled a custom interface; it must not imply NLWeb conformance.
- ACP discovery examples differ across our pages. Their inconsistency is confirmed, but neither example has been established as canonical in this review. Rebuild them from the published ACP schemas in a focused correction rather than choosing the more plausible example.

These defects matter more than the exact category containing a card: a reader following the advice can implement the wrong contract.

### 2. Make the authentication learning path fit the acting identity

The `auth-onboarding` card promises user-delegated access but links to [OAuth for agents](../src/content/docs/authentication/oauth-for-agents.mdx), whose description, summary, and main worked flow emphasize Client Credentials. The [authentication index](../src/content/docs/authentication/index.mdx) also frames that route as the default for service-owned/M2M access. This is a poor first explanation for a product reader thinking about a customer's account.

Recommend an identity-first introduction: public access; the customer's delegated access; the product's own service identity. Explain supported API keys and OAuth flows in that context. Link the card to that introduction once corrected. Do not make Client Credentials or a new identity for every sub-agent universal requirements.

**Release distinction:** local consumer-auth corrections exist, but `git show HEAD:src/content/docs/scoring/rubric.mdx` confirms commit `4718ba2` still contains the older rubric penalizing an Authorization Code-only flow. The local preview's corrections must be reviewed and integrated separately before deployment. This review did not commit or modify them.

### 3. Add a clear priority model without replacing the five areas

Verified counts: 11 Discovery, 14 Understanding, 5 Auth, 23 Usability, 3 Payments. There are seven “Start here” cards, only one in Usability. The applicability field has **49 distinct strings**, not Fable's estimate of around thirty. Conditions describe audience and applicability, not implementation order.

Recommend separating two pieces of information: priority for an applicable product, and the condition under which advice applies. Protocol maturity can be a third, independent property where useful. Do not combine these into a single Foundation/Conditional/Emerging enum: a conditional payment or auth requirement can still be essential for the product concerned.

Within Usability, group advice conceptually into supported interfaces, reliable actions and recovery, and testing/operations. These can remain within one top-level area. There is no evidence that 18 cards is a useful threshold; the ordering and clarity matter more than an arbitrary count.

### 4. Refresh glossary concepts and categories

The [glossary data](../src/data/glossary.ts) has genuine inconsistencies:

- `a2a` lives under Ops & Lifecycle, describes A2A as Google's, and presents IBM's Agent Communication Protocol as a current peer. The [official ACP site](https://agentcommunicationprotocol.dev/introduction/welcome) now says it is part of A2A. The separate `acp` entry means Agentic Commerce Protocol. Rewrite the A2A explanation, put it with agent infrastructure, and explicitly distinguish the overloaded acronyms.
- Agent Readiness is both the whole subject and a category mixing web publishing with grounding and guardrails. Use a more specific web/content category; put grounding with knowledge/retrieval and guardrails with safety/reliability. Fable proposed moving both to Agent Infrastructure; this is an editorial option, not a fact.
- NLWeb, AGENTS.md, well-known endpoints, and browser agents/accessibility trees are absent as named entries despite appearing in the guide or linked explanations. Add these before adding more optional protocol acronyms. Define authentication versus authorization and distinguish an LLM token from an access token as further useful foundations.
- Older entries include model/vendor examples and overbroad claims about context, grounding, and reliability. Update the concepts and qualify approximations. “Roughly three quarters of a word” is a language/tokenizer-dependent heuristic, not intrinsically a dated or false claim.

The glossary should remain broader than the homepage implementation taxonomy; it also explains the systems agents use. Its categories need coherent boundaries, not identical names.

### 5. Make consistent facts a first-class recommendation

[Product journeys](../src/content/docs/scoring/product-journeys.mdx) explicitly requires product pages, structured data, Markdown, search results, and APIs to agree because they draw on the same owned source. The homepage mentions consistency for individual representations, but has no clear cross-surface recommendation covering all of them.

Add or strengthen a recommendation about authoritative, consistent facts: prices, availability, units, terms, and identifiers must agree wherever the agent encounters them. This is more valuable to the intended reader than another niche discovery format.

### 6. Explain payment choices without unsupported adoption rankings

The homepage's “supported integration such as UCP or ACP” is already conditional; naming both is not itself a factual error. The bigger problem is the destination [commerce guide](../src/content/docs/protocols/agentic-commerce.mdx), which mixes durable advice with dated “center of gravity,” “deflating,” store counts, and adoption assertions. It also says payment protocols become a serialization detail, contradicting its own warning that payment and delegation contracts differ.

The current [ACP repository](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol) identifies beta status and published `2026-04-17` assets, with separate current development. Its [official introduction](https://www.agenticcommerce.dev/docs) continues to describe an active checkout integration. These establish protocol existence and published artifacts; they do not settle commercial adoption, conversion rates, or the status of any particular checkout product. Treat the older commercial rankings as unverified rather than replacing them with a different unsupported ranking.

[MPP](https://mpp.dev/overview) and [x402](https://x402.org/) overlap in HTTP payment-gated access. Their common HTTP 402 mechanism is not an error. Explain the actual supported payment methods, client/provider integrations, verification, settlement, and failure behavior; avoid an artificial binary distinction. [AP2](https://ap2-protocol.org/) represents authorization through signed mandates. Spending permission and reliable order confirmation are foundational requirements when purchases apply, even when a chosen protocol is emerging.

### 7. Clarify boundaries; do not force every concept into a single exclusive box

Recommended teaching definitions:

| Area              | Reader's question                                       | Primary responsibility                                          |
| ----------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| Discoverability   | Can an agent find and reach us?                         | Crawl access, stable addresses, entry points, official listings |
| Understandability | Can it understand the offer and available actions?      | Facts, meaning, prices/terms, schemas, documented constraints   |
| Auth & identity   | Who is acting, for whom, and with what permission?      | Identity, consent, credentials, scope, revocation               |
| Usability         | Can it complete the task and prove the result?          | Interfaces, safe actions, recovery, testing, observability      |
| Payments          | Can it buy within permission and reconcile the outcome? | Spend authorization, checkout, settlement, order/delivery state |

`page-metadata` can reasonably move beside stable URLs in Discovery because of canonical and alternate URLs, although titles and structured meaning span both areas. Keep shared facts cross-linked instead of treating overlap as a defect in itself. Billing terms belong with understanding an offer; completing payment belongs in Payments.

### 8. Simplify niche advice only where the reader decision remains intact

Fable proposed merging trust claims into catalogs, plugins into listings, MCP resources into MCP tools, and natural-language search into feeds. The first two are reasonable candidates for editorial consolidation. The latter two combine distinct capabilities: resources are not tools, and a query interface is not a publishing feed. Preserve those distinctions, whether as separate cards or explicit subtopics.

Signed bot identity addresses verification distinct from crawler access policy. It can remain conditional in Auth & identity; do not remove it merely because it is specialized. If cards are merged, preserving HTML anchors alone will not satisfy the current coverage validator: update its data mappings deliberately while retaining externally linked anchors.

## Findings corrected or not adopted

- Fable estimated around 30 applicability labels; the exact count is 49.
- “No priority signal” is overstated: the page already says to start at each section's top and has seven Start here labels. The verified issue is weak and inconsistent prioritization, not total absence.
- “No card states public versus protected” is overstated: `auth-onboarding` already begins by asking readers to explain public actions and credentials. It needs a clearer three-way acting-identity decision and a suitable linked introduction.
- Calling the OAuth page's title “Client Credentials and M2M” is imprecise. The title is “OAuth 2.1 for Agents”; the description and content are M2M-heavy.
- Named integrations are not automatically scanner padding. The coverage history confirms fourteen additions, but their usefulness needs a reader-task judgment. Keep distinct capabilities where they matter.
- Do not mark all Payments emerging or merge natural-language queries into feed discovery without preserving their different purposes.
- Do not treat present commercial adoption claims as false solely because Fable questioned them. Their current truth remains unverified.
- Fable's carousel relocation suggestion is deferred to the separate design/reading-experience pass requested by Daniel. The missing explanatory bridge between five teaching areas and eleven technical scoring dimensions can be addressed in content without moving UI.

## Remaining currency checks

This review is not a claim that every protocol page is fully current. The highest-impact inconsistencies above were checked against primary sources. Remaining detailed verification before rewriting fast-changing reference pages:

| Claim                                               | Status / next source                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ora catalog and Is Agentic relationship             | Rechecked live at 2026-09-10T09:33:52Z: Ora 1.24.0, 125 matching definitions. [Is Agentic methodology](https://is-agentic.com/methodology) confirms Ora runs the checks. The recorded 119 HTML total was not independently recounted in this review.   |
| Current MCP revision                                | `/specification/latest` currently redirects to [2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28). This does not verify every local MCP example.                                                                                   |
| A2A release dates and governance                    | Current discovery path verified; reconcile local 1.0.1/date claim with the official release history.                                                                                                                                                   |
| UCP store counts and adoption ranking               | Not verified. Use [official UCP material](https://ucp.dev/) for capabilities and dated evidence for adoption.                                                                                                                                          |
| AP2 governance/date/version and production uptake   | Mandate concept verified; detailed historical/adoption assertions remain unverified. [Primary source](https://ap2-protocol.org/).                                                                                                                      |
| x402 transaction counts and Cloudflare availability | Not verified. Check [x402](https://x402.org/) and the [referenced Cloudflare announcement](https://blog.cloudflare.com/monetization-gateway/); separate announced availability from observed support.                                                  |
| ACP checkout shutdown and conversion claims         | Not established by reviewed primary protocol sources. Recheck the named product's official announcements before retaining those claims.                                                                                                                |
| WebMCP draft date and Chrome origin-trial range     | Draft source opened; precise dates and version range not re-established here. [Draft](https://webmachinelearning.github.io/webmcp/) and [Chrome docs](https://developer.chrome.com/docs/ai/webmcp).                                                    |
| Agent Skills discovery schema, auth.md exact fields | Previously checked in this task history; no new full schema validation in this review. Recheck [discovery schema](https://schemas.agentskills.io/discovery/0.2.0/schema.json) and [auth.md](https://github.com/workos/auth.md) when changing examples. |
| Experimental well-known discovery proposals         | Current adoption/status remains unverified; validate each claimed standard independently rather than treating the scanner's detection as endorsement.                                                                                                  |
| Structured-data freshness                           | Local date is 2026-06-02; it reaches 120 days on 2026-09-30. The date alone is neither proof of correctness nor a reason to bump it without rechecking.                                                                                                |

## Recommended next work, not yet implemented

1. Repair the A2A/NLWeb contracts, reconcile ACP examples, and complete the authentication introduction and separate pending consumer-auth correction set.
2. Refresh and recategorize the glossary, add missing foundational vocabulary, and clarify overloaded names.
3. Separate applicability, priority, and protocol maturity; add explicit cross-surface fact consistency and a short bridge to the docs taxonomy.
4. Consolidate only genuinely duplicate advice, preserving capability distinctions and coverage mappings.
5. Replace fragile adoption rankings with dated, supported evidence and client/provider-based decisions.

Preserve the five questions, the action/feature/why structure, explicit applicability, honest limitations, the broad glossary, stable links, and the task-based evaluation method. No homepage, glossary, documentation guidance, styling, or layout was changed as part of this review. Only review artifacts were written; nothing was committed, pushed, or deployed.
