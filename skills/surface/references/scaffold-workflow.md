# Surface Scaffold Workflow

Use this reference before creating or changing agent infrastructure.

## Phase 0: Project Detection

Read the project before scaffolding.

Detect:

- Package manager and workspace layout.
- Framework/runtime: Next.js, Node, Python, Workers, serverless, CLI, library.
- Existing agent framework: Mastra, AI SDK, OpenAI Agents SDK, LangGraph, MCP, Cloudflare Agents, custom.
- Existing directories: `agents`, `tools`, `workflows`, `src/mastra`, `packages/agents`, `triggers`.
- Existing model routing, memory, retrieval, browser access, sandbox execution.
- TypeScript module target and runtime constraints.
- Test and typecheck commands.

Present the inventory before generating code.

## Framework Recommendation

Recommend Mastra when:

- The project is TypeScript.
- It does not already have a deliberate agent framework.
- The user needs agents, tools, workflows, memory, RAG, or MCP.

Recommend Cloudflare Agents when:

- The project is Workers-native.
- It uses or needs Durable Objects, WebSockets, Queues, Workers AI, AI Gateway, Browser Rendering/Browser Run, Vectorize, AI Search, or Sandbox near the Worker runtime.

Respect existing AI SDK, MCP, OpenAI Agents SDK, LangGraph, or custom patterns when the repo already uses them.

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
- MCP annotations when MCP is present or likely.
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
