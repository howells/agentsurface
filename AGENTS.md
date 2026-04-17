# agent-zero

## Purpose

`agent-zero` is a monorepo for auditing and improving how well a codebase works with AI agents.

The main capability in this repository is the `agentify` skill. It audits a target codebase across 11 dimensions, produces a scorecard and findings, and can execute a transformation plan through specialist sub-agents.

This repository also includes supporting agents, commands, templates, and a Next.js documentation site.

## Primary Capability

### `agentify`

Use [`./skills/agentify/SKILL.md`](./skills/agentify/SKILL.md) when the task is to:

- audit agent readiness
- score a codebase across agent-consumption dimensions
- identify gaps in API, CLI, MCP, discovery, auth, testing, or retrievability
- generate a transformation plan
- execute targeted upgrades with specialist agents

Core characteristics:

- 11 scored dimensions, `0-3` each, for a maximum of `33`
- clustered findings with concrete fixes
- prioritized transformation planning
- optional execution through specialist agents
- cross-runtime positioning via `AGENTS.md`, `SKILL.md`, and MCP-aligned patterns

## Specialist Agents

When `agentify` enters execution mode, it can delegate to specialist agents in [`./agents`](./agents):

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

- [`./skills/agentify`](./skills/agentify) - the main skill and scoring references
- [`./agents`](./agents) - specialist agent definitions used during transformation
- [`./commands`](./commands) - slash-command entrypoints such as `/agentify`
- [`./disciplines`](./disciplines) - longer-form reference material on agent design
- [`./templates`](./templates) - copyable templates for discovery, MCP, auth, errors, evals, and orchestration
- [`./src/app`](./src/app) - Next.js application for the docs site
- [`./src/content/docs`](./src/content/docs) - published documentation content in MDX
- [`./docs`](./docs) - working docs and internal specs
- [`./.claude-plugin/plugin.json`](./.claude-plugin/plugin.json) - Claude Code plugin metadata
- [`./.skill.yaml`](./.skill.yaml) - skill distribution manifest

## Development

### Prerequisites

- Node.js 20+
- `pnpm`

### Common Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
```

Notes:

- `postinstall` runs `fumadocs-mdx`
- the current `package.json` defines `dev`, `build`, and `start`
- there is no dedicated `test` or `lint` script in `package.json` at the time of writing
- formatting and linting configuration lives in [`./biome.json`](./biome.json)

## How To Navigate This Repo

If you are an agent entering this repository cold, the usual read order is:

1. Read this file for the repo overview and working constraints.
2. Read [`./skills/agentify/SKILL.md`](./skills/agentify/SKILL.md) for the operative workflow.
3. Read the relevant reference files under [`./skills/agentify/references`](./skills/agentify/references) for scoring details.
4. Read [`./commands/agentify.md`](./commands/agentify.md) if you need the slash-command surface.
5. Read the matching files in [`./agents`](./agents), [`./templates`](./templates), or [`./src/content/docs`](./src/content/docs) depending on the task.

## Skills Available To Agents

- [`agentify`](./skills/agentify/SKILL.md) - audit and transform codebases for AI agent consumption

## Compatibility Notes

This repository is intended to be understandable by multiple agent runtimes.

- `AGENTS.md` provides root-level project guidance
- `SKILL.md` provides operational instructions for the `agentify` skill
- Claude Code can consume the plugin and skill layout directly
- Codex and other generic runtimes can follow the `AGENTS.md` entrypoint and linked skill files

## MCP Status

No standalone MCP server is bundled in this repository today.

`agentify` may recommend or generate MCP surfaces for other codebases, but this repo itself is primarily a skill, template, and documentation distribution repo.

## Dependencies And Stack

Current stack visible in the repository:

- Next.js 16
- React 19
- TypeScript 6
- Tailwind CSS 4
- Fumadocs for the documentation site

## Boundaries

When working in this repo:

- prefer updating source documentation rather than duplicating the same explanation across multiple files
- keep repository descriptions aligned with the actual checked-in structure
- do not claim scripts, servers, or integrations exist unless they are present in code or configuration
- treat `AGENTS.md` as an operational document first and a marketing document second

## Key References

- [`./skills/agentify/SKILL.md`](./skills/agentify/SKILL.md)
- [`./commands/agentify.md`](./commands/agentify.md)
- [`./docs/arc/specs/agentify-spec.md`](./docs/arc/specs/agentify-spec.md)
- [`./README.md`](./README.md)
- [`./INSTALL.md`](./INSTALL.md)

## License

MIT

## Contact

Author: Daniel Howells
