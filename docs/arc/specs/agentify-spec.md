# Agentify Skill Specification

**Author:** Daniel Howells
**Date:** 2026-04-17
**Status:** Draft
**Version:** 0.1.0

---

## 1. Vision

The `/agentify` skill takes any codebase and makes it maximally consumable by AI agents.

Most software today is built for humans. Agents interact with it through scraping, prompt engineering, and brittle heuristics. Agentify measures how well a codebase supports agent consumption across 10 dimensions, scores each one on a 0-3 rubric, produces a detailed findings report, and can execute a transformation plan to close the gaps.

The skill is the operational counterpart to the Agent Zero documentation site. The docs site is the textbook. The skill is the audit tool. Every finding links back to a docs page. Every transformation follows a documented pattern.

### Design Principles

1. **Measure before you fix.** The audit produces a score. The score tells you where you are. Only then do you decide what to change.
2. **Dimension independence.** Each dimension is scored independently. A project can score 3 on API Surface and 0 on MCP Server. The skill never assumes one dimension implies another.
3. **Incremental transformation.** You do not need to go from 0 to 30 in one pass. The transformation plan is ordered by impact-to-effort ratio. You can stop at any point and still have a better codebase.
4. **Evidence-based scoring.** Every score includes the specific files, patterns, and signals that justify it. No vibes-based assessment.
5. **Framework agnostic.** The skill works on any codebase: Node.js, Python, Go, Rust, Ruby, Java, mixed. Dimension applicability varies, but scoring is consistent.

---

## 2. The 10 Audit Dimensions

Total score: 0-30 (each dimension scored 0-3).

### Dimension 1: API Surface

How well is the API described for machine consumption?

| Score | Level | Criteria |
|-------|-------|----------|
| 0 | None | No machine-readable API specification. Agents must reverse-engineer endpoints from code or documentation. |
| 1 | Basic | OpenAPI spec exists but descriptions are human-oriented. Missing operationIds, weak parameter descriptions, no examples. Agent must guess intent from path names. |
| 2 | Agent-oriented | Agent-optimized descriptions on every operation. Proper `operationId` naming (verb_noun pattern). Enum values documented. Request/response examples present. Error schemas defined per endpoint. |
| 3 | Agent-first | Full agent optimization. Arazzo workflow definitions for multi-step operations. Semantic extensions (`x-agent-hint`, `x-rate-limit`). LAPIS-style efficiency (batch endpoints, partial responses, field selection). Content negotiation supporting Markdown responses. |

**Detection signals:**
- `openapi.yaml`, `openapi.json`, `swagger.yaml`, `swagger.json` in project root or `docs/`
- `@ApiOperation`, `@ApiResponse` decorators (NestJS, Spring)
- FastAPI route definitions with response models
- `.arazzo.yaml` files
- `x-agent-*` extensions in OpenAPI spec

**Key files to check:**
- OpenAPI spec files
- API route handlers
- SDK generation config (`openapitools.json`)
- API documentation pages

### Dimension 2: CLI Design

How well does the CLI serve AI agents? Based on the Agent DX CLI Scale.

| Score | Level | Criteria |
|-------|-------|----------|
| 0 | Human-only | Output is human-readable only (tables, colors, progress bars). No structured output format. Agents must parse prose. |
| 1 | JSON exists | `--json` or `--output json` flag exists but output schema is inconsistent across commands. Some commands lack it entirely. Exit codes are 0/1 only. |
| 2 | Consistent structured output | Every command supports JSON output with a consistent envelope schema. Semantic exit codes (0 success, 1 user error, 2 system error). `--dry-run` on mutating operations. `--quiet`/`--verbose` flags. Idempotent operations where possible. |
| 3 | Agent-native | NDJSON streaming for long-running operations. Schema introspection (`--schema` flag that emits JSON Schema for input/output). Full input hardening (stdin JSON, env var injection, config file). SKILL.md shipped alongside the CLI for agent self-documentation. Confirmation bypass (`--yes`/`--force`) on destructive operations. |

**Detection signals:**
- `bin/` directory, `"bin"` field in `package.json`
- CLI framework (`commander`, `yargs`, `click`, `cobra`, `clap`)
- `--json` flag in help output
- `--dry-run` flag existence
- SKILL.md in package root
- NDJSON output patterns

**Key files to check:**
- CLI entry points
- Command definitions
- Help text / usage strings
- Output formatting utilities

### Dimension 3: MCP Server

Does the project expose an MCP (Model Context Protocol) server?

