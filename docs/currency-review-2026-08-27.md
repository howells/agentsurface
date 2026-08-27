# Currency and Relevance Review — 2026-08-27

## Scope

This review covered the published guide, the distributable `surface` skill, specialist prompts, templates, protocol guidance, fast-decay pages, external references, and dependency ranges. It is a currency and relevance review, not a new 11-dimension readiness score.

Primary-source checks focused on:

- the W3C WebMCP Community Group draft and Chrome implementation guidance
- the distinct `webmcp.dev` JavaScript library
- Vercel's Is Agentic service and its Ora-backed methodology
- the final MCP `2026-07-28` specification and release status
- current Google, Anthropic, Mastra, Promptfoo, LangGraph, Claude Code, GitHub Copilot, and OpenAI documentation

## Findings and Applied Changes

### 1. WebMCP needed a canonical home

The watchlist described an older February proposal using `navigator.modelContext`. The current draft uses `document.modelContext`, has imperative and declarative APIs, and is a W3C Community Group report rather than a W3C Standard. Chrome's origin trial begins in Chrome 149.

Applied:

- added `src/content/docs/protocols/webmcp.mdx` with a verified imperative example, lifecycle cancellation, origin and Permissions Policy boundaries, and selection guidance
- distinguished the current browser proposal from remote MCP and from the older `@jason.today/webmcp` library at `webmcp.dev`
- added WebMCP to protocol navigation, protocol selection, discovery evidence, the skill's current-standards notes, and the canonical reference index

### 2. Is Agentic is useful external evidence, not a replacement score

Is Agentic is a Vercel public-site readiness service powered by Ora. Its score estimates whether an agent can discover, access, understand, and use a public website. Essential checks share 80 points, Recommended checks share 20, and emerging signals can add up to five bonus points. Inapplicable surfaces are excluded and API, OAuth, MCP, GraphQL, and MCP Apps checks activate only when detected.

Applied:

- added Is Agentic to the evaluation and observability catalog and reference index
- documented its read-only report API, CLI, remote MCP server, and agent skill
- added an explicit boundary between public outside-in scans and source-backed Surface audits
- added scanner evidence guidance to the `surface` skill reference

Verification limit: `is-agentic.com` is blocked on this laptop, as expected for the new domain. The review used its public official pages through external web retrieval. No scan of `agentsurface.dev` was started, and no score is claimed. A future scan should record the canonical report URL and scan timestamp, then trace each relevant finding back to source and deployment configuration.

### 3. MCP guidance was still written for a future release

The guide said the `2026-07-28` revision was scheduled and advised building against `2025-11-25`. The final revision has shipped and all Tier 1 SDKs support it. The old text also called `server/discover` mandatory; it is optional.

Applied:

- made `2026-07-28` the default build and audit target across docs, skill references, specialist prompts, and templates
- described the stateless core and per-request metadata as current behavior
- treated `2025-11-25` as labeled compatibility guidance
- moved Tasks out of the core primitive list and documented `io.modelcontextprotocol/tasks`, `tasks/get`, and `tasks/update`
- corrected `server/discover` from mandatory to optional
- replaced draft and rollout links with the final specification and release summary
- removed stale “release candidate” and “SDK support catching up” language

### 4. Fast-decay coverage and model examples had drifted

Applied:

- reverified the docs-coverage audit against Mastra's current navigation, including harnesses, connections, traces, metrics, evals, and datasets
- updated Google examples to Gemini 3.7 Flash while retaining Gemini 3.6 Flash only as a deliberate compatibility pin
- updated the Anthropic platform page to record the completed Opus 4.1 retirement
- updated the Gemini Embedding 2 reference

### 5. External links and schemas had accumulated rot

A bounded repository scan extracted 819 external URL occurrences. Many failures were expected noise from placeholders, authentication, anti-bot responses, and example domains, so the review did not claim that every external endpoint is machine-checkable.

Confirmed stale references were repaired for Promptfoo, LangGraph, Claude Code project memory, GitHub Copilot custom instructions, Bun cron, OpenAI Responses, Gemini embeddings, the MCP Registry, and Gemini Enterprise custom MCP servers. Dead A2A and MCP server-card `$schema` URLs were removed rather than replaced with invented schemas.

### 6. Compatible dependencies were behind

The dependency catalog and direct ranges were refreshed without crossing declared major-version boundaries. Notable updates include Next 16.3.3, React 19.2.8, Fumadocs core/UI 16.15.2, MCP TypeScript SDK 1.30.0, Tailwind 4.3.3, Motion 12.43.0, and shadcn 4.19.0.

Deferred major upgrades — Fumadocs MDX 15, Motion 13, TypeScript 7, `@types/node` 26, and `@howells/lint` 2 — require dedicated compatibility review and are not silently bundled into a currency pass.

## Claim Ceiling

- WebMCP remains a draft Community Group report with a Chrome origin trial, not a cross-browser production baseline.
- `webmcp.dev` is covered as a distinct legacy library, not presented as the current browser specification.
- Is Agentic was researched but not run against Agent Surface from this blocked laptop.
- External link checking was bounded and triaged; passing the repository's own integrity, lint, and build gates is the release criterion for this change.
- Major dependency upgrades remain explicit follow-up work.

## Primary Sources

- [WebMCP Community Group draft](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
- [webmcp.dev](https://webmcp.dev/)
- [Is Agentic methodology](https://is-agentic.com/methodology)
- [Is Agentic developer docs](https://is-agentic.com/docs)
- [MCP 2026-07-28 specification](https://modelcontextprotocol.io/specification/2026-07-28/)
- [MCP 2026-07-28 release](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [Gemini models](https://ai.google.dev/gemini-api/docs/models)
- [Mastra documentation](https://mastra.ai/docs)
