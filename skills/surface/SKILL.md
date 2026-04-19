---
name: surface
description: |
  Make software legible to agents. One skill that routes to the right workflow:
  audit agent readiness, scaffold agent infrastructure, generate MCP servers,
  write context files, or fix specific gaps. Use when asked to "audit this
  codebase", "score agent readiness", "make this agentic", "create an agent",
  "add a tool", "build a workflow", "set up AI", "add MCP", "create llms.txt",
  "scaffold agents", "add memory", or any request about agent consumability
  or agent infrastructure.
argument-hint: "[score|plan|transform|init|agent|tool|workflow|memory|model|browser|sandbox] [--dimension=X] [--format=json] [name]"
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Agent
model: sonnet
license: MIT
metadata:
  version: 2.0.0
  author: Daniel Howells
  repository: https://github.com/howells/agentsurface
  keywords:
    - agentic
    - mcp
    - api-design
    - cli-design
    - agent-dx
    - audit
    - transformation
    - scaffolding
    - llms-txt
    - agents-md
    - aeo
    - data-retrievability
    - mastra
    - tools
    - workflows
    - ai-sdk
    - memory
    - rag
    - codex-compatible
  agents:
    - context-writer
    - discovery-writer
    - error-designer
    - api-optimizer
    - cli-enhancer
    - auth-upgrader
    - mcp-builder
    - test-writer
    - retrievability-engineer
    - agentic-patterns-writer
---

# Surface

**One skill for making software legible to agents.** Routes to the right workflow based on what you need: audit and score a codebase, scaffold agent infrastructure, or transform specific surfaces.

## Summary

Surface combines two workflows under one entry point:

- **Audit workflow** — Scores a codebase across 11 dimensions (0-3 each, max 33 points), produces clustered findings, generates transformation plans, and dispatches specialist sub-agents to fix gaps.
- **Scaffold workflow** — Creates and updates agent infrastructure (agents, tools, workflows, memory, model routing, browser, sandbox) shaped to the existing project. Recommends Mastra for TypeScript, adapts when a repo uses AI SDK, MCP, LangGraph, or Cloudflare Workers.

Cross-runtime compatible: works with Claude Code, Claude Agent SDK, OpenAI Codex CLI, and generic agent runtimes.

---

<tool_restrictions>
## REQUIRED TOOLS
- Read, Glob, Grep — for codebase analysis and project detection
- Write, Edit — for generating reports, plans, and scaffolding
- Agent — for dispatching specialist sub-agents in audit execution
- Bash — for checking installed packages

## BANNED TOOLS
- EnterPlanMode — this skill manages its own process
- ExitPlanMode — you are never in plan mode
</tool_restrictions>

## Routing

Determine the workflow from the user's request:

| Signal | Route |
|--------|-------|
| "audit", "score", "assess", "how agent-ready" | **Audit workflow** |
| "plan", "transform", "fix", "improve" | **Audit workflow** (plan or transform mode) |
| "create agent", "add tool", "build workflow", "scaffold", "init" | **Scaffold workflow** |
| "add memory", "model routing", "browser", "sandbox" | **Scaffold workflow** |
| "add MCP", "create llms.txt", "write AGENTS.md" | **Audit workflow** (single-dimension transform) |
| Ambiguous | Ask: "Would you like me to audit this codebase for agent readiness, or scaffold new agent infrastructure?" |

## Invocation Modes

### Audit modes
- `/surface` — Full audit with scorecard and findings
- `/surface score` — Quick scorecard only (no detailed findings)
- `/surface plan` — Full audit + transformation plan
- `/surface transform` — Full audit + plan + execute transformations
- `/surface --dimension=mcp` — Audit a single dimension
- `/surface --format=json` — Output as structured JSON

### Scaffold modes
- `/surface init` — Initialize agent infrastructure in a project
- `/surface agent <name>` — Scaffold a new agent with tools and instructions
- `/surface tool <name>` — Scaffold a new tool with Zod schemas
- `/surface workflow <name>` — Scaffold a workflow with steps and state
- `/surface memory` — Add memory (Mastra Memory + PgVector) to the project
- `/surface model` — Set up multi-provider model routing
- `/surface browser` — Add browser/web access tooling for agents
- `/surface sandbox` — Add isolated code execution tooling for agents