| Score | Level | Criteria |
|-------|-------|----------|
| 0 | None | No MCP server. Agents cannot interact with this project through MCP. |
| 1 | Basic | MCP server exists with a handful of tools. Descriptions are minimal or auto-generated. No error handling beyond throwing. No resources or prompts. |
| 2 | Well-structured | Proper tool organization with clear, agent-oriented descriptions including "when to use" guidance. Input validation with Zod or equivalent. Structured error responses. Pagination on list operations. Resource exposure for key data. |
| 3 | Production | Full MCP implementation. OAuth 2.1 or token auth. Tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`). Prompt templates for common workflows. Resource subscriptions for live data. `toModelOutput` optimization on responses. Comprehensive test suite. Rate limiting. Logging with trace IDs. |

**Detection signals:**
- `@modelcontextprotocol/sdk` or `mcp` in dependencies
- `mcp.json`, `.mcp.json` config files
- `McpServer`, `Server` class instantiation from MCP SDK
- `server.tool()`, `server.resource()`, `server.prompt()` calls
- `stdio` or `sse` transport configuration

**Key files to check:**
- MCP server entry point
- Tool definitions
- Resource definitions
- Prompt templates
- MCP config files

### Dimension 4: Discovery and AEO

How discoverable is this project to AI agents? Covers Agent Engine Optimization.

| Score | Level | Criteria |
|-------|-------|----------|
| 0 | None | No agent-specific discovery files. Agents find this project only through human-written docs or web scraping. |
| 1 | Basic | An `AGENTS.md` or `llms.txt` exists, but it is minimal, auto-generated, or outdated. Provides some signal but not enough for an agent to understand capabilities. |
| 2 | Structured | `llms.txt` with proper sections (capabilities, endpoints, authentication). `AGENTS.md` with interaction patterns. Structured data (JSON-LD with `SoftwareApplication` or `APIReference` schema) on public pages. `robots.txt` allows AI crawlers. |
| 3 | Full AEO | Complete discovery surface: `llms.txt` + `llms-full.txt` (token-counted, with progressive detail). Content negotiation returning Markdown for `Accept: text/markdown`. `/.well-known/ai-plugin.json` or equivalent manifest. "Copy for AI" buttons on docs. NLWeb `/ask` endpoint for natural language queries. Sitemap includes API documentation pages. AI-specific meta tags. |

**Detection signals:**
- `AGENTS.md` in project root
- `llms.txt`, `llms-full.txt` in `public/` or project root
- `/.well-known/ai-plugin.json`
- JSON-LD blocks with `SoftwareApplication` schema
- Content negotiation middleware
- `robots.txt` with AI crawler directives
- NLWeb endpoint configuration

**Key files to check:**
- `AGENTS.md`
- `llms.txt`, `llms-full.txt`
- `public/.well-known/` directory
- Root layout (for structured data)
- `robots.txt`
- Documentation pages (for "Copy for AI" patterns)

### Dimension 5: Authentication

How well does auth support machine-to-machine (M2M) and agent access patterns?

| Score | Level | Criteria |
|-------|-------|----------|
| 0 | Browser-only | Auth requires browser interaction: OAuth authorization code flow with no M2M alternative, CAPTCHAs, cookie-based sessions without API tokens. Agents cannot authenticate programmatically. |
| 1 | API keys | API keys exist for programmatic access. But no scoped permissions, no token rotation, no M2M OAuth flow. Keys are long-lived and all-or-nothing. |
| 2 | OAuth 2.1 M2M | OAuth 2.1 Client Credentials grant for server-to-server auth. Scoped tokens with fine-grained permissions. Token rotation and expiry. Environment variable injection for credentials. API keys have scopes. |
| 3 | Agent identity | Token exchange (RFC 8693) for agent delegation. Agent identity separate from user identity. Delegation patterns ("act on behalf of user X with scopes Y"). JWT validation with `iss`/`sub`/`aud` claims for agent identification. Consent and audit trail for agent actions. Permission boundaries enforced per-agent. |

**Detection signals:**
- Auth provider config (Clerk, Auth0, WorkOS, Supabase Auth, NextAuth)
- OAuth implementation files
- API key generation endpoints
- `client_credentials` grant type references
- JWT validation middleware
- Token exchange implementation
- Environment variable patterns for credentials (`*_API_KEY`, `*_SECRET`)

**Key files to check:**
- Auth middleware
- OAuth configuration
- API key management
- Token validation
- Environment variable documentation

### Dimension 6: Error Handling

How well do errors help agents recover and retry?

| Score | Level | Criteria |
|-------|-------|----------|
| 0 | Generic | HTTP status codes only. Error responses are strings or unstructured JSON. Agent cannot distinguish between "try again" and "you sent bad data." |
| 1 | Partially structured | Some endpoints return structured errors (`{ "error": "message" }`) but format varies across the codebase. No standard envelope. |
| 2 | RFC 7807 | RFC 7807 Problem Details format everywhere. Consistent error schema with `type`, `title`, `status`, `detail`, `instance`. Includes `is_retriable` boolean. Includes `suggestions` array with recovery hints. Validation errors include field-level detail. |
| 3 | Agent-optimized | Full agent error design. Every error includes: `doc_uri` linking to relevant documentation, `trace_id` for debugging, `recovery_hint` with specific next steps. Retry-After headers on rate limits. Intent tracing on cancellation (what the agent was trying to do). Idempotency keys to safely retry mutations. Error responses include the request context that caused the failure. |

**Detection signals:**
- Error middleware / error handler files
- `ProblemDetails` or `RFC7807` references
- Error response type definitions
- Retry-After header usage
- Idempotency key implementation
- Error documentation
- `is_retriable`, `recovery_hint`, `doc_uri` fields

**Key files to check:**
- Global error handler
- Error type definitions
- API middleware
- Error response utilities
- Retry logic

### Dimension 7: Tool Design

How well are the project's tools (functions, operations, capabilities) designed for agent consumption?

| Score | Level | Criteria |
|-------|-------|----------|
| 0 | None | No formal tool definitions. Capabilities are implicit in code. Agent must read source to understand what operations are available. |
| 1 | Basic schemas | Tool schemas exist (JSON Schema, TypeScript types, Pydantic models) but descriptions are weak or missing. No guidance on when to use each tool. Parameter names are ambiguous. |
| 2 | Agent-oriented | Verb_noun naming convention (`create_issue`, `search_documents`). Every tool has an agent-oriented description including "when to use this tool" and "when NOT to use this tool." Typed schemas with constraints (min/max, patterns, enums). Required vs optional parameters clear. Return type documented. |
| 3 | Cross-framework | Tools work across MCP, OpenAI function calling, and direct invocation. `toModelOutput` optimization reduces token usage in responses. Tool annotations (read-only, destructive, idempotent). Dynamic tool selection support (tool manifests with semantic descriptions). Batch operations for common multi-step patterns. Tool composition primitives. |

**Detection signals:**
- Function/tool definition files
- JSON Schema definitions for inputs/outputs
- `@tool` decorators or equivalent
- Tool description quality (grep for "when to use")
- Naming patterns (verb_noun vs noun-only)
- Tool annotation metadata
- Response size optimization

**Key files to check:**
- Tool/function definition files
- Schema definitions
- MCP tool registrations
- OpenAI function definitions
- SDK method signatures

### Dimension 8: Context Files

How well does the project inform agents about its conventions, commands, and boundaries?

| Score | Level | Criteria |
|-------|-------|----------|
| 0 | None | No `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, or equivalent context files. Agent starts from zero context every session. |
| 1 | Basic | A context file exists but is generic, auto-generated, or minimal. Lists a few commands but lacks conventions, boundaries, or architecture guidance. |
| 2 | Curated | Hand-curated context files with: available commands and how to run them, coding conventions and style rules, directory structure explanation, testing instructions, deployment process, boundaries (what the agent should NOT do). |
| 3 | Multi-tool + boundaries | Context files for multiple tools (`AGENTS.md` + `CLAUDE.md` + `.cursor/rules/`). Permission boundaries defined per operation type. Progressive disclosure (summary up top, detail on demand). Architecture decision records referenced. Onboarding flow for new agent sessions. Memory patterns for cross-session continuity. |

