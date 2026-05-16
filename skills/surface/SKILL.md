---
name: surface
description: Make software legible to agents. Use when asked to audit or score agent readiness, make a codebase agentic, improve agent DX, add or assess AGENTS.md/llms.txt/MCP/OpenAPI/CLI/tooling surfaces, generate an agent-readiness plan, scaffold agent infrastructure, create agents/tools/workflows/memory/model routing/browser/sandbox capabilities, or improve agent consumability across APIs, CLIs, docs, auth, errors, tests, retrieval, and multi-agent systems.
---

# Surface

Make software easier for agents to discover, understand, call, test, and safely modify.

Surface has two main workflows:

- **Audit**: detect project surfaces, score agent readiness, produce findings, and write improvement plans.
- **Scaffold**: add or extend agent infrastructure such as agents, tools, workflows, model routing, retrieval/RAG, memory, browser access, sandbox execution, and MCP.

Use the existing project shape first. Read files before making claims or generating code.

## Quick Routing

| User asks for | Route |
| --- | --- |
| audit, score, assess, agent-ready, agent-readiness | Audit |
| plan, transform, improve, fix agent DX | Audit, then optionally execute |
| add MCP, create llms.txt, write AGENTS.md, improve discovery | Audit single-area transform unless they ask for direct generation |
| create agent, add tool, build workflow, scaffold, init | Scaffold |
| add retrieval, RAG, semantic search, memory, model routing, browser tool, sandbox tool | Scaffold |
| ambiguous "make this agentic" | Start with Audit unless they clearly want new agent runtime code |

If the user explicitly wants a direct artifact, do not force a full audit. Do a narrow detection pass, create the artifact, and explain the skipped audit scope.

## Modes

Audit modes:

- `score`: quick scorecard only.
- `plan`: scorecard, findings, and transformation plan.
- `transform`: plan plus execution after explicit confirmation.
- `--dimension=<name>`: score one dimension only.
- `--format=json`: return structured JSON as well as, or instead of, prose when useful.

Scaffold modes:

- `init`: initialize agent infrastructure.
- `agent <name>`: create a bounded agent.
- `tool <name>`: create a typed tool.
- `workflow <name>`: create a deterministic or partly agentic workflow.
- `retrieval`: add document retrieval, RAG, semantic search, or search-backed agent context.
- `memory`: add durable memory only when the use case requires it.
- `model`: add multi-provider model routing.
- `browser`: add browser/web access with guardrails.
- `sandbox`: add isolated code execution with guardrails.

## Required Context Discipline

1. Start by detecting the project type, package manager, framework, runtime, and existing agent surfaces.
2. Use fast file discovery (`rg`, `rg --files`, `find`) and read the important files. Do not infer from filenames alone.
3. Keep findings evidence-based. Cite paths and line numbers where possible.
4. Prefer project-native conventions over generic templates.
5. Treat destructive, authenticated, browser, sandbox, and production operations as high-risk. Require clear confirmation before executing them.
6. Preserve user edits. Do not overwrite existing AGENTS.md, CLAUDE.md, llms.txt, MCP servers, or agent files without reading and merging.

## Audit Workflow

Read `references/audit-workflow.md` before running a full audit, scorecard, plan, or transform.

Also load dimension references only when needed:

| Dimension | Reference |
| --- | --- |
| API Surface | `references/api-surface.md` |
| CLI Design | `references/cli-design.md` |
| MCP Server | `references/mcp-servers.md` |
| Discovery & AEO | `references/discovery-aeo.md` |
| Authentication | `references/authentication.md` |
| Error Handling | `references/error-handling.md` |
| Tool Design | `references/tool-design.md` |
| Context Files | `references/context-files.md` |
| Multi-Agent | `references/multi-agent.md` |
| Testing | `references/testing.md` |
| Data Retrievability | `references/data-retrievability.md` |

Do not load every reference at once. Load the workflow reference first, then only the relevant dimension files.

### Audit Detection Checklist

Gather these surfaces before scoring:

