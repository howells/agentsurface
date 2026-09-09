# Ora / orank remediation — 2026-09-09

Scope: selected findings from the agentsurface.dev scan, verified against the existing Next.js/Fumadocs documentation service. This is a focused remediation, not a new Surface scorecard.

| Finding | Action | Surface |
| --- | --- | --- |
| OpenAPI missing | Added `/openapi.json` describing public page-level search at `/api/docs/search` and existing Markdown retrieval at `/api/md/{slug}`. Linked from HTML and `/llms.txt`. | API, discovery |
| JSON errors missing | Added RFC 9457 JSON errors with codes, messages, and recovery hints for invalid search, missing Markdown, unknown API routes, and search failures. Preserved the Fumadocs search success contract. | API |
| Homepage WebMCP missing | Registered read-only `search_docs` and `get_page` from the root layout. Uses `document.modelContext` first and legacy `navigator.modelContext` only as fallback; aborts registration on unmount. | Browser tools |
| Auth discovery missing | Added `/auth.md` explaining anonymous public access. OAuth protected-resource and authorization-server metadata are inapplicable: no protected resource, identity endpoint, or authorization server exists. | Auth, docs |
| Wikipedia/Wikidata absent | Deferred. Independent coverage and eligibility must precede an externally published entity/article. No fabricated entity or links added. | External discovery |
| Ora missing from catalog | Added direct Ora/orank catalog entry, capability-map entry, methodology/API links, and scan guidance. | Docs |

Validation: docs integrity and TypeScript checks passed. Real local HTTP checks exercised OpenAPI, successful search, invalid query/limit, successful Markdown retrieval, missing pages, unknown API routes, public access policy, and the existing UI search endpoint. The rendered homepage loaded successfully in Playwright. That browser does not expose WebMCP, so native tool invocation remains unverified; the HTTP tools work independently of browser support.

Production cached score fetched from `https://ora.ai/api/score/agentsurface.dev`: 61/100, C. Changes are local and have not been pushed or deployed, so this is a baseline, not an improved score. After deployment, POST `{"url":"agentsurface.dev"}` to `https://ora.ai/api/scan`; respect its freshness cache and rate limits.

Sources: https://ora.ai/methodology, https://ora.ai/api/openapi.json, https://webmachinelearning.github.io/webmcp/, https://github.com/workos/auth.md.
