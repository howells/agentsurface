# agent-zero

## Summary

A monorepo suite for auditing and transforming any codebase to be maximally consumable by AI agents. Core skill is `agentify`: 11-dimension scoring framework (0–33 points), produces clustered findings and transformation plans, dispatches specialist sub-agents for execution. Includes templates for AGENTS.md, CLAUDE.md, discovery files, and agent context. Cross-compatible with Claude Code, Claude Agent SDK, OpenAI Codex CLI, and generic runtimes via AGENTS.md spec and MCP standards.

- **agentify skill**: Audit, score, find gaps, plan, execute transformations
- **Specialist agents**: context-writer, discovery-writer, api-optimizer, cli-enhancer, auth-upgrader, mcp-builder, test-writer
- **11 dimensions**: API Surface, CLI, MCP, Discovery, Auth, Error Handling, Tool Design, Context Files, Multi-Agent, Testing, Data Retrievability
- **Output**: scorecard (JSON), findings report (clustered), transformation plan, delta scorecard post-execution

---

**A suite of agentic AI tools and frameworks for auditing, transforming, and optimizing codebases for AI agent consumption.** Includes specialist agents for discovery, API design, CLI hardening, MCP servers, authentication, error handling, and testing. Cross-compatible with Claude Code, Claude Agent SDK, OpenAI Codex CLI, and generic agent runtimes via AGENTS.md and MCP standards.

## What This Repository Contains

This is a monorepo containing:
- **Skills** (`./skills/`) — Claude Code skills for agent-driven workflows
  - `agentify` — Core audit and transformation skill
- **Agents** (`./agents/`) — Specialist sub-agents (context-writer, api-optimizer, mcp-builder, etc.)
- **Commands** (`./commands/`) — Slash commands for quick invocation
- **Disciplines** (`./disciplines/`) — Agent personas and execution contexts
- **Templates** (`./templates/`) — AGENTS.md, CLAUDE.md, and discovery file templates
- **Docs** (`./docs/`) — Architecture, audit reports, and reference guides
- **Source** (`./src/`) — TypeScript utilities and helpers (Next.js documentation site)

## Repository Structure

```
agent-zero/
├── AGENTS.md                    # This file: project guidance for AI agents
├── package.json                 # Build, dev, and dependencies
├── .claude-plugin/plugin.json   # Claude Code plugin metadata
├── .skill.yaml                  # Skill distribution manifest
├── INSTALL.md                   # Distribution and installation guide
├── skills/
│   └── agentify/
│       ├── SKILL.md             # Main skill (entry point)
│       ├── INSTALL.md           # Installation instructions
│       └── references/          # Dimension-specific rubrics
├── agents/                      # Specialist agent definitions
├── commands/                    # Slash command definitions
├── disciplines/                 # Agent execution personas
├── templates/                   # Reference templates
├── docs/                        # Audit reports and guides
├── src/                         # Next.js site source
└── .source/                     # Documentation generation config
```

## Build and Development

**Prerequisites:** Node.js 20+, pnpm

```bash
# Install dependencies
pnpm install

# Start dev server (Next.js docs site)
pnpm dev

# Build static site
pnpm build

# Run in production
pnpm start
```

Lint and format tools are configured in `biome.json` for TypeScript/JSX.

## Key Skills and Agents

### agentify Skill
The core audit and transformation skill. Evaluates any codebase across 11 dimensions:
1. API Surface
2. CLI Design
3. MCP Server
4. Discovery & AEO
5. Authentication
6. Error Handling
7. Tool Design
8. Context Files
9. Multi-Agent
10. Testing
11. Data Retrievability

**Invocation:**
- `/agentify` — Full audit with findings
- `/agentify score` — Quick scorecard only
- `/agentify plan` — Audit + transformation plan
- `/agentify transform` — Audit + plan + execute

See [./skills/agentify/SKILL.md](./skills/agentify/SKILL.md) for complete documentation.

### Specialist Agents
When executing transformations (Phase 4), agentify dispatches specialist agents:
- `context-writer` — AGENTS.md, CLAUDE.md, .cursor/rules
- `discovery-writer` — llms.txt, robots.txt, JSON-LD
- `error-designer` — RFC 7807 structured errors
- `api-optimizer` — OpenAPI descriptions
- `cli-enhancer` — --json output, exit codes
- `auth-upgrader` — OAuth 2.1 Client Credentials
- `mcp-builder` — MCP server creation
- `test-writer` — Agent evaluation suites

## For Codex and Generic Agents

This repository follows the [Linux Foundation AGENTS.md spec](https://github.com/openai/agents.md) for cross-runtime compatibility.

**OpenAI Codex CLI** reads this file automatically. Codex will:
- Discover the `agentify` skill via the relative link below
- Use the repo layout, build commands, and agent list to optimize its context
- Apply MCP server configuration if present

**Other agent runtimes** (Cursor, Devin, Jules, etc.) similarly respect the AGENTS.md convention.

### Skills Available to Agents

- **[agentify](./skills/agentify/SKILL.md)** — Audit and transform codebases for agent consumption (11-dimension scoring, findings, plan, execute)

### MCP Servers

No MCP servers are bundled in this repo. Agentify uses Claude's native Agent tool for specialist dispatching.

## Dependencies

- **Claude Code** — Required for skill execution (not required to use AGENTS.md spec)
- **Next.js 16** — For documentation site
- **TypeScript 6** — For development
- **Tailwind CSS 4.2** — For styling

## License

MIT

## Contact

Author: Daniel Howells

---

## For Codex-Specific Notes

Codex CLI supports this repository as of April 2026:
- Reads this AGENTS.md for project guidance
- Respects `skills/` directory layout for Claude Code interop
- Honors `package.json` scripts for build/test/lint
- Can invoke the `agentify` skill via agent-to-agent delegation if Claude Code is available, or via a local MCP bridge (future feature)

For Codex to use agentify, ensure `agentify` skill is installed in Claude Code first, then reference it from your project's own AGENTS.md.