- Stack files: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `deno.json`, `bun.lockb`, lockfiles.
- API specs/routes: OpenAPI, Swagger, `app/api`, `pages/api`, route handlers, controllers.
- CLI: `bin` field, command entrypoints, argument parsers, TTY/output handling.
- MCP: `.mcp.json`, `.mcp/mcp.json`, `@modelcontextprotocol/sdk`, `mcp-handler`, `@mastra/mcp`, server transports, protocol version, roots, sampling, elicitation, and task support.
- Discovery: `AGENTS.md`, `CLAUDE.md`, Cursor/Copilot/Windsurf rules, `llms.txt`, `llms-full.txt`, `robots.txt`, `sitemap.xml`, `.well-known`.
- Agent web readiness: Markdown content negotiation, JSON-LD, OpenAPI links, API catalog, MCP metadata, OAuth protected-resource metadata.
- Auth: OAuth, API keys, bearer/JWT validation, scopes, token exchange, env-var handling.
- Tools/agents/workflows: OpenAI Agents SDK, Claude Managed Agents, Claude Code SDK, Agent Skills, Vercel AI SDK, Vercel Workflow, Mastra, LangGraph, Cloudflare Agents, custom tool registries.
- Retrieval: RAG pattern family, document ingestion, embeddings, vector/search stores, hybrid search, rerankers, graph/structured retrieval, metadata filters, eval scripts.
- Tests/evals: unit, integration, MCP transport tests, CLI contract tests, agent evals, CI.

### Scoring Rules

- Score each applicable dimension from 0-3.
- Mark a dimension N/A only when the project genuinely cannot expose that surface.
- Derive the final rating from the scaled score out of 30, not the raw score.
- Score current implementation, not intent or roadmap.
- Be conservative when evidence is partial.
- If delegation is available and appropriate, score independent dimensions in parallel. If not, score locally with the same output format.

For the exact scorecard, finding, plan, and delta formats, use `references/audit-workflow.md`.

## Scaffold Workflow

Read `references/scaffold-workflow.md` before generating or modifying agent infrastructure.

Load additional scaffold references only as needed:

| Need | Reference |
| --- | --- |
| Project layout and naming | `references/conventions.md` |
| Agents, tools, security, workflow basics | `references/patterns.md` |
| Multi-provider model routing | `references/model-routing.md` |
| Branches, loops, parallelism, suspend/resume | `references/workflow-composition.md` |
| Wiring and framework pitfalls | `references/gotchas.md` |
| House style for generated docs/code | `references/house-style.md` |

### Scaffold Principles

1. **Tools over prompt knowledge**: external facts, mutations, and retrieval belong in tools.
2. **Narrow ownership**: one agent owns one decision boundary.
3. **Bounded execution**: every agent or workflow needs a step budget, stop condition, and failure path.
4. **Workflow first**: predictable, resumable, auditable sequences should be workflows; use agents for judgment-heavy steps.
5. **Prompt as configuration**: prompts encode role, constraints, and format, not hidden application branching.
6. **Memory is earned**: add durable memory only for cross-turn recall, durable entity state, or retrieval over durable data.
7. **Eval hooks ship with scaffolds**: note the first tests/evals that should verify routing, recovery, and guardrails.
8. **High-risk tools need policy**: browser, sandbox, write, auth, and production tools need allowlists, quotas, audit logs, timeouts, and confirmation gates.

## Framework Guidance

- Prefer the project's existing deliberate agent framework first.
- Prefer OpenAI Agents SDK when the project is OpenAI-native, uses the Responses API, needs OpenAI tracing/evals/handoffs, hosted tools, remote MCP, realtime voice, files, or sandbox execution close to OpenAI's platform.
- Prefer Claude Managed Agents when the project is Claude-native and needs Anthropic-managed sessions, containers/sandboxing, Agent Skills, built-in tools, memory, vault credentials, webhooks, multiagent sessions, or outcomes.
- Prefer Claude Code SDK when the project is building coding/repo agents that need the Claude Code harness, tool permissions, file/shell/code execution, session management, and MCP extensibility.
- Prefer Vercel AI SDK for Next.js/Vercel apps that already use streaming UI, tool calling, provider routing, AI Gateway, or route-handler based chat. Pair it with Vercel Workflow when execution must pause, resume, retry, wait on approvals, or span minutes to months.
- Prefer Cloudflare Agents when the project is Workers-native or needs Durable Objects, WebSockets, Workers AI, AI Gateway, Browser Rendering/Browser Run, Vectorize, AI Search, Queues, or Sandbox close to the Worker runtime.
- Prefer Mastra for TypeScript projects that need a full local agent/workflow/memory/RAG/MCP framework and do not already have a stronger platform constraint.
- Adapt to existing LangGraph, MCP, or custom runtime patterns when already present.
- Do not generate Node-only APIs in Workers-native projects.

