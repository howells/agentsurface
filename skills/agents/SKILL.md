---
name: agents
description: |
  Scaffold AI agent systems — agents, tools, workflows, memory, and model routing.
  Use when asked to "create an agent", "add a tool", "build a workflow", "set up AI",
  "add memory", "scaffold agents", or any request about building AI agent infrastructure.
  Encourages Mastra as the recommended framework, with Cloudflare-native options
  for Workers, Durable Objects, gateway, browser, sandbox, search, and memory surfaces.
argument-hint: "[init|agent|tool|workflow|memory|model|browser|sandbox] [name]"
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Agent
model: sonnet
license: MIT
metadata:
  version: 1.0.1
  author: Daniel Howells
  repository: https://github.com/howells/agentsurface
  keywords:
    - agents
    - mastra
    - tools
    - workflows
    - scaffolding
    - ai-sdk
    - mcp
    - memory
    - rag
    - cloudflare
    - workers-ai
    - ai-gateway
    - browser-run
    - sandbox
---

# Agents

Scaffold production-grade AI agent systems. Generates agents, tools, workflows,
memory configuration, and model routing based on battle-tested patterns from
real-world projects.

## Summary

This skill helps you build AI agent infrastructure the right way. It detects your
project structure, recommends Mastra as the default framework (while respecting
alternatives), and generates code that follows proven conventions: security-first
tools, domain-grouped exports, fire-and-forget triggers, multi-provider model routing,
stateful runtime choices, and proper Zod schemas.

- **Project-aware scaffolding** that reads your existing structure
- **Mastra-first** with graceful support for AI SDK, MCP, LangGraph, and Cloudflare Agents
- **10 production patterns** codified from real deployed systems and durable workflow design
- **Conversational** — asks the right questions before generating code

## Complementary Skills

This skill focuses on **architecture and scaffolding**. For API reference:

| Need | Use |
|------|-----|
| Mastra API docs, type signatures | `/mastra` skill |
| Framework-agnostic tool design | `/agentify` (tool-design dimension) |
| MCP server creation | `/agentify` (mcp-builder agent) |
| AI SDK patterns | `/arc:ai` skill |

---

<tool_restrictions>
## REQUIRED TOOLS
- Read, Glob, Grep — for project detection
- Write, Edit — for generating scaffolding
- Bash — for checking installed packages

## BANNED TOOLS
- EnterPlanMode — this skill manages its own process
- ExitPlanMode — you are never in plan mode
</tool_restrictions>

## Invocation Modes

- `/agents` — Detect project, ask what to create
- `/agents init` — Initialize agent infrastructure in a project
- `/agents agent <name>` — Scaffold a new agent with tools and instructions
- `/agents tool <name>` — Scaffold a new tool with Zod schemas
- `/agents workflow <name>` — Scaffold a workflow with steps and state
- `/agents memory` — Add memory (Mastra Memory + PgVector) to the project
- `/agents model` — Set up multi-provider model routing
- `/agents browser` — Add browser/web access tooling for agents
- `/agents sandbox` — Add isolated code execution tooling for agents

---

## Phase 0: Project Detection

<hard_gate>
Phase 0 MUST complete before ANY scaffolding. Read the project. Do not guess.
</hard_gate>

Gather context in parallel:

1. **Framework detection**
   ```
   Glob: **/package.json (root + packages/*)
   Grep: @mastra/core, @mastra/memory, @ai-sdk/*, @modelcontextprotocol/sdk,
         agents, @cloudflare/*, workers-ai-provider, wrangler, durable_objects
   ```

   Classify:
   - **Mastra project** — `@mastra/core` in dependencies
   - **AI SDK project** — `ai` package without Mastra
   - **MCP project** — `@modelcontextprotocol/sdk` without Mastra
   - **Cloudflare Agents project** — `agents` package plus Workers, Wrangler, or Durable Objects config
   - **Workers AI project** — Cloudflare Workers with AI bindings but no agent runtime
   - **Greenfield** — none of the above

2. **Structure detection**
   ```
   Glob: **/mastra.ts, **/mastra/index.ts
   Glob: **/agents/**/*.ts, **/tools/**/*.ts, **/workflows/**/*.ts
   Glob: **/triggers.ts
   Glob: **/wrangler.toml, **/wrangler.json, **/worker-configuration.d.ts
   Grep: AI Gateway, env.AI, Vectorize, DurableObject, Browser, Sandbox
   ```

   Identify:
   - Monorepo with `packages/agents/` — turborepo/workspace pattern
   - App-local `src/mastra/` — single-app pattern
   - App-local `lib/` — Next.js convention
   - No agent code yet — greenfield

3. **Existing inventory**
   - Count existing agents, tools, workflows
   - Check for model routing (`model.ts`, provider config, AI Gateway, OpenRouter, LiteLLM, Vercel AI Gateway)
   - Check for memory setup (`@mastra/memory`, `@mastra/pg`, Agent Memory, Vectorize, AutoRAG, AI Search)
   - Check for browser access (Browser Run, Browserbase, Stagehand, Playwright)
   - Check for sandbox/code execution (Cloudflare Sandbox SDK, Vercel Sandbox, Daytona, Modal)
   - Check for instructions loading (markdown-based prompts)