**Detection signals:**
- `AGENTS.md` in project root
- `CLAUDE.md` or `.claude/` directory
- `.cursorrules` or `.cursor/rules/`
- `.github/copilot-instructions.md`
- `CONTRIBUTING.md` (partial signal)
- `.windsurfrules`
- Context file quality (length, structure, specificity)

**Key files to check:**
- All context files in project root
- `.claude/` directory contents
- `.cursor/rules/` contents
- Contributing guides

### Dimension 9: Multi-Agent Support

How well does the project support multi-agent orchestration patterns?

| Score | Level | Criteria |
|-------|-------|----------|
| 0 | None | No multi-agent patterns. Single-agent interaction only. No delegation, no state handoff, no agent coordination. |
| 1 | Basic sub-agents | Basic ability to delegate to sub-agents (e.g., spawning child tasks). No structured handoff protocol. State management is ad-hoc. |
| 2 | Structured delegation | Supervisor pattern implemented. Structured task delegation with typed inputs/outputs. State management across agent turns. Human-in-the-loop checkpoints for high-stakes operations. Error escalation from sub-agent to supervisor. |
| 3 | Full multi-agent | A2A (Agent-to-Agent) agent cards published. Workflow composition across agents. Conversation memory and context sharing. Parallel agent execution with result aggregation. Agent capability discovery (one agent can find and invoke another). Push notification support for long-running agent tasks. |

**Detection signals:**
- A2A agent card files (`.well-known/agent.json`)
- Sub-agent spawning patterns
- Task queue / workflow engine integration
- State management across agent turns
- Human-in-the-loop checkpoint code
- Agent capability manifests
- Push notification / webhook configuration for agent callbacks

**Key files to check:**
- Agent definition files
- Workflow orchestration code
- State management utilities
- A2A configuration
- Agent card manifests

### Dimension 10: Testing and Evaluation

How well is agent interaction tested and evaluated?

