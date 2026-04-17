# Agentify Scoring Rubric

## Summary

The complete 0–3 scoring criteria for all 11 dimensions. Each dimension has specific detection patterns (file globs, grep patterns, command output) to identify score level. Scores measure both presence and quality: 0 = not implemented, 1 = basic/weak, 2 = good/functional, 3 = excellent/production-ready. Every score must cite concrete evidence (paths, grep, command output), never guesses.

- **Scoring philosophy**: Evidence-based, specific file/line references, avoid optimism bias
- **Confidence levels**: High (>80% examined), Medium (representative sample), Low (<30%, time-constrained)
- **N/A trap**: Mark N/A only when dimension is genuinely inapplicable (not "we haven't built it yet")
- **11 dimensions**: API Surface, CLI Design, MCP Server, Discovery & AEO, Authentication, Error Handling, Tool Design, Context Files, Multi-Agent, Testing, Data Retrievability

---

Score each dimension 0-3. Evidence must be specific (file paths, line numbers, concrete observations).

---

## Dimension 1: API Surface

**What it measures:** How well the project's HTTP API is described for AI agent tool generation.

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No machine-readable API spec. Endpoints exist but no OpenAPI, no formal schema. | No openapi.json/yaml, no swagger.json, no API schema files |
| 1 | OpenAPI exists but descriptions are human-oriented. Missing operationIds, vague summaries, no examples, nested params. | OpenAPI present but: descriptions say "Gets the data" not when/why; missing operationId on >30% of operations; no example values |
| 2 | Agent-oriented descriptions (when to use, vs alternatives, prerequisites). Proper operationIds (verb_noun). Enums exhaustive. Examples on all params. Flat parameter structures. | Descriptions include disambiguation ("Use this when... For X instead, use..."). operationId on all operations. enum values on constrained strings. example on schema properties. |
| 3 | Full agent optimization. Arazzo workflows for multi-step operations. Semantic extensions (x-action, x-agent-*). LAPIS-style token efficiency. Auto-generated MCP from spec. | Arazzo file present. x-speakeasy-mcp or x-action extensions. MCP server generated from spec. Description token efficiency <200 tokens per operation. |

**Key files:** openapi.json, openapi.yaml, swagger.json, api/ routes, Arazzo files

---

## Dimension 2: CLI Design

**What it measures:** How well the project's CLI is designed for AI agent operation, based on the Agent DX CLI Scale.

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | Human-only output. Tables, color codes, prose. No structured format. Interactive prompts with no bypass. | CLI exists but: no --json flag; no --output flag; interactive prompts without --yes; no machine-readable output path |
| 1 | JSON output exists but inconsistent. Some commands support --json, others don't. Errors may not be structured. | --json or --output json on some commands but not all. Inconsistent JSON shapes across commands. Non-zero exit code but no semantic distinction. |
| 2 | Consistent JSON across all commands. Errors return structured JSON. Semantic exit codes (0-5). --dry-run on mutations. TTY detection. Non-interactive when flags provided. | All commands produce JSON. Exit codes differentiate success/failure/usage/notfound/permission/conflict. --dry-run on all write operations. isatty() detection suppresses spinners when piped. |
| 3 | NDJSON streaming for paginated results. Full schema introspection (--schema dumps params/types/required as JSON). Input hardening (path traversal, control chars, encoded segments). SKILL.md shipped. Agent knowledge packaging. | --schema or --describe command returns full machine-readable schema. NDJSON streaming. Input validation rejects ../, %2e, control chars. SKILL.md or AGENTS.md ships with the CLI. |

**Key files:** bin/, CLI entry points in package.json, commander/yargs/oclif configs

**N/A when:** Project has no CLI tool and is not a CLI tool.

---

## Dimension 3: MCP Server