---

# Audit Workflow

## Phase 0: Project Detection

<hard_gate>
Phase 0 MUST complete before ANY scoring begins.
Do not guess stack or surfaces. Read the files.
</hard_gate>

Gather context in parallel using Glob and Grep:

1. **Stack detection** — Read package.json, Cargo.toml, pyproject.toml, go.mod, etc.
   Identify framework (Next.js, Express, FastAPI, etc.), language, package manager.

2. **Surface detection** — Search for existing agent surfaces:

   | Surface | Glob Patterns |
   |---------|---------------|
   | OpenAPI specs | `**/openapi.{json,yaml,yml}`, `**/swagger.{json,yaml}` |
   | MCP servers | `**/.mcp.json`, grep for `@modelcontextprotocol/sdk`, `mcp-handler`, `@mastra/mcp` |
   | Context files | `**/AGENTS.md`, `**/CLAUDE.md`, `**/.cursor/rules/*.mdc`, `**/.github/copilot-instructions.md` |
   | Discovery | `**/llms.txt`, `**/llms-full.txt`, `**/robots.txt`, `**/sitemap.xml`, `**/.well-known/**`, `**/api-catalog*` |
   | Agent web readiness | grep for `Accept: text/markdown`, `Content-Signal`, `http-message-signatures-directory`, `agent-skills`, `mcp/server-card`, `oauth-protected-resource`, `api-catalog`, `x402`, `ucp`, `acp` |
   | CLI tools | `**/bin/*`, CLI entry points in package.json `bin` field |
   | API routes | `**/app/api/**`, `**/pages/api/**`, `**/routes/**` |
   | Structured data | grep for `schema.org`, `application/ld+json` in layout/template files |
   | Auth | grep for `client_credentials`, `Bearer`, `JWT`, OAuth config files |
   | Tests | `**/*.test.*`, `**/*.spec.*`, `**/tests/`, `**/evals/` |

3. **Dimension applicability** — Not all dimensions apply:

   | Dimension | Applicable When |
   |-----------|-----------------|
   | API Surface | Project exposes HTTP endpoints |
   | CLI Design | Project has or is a CLI tool |
   | MCP Server | Always (any project can expose one) |
   | Discovery & AEO | Project has a web presence |
   | Authentication | Project has auth or API access |
   | Error Handling | Always |
   | Tool Design | Project defines agent tools |
   | Context Files | Always |
   | Multi-Agent | Project involves agent orchestration |
   | Testing | Always |
   | Data Retrievability | Project exposes knowledge, documents, or searchable data |

Present detected surfaces and applicable dimensions. Then proceed to Phase 1.

---

## Phase 1: Dimension Scoring

<required_reading>
Read the scoring rubric NOW:
`${CLAUDE_SKILL_DIR}/references/scoring-rubric.md`
</required_reading>

Score each applicable dimension 0-3. For each:
1. Examine relevant files identified in Phase 0
2. Match against rubric criteria with specific evidence
3. Assign score and confidence (high/medium/low)

### The 11 Dimensions

| # | Dimension | What It Measures |
|---|-----------|-----------------|
| 1 | **API Surface** | OpenAPI quality, agent-oriented descriptions, operationIds, Arazzo workflows |
| 2 | **CLI Design** | JSON output, exit codes, schema introspection, input hardening, SKILL.md |
| 3 | **MCP Server** | Tool definitions, annotations, resources, auth, testing |
| 4 | **Discovery & AEO** | llms.txt, AGENTS.md, JSON-LD, content negotiation, robots.txt, agent-readiness standards |
| 5 | **Authentication** | M2M auth, OAuth 2.1, scoped tokens, agent identity |
| 6 | **Error Handling** | RFC 7807, is_retriable, suggestions, recovery hints |
| 7 | **Tool Design** | Descriptions as prompts, schemas, toModelOutput, cross-framework |
| 8 | **Context Files** | AGENTS.md quality, multi-tool support, permission boundaries |
| 9 | **Multi-Agent** | Orchestration patterns, state management, A2A support |
| 10 | **Testing** | Agent evals, tool routing accuracy, pass@k metrics |
| 11 | **Data Retrievability** | RAG indexing, vector embeddings, semantic search, knowledge graphs |

