# Agent Surface

## Purpose

Agent Surface is a guide and implementation kit for making software legible to AI agents, and for building production-grade agent systems.

The repository provides published documentation, reusable templates, a Next.js docs site, and a single operational skill, `surface`, that routes to the right workflow: guide, audit, scaffold, transform, or generate.

The site should read as the go-to guide for agent-readable software: concepts, standards, patterns, tooling, evaluation, and concrete implementation paths.

## Primary Capabilities

### `surface`

Use [`./skills/surface/SKILL.md`](./skills/surface/SKILL.md) when the task is to:

- explain, compare, or organize information about AI agents
- guide a developer through agent-readable software, agent systems, or agent infrastructure
- audit agent readiness
- score a codebase across agent-consumption dimensions
- identify gaps in API, CLI, MCP, discovery, auth, testing, or retrievability
- generate a transformation plan
- execute targeted upgrades with specialist agents
- scaffold a new AI agent, tool, or workflow
- initialize framework-appropriate agent infrastructure in a project
- set up multi-provider model routing
- add memory (vector search, semantic recall) to agents
- create production-grade agent scaffolding based on proven patterns

Core characteristics:

- guide-first documentation for agent systems, agent-readable surfaces, standards, tooling, and evaluation
- 11 scored dimensions, `0-3` each, for a maximum raw score of `33`, scaled to `30` for ratings
- clustered findings with concrete fixes
- prioritized transformation planning
- optional execution through specialist agents
- framework selection across OpenAI Agents SDK, Claude Managed Agents/Claude Code SDK, Vercel AI SDK/Workflow, Cloudflare Agents, Mastra, LangGraph, and MCP-first designs
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
- pnpm 9

### Common Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
```

Notes:

- `postinstall` runs `fumadocs-mdx`
- formatting and linting configuration lives in [`./oxlint.config.ts`](./oxlint.config.ts) and [`./oxfmt.config.ts`](./oxfmt.config.ts)

## How To Navigate This Repo

If you are an agent entering this repository cold, the usual read order is:

1. Read this file for the repo overview and working constraints.
2. Read [`./skills/surface/SKILL.md`](./skills/surface/SKILL.md) for the operative workflow.
3. For content or site-structure work, read the relevant source pages under [`./src/content/docs/`](./src/content/docs/).
4. For audits or scoring, read the relevant reference files under [`./skills/surface/references/`](./skills/surface/references/).
5. For implementation work, read the matching specialist prompts in [`./skills/surface/agents/`](./skills/surface/agents/) or templates in [`./templates/`](./templates/).

## Skills

- [`surface`](./skills/surface/SKILL.md) - guide, audit, evaluate, transform, scaffold, and generate for AI agent systems

## Cross-Runtime Compatibility

This repository is designed to be understood by multiple agent runtimes:

| Runtime            | Discovery Path                                                      |
| ------------------ | ------------------------------------------------------------------- |
| **Claude Code**    | Reads this `AGENTS.md` + loads `skills/surface/SKILL.md` as a skill |
| **Codex CLI**      | Reads this `AGENTS.md`, follows link to `SKILL.md` for instructions |
| **Cursor**         | Reads this `AGENTS.md` for project context                          |
| **GitHub Copilot** | Reads this `AGENTS.md` for project context                          |
| **Devin / Jules**  | Reads this `AGENTS.md` for project context                          |

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