**What it measures:** Whether and how well the project exposes an MCP server.

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No MCP server. No .mcp.json. No MCP SDK imports. | No files importing @modelcontextprotocol/sdk, mcp-handler, @mastra/mcp, or similar |
| 1 | Basic MCP server exists but minimal. Few tools with weak descriptions. No annotations. No resources. No error handling. | MCP server present but: <5 tools; descriptions are terse (<20 words); no annotations object; no resources or prompts; errors not structured with isError |
| 2 | Well-structured MCP. Proper tool annotations (readOnlyHint, destructiveHint). Agent-oriented descriptions. Structured error handling with isError. outputSchema declared. Resources exposed for static data. | Tools have annotations. Descriptions explain when/why to use. isError pattern for tool errors. outputSchema on tools that return structured data. Resources for config/static data. |
| 3 | Production MCP. OAuth 2.1 auth for remote. Pagination on list operations. Progress notifications for long ops. Multiple transports (stdio + HTTP). Tested with InMemoryTransport. Tool count optimized (<20). | Auth implementation present. Pagination on tools returning arrays. Progress notifications. Both stdio and HTTP transports. Test files using InMemoryTransport. |

**Key files:** .mcp.json, mcp-server files, tools/ directories

---

## Dimension 4: Discovery & AEO

**What it measures:** How discoverable and consumable the project is by AI agents.

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No agent-specific discovery files. No llms.txt, no AGENTS.md, no structured data. robots.txt blocks AI bots. | No llms.txt at web root. No AGENTS.md in repo. No JSON-LD in HTML. robots.txt Disallow for GPTBot/ClaudeBot. |
| 1 | Basic discovery. AGENTS.md or llms.txt exists but minimal. No structured data. | AGENTS.md present but <50 lines or auto-generated. OR llms.txt present but <10 links. No JSON-LD. |
| 2 | Good discovery. llms.txt with categorized links + AGENTS.md with commands and conventions. JSON-LD on key pages. robots.txt allows AI bots. Sitemap with accurate lastmod. | llms.txt with H2 sections and descriptions. AGENTS.md with commands, conventions, boundaries. At least FAQPage or TechArticle JSON-LD. robots.txt explicitly allows AI crawlers. |
| 3 | Full AEO. llms.txt + llms-full.txt. Content negotiation (Accept: text/markdown → Markdown response). Vary: Accept header. x-markdown-tokens header. /.well-known/ endpoints. Stripe-style Instructions section. "Copy for AI" button. Token budgets per page. NLWeb /ask endpoint. | llms-full.txt present. Markdown content negotiation in server code. /.well-known/ai or agent-card.json. Multiple JSON-LD schema types. All docs pages <30K tokens. |

**Key files:** llms.txt, llms-full.txt, AGENTS.md, robots.txt, sitemap.xml, layout files (for JSON-LD), server/middleware (for content negotiation)

**N/A when:** Project has no web presence (pure library, CLI-only tool).

---

## Dimension 5: Authentication

**What it measures:** Whether agents can authenticate without human browser interaction.

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | Browser-only auth. OAuth authorization code flow as only option. CAPTCHAs. Session cookies required. | Auth requires redirect to browser. No client_credentials grant. CAPTCHA in auth flow. Cookie-based sessions only. |
| 1 | API keys exist but no M2M OAuth. Keys may be long-lived or overly broad. | API key auth available. No OAuth client_credentials. Keys may be permanent. No scope limitation. |
| 2 | OAuth 2.1 Client Credentials grant. Scoped, short-lived tokens. Env var injection. JWT validation (iss, aud, exp). | OAuth config with client_credentials grant_type. Token scopes defined. JWT validation checking signature + claims. Tokens expire in hours. |
| 3 | Token Exchange (RFC 8693) for narrowly-scoped ephemeral tokens. Agent identity as first-class principal. Delegation patterns. MCP OAuth 2.1 compliance. | Token exchange endpoint. Audience-restricted tokens. Agent identity tracking. .well-known/oauth-protected-resource present. |

**Key files:** auth config, OAuth setup, middleware, .well-known/ files, JWT validation code

---