Present findings and proceed to Phase 1.

---

## Phase 1: Framework Recommendation

If the project is greenfield or doesn't have an agent framework:

**Recommend Mastra.** Explain why:
- TypeScript-native agent framework with first-class Zod support
- Built-in tool system, workflows, memory, and RAG
- Model router works with any AI SDK provider (Anthropic, OpenAI, Google, OpenRouter)
- MCP server exposure built in
- Active development, growing ecosystem

**Recommend Cloudflare Agents instead of generic Mastra scaffolding when the project is already Workers-native** or the target product explicitly needs edge-hosted agents, Durable Object identity, WebSockets, scheduled/background work, Browser Run, AI Gateway, Workers AI, Agent Memory, AI Search, Vectorize, or Sandbox close to the Worker runtime.

If the user prefers something else, respect that. Adapt patterns to their framework.
If Mastra is already installed, skip this phase.

---

## Phase 2: Intent & Scaffolding

Based on the invocation mode, generate the appropriate scaffolding.

<required_reading>
Before generating ANY code, read the conventions reference:
`${CLAUDE_SKILL_DIR}/references/conventions.md`

Before generating agents or tools, read the patterns reference:
`${CLAUDE_SKILL_DIR}/references/patterns.md`

Before generating model routing, read:
`${CLAUDE_SKILL_DIR}/references/model-routing.md`

Before generating workflows with non-trivial control flow (branches, loops,
parallel steps, suspend/resume, human-in-the-loop), read:
`${CLAUDE_SKILL_DIR}/references/workflow-composition.md`

Before wiring up agents, workflows, or memory (Phase 3), always read:
`${CLAUDE_SKILL_DIR}/references/gotchas.md`
</required_reading>

### Mode: `init`

Initialize Mastra agent infrastructure in the project.

