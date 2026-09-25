# Agent Surface

Agent Surface is a field guide and implementation kit for engineering teams making software
operable by agents: discoverable, understandable, callable, recoverable, and evaluable.

Agents do not reach software through one interface. They read docs, inspect repositories,
call APIs, run CLIs, use MCP tools, parse errors, and retrieve data. Agent Surface treats all
of those contact points as one design problem: the **agent surface**.

## Two Parts

The site has two labelled parts.

**Part 1 - Make your product agent-ready (the core guide).** Product-side, framework-neutral
guidance for making an existing product usable by agents: discovery, API surface, tool
design, CLI design, MCP servers, authentication, error handling, context files
(AGENTS.md/CLAUDE.md), agentic UI, retrievability (search APIs, retrieval contracts,
structured content), protocols, testing, scoring, and reference links. This is the guide the
`surface` skill applies.

**Part 2 - Build agents (the agent-building inventory).** A secondary, condensed reference for
teams building their own agents: frameworks (including Mastra), platform features,
orchestration, memory, durable execution, browser and sandbox access, guardrails
(`/docs/agents`), and agent retrieval - vector databases, embeddings, RAG, knowledge graphs
(`/docs/agent-retrieval`) - plus a tooling catalog. This inventory gives one short summary of
current practice per topic; it sits outside the core guide and outside the `surface` skill.

An earlier version of this repo kept agent-internal architecture out entirely. We keep the
inventory because it is worth maintaining as a reference, but it stays separate so the guide
does not turn into a general agent-building toolkit.

## The `surface` Skill

`surface` is a single skill with three routes, all product-side and framework-neutral:

- **Guide** - explain agent-surface concepts, standards, and implementation patterns; point to
  the right doc or primary source.
- **Audit** - detect a project's surfaces, score agent readiness across 10 dimensions, produce
  findings, and write a transformation plan. `plan` and `transform` are Audit modes, not
  separate routes; `transform` executes only after explicit confirmation.
- **Scaffold** - create or extend agent surfaces (discovery files, API/CLI/MCP surfaces, tool
  contracts, retrieval endpoints) and the evaluation harnesses that verify them. It does not
  generate agent-internal architecture (agents, orchestration, memory, model routing, an
  agent's own retrieval pipeline) - that belongs to Part 2, not this skill.

The 10 audit dimensions:

1. API Surface
2. CLI Design
3. MCP Server
4. Discovery and AEO
5. Authentication
6. Error Handling
7. Tool Design
8. Context Files
9. Testing and Evaluation
10. Retrievability

See [`skills/surface/SKILL.md`](./skills/surface/SKILL.md) for the operative workflow and
[`skills/surface/references/`](./skills/surface/references/) for the per-dimension and
per-mode detail.

## Repository Contents

- [`skills/surface/`](./skills/surface/) - skill entrypoint, audit/scaffold references, and specialist agent prompts
- [`src/content/docs/`](./src/content/docs/) - the two-part MDX guide served by the docs site
- [`disciplines/`](./disciplines/) - longer-form guidance on agent-surface design topics
- [`templates/`](./templates/) - reusable starter files the implementation kit points to
- [`src/app/`](./src/app/) - Next.js application for the docs site
- [`docs/`](./docs/) - ADRs and internal supporting documents

## Quick Start

Prerequisites:

- Node 24.15+
- pnpm 11

Install and run the docs site:

```bash
pnpm install
pnpm dev
```

Other useful commands:

```bash
pnpm build
pnpm start
pnpm test        # docs integrity check
pnpm typecheck
pnpm lint
```

Notes:

- `postinstall` runs `fumadocs-mdx`
- `pnpm prepush` runs typecheck, lint, then `test` - the full local gate
- linting and formatting configuration lives in [`oxlint.config.ts`](./oxlint.config.ts) and [`oxfmt.config.ts`](./oxfmt.config.ts)

## Using the Skill

`surface` routes to the matching workflow based on the request:

- `/surface` - explain a concept, or run a full audit with scorecard and findings, depending on the ask
- `/surface score` - scorecard only
- `/surface plan` - audit plus transformation plan
- `/surface transform` - audit, plan, and execution (after confirmation)
- `/surface --dimension=X` - focus on a single dimension
- `/surface --format=json` - structured output
- `/surface init` - initialize baseline agent-surface conventions (AGENTS.md, llms.txt, `.well-known`)
- `/surface api` / `/surface cli` / `/surface mcp` - scaffold or upgrade that surface
- `/surface tool <name>` - scaffold or refine one typed tool contract
- `/surface test-harness` - scaffold an evaluation harness for a surface

These are skill/runtime invocations, not an npm binary. This repository does not publish a `bin` entry in `package.json`.

## Specialist Agents

`surface` can delegate focused work to specialist prompts in [`skills/surface/agents`](./skills/surface/agents):

- `context-writer`, `discovery-writer`, `error-designer`, `api-optimizer`, `cli-enhancer`, `auth-upgrader`, `mcp-builder`, `test-writer`, `tool-design-writer` - improve an existing surface in place
- `retrievability-engineer` - build or upgrade search/query APIs, retrieval contracts, and structured content
- `score-*` prompts - score one audit dimension in parallel delegation

These agents apply focused fixes after an audit identifies the highest-impact gaps; they are
task resources, not required context for ordinary guide/audit/scaffold routing.

## Documentation Site

The Next.js site in [`src/app`](./src/app) publishes the guidance in [`src/content/docs`](./src/content/docs), split into the two parts described above.

## Compatibility

This repository is structured to be readable by multiple agent runtimes.

- `AGENTS.md` provides repo-level guidance
- `skills/surface/SKILL.md` provides execution instructions for the Guide, Audit, and Scaffold routes
- Claude Code can consume the plugin and skill layout directly
- Codex and other generic runtimes can use `AGENTS.md` plus the linked skill file

The docs site also exposes a lightweight HTTP MCP endpoint at `/mcp` for documentation search and page retrieval. This is a docs discovery surface, not a generated project MCP server; the surface skill, templates, and guidance remain the primary distribution artifacts.

## Current Stack

Visible in the checked-in code:

- Next.js 16
- React 19
- TypeScript 6
- Tailwind CSS 4
- Fumadocs

## Key Files

- [`AGENTS.md`](./AGENTS.md)
- [`CONTEXT.md`](./CONTEXT.md)
- [`skills/surface/SKILL.md`](./skills/surface/SKILL.md)
- [`INSTALL.md`](./INSTALL.md)
- [`CHANGELOG.md`](./CHANGELOG.md)

## License

MIT

## Author

Daniel Howells