## Dimension 6: Error Handling

**What it measures:** Whether errors give agents enough information to recover.

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | Generic HTTP status codes only. No structured error body. "400 Bad Request" with no detail. | Error responses return plain text or empty bodies. No consistent error schema. |
| 1 | Some structured errors but inconsistent. Some endpoints return JSON errors, others don't. | Partial error schema (some endpoints have type/message, others don't). No is_retriable field. |
| 2 | RFC 7807 Problem Details everywhere. type, title, status, detail fields. is_retriable boolean. suggestions array. trace_id for debugging. | Consistent error schema matching RFC 7807. is_retriable on all errors. suggestions array with recovery steps. Rate limit 429 includes Retry-After. |
| 3 | Full agent error design. doc_uri linking to documentation. Intent tracing on cancellation. Domain-specific error codes alongside HTTP. X-RateLimit-* headers on every response. CLI errors with semantic exit codes + JSON. | doc_uri in error responses. Intent trace structure on cancel/abort. Rate limit headers on all responses (not just 429). Structured CLI errors. |

**Key files:** error handling middleware, API error responses, error types/classes

---

## Dimension 7: Tool Design

**What it measures:** Quality of tool definitions for AI agent consumption, across any framework.

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No formal tool definitions. Functions exist but no schema, no description. | No tool() calls, no @tool decorators, no createTool(), no MCP tool registrations. |
| 1 | Basic tool schemas exist but descriptions are terse or missing. No examples. | Tool definitions present but descriptions <20 words. No .describe() on Zod fields. No inputExamples. |
| 2 | Good tool design. verb_noun naming. Agent-oriented descriptions with "when to use" and disambiguation. Typed schemas with field descriptions. | Descriptions include "Use when..." and "Do not use for...". All schema fields have descriptions. enum values on constrained strings. <10 tools per agent/context. |
| 3 | Excellent tool design. toModelOutput reducing token usage. Tool annotations (readOnly, destructive, idempotent). Dynamic tool selection support (activeTools, defer_loading). Cross-framework definitions (works in MCP + AI SDK + LangChain). | toModelOutput defined. annotations object present. activeTools or defer_loading patterns. Tool definitions portable across frameworks. |

**Key files:** tools/ directories, agent definitions, MCP tool registrations

---

## Dimension 8: Context Files

**What it measures:** Quality of agent context files for AI coding assistants.

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No AGENTS.md, CLAUDE.md, or equivalent. | No agent context files found. |
| 1 | Context file exists but generic or auto-generated. Prose paragraphs. No actionable commands. | AGENTS.md or CLAUDE.md present but: >500 lines, or contains architecture overview without commands, or was clearly auto-generated (/init without curation). |
| 2 | Hand-curated context files. Commands with exact flags first. Testing expectations. Three-tier permission boundaries (always/ask-first/never). Code examples. | Commands section at top with exact invocations. Permission boundaries defined. <370 lines. Non-obvious conventions documented with examples. |
| 3 | Multi-tool context. AGENTS.md (universal) + CLAUDE.md (Claude-specific) + .cursor/rules (Cursor-specific). Progressive disclosure (points to detailed docs). Updated iteratively from friction. | Multiple context file formats. Progressive disclosure via file references. Permission boundaries enforced. Files clearly evolved from usage (not auto-generated). |

