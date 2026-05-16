# Surface Scaffold Workflow

Use this reference before creating or changing agent infrastructure.

## Phase 0: Project Detection

Read the project before scaffolding.

Detect:

- Package manager and workspace layout.
- Framework/runtime: Next.js, Node, Python, Workers, serverless, CLI, library.
- Existing agent framework: OpenAI Agents SDK, Claude Managed Agents, Claude Code SDK, Agent Skills, Vercel AI SDK, Vercel Workflow, Mastra, LangGraph, MCP, Cloudflare Agents, custom.
- Existing directories: `agents`, `tools`, `workflows`, `src/mastra`, `packages/agents`, `triggers`.
- Existing model routing, retrieval/RAG, memory, browser access, sandbox execution.
- TypeScript module target and runtime constraints.
- Test and typecheck commands.

Present the inventory before generating code.

## Framework Recommendation

Choose the framework by project shape, not by preference.

Prefer the existing framework when the repo already has one deliberately wired.

Recommend OpenAI Agents SDK when:

- The project is OpenAI-native or already uses the Responses API.
- The user needs handoffs, tracing, evals, built-in/hosted tools, remote MCP, realtime voice, files, or sandbox execution close to OpenAI's platform.
- The agent should preserve OpenAI response items, traces, and hosted tool behavior rather than abstracting them behind another framework.

Recommend Claude Managed Agents when:

- The project is Claude-native and the agent runtime should be managed by Anthropic.
- The user needs managed sessions, secure containers/sandboxing, Agent Skills, code execution, memory, vault credentials, webhooks, multiagent sessions, outcomes, or Claude Platform on AWS.
- The app benefits from Anthropic-owned event/session lifecycle more than embedding the loop inside the app server.

Recommend Claude Code SDK when:

- The project is building coding, repository, incident response, or local automation agents.
- It needs the Claude Code harness, file/shell/code tools, explicit tool permissions, session management, and MCP extensibility.
- The user wants programmatic control of Claude Code-like behavior from a service or CLI.

Recommend Vercel AI SDK when:

- The project is a Next.js or Vercel app.
- It already uses `ai`, `@ai-sdk/*`, streaming chat UI, route handlers, provider routing, AI Gateway, or UI message persistence.
- The primary need is app-local generation, tool calling, streaming UX, structured outputs, or active tool selection.

Recommend Vercel Workflow in addition to AI SDK when:

- Agent work must pause/resume, wait for human approval, retry durable steps, react to hooks/webhooks, or span minutes to months.
- The app is already deployed on Vercel or the user wants Vercel-managed workflow state, queues, and observability.

Recommend Cloudflare Agents when:

- The project is Workers-native.
- It uses or needs Durable Objects, WebSockets, Queues, Workers AI, AI Gateway, Browser Rendering/Browser Run, Vectorize, AI Search, or Sandbox near the Worker runtime.

Recommend Mastra when:

- The project is TypeScript.
- It does not already have a stronger platform-native agent framework.
- The user needs a full local agent/workflow/memory/RAG/MCP framework with explicit app-owned orchestration.

Respect existing MCP, LangGraph, or custom patterns when the repo already uses them.

For retrieval and integration choices, use the local tooling catalog as a shortlist, not as a dependency list. Add only the storage provider, parser, reranker, graph store, MCP hub, or observability sink that matches the project's existing platform and query shape.

## Shared Scaffolding Rules

1. Prefer project-native layout over templates.
2. Keep agents narrow: one decision boundary, small tool set.
3. Use workflows for predictable, resumable, auditable processes.
4. Add typed input and output schemas.
5. Include failure paths, retry policy where appropriate, and explicit stop conditions.
6. Add eval/test scenarios as part of the scaffold.
7. Register and export everything that should be public.
8. Document environment variables and runtime bindings.
9. Avoid durable memory unless the user needs cross-turn recall, persistent entity state, or retrieval.
10. Add explicit safety policy for browser, sandbox, auth, write, and production tools.

## Mode: init

Initialize agent infrastructure.

Create the smallest useful structure:

```text
src/mastra/
  index.ts
  agents/index.ts
  tools/index.ts
  workflows/index.ts
```

For monorepos, prefer:

```text
packages/agents/src/
  index.ts
  mastra.ts
  agents/index.ts
  tools/index.ts
  workflows/index.ts
  triggers.ts
```

Do not install dependencies without permission when package installation is not already part of the user's request. Suggest exact commands and wait if needed.

## Mode: agent <name>

Ask only for missing decisions:

- What decision boundary does the agent own?
- What tools does it need?
- What is the stop condition or escalation path?
- What latency/cost tier should its model target?

Generate:

- Agent definition file.
- Instructions inline, builder, or markdown according to repo style.
- Tool stubs only when needed.
- Barrel export.
- Registration in central runtime.
- 3-5 eval scenarios.

Agent must include:

