---
name: agentify
description: |
  Audit and transform any codebase for AI agent consumability. Use when asked to
  "make this agentic", "audit agent readiness", "score this codebase", "add MCP",
  "create llms.txt", "improve agent DX", "agentify this project", or any request
  about making a codebase, API, or CLI more consumable by AI agents.
version: 1.0.0
license: MIT
keywords:
  - agentic
  - mcp
  - api-design
  - cli-design
  - agent-dx
  - audit
  - transformation
  - llms-txt
  - agents-md
  - aeo
  - data-retrievability
  - vectors
  - rag
  - codex-compatible
homepage: https://github.com/openai/agents.md
repository: https://github.com/anthropics/claude-code
author: Daniel Howells
metadata:
  agents:
    - context-writer
    - discovery-writer
    - error-designer
    - api-optimizer
    - cli-enhancer
    - auth-upgrader
    - mcp-builder
    - test-writer
---

# Agentify

**Audit and transform any codebase to be maximally consumable by AI agents.** Scores across 11 dimensions (0-3 each, max 33 points), produces clustered findings, and optionally executes transformation plans via specialist sub-agents. Works with Claude Code, Claude Agent SDK, OpenAI Codex CLI, and generic agent runtimes.

## Summary

Agentify provides a comprehensive audit framework for assessing how well a codebase supports AI agent consumption. It evaluates 11 key dimensions from API design to data retrievability to testing, generates a scorecard rating (Human-only → Agent-first), and dispatches specialist agents to fix high-impact gaps. Use this when you need to understand agent readiness, plan modernization, or execute transformations.

- **11-dimension audit** with 0-3 scoring rubric per dimension
- **Clustered findings report** organized by fix-together dependencies
- **Transformation plan** prioritized by impact-to-effort ratio
- **Specialist sub-agents** for targeted fixes (context, discovery, error handling, API, CLI, auth, MCP, testing)
- **Delta scorecard** post-execution showing improvement across dimensions
- **Cross-runtime compatible** — AGENTS.md + SKILL.md for Codex, Claude Code, and generic agents

Audit and transform any codebase to be maximally consumable by AI agents.
Scores across 11 dimensions (0-3 each, total 0-33), produces clustered findings,
and optionally executes a transformation plan via specialist sub-agents.

## Compatibility

This skill runs natively on:
- **Claude Code** — Via skill loader (`.claude/skills/agentify/SKILL.md`)
- **Claude Agent SDK** — Via plugin (`mcp__plugin__agentify`)
- **OpenAI Codex CLI** — Via `AGENTS.md` cross-reference (project root links to this skill)
- **Generic agent runtimes** — Via AGENTS.md convention (Linux Foundation spec)

For Codex and non-Claude tools, reference this skill in your project's `AGENTS.md`:
```markdown
- [agentify](./skills/agentify/SKILL.md) — Audit and transform codebases for agent consumption
```

---

## Distribution

**Claude Code plugin marketplace** (recommended for Claude users):
- Install via Claude Code: `/plugin install agentify`
- Source: `.claude-plugin/plugin.json`

**Git clone** (for personal/team use):
```bash
git clone https://github.com/anthropics/agent-zero ~/.claude/skills/agentify
```

**Project-specific** (commit to version control):
```bash
cp -r skills/agentify .claude/skills/
```

See [INSTALL.md](./INSTALL.md) for detailed instructions.

---

<tool_restrictions>
## REQUIRED TOOLS
- Read, Glob, Grep — for codebase analysis
- Write — for generating audit reports and transformation artifacts
- Agent — for dispatching specialist sub-agents in Phase 4

## BANNED TOOLS
- EnterPlanMode — this skill manages its own process
- ExitPlanMode — you are never in plan mode
</tool_restrictions>

## Invocation Modes

- `/agentify` — Full audit with scorecard and findings
- `/agentify score` — Quick scorecard only (no detailed findings)
- `/agentify plan` — Full audit + transformation plan
- `/agentify transform` — Full audit + plan + execute transformations
- `/agentify --dimension=mcp` — Audit a single dimension
- `/agentify --format=json` — Output as structured JSON

---

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
   | Discovery | `**/llms.txt`, `**/llms-full.txt`, `**/robots.txt`, `**/sitemap.xml` |
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

Present detected surfaces and applicable dimensions. Then proceed to Phase 1.

---

## Phase 1: Dimension Scoring

<required_reading>
Read the scoring rubric NOW:
`${CLAUDE_PLUGIN_ROOT}/skills/agentify/references/scoring-rubric.md`
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
| 4 | **Discovery & AEO** | llms.txt, AGENTS.md, JSON-LD, content negotiation, robots.txt |
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

```
╔══════════════════════════════════════════════════════════════════╗
║                    AGENTIFY SCORECARD                          ║
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

╠══════════════════════════════════════════════════════════════════╣
║  TOTAL: 11/27 (scaled: 12/30)                                  ║
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

When dimensions are N/A, scale: `(score / max_applicable) * 30`.
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

Write to `docs/agentify/audit-[YYYY-MM-DD].md` in the project being audited.

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
| 9 | Testing (eval suite) | Higher | Long-term |
| 10 | Multi-agent patterns | Highest | Advanced |

### Task Format

Each task in the plan:
- Task ID and description
- Files to create or modify
- Complexity: S (< 1 hour) / M (1-4 hours) / L (4+ hours)
- Score impact: which dimensions improve, by how much
- Dependencies: which tasks must complete first
- Agent: which specialist to dispatch

Write plan to `docs/agentify/plan.md`.

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
| `discovery-writer` | llms.txt, llms-full.txt, robots.txt, JSON-LD | Sonnet |
| `error-designer` | RFC 7807 structured errors | Sonnet |
| `api-optimizer` | OpenAPI descriptions, extensions | Sonnet |
| `cli-enhancer` | --json output, exit codes, introspection | Sonnet |
| `auth-upgrader` | OAuth 2.1 Client Credentials | Sonnet |
| `mcp-builder` | MCP server creation/enhancement | Sonnet |
| `test-writer` | Agent evaluation suite | Sonnet |

### Agent Dispatch

Each agent receives:
- Specific task(s) from the plan
- Relevant codebase files
- Scoring rubric for their dimension
- Reference doc: `${CLAUDE_PLUGIN_ROOT}/skills/agentify/references/[dimension].md`

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
║              AGENTIFY DELTA SCORECARD                 ║
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

1. Update `docs/agentify/scorecard.md` with history entry
2. Offer to commit changes
3. Suggest next improvement cluster

---

## Reference Loading

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
</required_reading>

---

## Edge Cases

- **Polyglot projects**: Score each language surface independently, report weakest
- **Monorepos**: Offer per-package or aggregate scoring
- **Zero-score projects**: Focus on the 3 highest-impact dimensions only
- **Re-audits**: Load previous `docs/agentify/scorecard.md`, show delta
- **N/A dimensions**: Skip and scale total proportionally
- **Single dimension mode**: `--dimension=X` skips other dimensions entirely