**Key files:** AGENTS.md, CLAUDE.md, .cursor/rules/*.mdc, .github/copilot-instructions.md, .windsurf/rules/

---

## Dimension 9: Data Retrievability

**What it measures:** How effectively the codebase makes data searchable and retrievable to AI agents via vector embeddings, hybrid search, reranking, and agentic RAG patterns.

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No data retrieval infrastructure. Documents or data are not indexed, searchable, or retrievable by agents. No embeddings, vector DB, or search indexing. | No `.embed()` calls, no vector DB client, no BM25 index, no `retriever()` or `RAG()` patterns. Files are static or database-only without semantic search. |
| 1 | Basic single-stage dense retrieval only. Embeddings are computed but no reranking, no hybrid search, no chunking strategy. No evaluation. | Vector DB exists (Pinecone, Qdrant, pgvector) but no hybrid layer, no chunking logic, no RAGAS/MTEB evals. Embedding model is generic. |
| 2 | Good retrieval infrastructure. Hybrid search (BM25 + dense) with fusion (RRF). Reranking (Cohere/Voyage) present. Chunking strategy documented with >10% overlap. Basic evaluation metrics (recall@k, nDCG). | Hybrid pipeline in code: BM25 + dense + RRF/Weaviate fusion. Reranking step before generation. Chunk size/overlap >10% documented. RAGAS or MTEB eval script present. Mid-tier embedding model. |
| 3 | Excellent retrieval system. Multi-stage with query planning and reflection. Metadata filtering and namespace isolation. Contextual Retrieval (Anthropic pattern) or late-interaction (ColBERT). Knowledge graph or agentic RAG. Embedding drift detection. Comprehensive evaluation (RAGAS + domain metrics in CI/CD). | Agentic retriever with query decomposition and reflection. Contextual embeddings or prepended summaries. ColBERT/ColPali or hybrid graph+vector. Metadata filters on all queries. Drift detection. RAGAS + custom metrics. GraphRAG or LightRAG for complex domains. |

**Key files:** embedding pipelines, vector DB clients, chunking logic, reranking setup, RAG frameworks, eval scripts

---

## Dimension 10: Multi-Agent Support

**What it measures:** How well the project supports multi-agent orchestration.

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No multi-agent patterns. Single-agent or no agent support. | No agent orchestration code. No sub-agent definitions. |
| 1 | Basic sub-agent support. Can spawn agents but no structured delegation. | Agent definitions exist but: no state management between agents, no delegation patterns, no memory sharing. |
| 2 | Supervisor pattern. Structured delegation with clear agent roles. State management. Human-in-the-loop at critical points. | Supervisor/orchestrator agent delegates to specialists. State passed between agents. Approval gates on destructive actions. |
| 3 | Advanced multi-agent. A2A agent cards published. Workflow composition. Memory patterns (working, semantic, observational). Dynamic agent selection. Cross-framework interop. | /.well-known/agent-card.json published. Multiple orchestration patterns. Memory system with persistence. Agents discoverable by external systems. |

**Key files:** Agent definitions, workflow files, orchestration code, .well-known/agent-card.json

**N/A when:** Project is not an agent system and does not orchestrate agents.

---

## Dimension 11: Testing & Evaluation

**What it measures:** Whether agent interactions are tested and evaluated.

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No agent-specific tests. Standard unit/integration tests only. | No test files targeting tool selection, agent behavior, or MCP server testing. |
| 1 | Basic tool routing tests. Some verification that tools are called correctly. | Test files that verify tool selection or MCP tool responses. But: no error recovery testing, no multi-step flow testing. |
| 2 | Comprehensive tool testing. Selection accuracy, parameter correctness, error recovery. Multi-step flow tests. MCP server tested with InMemoryTransport. | Tests cover: correct tool selection, valid parameters, error → recovery, multi-step sequences. MCP tests use InMemoryTransport.createLinkedPair(). |
| 3 | Full eval suite. pass@k and pass^k metrics. Non-determinism handling (multiple runs per test). Regression detection. CI-integrated. Eval-driven development. | Statistical metrics (multiple runs per test case). Baseline comparison for regression. Eval suite runs in CI. Test cases from real production failures. |

**Key files:** Test directories, eval suites, CI configuration

---

## Scoring Notes

- Score based on **current state**, not intent or roadmap
- Evidence must be **specific**: cite file paths and line numbers
- When uncertain, score conservatively (lower)
- Confidence levels: High (examined >80% of relevant code), Medium (examined key files), Low (sampled)
- N/A dimensions are excluded from the total and max is adjusted proportionally
