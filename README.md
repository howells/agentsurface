# agent-zero

`agent-zero` is a monorepo for auditing and improving how well software works with AI agents.

Its main deliverable is `agentify`: a skill for scoring a codebase across 11 agent-readiness dimensions, generating findings and transformation plans, and optionally executing targeted improvements through specialist sub-agents.

The repository also includes templates, command definitions, specialist agents, and a Next.js documentation site that explains the underlying patterns.

## What `agentify` Does

`agentify` is designed for requests such as:

- audit this codebase for agent readiness
- make this repo easier for AI agents to use
- improve API, CLI, MCP, discovery, auth, testing, or retrievability surfaces
- produce a transformation plan
- execute the highest-impact upgrades

Core outputs:

- scorecard across 11 dimensions, `0-3` each, max `33`
- clustered findings with concrete fixes
- prioritized transformation plan
- post-change delta scorecard

The 11 dimensions are:

1. API Surface
2. CLI Design
3. MCP Server
4. Discovery and AEO
5. Authentication
6. Error Handling
7. Tool Design
8. Context Files
9. Multi-Agent Support
10. Testing
11. Data Retrievability

## Repository Contents

High-signal parts of the repo:

- [`skills/agentify/`](./skills/agentify/) - main skill entrypoint and scoring references
- [`agents/`](./agents/) - specialist agent definitions used during execution
- [`commands/`](./commands/) - slash command entrypoints such as `/agentify`
- [`disciplines/`](./disciplines/) - longer-form guidance on agent design topics
- [`templates/`](./templates/) - reusable templates for discovery, auth, MCP, errors, evals, and orchestration
- [`src/app/`](./src/app/) - Next.js application for the docs site
- [`src/content/docs/`](./src/content/docs/) - MDX documentation content served by the site
- [`docs/`](./docs/) - working specs and internal supporting documents

## Quick Start

Prerequisites:

- Node.js 20+
- `pnpm`

Install and run the docs site:

```bash
pnpm install
pnpm dev
```

Other useful commands:

```bash
pnpm build
pnpm start
```

Notes:

- `postinstall` runs `fumadocs-mdx`
- the current `package.json` does not define dedicated `test` or `lint` scripts
- Biome configuration lives in [`biome.json`](./biome.json)

## Using `/agentify`

The command surface in this repository supports the following modes:

- `/agentify` - full audit with scorecard and findings
- `/agentify score` - scorecard only
- `/agentify plan` - audit plus transformation plan
- `/agentify transform` - audit, plan, and execution
- `/agentify --dimension=X` - focus on a single dimension
- `/agentify --format=json` - structured output

See [`commands/agentify.md`](./commands/agentify.md) and [`skills/agentify/SKILL.md`](./skills/agentify/SKILL.md) for the operative workflow.

## Specialist Agents

`agentify` can delegate work to specialist agents in [`./agents`](./agents):

- `context-writer`
- `discovery-writer`
- `error-designer`
- `api-optimizer`
- `cli-enhancer`
- `auth-upgrader`
- `mcp-builder`
- `test-writer`
- `retrievability-engineer`
- `agentic-patterns-writer`

These agents are used to apply focused fixes after the audit identifies the highest-impact gaps.

## Documentation Site

The Next.js site in [`src/app`](./src/app) publishes the guidance stored in [`src/content/docs`](./src/content/docs).

Current documentation areas include:

- API surface design
- CLI design
- context files
- discovery and AEO
- error handling
- MCP servers
- multi-agent patterns
- testing
- tool design
- data retrievability
- scoring and calibration
- protocols
- cookbook patterns

## Compatibility

This repository is structured to be readable by multiple agent runtimes.

- `AGENTS.md` provides repo-level guidance
- `SKILL.md` provides execution instructions for `agentify`
- Claude Code can consume the plugin and skill layout directly
- Codex and other generic runtimes can use `AGENTS.md` plus linked skill files

No standalone MCP server is bundled in this repository today. The repo mainly distributes the audit skill, related templates, and supporting documentation.

## Current Stack

Visible in the checked-in code:

- Next.js 16
- React 19
- TypeScript 6
- Tailwind CSS 4
- Fumadocs

## Key Files

- [`AGENTS.md`](./AGENTS.md)
- [`skills/agentify/SKILL.md`](./skills/agentify/SKILL.md)
- [`commands/agentify.md`](./commands/agentify.md)
- [`docs/arc/specs/agentify-spec.md`](./docs/arc/specs/agentify-spec.md)
- [`INSTALL.md`](./INSTALL.md)
- [`CHANGELOG.md`](./CHANGELOG.md)

## License

MIT

## Author

Daniel Howells