| Score | Level | Criteria |
|-------|-------|----------|
| 0 | None | No agent-specific tests. If agents interact with this project, nobody knows whether they succeed or fail. |
| 1 | Basic routing | Basic tool routing tests verify that the right tool is called for a given prompt. No parameter correctness validation. No multi-step flow tests. |
| 2 | Correctness | Tool selection accuracy tests with diverse phrasings. Parameter extraction correctness validation. Error recovery tests (what happens when a tool call fails). Edge case coverage (missing params, wrong types, ambiguous intent). Response quality assertions. |
| 3 | Full eval suite | pass@k metrics for tool selection (multiple attempts, measure success rate). Multi-step flow evaluation (agent completes a 5-step workflow correctly). Non-determinism handling (run same test N times, measure variance). Regression detection (score drops on code changes trigger alerts). Benchmark suite with labeled examples. CI integration for agent eval on every PR. |

**Detection signals:**
- Test files with "agent", "tool", "mcp" in name
- Eval framework configuration (promptfoo, langsmith, braintrust)
- Benchmark datasets / labeled examples
- CI workflows running agent tests
- pass@k or similar metric references
- Tool routing test patterns

**Key files to check:**
- Agent/tool test files
- Eval configuration
- Benchmark datasets
- CI workflow files

---

## 3. Scoring Interpretation

| Range | Rating | Badge | Description |
|-------|--------|-------|-------------|
| 0-7 | Human-only | :red_circle: | Built for humans. Agents will struggle with every interaction. Heavy prompt engineering required for basic operations. |
| 8-14 | Agent-tolerant | :orange_circle: | Agents can use it, but with significant friction. JSON output exists somewhere, maybe an API spec, but gaps force workarounds. |
| 15-22 | Agent-ready | :yellow_circle: | Solid agent support across most dimensions. A few gaps remain but agents can accomplish most tasks without heroics. |
| 23-30 | Agent-first | :green_circle: | Purpose-built for agent consumption. Best in class. Other projects should study this one. |

### Dimension Applicability

Not every dimension applies to every project. A CLI tool has no API Surface (Dimension 1) to score. A backend service has no CLI (Dimension 2) to evaluate. The skill handles this:

- **N/A dimensions** are excluded from the total. A project with 7 applicable dimensions is scored out of 21, not 30.
- The rating bands scale proportionally. A 15/21 (71%) maps to the same band as a 21/30 (70%).
- The report clearly states which dimensions are N/A and why.

**Applicability heuristics:**

| Dimension | Applicable when |
|-----------|----------------|
| API Surface | Project exposes HTTP API endpoints |
| CLI Design | Project ships a CLI tool |
| MCP Server | Project could benefit from MCP (has data, actions, or both) |
| Discovery & AEO | Project has public documentation or a web presence |
| Authentication | Project requires auth for any operation |
| Error Handling | Project returns errors to callers (API, CLI, SDK) |
| Tool Design | Project exposes callable operations (API, SDK, MCP, CLI commands) |
| Context Files | Always applicable |
| Multi-Agent Support | Project has complex workflows or could delegate tasks |
| Testing & Evaluation | Always applicable (but weighted by other applicable dimensions) |

---

## 4. Audit Phases

### Phase 0: Project Detection

Detect the project's technology stack, existing agent surfaces, and applicable dimensions.

**Step 0.1: Stack detection**

```
Detect:
- Language(s): TypeScript, Python, Go, Rust, Java, Ruby, etc.
- Framework(s): Next.js, FastAPI, Express, Django, Gin, Actix, Spring, etc.
- Package manager: npm, pnpm, yarn, pip, poetry, cargo, go modules
- Monorepo structure: turborepo, nx, lerna, cargo workspace
```

**Step 0.2: Existing agent surface detection**

Scan for all existing agent-related files and capabilities:

```
Scan for:
- OpenAPI specs (openapi.yaml, swagger.json, etc.)
- MCP server files (mcp.json, McpServer instantiation)
- Context files (AGENTS.md, CLAUDE.md, .cursorrules)
- Discovery files (llms.txt, llms-full.txt, .well-known/ai-plugin.json)
- CLI tools (bin/, CLI framework deps)
- A2A agent cards (.well-known/agent.json)
- Agent test files (*agent*.test.*, *tool*.test.*, *mcp*.test.*)
- Error handling patterns (error middleware, ProblemDetails)
- Auth configuration (OAuth, API keys, JWT)
```

**Step 0.3: API route and endpoint discovery**

```
Framework-specific route detection:
- Next.js App Router: app/**/route.ts
- Next.js Pages API: pages/api/**/*.ts
- Express/Fastify: grep for router.get/post/put/delete
- FastAPI: grep for @app.get/post/put/delete
- Django: urls.py patterns
- Go: http.HandleFunc or framework-specific patterns
```

**Step 0.4: Determine applicable dimensions**

Based on detection results, mark each dimension as applicable or N/A with a one-line justification.

**Step 0.5: Summarize detection**

```markdown
## Project Profile

**Stack:** [language] + [framework]
**Package manager:** [manager]
**Structure:** [monorepo / single-package]

### Existing Agent Surfaces
- API spec: [found / not found] — [file path if found]
- MCP server: [found / not found] — [file path if found]
- Context files: [list of found files]
- Discovery files: [list of found files]
- CLI tools: [found / not found]
- Agent tests: [found / not found]

### Applicable Dimensions
[List of applicable dimensions with justification for any N/A]

### Scoring basis
Total: [N] applicable dimensions, max score: [N*3]
```

