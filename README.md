# Agent Surface

Agent Surface is a practical resource for making software legible, callable, and useful to AI agents.

It combines documentation, implementation approaches, reusable templates, and a single skill: `surface`, which routes to the right workflow — audit, scaffold, transform, or generate.

The premise is simple: agents do not consume software through one interface. They read docs, inspect repositories, call APIs, run CLIs, use MCP tools, parse errors, retrieve context, and execute workflows. Agent Surface treats all of those as one design problem.

## What This Repo Contains

- **Documentation** — a Fumadocs site covering API surface, CLI design, MCP servers, discovery, authentication, errors, testing, multi-agent patterns, scoring, protocols, and tool design
- **Approaches** — opinionated patterns for making software agent-ready without turning every product into an agent framework
- **`surface` skill** — a single skill that routes to audit, scaffold, transform, and generate workflows, scoring a codebase across 11 dimensions and scaffolding agents, tools, workflows, memory, model routing, browser access, and sandboxes
- **Specialist agents** — focused workers for context files, discovery, errors, API shape, CLI ergonomics, auth, MCP, testing, retrievability, and agentic patterns
- **Templates** — reusable examples for discovery, auth, MCP, errors, evals, orchestration, and agent-facing contracts
- **Tooling catalog** — a curated list of well-regarded AI and agent tooling grouped by purpose

## What `surface` Does

`surface` is a single skill that routes to the right workflow based on the request. It handles:

- audit this codebase for agent readiness
- make this repo easier for AI agents to use
- improve API, CLI, MCP, discovery, auth, testing, or retrievability surfaces
- produce a transformation plan
- execute the highest-impact upgrades
- create an agent
- add a tool
- build a workflow
- add memory
- set up model routing
- update an existing agent correctly

### Audit and Transform

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
9. Data Retrievability
10. Multi-Agent and Orchestration
11. Testing and Evaluation

### Scaffold

For agent system scaffolding, `surface` chooses the framework from the project shape. It prefers existing deliberate infrastructure, then selects OpenAI Agents SDK, Claude Managed Agents/Claude Code SDK, Vercel AI SDK, Vercel Workflow, Cloudflare Agents, Mastra, LangGraph, or MCP-first patterns based on runtime, deployment target, durability needs, and external agent interoperability.

Core outputs:

- agent definitions with clear instructions and tool registration
- typed tools with Zod schemas and MCP annotations
- workflow scaffolds with state, triggers, and safety patterns
- memory setup for Claude Managed Agents, Mastra, Postgres/pgvector, Workers-native alternatives, or the repo's existing storage
- model routing across providers and gateways
- browser and sandbox tool wrappers with safety boundaries

## Repository Contents

High-signal parts of the repo:

- [`skills/surface/`](./skills/surface/) - main skill entrypoint, scoring references, specialist agents, and agent system scaffolding
- [`src/content/docs/agents/framework-selection.mdx`](./src/content/docs/agents/framework-selection.mdx) - current framework selection guidance
- [`src/content/docs/agents/anthropic-platform.mdx`](./src/content/docs/agents/anthropic-platform.mdx) - Claude Managed Agents, Claude Code SDK, Agent Skills, MCP connector, and Anthropic platform notes
- [`disciplines/`](./disciplines/) - longer-form guidance on agent design topics
- [`templates/`](./templates/) - reusable templates for discovery, auth, MCP, errors, evals, and orchestration
- [`src/app/`](./src/app/) - Next.js application for the docs site
- [`src/content/docs/`](./src/content/docs/) - MDX documentation content served by the site
- [`docs/`](./docs/) - working specs and internal supporting documents

## Quick Start

Prerequisites:

- Node.js 20+
- npm

Install and run the docs site:

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run build
npm start
```

Notes:

- `postinstall` runs `fumadocs-mdx`
- the current `package.json` does not define dedicated `test` or `lint` scripts
- Biome configuration lives in [`biome.json`](./biome.json)

## Using The Skill

`surface` routes to the right workflow based on the command:

- `/surface` - full audit with scorecard and findings
- `/surface score` - scorecard only
- `/surface plan` - audit plus transformation plan
- `/surface transform` - audit, plan, and execution
- `/surface --dimension=X` - focus on a single dimension
- `/surface --format=json` - structured output
- `/surface init` - initialize agent infrastructure
- `/surface agent <name>` - scaffold an agent
- `/surface tool <name>` - scaffold a typed tool
- `/surface workflow <name>` - scaffold a workflow
- `/surface memory` - add memory
- `/surface model` - configure model routing
- `/surface browser` - add browser/web access tooling
- `/surface sandbox` - add isolated code execution tooling

See [`skills/surface/SKILL.md`](./skills/surface/SKILL.md) for the operative workflow.

## Specialist Agents

`surface` can delegate work to specialist agents in [`skills/surface/agents`](./skills/surface/agents):

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
- agent system scaffolding
- scoring and calibration
- protocols
- cookbook patterns

## Compatibility

This repository is structured to be readable by multiple agent runtimes.

- `AGENTS.md` provides repo-level guidance
- `skills/surface/SKILL.md` provides execution instructions for audits, transformations, and agent system scaffolding
- Claude Code can consume the plugin and skill layout directly
- Codex and other generic runtimes can use `AGENTS.md` plus the linked skill file

No standalone MCP server is bundled in this repository today. The repo mainly distributes the surface skill, related templates, and supporting documentation.

## Current Stack

Visible in the checked-in code:

- Next.js 16
- React 19
- TypeScript 6
- Tailwind CSS 4
- Fumadocs

## Key Files

- [`AGENTS.md`](./AGENTS.md)
- [`skills/surface/SKILL.md`](./skills/surface/SKILL.md)
- [`INSTALL.md`](./INSTALL.md)
- [`CHANGELOG.md`](./CHANGELOG.md)

## License

MIT

## Author

Daniel Howells