## Interaction Pattern

For audits:

1. Present detected stack and surfaces.
2. Score the applicable dimensions.
3. Write `docs/surface/audit-YYYY-MM-DD.md` for full audits.
4. Write `docs/surface/plan.md` for plan mode.
5. Ask before executing transform work.

For scaffolds:

1. Present detected stack, framework, and existing inventory.
2. Ask only the missing decisions needed to generate useful code.
3. Preview file changes and key decisions.
4. Generate narrowly scoped files.
5. Register/export/wire the new code.
6. Run or suggest the project's typecheck/test command according to the user's permissions and repo norms.

## Output Files

Use these defaults unless the project already has a better convention:

- Audit report: `docs/surface/audit-YYYY-MM-DD.md`
- Current scorecard/history: `docs/surface/scorecard.md`
- Transformation plan: `docs/surface/plan.md`
- Agent context: `AGENTS.md` at repo root
- Web discovery: `public/llms.txt`, `public/llms-full.txt`, or framework-equivalent routes
- MCP discovery/auth: `.mcp.json`, `.mcp/mcp.json`, and `.well-known/*` where applicable

## Edge Cases

- **Monorepo**: offer per-package scoring and aggregate scoring; do not flatten package-specific context.
- **Polyglot repo**: score each exposed surface in its native language; report the weakest user-facing path.
- **Pure CLI**: Discovery & AEO may be N/A, but Context Files, CLI Design, Error Handling, Testing, and MCP still matter.
- **No web presence**: do not penalize for missing public `llms.txt`; consider repo-local context files and package metadata instead.
- **Existing generated context**: improve it surgically; avoid replacing hard-won local notes.
- **Re-audit**: read previous `docs/surface/scorecard.md` and show deltas.
- **Transform mode**: execution requires explicit user confirmation after the plan.

## Current Standards Notes

- AGENTS.md is a Markdown convention for project-specific agent instructions. Treat it as the cross-tool baseline and keep tool-specific files as overlays.
- `llms.txt` is a useful Markdown discovery convention for inference-time retrieval, not a guaranteed SEO or citation signal. Pair it with crawlable docs, structured data, sitemap, and stable canonical URLs.
- Choose RAG architecture by data shape and query need, not by trend: dense-only for prototypes, hybrid + rerank for most production knowledge search, graph/LightRAG when relationships drive answers, multimodal retrieval for visual/audio corpora, and compiled/optimized retrieval when the query workload is stable enough to justify preprocessing.
- MCP 2025-11-25 is the current baseline for this skill. Check tools, resources, prompts, roots, sampling, elicitation, tasks, Streamable HTTP, and protocol-version negotiation where relevant.
- Remote protected MCP servers should publish OAuth protected-resource metadata using RFC 9728, point clients to authorization-server metadata, and validate issuer, audience/resource, expiry, and scopes on every protected request.
- MCP tool descriptions and annotations are advisory hints, not authorization policy. Treat them as untrusted unless the server is trusted, and enforce approvals, auth, and scope checks in the server or workflow.
- MCP tools should provide input schemas, `outputSchema` plus `structuredContent` for structured results, annotations, resource links where useful, and structured recoverable errors.
- Anthropic guidance changes quickly. For Claude-native scaffolds, check Claude Platform release notes for Managed Agents, Agent Skills, MCP connector limits, current model IDs, context limits, and beta headers before hard-coding recommendations.

## Useful References

- AGENTS.md and Agentic AI Foundation: https://openai.com/index/agentic-ai-foundation/
- AGENTS.md format: https://agents.md
- llms.txt proposal: https://llmstxt.org
- MCP specification: https://modelcontextprotocol.io/specification
- OpenAI Agents SDK: https://platform.openai.com/docs/guides/agents-sdk/
- Claude Platform release notes: https://platform.claude.com/docs/en/release-notes/overview
- Claude Managed Agents: https://platform.claude.com/docs/en/managed-agents/overview
- Claude Code SDK: https://docs.anthropic.com/en/docs/claude-code/sdk
- Vercel AI SDK: https://ai-sdk.dev/docs
- Vercel Workflow: https://vercel.com/docs/workflow
- OAuth Protected Resource Metadata (RFC 9728): https://www.rfc-editor.org/rfc/rfc9728.html
- Agent Surface RAG patterns: /docs/data-retrievability/rag-patterns
- Agent Surface tooling catalog: /docs/tooling-catalog