### Phase 1: Dimension Scoring

Score each applicable dimension using the rubrics defined in Section 2. This phase is purely analytical. No changes are made.

**For each applicable dimension:**

1. **Gather evidence.** Read the relevant files identified in Phase 0. Use Grep and Glob to find additional signals from the detection criteria.
2. **Apply rubric.** Match the evidence against the 0-3 scoring criteria. Choose the highest level where ALL criteria are met.
3. **Record justification.** For each score, record:
   - The score (0-3)
   - The specific files and patterns that justify the score
   - What is missing that would earn the next level up
   - A confidence indicator (high / medium / low) based on how much evidence was available

**Produce a scorecard:**

```markdown
## Agentify Scorecard

| # | Dimension | Score | Rating | Confidence | Key Signal |
|---|-----------|-------|--------|------------|------------|
| 1 | API Surface | 1/3 | Basic | High | openapi.yaml exists, missing operationIds |
| 2 | CLI Design | 0/3 | None | High | No CLI tool detected |
| 3 | MCP Server | 2/3 | Well-structured | Medium | MCP server with tools, missing annotations |
| 4 | Discovery & AEO | 1/3 | Basic | High | AGENTS.md exists, no llms.txt |
| 5 | Authentication | 2/3 | OAuth 2.1 M2M | High | Client credentials implemented |
| 6 | Error Handling | 1/3 | Partial | Medium | Inconsistent error format across routes |
| 7 | Tool Design | 1/3 | Basic schemas | High | Schemas exist but descriptions weak |
| 8 | Context Files | 1/3 | Basic | High | CLAUDE.md exists, generic content |
| 9 | Multi-Agent Support | N/A | — | — | Single-purpose API, no delegation needed |
| 10 | Testing & Evaluation | 0/3 | None | High | No agent-specific tests |

**Total: 9 / 24 (37%) — Agent-tolerant**

Rating: Agent-tolerant — Agents can use it with heavy prompt engineering.
```

### Phase 2: Findings Report

Transform the scorecard into an actionable findings report.

**Severity levels:**

| Severity | Definition | Examples |
|----------|-----------|----------|
| Critical | Blocks agent use entirely. Agents cannot perform the intended operation. | No structured output from CLI. Auth requires browser only. No error structure. |
| High | Significant friction. Agents can work around it but with unreliable results. | Inconsistent JSON output. Missing operationIds. Weak tool descriptions. |
| Medium | Suboptimal. Agents can function but the experience is degraded. | Missing examples in API spec. No --dry-run. No agent test coverage. |
| Low | Nice-to-have. Would improve agent experience but not blocking. | Missing llms-full.txt. No NDJSON streaming. No tool annotations. |

**Clustering strategy:**

Findings are NOT grouped by dimension. They are grouped by "what you would fix together" — files and concerns that would be addressed as a unit of work.

Clustering criteria:
1. **By area of code** — findings touching the same files cluster together.
2. **By type of work** — findings requiring the same kind of change cluster together (e.g., "add structured errors to all API routes").
3. **By dependency** — if fixing A is prerequisite for fixing B, they cluster together with A first.

**Each finding includes:**

```markdown
### [Finding Title]

**Dimension:** [which dimension this relates to]
**Severity:** [Critical / High / Medium / Low]
**File(s):** [specific file paths]
**Current state:** [what exists now — with evidence]
**Why it matters for agents:** [concrete impact on agent usage]
**How to fix:** [specific steps]
**Reference:** [link to agent-zero docs page]
**Effort estimate:** [S / M / L]
```

**Cluster format:**

```markdown
## Cluster: [Descriptive Name]

**Why:** [1 sentence — what is wrong in this area and why it matters]
**Effort:** [total estimated effort]
**Impact:** [which dimensions improve and by how much]

### Findings

[Finding 1]
[Finding 2]
[Finding 3]

### Suggested approach
[1-3 sentences on how to tackle this cluster]
```

### Phase 3: Transformation Plan (user-initiated)

Generated only when the user requests it after reviewing the findings report. The plan is an ordered sequence of work items optimized for highest-impact, lowest-effort first.

**Plan structure:**

```markdown
# Agentify Transformation Plan

**Project:** [name]
**Current score:** [X / Y] ([Z]%) — [rating]
**Target score:** [A / Y] ([B]%) — [target rating]
**Estimated total effort:** [X hours / days]

## Phase 1: Quick Wins (Score +N)

### Task 1.1: [Title]
**Dimension:** [which one]
**Score impact:** [dimension] 0 → 1
**Effort:** S
**Files to modify:** [list]
**Changes:**
- [specific change 1]
- [specific change 2]

### Task 1.2: [Title]
[same format]

## Phase 2: Foundation (Score +N)

[Tasks that require more effort but establish important patterns]

## Phase 3: Advanced (Score +N)

[Tasks that push dimensions to level 2-3]

## Phase 4: Excellence (Score +N)

[Tasks that achieve level 3 across all applicable dimensions]
```