- Clear purpose and non-goals.
- Small tool list.
- Step budget or bounded workflow placement.
- Fallback behavior for missing information and failed tools.

## Mode: tool <name>

Ask:

- What does the tool do?
- Inputs and outputs.
- Read/write/destructive/idempotent behavior.
- User context and permission needs.

Generate:

- Tool file.
- Zod or native schema equivalent.
- Field descriptions.
- Output schema.
- MCP annotations plus `outputSchema`/`structuredContent` when MCP is present or likely.
- Security pattern for user context.
- Tests or fixtures when the project has a test surface.

For write/destructive tools, require explicit confirmation gate in the tool contract or workflow.

## Mode: workflow <name>

Ask:

- Goal and trigger.
- Deterministic vs agentic steps.
- Sequential, branch, parallel, fan-out/fan-in, suspend/resume shape.
- Shared state.
- Retry and human-review points.

Generate:

- Workflow file or directory.
- Step files for complex workflows.
- Shared state schema.
- Trigger function when needed.
- Registration/export.
- Tests/evals for happy path, recoverable error, and cancellation/escalation.

## Mode: retrieval

Add retrieval or RAG infrastructure only after identifying the data shape and query pattern.

Ask only for missing decisions:

- What corpus is being searched: docs, code, database rows, app data, tickets, emails, images, audio, or mixed media?
- What answers require retrieval: exact lookup, semantic recall, multi-hop relationship reasoning, current web context, or structured tool/database access?
- What freshness, tenancy, deletion, and access-control rules apply?
- What latency and quality target should the first version meet?

Default recommendations:

- Use hybrid lexical + dense retrieval with reranking for most production knowledge search.
- Use simple dense retrieval only for prototypes or small low-risk corpora.
- Use graph or LightRAG-style retrieval when explicit relationships, entity histories, dependencies, or multi-hop questions drive quality.
- Use multimodal retrieval when source material is visual, audio, slides, screenshots, diagrams, or scanned PDFs.
- Use structured/tool-backed retrieval when the answer must come from live APIs, SQL, or business systems rather than chunked text.
- Consider compiled/optimized retrieval only for stable query workloads where preprocessing, generated indexes, or query plans materially reduce cost or latency.

Generate:

- Ingestion/chunking or source connector code.
- Search interface with typed query and result schemas.
- Storage provider wiring that matches the existing platform.
- Metadata filters for tenant, user, source, freshness, and permissions.
- Reranking or rank-fusion stage when quality matters.
- Eval fixtures for recall@k, context precision, grounding, and representative failure cases.

Do not add durable agent memory when request-scoped retrieval, workflow state, or a searchable corpus is the actual requirement.

## Mode: memory

Add memory only after confirming why request-scoped state, workflow state, or retrieval is insufficient.

Default TypeScript recommendation:

- Mastra Memory plus Postgres/PgVector when the project already uses Mastra or Postgres.
- Cloudflare-native memory/search/vector options in Workers-native projects.

Document:

- Storage provider.
- Retention/deletion behavior.
- Namespace isolation.
- Privacy/security implications.
- Environment variables or bindings.

## Mode: model

Read `model-routing.md`.

Generate:

- Model router/provider file.
- Environment-driven defaults.
- Tiered model selection: quick, standard, rigorous.
- Fallback chain.
- Provider-specific env vars/bindings.

Support only providers that make sense for the project. Avoid adding many unused dependencies.

## Mode: browser

Browser tools are high risk.

Generate:

- Provider recommendation based on runtime.
- Allowlist and denylist.
- Timeout and page-size limits.
- Output truncation/summarization.
- Audit log hooks.
- Confirmation gates for forms, purchases, deletes, auth changes, and production actions.

Browser tools must be visible to the agent/user. Do not hide them as utility calls.

## Mode: sandbox

Sandbox/code execution tools are high risk.

Generate:

- Provider recommendation based on runtime.
- Language allowlist.
- CPU/memory/time limits.
- Filesystem boundaries.
- Network policy.
- Audit logs.
- Confirmation gates for package installs, network access, and writes outside the sandbox.

Never execute untrusted code in the app server process.

## Wiring

After generating code:

1. Register agents/workflows/tools in the central runtime.
2. Export public modules from barrel files.
3. Add triggers or routes where appropriate.
4. Document env vars and bindings.
5. Run or propose typecheck/test commands.
6. Confirm visible failure shape: retries, stop limits, fallback.
7. Note eval hooks and first test cases.

## File Preview Format

Before writing substantial scaffolding, show:

```text
Files to change:
- src/mastra/index.ts - register runtime
- src/mastra/agents/research-agent.ts - new bounded agent
- src/mastra/tools/search-docs.ts - read-only retrieval tool

Key decisions:
- Framework: Mastra, matching TypeScript app
- Model: standard tier via existing router
- Safety: read-only tool, no durable memory
```