### Scorecard Output

<hard_gate>
The scorecard MUST be presented in EXACTLY this format.
No variations. No prose summaries substituting for the table.

Always show both:
- a raw total: `score / max_applicable`
- a scaled total out of `30`, used for the rating band

The scaled total is:
`round((raw_score / max_applicable) * 30)`

```
╔══════════════════════════════════════════════════════════════════╗
║                    SURFACE SCORECARD                           ║
║                    [Project Name]                              ║
║                    [YYYY-MM-DD]                                ║
╠══════════════════════════════════════════════════════════════════╣

  1. API Surface         [█░░]  1/3   Good OpenAPI but human-oriented descriptions
  2. CLI Design          [███]  3/3   Full JSON output, schema introspection, hardened
  3. MCP Server          [░░░]  0/3   No MCP server
  4. Discovery & AEO     [█░░]  1/3   Basic AGENTS.md, no llms.txt
  5. Authentication      [██░]  2/3   OAuth 2.1 M2M, scoped tokens
  6. Error Handling      [░░░]  0/3   Generic status codes only
  7. Tool Design         [██░]  2/3   Good schemas, weak descriptions
  8. Context Files       [█░░]  1/3   Auto-generated CLAUDE.md
  9. Multi-Agent         [───]  N/A   Not an agent system
  10. Testing            [█░░]  1/3   Basic tool tests, no evals
  11. Data Retrievability [░░░] 0/3   No semantic retrieval surface

╠══════════════════════════════════════════════════════════════════╣
║  TOTAL: 11/30 (scaled: 11/30)                                  ║
║  RATING: Agent-tolerant                                        ║
║                                                                ║
║  ░░░░░░░░░░░░██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     ║
║  Human-only  ▲Agent-tolerant  Agent-ready    Agent-first       ║
╚══════════════════════════════════════════════════════════════════╝
```

Score visualization per dimension:
- 0/3: [░░░]
- 1/3: [█░░]
- 2/3: [██░]
- 3/3: [███]
- N/A: [───]

Rating bands:
| Range | Rating | Meaning |
|-------|--------|---------|
| 0-7   | **Human-only** | Built for humans. Agents will struggle. |
| 8-14  | **Agent-tolerant** | Usable with heavy prompt engineering. |
| 15-22 | **Agent-ready** | Solid agent support. Few gaps remain. |
| 23-30 | **Agent-first** | Purpose-built for agents. Best in class. |

Always derive the rating from the scaled score, not the raw score.
</hard_gate>

If mode is `score`, STOP HERE. Present scorecard and exit.

---

## Phase 2: Findings Report

For each dimension scoring below 3, generate findings.

### Finding Structure

<hard_gate>
Every finding MUST have all five fields. No exceptions.
</hard_gate>

| Field | Content |
|-------|---------|
| **What** | Specific issue with `file:line` reference |
| **Why** | Why this matters for agent consumption |
| **Fix** | Concrete steps to resolve (not vague advice) |
| **Impact** | Which dimension, current → target score |
| **Severity** | Critical / High / Medium / Low |

### Severity Definitions

| Severity | Meaning |
|----------|---------|
| **Critical** | Blocks agent use entirely (e.g., browser-only auth, no structured output) |
| **High** | Significant friction (e.g., terse tool descriptions, no error recovery info) |
| **Medium** | Suboptimal but functional (e.g., missing AGENTS.md, no llms.txt) |
| **Low** | Polish item (e.g., missing field descriptions on schema, no token counts) |

### Clustering

Cluster findings by "what you'd fix together", NOT by dimension.

Instead of: "API findings | CLI findings | MCP findings"
Use: "API discoverability (3 findings across API Surface + Discovery + Tool Design)"

Each cluster:
- Descriptive name
- 1-sentence rationale
- Table of findings (severity, file, issue, dimension)
- Suggested approach (1-2 sentences)
- Dependencies on other clusters

### Report Output