**Ordering heuristics:**

1. **Critical findings first** regardless of effort.
2. **Context files (Dimension 8) early** because they improve agent interaction with the codebase during subsequent tasks. The agent doing the transformation benefits from better context files.
3. **Error handling (Dimension 6) before API Surface (Dimension 1)** because a well-structured API with bad errors is worse than a basic API with good errors.
4. **Discovery (Dimension 4) last** unless the project has a public web presence. Discovery files describe what exists, so they should be written after the capabilities are in place.
5. **Testing (Dimension 10) interleaved** — each phase includes tests for what it builds, not a testing phase at the end.

### Phase 4: Execution (user-initiated)

Executes the transformation plan using specialized sub-agents. Each sub-agent is an expert in one transformation type.

**Execution is incremental.** The user chooses which phase or task to execute. The skill confirms before making changes. After each task, the skill re-scores the affected dimension to verify the improvement.

**Sub-agent dispatch pattern:**

```
For each task in the selected phase:
  1. Read the task specification
  2. Read the relevant reference doc from references/
  3. Dispatch the appropriate sub-agent with task + reference
  4. Sub-agent executes the transformation
  5. Sub-agent reports what was changed
  6. Re-score the affected dimension
  7. Update the scorecard
```

---

## 5. Sub-Agents

Each transformation type has a specialized sub-agent. Sub-agents receive the task specification and relevant reference documentation. They execute the transformation and report results.

### context-writer

**Purpose:** Generate and curate context files (AGENTS.md, CLAUDE.md, .cursor/rules/).

**Inputs:**
- Current context files (if any)
- Project stack detection results
- Available commands and conventions
- Directory structure

**Outputs:**
- Created/updated context files
- Permission boundaries defined
- Progressive disclosure structure

**Reference:** `references/context-files.md`

### error-designer

**Purpose:** Implement structured error handling patterns.

**Inputs:**
- Current error handling patterns
- API routes / CLI commands that return errors
- Existing error types

**Outputs:**
- RFC 7807 error types
- Error middleware / handler
- Error documentation
- Recovery hints and retry guidance

**Reference:** `references/error-handling.md`

### api-optimizer

**Purpose:** Improve OpenAPI specs and API design for agent consumption.

**Inputs:**
- Current OpenAPI spec (or route handlers if no spec)
- API routes and their handlers
- Existing documentation

**Outputs:**
- Updated/created OpenAPI spec
- Agent-oriented descriptions
- operationId naming
- Request/response examples
- Error schemas per endpoint

**Reference:** `references/api-surface.md`

### cli-enhancer

**Purpose:** Add agent-friendly capabilities to CLI tools.

**Inputs:**
- CLI entry point and command definitions
- Current output formats
- Available flags

**Outputs:**
- `--json` output on all commands
- Consistent output envelope schema
- `--dry-run` on mutating commands
- Semantic exit codes
- Schema introspection (at level 3)

**Reference:** `references/cli-design.md`

### mcp-builder

**Purpose:** Create or enhance MCP servers.

**Inputs:**
- Existing MCP server (if any)
- Available API endpoints / operations
- Data sources and resources
- Common workflow patterns

**Outputs:**
- MCP server implementation
- Tool definitions with descriptions
- Resource exposure
- Prompt templates
- Tool annotations (at level 3)

**Reference:** `references/mcp-servers.md`

### discovery-writer

**Purpose:** Generate agent discovery files and AEO assets.

**Inputs:**
- Project capabilities (from all other dimensions)
- Public documentation
- API surface
- Web presence

**Outputs:**
- `llms.txt` and `llms-full.txt`
- `AGENTS.md` (if not already covered by context-writer)
- JSON-LD structured data
- `.well-known/ai-plugin.json`
- Content negotiation middleware (at level 3)

**Reference:** `references/discovery-aeo.md`

### auth-upgrader

**Purpose:** Add machine-to-machine auth patterns.

**Inputs:**
- Current auth implementation
- Auth provider configuration
- API endpoints requiring auth

**Outputs:**
- OAuth 2.1 Client Credentials configuration
- Scoped API key implementation
- Token rotation setup
- Agent identity patterns (at level 3)

**Reference:** `references/authentication.md`

### test-writer

**Purpose:** Create agent evaluation suites.

**Inputs:**
- Available tools / operations
- Common agent workflows
- Existing test infrastructure

**Outputs:**
- Tool routing tests
- Parameter correctness tests
- Error recovery tests
- Multi-step flow tests (at level 2-3)
- Eval framework configuration (at level 3)

**Reference:** `references/testing-evaluation.md`

---

## 6. Skill Architecture

### File Structure