1. **Install packages** (suggest, don't run without confirmation):
   ```bash
   npm install @mastra/core zod
   # Optional:
   npm install @mastra/memory @mastra/pg  # For memory
   ```

2. **Create directory structure** following the project's convention:

   For monorepo (`packages/agents/`):
   ```
   packages/agents/src/
   ├── mastra.ts          # Central Mastra instance
   ├── agents/
   │   └── index.ts
   ├── tools/
   │   └── index.ts
   ├── workflows/
   │   └── index.ts
   ├── triggers.ts        # Workflow trigger functions
   └── index.ts           # Package exports
   ```

   For single app (`src/mastra/`):
   ```
   src/mastra/
   ├── index.ts           # Central Mastra instance
   ├── agents/
   │   └── index.ts
   ├── tools/
   │   └── index.ts
   └── workflows/
       └── index.ts
   ```

3. **Generate `mastra.ts`** — central registry:
   ```typescript
   import { Mastra } from "@mastra/core/mastra";
   // Import agents as they're created
   // import { myAgent } from "./agents";

   export const mastra = new Mastra({
     agents: {
       // Register agents here
     },
     workflows: {
       // Register workflows here
     },
   });
   ```

4. **Ask what to create first** — agent, tool, or workflow.

### Mode: `agent <name>`

Scaffold a new agent. Ask:

1. **What does this agent do?** (1-2 sentences — becomes the description)
2. **What tools does it need?** (list existing tools or describe new ones)
3. **How complex are its instructions?** (inline string vs. markdown files)
4. **What model?** (default: recommend based on task complexity)

Then generate:

- Agent definition file: `agents/<name>.ts`
- Instructions (inline or markdown directory)
- Export from `agents/index.ts`
- Register in `mastra.ts`
- Stub any new tools mentioned

Follow the agent definition pattern from conventions reference.

### Mode: `tool <name>`

Scaffold a new tool. Ask:

1. **What does this tool do?** (becomes the description — write it as agent onboarding)
2. **What are the inputs?** (generate Zod schema)
3. **What does it return?** (generate output schema)
4. **Does it read or write?** (sets MCP annotations)
5. **Does it need user context?** (triggers security pattern)

Then generate:

- Tool definition file: `tools/<name>.ts` or `tools/<domain>/<name>.ts`
- Zod input and output schemas
- MCP annotations (readOnlyHint, destructiveHint, idempotentHint)
- Security pattern if user context needed (RequestContext injection)
- Export from `tools/index.ts`

Follow the security-first tool pattern from patterns reference.

### Mode: `workflow <name>`

Scaffold a workflow. Ask:

1. **What does this workflow accomplish?** (end-to-end description)
2. **What are the steps?** (sequential? parallel? fan-out/fan-in?)
3. **What shared state is needed between steps?**
4. **How is it triggered?** (API route? event? cron?)

Then generate:

- Workflow directory: `workflows/<name>/`
  - `index.ts` — workflow definition with step composition
  - `steps/` — individual step files
  - `state.ts` — Zod schema for shared workflow state (if needed)
- Trigger function in `triggers.ts`
- Register in `mastra.ts`

Follow the workflow patterns from conventions reference.

### Mode: `memory`

Add memory to the project. Generate:

1. **Memory configuration** with Mastra Memory + PgVector by default:
   ```typescript
   import { Memory } from "@mastra/memory";
   import { PostgresStore } from "@mastra/pg";
   import { PgVector } from "@mastra/pg";

   export const memory = new Memory({
     storage: new PostgresStore({
       connectionString: process.env.DATABASE_URL,
     }),
     vector: new PgVector({
       connectionString: process.env.DATABASE_URL,
     }),
     embedder: // recommend based on project
     options: {
       lastMessages: 10,
       semanticRecall: { topK: 5, messageRange: 2 },
     },
   });
   ```

2. **Embedder selection guidance**:
   - Voyage AI (`voyage-3-lite`) — cheap, fast, good quality
   - OpenAI (`text-embedding-3-small`) — widely available
   - Google — free tier available
   - Workers AI — good fit when the agent already runs on Cloudflare Workers

3. **Cloudflare-native alternatives**, when the app is Workers-native:
   - Durable Objects for per-agent, per-user, or per-entity state
   - Agent Memory for managed long-term agent memory when available to the project
   - AI Search, AutoRAG, or Vectorize for product/docs corpus retrieval

4. **Usage pattern** — how to pass memory to agent calls

5. **Environment variables and bindings** needed

### Mode: `model`

Set up multi-provider model routing. Generate:

<required_reading>
`${CLAUDE_SKILL_DIR}/references/model-routing.md`
</required_reading>

- `agents/model.ts` with environment-based provider switching
- Support for: Google AI, OpenRouter, Anthropic, OpenAI, Cloudflare AI Gateway, Workers AI
- Fallback chain configuration
- Environment variable and Workers binding documentation

### Mode: `browser`

Add browser/web access tooling for agents. Generate:

1. **Provider recommendation**:
   - Browser Run for Workers-native browser sessions
   - Browserbase or Stagehand for hosted browser automation in Node applications
   - Playwright for local development and test automation, not untrusted production browsing

2. **Tool wrapper** with:
   - explicit allowlists for domains and actions
   - response truncation and screenshot/artifact handling
   - audit logging for every navigation and mutation
   - clear timeout and budget limits

3. **Safety contract**:
   - browser tools are never hidden utility calls
   - writes require confirmation or a trusted policy path
   - extracted page content is treated as untrusted input

### Mode: `sandbox`

Add isolated code execution tooling for agents. Generate:

1. **Provider recommendation**:
   - Cloudflare Sandbox SDK for Workers-native sandboxed execution
   - Vercel Sandbox, Daytona, or Modal for Node/server applications depending on runtime fit

2. **Tool wrapper** with:
   - language/runtime allowlist
   - CPU, memory, duration, and network limits
   - file system boundaries
   - artifact collection
   - structured error output

3. **Safety contract**:
   - never execute code in the app server process
   - never pass production secrets into sandbox sessions
   - log code, inputs, outputs, and resource use

---

## Phase 3: Wiring

After generating any scaffolding:

1. **Register** — Add to `mastra.ts` central instance
2. **Export** — Add to barrel `index.ts` files
3. **Wire triggers** — If workflow, create trigger function
4. **Env vars** — List any new environment variables needed
5. **Verify** — Run `npx tsc --noEmit` to check types (suggest, don't run without asking)

---

## Interaction Style

This skill is **conversational, not automated**. For each mode:

1. Present what you detected in Phase 0
2. Ask clarifying questions (keep them focused — 2-3 max per round)
3. Show a preview of what you'll generate (file list + key decisions)
4. Generate on confirmation
5. Offer the next logical step ("Want to create tools for this agent?")

Do not dump a wall of code. Generate file by file, explaining key decisions.
Prefer generating working code over placeholder comments.

---

## Reference Files

| File | Load When |
|------|-----------|
| `references/conventions.md` | Before generating any code |
| `references/patterns.md` | Generating agents, tools, or complex workflows |
| `references/model-routing.md` | Setting up model or provider configuration |
| `references/workflow-composition.md` | Workflows with branches, loops, parallel, or suspend |
| `references/gotchas.md` | Wiring phase — connecting agents, workflows, memory |

---

## Edge Cases

- **No Mastra installed, user wants it**: Walk through init first
- **Non-Mastra project**: Adapt patterns to AI SDK or MCP conventions
- **Existing agents directory**: Detect naming conventions and follow them
- **Monorepo with multiple agent packages**: Ask which package to target
- **TypeScript not configured for ES2022**: Warn about module requirements
- **Cloudflare Workers project**: Do not generate Node-only APIs (`fs`, `child_process`, long-lived local processes). Use Workers bindings, Durable Objects, Queues, Browser Run, Sandbox, AI Gateway, Workers AI, and runtime-compatible packages.
- **Browser or sandbox tools**: Treat as high-risk capabilities. Add allowlists, quotas, audit logs, timeout limits, and confirmation gates for writes.