Write to `docs/surface/audit-[YYYY-MM-DD].md` in the project being audited.

If mode is not `plan` or `transform`, present findings and offer:
1. Generate transformation plan
2. Tackle the highest-impact cluster now
3. Deep dive on a specific dimension

---

## Phase 3: Transformation Plan

Generate an ordered plan prioritized by impact-to-effort ratio.

### Default Priority Order

| Priority | What | Effort | Impact |
|----------|------|--------|--------|
| 1 | Context files (AGENTS.md, CLAUDE.md) | Low | Immediate |
| 2 | Discovery (llms.txt, robots.txt) | Low | High |
| 3 | Error handling (RFC 7807) | Medium | Critical |
| 4 | API descriptions (rewrite for agents) | Medium | High |
| 5 | CLI enhancements (--json, exit codes) | Medium | Broad |
| 6 | Authentication (OAuth 2.1 M2M) | Medium | Removes blockers |
| 7 | MCP server | Higher | Transformative |
| 8 | Structured data (JSON-LD) | Medium | AEO |
| 9 | Data retrievability (indexing, hybrid search) | Higher | High leverage |
| 10 | Testing (eval suite) | Higher | Long-term |
| 11 | Multi-agent patterns | Highest | Advanced |

### Task Format

Each task in the plan:
- Task ID and description
- Files to create or modify
- Complexity: S (< 1 hour) / M (1-4 hours) / L (4+ hours)
- Score impact: which dimensions improve, by how much
- Dependencies: which tasks must complete first
- Agent: which specialist to dispatch

Write plan to `docs/surface/plan.md`.

If mode is not `transform`, present plan and offer to execute.

---

## Phase 4: Execution

<hard_gate>
Phase 4 requires explicit user confirmation before dispatching any agent.
Present the plan summary and ask: "Ready to execute? I'll start with [cluster name]."
</hard_gate>

### Specialist Agents

| Agent | Purpose | Model |
|-------|---------|-------|
| `context-writer` | AGENTS.md, CLAUDE.md, .cursor/rules | Sonnet |
| `discovery-writer` | llms.txt, llms-full.txt, robots.txt, Content Signals, Markdown content negotiation, JSON-LD, `.well-known` discovery | Sonnet |
| `error-designer` | RFC 7807 structured errors | Sonnet |
| `api-optimizer` | OpenAPI descriptions, extensions | Sonnet |
| `cli-enhancer` | --json output, exit codes, introspection | Sonnet |
| `auth-upgrader` | OAuth 2.1 Client Credentials | Sonnet |
| `mcp-builder` | MCP server creation/enhancement | Sonnet |
| `test-writer` | Agent evaluation suite | Sonnet |
| `retrievability-engineer` | Retrieval, indexing, and search surfaces | Sonnet |
| `agentic-patterns-writer` | Multi-agent and orchestration patterns | Sonnet |

### Agent Dispatch

Each agent receives:
- Specific task(s) from the plan
- Relevant codebase files
- Scoring rubric for their dimension
- Reference doc: `${CLAUDE_SKILL_DIR}/references/[dimension].md`

### Agent Status Codes

Agents report one of:
- **DONE** — Task complete, all checks pass
- **DONE_WITH_CONCERNS** — Complete but flagged issues for review
- **NEEDS_CONTEXT** — Missing information, needs human input
- **BLOCKED** — Cannot proceed (dependency, permission, or technical blocker)

### Execution Flow

1. Group tasks by agent type
2. Identify parallel-safe groups (no file conflicts)
3. Dispatch parallel groups simultaneously
4. Collect results, handle NEEDS_CONTEXT and BLOCKED
5. Re-score affected dimensions
6. Present delta scorecard:

```
╔════════════════════════════════════════════════════════╗
║              SURFACE DELTA SCORECARD                  ║
╠════════════════════════════════════════════════════════╣

  Dimension          Before  After  Delta
  ─────────────────  ──────  ─────  ─────
  Error Handling     0/3     2/3    +2 ✦
  Context Files      1/3     3/3    +2 ✦
  Discovery & AEO    1/3     2/3    +1 ↑

  TOTAL: 11/27 → 16/27 (scaled: 12/30 → 18/30)
  RATING: Agent-tolerant → Agent-ready ✦

╚════════════════════════════════════════════════════════╝
```