```
skills/
  agentify/
    SKILL.md                    # Orchestration instructions (~300 lines)
    references/
      api-surface.md            # Detailed patterns for Dimension 1
      cli-design.md             # Detailed patterns for Dimension 2
      mcp-servers.md            # Detailed patterns for Dimension 3
      discovery-aeo.md          # Detailed patterns for Dimension 4
      authentication.md         # Detailed patterns for Dimension 5
      error-handling.md         # Detailed patterns for Dimension 6
      tool-design.md            # Detailed patterns for Dimension 7
      context-files.md          # Detailed patterns for Dimension 8
      multi-agent.md            # Detailed patterns for Dimension 9
      testing-evaluation.md     # Detailed patterns for Dimension 10
      scoring-rubrics.md        # Complete scoring criteria and edge cases
      transformation-ordering.md # How to sequence changes for max impact
    agents/
      context-writer.md
      error-designer.md
      api-optimizer.md
      cli-enhancer.md
      mcp-builder.md
      discovery-writer.md
      auth-upgrader.md
      test-writer.md
    templates/
      agents-md.md              # AGENTS.md template
      claude-md.md              # CLAUDE.md template
      llms-txt.md               # llms.txt template
      llms-full-txt.md          # llms-full.txt template
      openapi-skeleton.yaml     # OpenAPI spec starting point
      mcp-server-skeleton.ts    # MCP server starting point
      error-types.ts            # RFC 7807 error type definitions
      scorecard.md              # Scorecard report template
      audit-report.md           # Full audit report template
      plan.md                   # Transformation plan template
```

### SKILL.md Frontmatter

```yaml
---
name: agentify
context: fork
description: |
  Audit any codebase for AI agent consumability and transform it to be agent-first.
  Scores 10 dimensions on a 0-3 rubric, produces a findings report, and executes
  a transformation plan with specialized sub-agents.
  Use when asked to "agentify this codebase", "make this agent-ready",
  "audit for agent support", "agent DX audit", or "how agent-friendly is this".
license: MIT
argument-hint: "[audit|score|plan|transform] [--dimension=<name>] [--format=json|markdown]"
metadata:
  author: howells
---
```

### Skill Invocation Modes

| Command | Mode | What Happens |
|---------|------|-------------|
| `/agentify` | Full audit | Run all phases 0-2. Produce scorecard + findings report. |
| `/agentify score` | Scorecard only | Run phases 0-1. Produce scorecard without detailed findings. |
| `/agentify audit` | Same as full audit | Alias for the default mode. |
| `/agentify plan` | Plan mode | Requires a prior audit. Generate transformation plan from findings. |
| `/agentify transform` | Execution mode | Requires a prior plan. Execute transformation tasks with sub-agents. |
| `/agentify --dimension=mcp` | Focused audit | Audit only the specified dimension in depth. |
| `/agentify --format=json` | JSON output | Produce scorecard and findings as JSON (for programmatic consumption). |

### Reference Loading Strategy

References are loaded on demand, not all at once. This keeps the initial skill load small.

```
Phase 0: No references loaded (detection uses Glob/Grep only)
Phase 1: Load scoring-rubrics.md + dimension-specific references as needed
Phase 2: No additional references (findings derived from Phase 1 evidence)
Phase 3: Load transformation-ordering.md
Phase 4: Load agent prompt + reference for the specific dimension being transformed
```

### Platform Adaptation

The skill adapts to the hosting platform's capabilities:

- **Sub-agent support available:** Dispatch transformation agents as sub-agents for parallel execution.
- **No sub-agent support:** Execute transformation logic inline, one task at a time.
- **Task tracking available:** Create tasks for transformation plan items.
- **No task tracking:** Write plan to markdown file only.
- **Structured questions available:** Use them for user interaction points.
- **No structured questions:** Use plain-text prompts.

---

## 7. Output Artifacts

### Audit Report

**Path:** `docs/agentify/audit-YYYY-MM-DD.md`

Contains:
- Project profile (stack, structure, existing surfaces)
- Full scorecard with per-dimension justification
- Rating and interpretation
- Detailed findings grouped by cluster
- Recommended next steps

### Scorecard

**Path:** `docs/agentify/scorecard.md`

A living document that tracks the project's agentify score over time. Updated on each audit run with a new entry.

```markdown
# Agentify Scorecard

## Latest: [date] — [score]/[max] ([percentage]%) — [rating]

| # | Dimension | Score | Notes |
|---|-----------|-------|-------|
| 1 | API Surface | 2/3 | OpenAPI with operationIds, missing Arazzo |
| ... | ... | ... | ... |

## History

| Date | Score | Rating | Delta | Focus |
|------|-------|--------|-------|-------|
| 2026-04-17 | 9/24 | Agent-tolerant | — | Initial audit |
| 2026-04-24 | 15/24 | Agent-ready | +6 | Error handling, context files |
```

The scorecard is designed to be committed to version control and tracked over time. It provides a single-file view of the project's agent readiness trajectory.

### Transformation Plan

**Path:** `docs/agentify/plan.md`

Generated in Phase 3. Contains ordered tasks with file-level specificity. See Section 4, Phase 3 for format.

---

