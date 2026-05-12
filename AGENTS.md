# Agent Surface

## Purpose

Agent Surface is a monorepo for auditing and improving how well a codebase works with AI agents, and for scaffolding production-grade AI agent systems.

The repository provides a single skill, `surface`, that routes to the right workflow: audit, scaffold, transform, or generate.

This repository also includes templates and a Next.js documentation site.

## Primary Capabilities

### `surface`

Use [`./skills/surface/SKILL.md`](./skills/surface/SKILL.md) when the task is to:

- audit agent readiness
- score a codebase across agent-consumption dimensions
- identify gaps in API, CLI, MCP, discovery, auth, testing, or retrievability
- generate a transformation plan
- execute targeted upgrades with specialist agents
- scaffold a new AI agent, tool, or workflow
- initialize Mastra agent infrastructure in a project
- set up multi-provider model routing
- add memory (vector search, semantic recall) to agents
- create production-grade agent scaffolding based on proven patterns

Core characteristics:

- 11 scored dimensions, `0-3` each, for a maximum of `33`
- clustered findings with concrete fixes
- prioritized transformation planning
- optional execution through specialist agents
- Mastra-first framework recommendation (with graceful alternatives)
- 8 production patterns codified from deployed systems
- project-aware scaffolding that reads existing structure
- conversational — asks the right questions before generating code

## Specialist Agents

When `surface` enters execution mode, it delegates to specialist agents in [`./skills/surface/agents/`](./skills/surface/agents/):

- `context-writer` - context files such as `AGENTS.md`, `CLAUDE.md`, and editor rules
- `discovery-writer` - `llms.txt`, `robots.txt`, JSON-LD, and related discovery assets
- `error-designer` - structured error formats and recovery guidance
- `api-optimizer` - agent-oriented API descriptions and related improvements
- `cli-enhancer` - JSON output, exit codes, and CLI ergonomics for agents
- `auth-upgrader` - machine-to-machine auth and token flow improvements
- `mcp-builder` - MCP server and tool surface creation
- `test-writer` - evaluation harnesses and test coverage for agent workflows
- `retrievability-engineer` - retrieval and indexing improvements
- `agentic-patterns-writer` - reusable orchestration and agent-pattern guidance

## Repository Layout

High-signal directories:

- [`./skills/surface/`](./skills/surface/) - the main skill, scoring references, and specialist agents
- [`./disciplines/`](./disciplines/) - longer-form reference material on agent design
- [`./templates/`](./templates/) - copyable templates for discovery, MCP, auth, errors, evals, and orchestration
- [`./src/app/`](./src/app/) - Next.js application for the docs site
- [`./src/content/docs/`](./src/content/docs/) - published documentation content in MDX
- [`./docs/`](./docs/) - working docs and internal specs

## Development

### Prerequisites

- Node.js 20+
- npm

### Common Commands

```bash
npm install
npm run dev
npm run build
npm start
```

Notes:

- `postinstall` runs `fumadocs-mdx`
- formatting and linting configuration lives in [`./biome.json`](./biome.json)

## How To Navigate This Repo

If you are an agent entering this repository cold, the usual read order is:

1. Read this file for the repo overview and working constraints.
2. Read [`./skills/surface/SKILL.md`](./skills/surface/SKILL.md) for the operative workflow.
3. Read the relevant reference files under [`./skills/surface/references/`](./skills/surface/references/) for scoring details.
4. Read the matching files in [`./skills/surface/agents/`](./skills/surface/agents/), [`./templates/`](./templates/), or [`./src/content/docs/`](./src/content/docs/) depending on the task.

## Skills

- [`surface`](./skills/surface/SKILL.md) - audit, transform, scaffold, and generate for AI agent systems

## Cross-Runtime Compatibility

This repository is designed to be understood by multiple agent runtimes:

| Runtime | Discovery Path |
|---------|---------------|
| **Claude Code** | Reads this `AGENTS.md` + loads `skills/surface/SKILL.md` as a skill |
| **Codex CLI** | Reads this `AGENTS.md`, follows link to `SKILL.md` for instructions |
| **Cursor** | Reads this `AGENTS.md` for project context |
| **GitHub Copilot** | Reads this `AGENTS.md` for project context |
| **Devin / Jules** | Reads this `AGENTS.md` for project context |

For any runtime, the entry point is this file. The skill instructions in `SKILL.md` are plain markdown and can be followed by any agent that reads files.

## Boundaries

When working in this repo:

- prefer updating source documentation rather than duplicating the same explanation across multiple files
- keep repository descriptions aligned with the actual checked-in structure
- do not claim scripts, servers, or integrations exist unless they are present in code or configuration
- treat `AGENTS.md` as an operational document first and a marketing document second

## Key References

- [`./skills/surface/SKILL.md`](./skills/surface/SKILL.md)
- [`./README.md`](./README.md)
- [`./INSTALL.md`](./INSTALL.md)

## License

MIT

## Contact

Author: Daniel Howells