### Post-Execution

1. Update `docs/surface/scorecard.md` with history entry
2. Offer to commit changes
3. Suggest next improvement cluster

---

# Scaffold Workflow

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

1. **Memory configuration** with Mastra Memory + PgVector by default
2. **Embedder selection guidance** (Voyage AI, OpenAI, Google, Workers AI)
3. **Cloudflare-native alternatives** when the app is Workers-native
4. **Usage pattern** — how to pass memory to agent calls
5. **Environment variables and bindings** needed

### Mode: `model`

<required_reading>
`${CLAUDE_SKILL_DIR}/references/model-routing.md`
</required_reading>

Set up multi-provider model routing. Generate:

- `agents/model.ts` with environment-based provider switching
- Support for: Google AI, OpenRouter, Anthropic, OpenAI, Cloudflare AI Gateway, Workers AI
- Fallback chain configuration
- Environment variable and Workers binding documentation

### Mode: `browser`

Add browser/web access tooling for agents. Generate:

1. **Provider recommendation** (Browser Run, Browserbase/Stagehand, Playwright)
2. **Tool wrapper** with allowlists, truncation, audit logging, and timeout limits
3. **Safety contract** — browser tools are never hidden utility calls

### Mode: `sandbox`

Add isolated code execution tooling for agents. Generate:

1. **Provider recommendation** (Cloudflare Sandbox SDK, Vercel Sandbox, Daytona, Modal)
2. **Tool wrapper** with language allowlist, resource limits, file system boundaries
3. **Safety contract** — never execute code in the app server process

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
5. Offer the next logical step

Do not dump a wall of code. Generate file by file, explaining key decisions.
Prefer generating working code over placeholder comments.

---

## Complementary Skills

| Need | Use |
|------|-----|
| Mastra API docs, type signatures | `/mastra` skill |
| AI SDK patterns | `/arc:ai` skill |

---

## Audit Reference Loading

<required_reading>
Load `references/scoring-rubric.md` in Phase 1.

Load dimension-specific references ONLY when auditing that dimension:
- `references/api-surface.md`
- `references/cli-design.md`
- `references/mcp-servers.md`
- `references/discovery-aeo.md`
- `references/authentication.md`
- `references/error-handling.md`
- `references/tool-design.md`
- `references/context-files.md`
- `references/multi-agent.md`
- `references/testing.md`
- `references/data-retrievability.md`
</required_reading>

## Scaffold Reference Loading

| File | Load When |
|------|-----------|
| `references/conventions.md` | Before generating any code |
| `references/patterns.md` | Generating agents, tools, or complex workflows |
| `references/model-routing.md` | Setting up model or provider configuration |
| `references/workflow-composition.md` | Workflows with branches, loops, parallel, or suspend |
| `references/gotchas.md` | Wiring phase — connecting agents, workflows, memory |

---

## Edge Cases

### Audit
- **Polyglot projects**: Score each language surface independently, report weakest
- **Monorepos**: Offer per-package or aggregate scoring
- **Zero-score projects**: Focus on the 3 highest-impact dimensions only
- **Re-audits**: Load previous `docs/surface/scorecard.md`, show delta
- **N/A dimensions**: Skip and scale total proportionally
- **Single dimension mode**: `--dimension=X` skips other dimensions entirely

### Scaffold
- **No Mastra installed, user wants it**: Walk through init first
- **Non-Mastra project**: Adapt patterns to AI SDK or MCP conventions
- **Existing agents directory**: Detect naming conventions and follow them
- **Monorepo with multiple agent packages**: Ask which package to target
- **TypeScript not configured for ES2022**: Warn about module requirements
- **Cloudflare Workers project**: Do not generate Node-only APIs. Use Workers bindings, Durable Objects, Queues, Browser Run, Sandbox, AI Gateway, Workers AI, and runtime-compatible packages.
- **Browser or sandbox tools**: Treat as high-risk capabilities. Add allowlists, quotas, audit logs, timeout limits, and confirmation gates for writes.