## 8. Integration with Agent Zero Docs Site

The Agent Zero documentation site at `~/Sites/agent-zero` serves as the knowledge base for the skill. Every finding references a specific docs page.

### Reference Mapping

| Dimension | Docs Section |
|-----------|-------------|
| API Surface | `/docs/api-surface` |
| CLI Design | `/docs/cli-design` |
| MCP Server | `/docs/mcp-servers` |
| Discovery & AEO | `/docs/discovery-aeo` |
| Authentication | `/docs/authentication` |
| Error Handling | `/docs/error-handling` |
| Tool Design | `/docs/tool-design` |
| Context Files | `/docs/context-files` |
| Multi-Agent Support | `/docs/multi-agent` |
| Testing & Evaluation | `/docs/testing-evaluation` |

### How Integration Works

1. **Skill references are distilled from docs.** Each `references/<dimension>.md` file in the skill is a condensed, action-oriented version of the corresponding docs section. It contains the scoring rubric, detection patterns, and transformation instructions — everything an agent needs to score and fix, without the full educational context.

2. **Findings link to docs.** Every finding in the audit report includes a `reference` field with a URL to the relevant docs page. The docs page provides the full explanation, examples, and rationale that the finding summary cannot include.

3. **Docs are the source of truth.** When the skill's reference and the docs disagree, the docs win. Skill references are regenerated from docs content periodically.

4. **Docs evolve independently.** The docs site covers topics broader than what the skill audits. New docs content may eventually become new dimensions or sub-dimensions in the skill.

---

## 9. Edge Cases and Design Decisions

### Polyglot Projects

Projects with multiple languages (e.g., TypeScript frontend + Python backend) are audited as a unit. Each dimension score reflects the weakest applicable surface. If the TypeScript API has structured errors but the Python API does not, Error Handling scores based on the Python API.

The findings report notes which language/surface is pulling the score down.

### Monorepo Handling

For monorepos, the skill can audit:
- The entire monorepo (default)
- A specific package (`/agentify packages/api`)
- A specific app (`/agentify apps/web`)

When auditing the full monorepo, each package/app gets its own dimension scores. The top-level score is the weighted average (by number of applicable dimensions per package).

### Projects with No Agent Surface

A project scoring 0/30 is a valid and common result. The skill does not judge — it measures. The findings report explains what "0" means practically and what the minimum viable improvements would be.

### Re-auditing After Transformation

After executing transformation tasks, the skill re-scores only the affected dimensions. The delta is recorded in the scorecard history. This provides a measurable feedback loop.

### Conflicting Patterns

When a project has conflicting patterns (e.g., some routes use RFC 7807 errors and others do not), the dimension score reflects the inconsistent state. The score for "partial but inconsistent" is always lower than "consistent at a lower level."

Example: A project with RFC 7807 on 3 of 10 routes scores Error Handling at 1 (partially structured), not 2 (RFC 7807 everywhere). The "everywhere" qualifier matters.

### Projects That Ship a SKILL.md

If the project already ships a `SKILL.md` (indicating it is itself a Claude Code skill), Dimension 2 (CLI Design) gets extra credit for agent self-documentation. The SKILL.md is evaluated for quality as part of the CLI scoring.

---

## 10. Success Criteria

The skill is complete and correct when:

- [ ] Phase 0 detects the project stack, existing agent surfaces, and applicable dimensions within 30 seconds
- [ ] Phase 1 scores every applicable dimension with evidence and justification
- [ ] Phase 1 scorecard matches manual expert assessment on 3+ reference codebases
- [ ] Phase 2 findings are clustered by area of work, not by dimension
- [ ] Phase 2 every finding includes file paths, current state, why it matters, and how to fix
- [ ] Phase 3 transformation plan orders tasks by impact-to-effort ratio
- [ ] Phase 4 sub-agents produce correct transformations for their respective dimensions
- [ ] Phase 4 re-scoring after transformation shows measurable improvement
- [ ] Scorecard tracks history across multiple audit runs
- [ ] All findings link to agent-zero docs pages
- [ ] The skill works on projects in any supported language (TypeScript, Python, Go, Rust at minimum)
- [ ] N/A dimensions are correctly identified and excluded from scoring
- [ ] The skill can audit itself (meta-test: run `/agentify` on the agent-zero project)

---

## 11. Future Considerations

These are not in scope for v1 but are noted for future design.

### CI Integration
A GitHub Action or CI step that runs `/agentify score` on every PR and posts the scorecard as a PR comment. Score regressions block merge.

### Badge Generation
Generate a shield.io-style badge (`Agent Score: 22/30 — Agent-ready`) for README files.

### Public Leaderboard
An optional registry where projects can publish their agentify scores. Creates competitive pressure toward agent-first design.

### Dimension Plugins
Allow third parties to define new dimensions with scoring rubrics. The skill would load dimension plugins and incorporate them into the audit.

### Cross-Project Comparison
Compare agentify scores across multiple projects in a portfolio. Identify which projects are lagging and which patterns could be shared.
