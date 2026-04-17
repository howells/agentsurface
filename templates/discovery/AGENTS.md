<!--
AGENTS.md — Canonical agent-consumable project documentation.

What: A plain-markdown file that tells AI agents (Claude Code, Cursor, Copilot, etc.) what this 
project does, how to run it, where critical files live, and what they are and are not allowed to change.

When to use: Every software project. Start with this template, hand-curate it, and keep it 
in sync as the project evolves.

What to customize:
1. Project description and tech stack (lines 8–10)
2. Commands section: replace with real invocations for your build system
3. File tree structure (match your actual src/, tests/, etc. layout)
4. Coding conventions (naming, import styles, tools)
5. Testing setup (test runner, CI gates, coverage expectations)
6. Permission boundaries (what agents can and cannot do)
7. Gotchas specific to your stack
8. Link to actual ADRs, architecture docs, etc.

Canonical spec: https://agents.md
GitHub reference: https://github.com/openai/agents.md
Keep this file <370 lines. Commands should be copy-pasteable (exact flags, no placeholders).
Line-by-line reading in agent context; structure for scannability.
-->

# Acme Agent Tools

Monorepo for enterprise agent infrastructure: TypeScript SDK, Next.js dashboard, Node.js backend service, MCP server implementations.

---

## Quick start

**Development (all packages):**
```sh
pnpm dev          # Start dev servers (SDK playground + dashboard)
pnpm test         # Run all tests (~15s)
pnpm lint         # ESLint + Prettier check
pnpm type-check   # Full TypeScript check
```

**Build & release:**
```sh
pnpm build        # All packages, production bundle (~3m)
changeset add     # Stage version bump (required)
changeset version # Bump versions from changesets
pnpm publish      # Push to npm
```

**Per-package (faster for focused work):**
```sh
pnpm --filter=@acme/sdk dev          # SDK docs (http://localhost:3000)
pnpm --filter=@acme/sdk test:watch
pnpm --filter=@acme/dashboard build  # Next.js static export
pnpm --filter=@acme/mcp-server start # MCP server on stdio
```

---

## File structure

```
.
├── packages/
│   ├── sdk/                  # TypeScript client library (export: ESM + CJS)
│   │   ├── src/
│   │   │   ├── index.ts      # Main entry point (agents, tools, utils)
│   │   │   ├── agents/       # Agent definitions
│   │   │   ├── tools/        # Tool helpers + schema builders
│   │   │   └── __tests__/
│   │   ├── AGENTS.md         # Package-specific commands
│   │   └── vitest.config.ts
│   │
│   ├── dashboard/            # Next.js 15 app (agent introspection UI)
│   │   ├── app/
│   │   │   ├── layout.tsx    # Root + JSON-LD (SoftwareApplication)
│   │   │   ├── page.tsx      # Landing
│   │   │   ├── api/
│   │   │   │   ├── ask/      # NLWeb-style /ask endpoint
│   │   │   │   └── mcp/      # /.well-known/mcp.json handler
│   │   │   └── docs/
│   │   │       └── [slug]/   # Content negotiation (text/markdown support)
│   │   ├── AGENTS.md
│   │   └── next.config.ts
│   │
│   ├── mcp-server/           # MCP 2025-11-25 server (stdio + HTTP)
│   │   ├── src/
│   │   │   ├── server.ts     # MCP server setup (tools, resources)
│   │   │   ├── tools/        # Tool implementations
│   │   │   └── __tests__/
│   │   ├── AGENTS.md
│   │   └── vitest.config.ts
│   │
│   └── shared/               # Shared types (Zod schemas, constants)
│       ├── src/
│       │   ├── index.ts
│       │   ├── schemas/      # Zod types for agent tool calls
│       │   └── __tests__/
│       └── package.json      # Exports via exports field
│
├── .claude/                  # Claude Code config
│   ├── agents/               # Subagent definitions
│   │   ├── reviewer.md       # Code review subagent
│   │   └── tester.md         # Test runner subagent
│   └── CLAUDE.md             # Claude-specific overrides
│
├── .cursor/
│   └── rules/
│       └── project.mdc       # Cursor-specific rules
│
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/
│       ├── test.yml          # Unit + integration tests
│       └── build.yml         # Monorepo build cache + turbo
│
├── docs/                     # Detailed documentation (referenced from AGENTS.md)
│   ├── ARCHITECTURE.md       # System design + dataflow
│   ├── ADRs/
│   │   ├── 001-mcp-2025.md   # Decision: Adopt MCP 2025-11-25
│   │   └── 002-schema-validation.md
│   ├── api/                  # API reference
│   │   └── tools.md          # Tool design guide
│   └── CONTRIBUTING.md       # Detailed workflow
│
├── AGENTS.md                 # This file (you are here)
├── CLAUDE.md                 # Claude Code overrides
├── pnpm-workspace.yaml       # pnpm monorepo config
├── turbo.json                # Turbo cache + tasks
├── package.json              # Root dependencies
├── .nvmrc                    # Node 20 LTS required
├── .env.example              # Secrets template (tracked)
└── public/
    ├── llms.txt              # Agent discovery index
    ├── llms-full.txt         # Full docs dump
    ├── robots-ai.txt         # AI crawler policy
    └── sitemap.xml           # For freshness tracking
```

---

## Coding conventions

**TypeScript strict mode required.**
- ESLint + Prettier (enforced in pre-commit hook)
- Filenames: kebab-case (`agent-executor.ts`, not `AgentExecutor.ts`)
- Functions / classes: camelCase
- Constants: UPPER_SNAKE_CASE
- React components: PascalCase
- Zod schemas in dedicated `src/schemas/` directory
- No wildcard imports; explicit paths with `@acme/` aliases

**Import order:**
```typescript
// External packages
import { z } from 'zod';
import React from 'react';

// Acme monorepo
import { Agent, Tool } from '@acme/sdk';
import { AgentSchema } from '@acme/shared';

// Local relative
import { executeAgent } from './execute';
import { validateInput } from '../utils';
```

**Error handling:** Use RFC 9457 `Problem+JSON` shape; return via tool result, not thrown.
```typescript
type ToolResult = { success: true; data: T } | { success: false; type: string; status: number; detail: string };
```

**Schema validation:** All tool inputs validated with Zod `.parse()` at entry; return detailed error messages in tool result.

---

## Testing

**Framework:** Vitest (all packages). ~15s full suite.

```sh
pnpm test               # Run all tests
pnpm test:watch        # Watch mode (on file change)
pnpm test:coverage     # Generate coverage reports (targets >80%)
```

**Structure:**
- Unit tests colocated: `src/index.test.ts` alongside `src/index.ts`
- Integration tests: `src/__tests__/integration/`
- Snapshot tests only for UI (Next.js components)
- Mock MCP server for agent tests via `InMemoryTransport.createLinkedPair()`

**CI gates (GitHub Actions):**
- `pnpm lint` must pass (no overrides)
- `pnpm type-check` must pass
- `pnpm test` must pass
- Coverage report: branches >75%

---

## Permission boundaries

**Always (no ask needed):**
- Read files in `src/`, `docs/`, `.github/`
- Run `pnpm test`, `pnpm test:watch`, `pnpm lint`, `pnpm type-check`
- Open draft PRs with `gh pr create --draft`
- Review CI logs and lint output
- Modify TypeScript types and test files
- Update `README.md`, `AGENTS.md`, inline code comments

**Ask first:**
- Install new dependencies (`pnpm add`)
- Modify `turbo.json` or `pnpm-workspace.yaml`
- Change package.json exports or entry points
- Run migrations or database operations
- Commit directly to main (use PR instead)
- Modify environment config (`packages/*/src/config.ts`)

**Never:**
- Deploy to production
- Rotate API keys, OAuth secrets, or database credentials
- Delete branches or tags
- Modify `.env` in git or commit unencrypted secrets
- Force-push to main or release branches
- Publish to npm without changesets

---

## Gotchas

**Node version:** `.nvmrc` enforces Node 20 LTS. `pnpm install` fails silently on Node <20. Check `node --version`.

**pnpm workspaces:** Always use `pnpm --filter=@acme/PACKAGE` for per-package commands, not `cd packages/PACKAGE && npm`. Workspace hoisting differs from npm.

**Changesets required:** Version bumps must go through `changeset add` → `changeset version` → CI gate. Hand-editing `package.json` versions is rejected by CI.

**TypeScript errors block builds:** Do not commit `any` types or `// @ts-ignore`. Use `// @ts-expect-error` only with an explanatory comment.

**MCP server refresh:** Server memory persists across test runs. If you modify tool definitions, restart the server or use `InMemoryTransport.createLinkedPair()` in tests for fresh state.

**Schema evolution:** Zod schemas in `@acme/shared` are consumed by SDK + dashboard. Breaking changes to `.shape` require a new major version (use changesets).

---

## Key files (quick reference)

- **Agent definitions:** `packages/sdk/src/agents/` — entry points for SDK users
- **Tool schemas:** `packages/shared/src/schemas/` — Zod validators for all tool inputs
- **MCP implementation:** `packages/mcp-server/src/server.ts` — server lifecycle + tool registration
- **Dashboard:** `packages/dashboard/app/` — Next.js routes, JSON-LD schemas, content negotiation
- **Tests:** `src/__tests__/`, colocated `.test.ts` files — run with `pnpm test`
- **CI pipeline:** `.github/workflows/test.yml`, `.github/workflows/build.yml`
- **Architecture decisions:** `docs/ADRs/` — linked from this file, not repeated

---

## Extending the project

**New agent:** Create `packages/sdk/src/agents/my-agent.ts`, export from `packages/sdk/src/index.ts`, test with `pnpm test`. Update `AGENTS.md` once stable.

**New tool:** Add Zod schema to `packages/shared/src/schemas/`, implement in `packages/mcp-server/src/tools/`, export from server, add to SDK `Agent.tools[]`.

**New docs page:** Add markdown to `docs/`, link from `packages/dashboard/app/docs/[slug]/`, ensure JSON-LD metadata in `generateMetadata()`. Sync with `public/llms.txt`.

---

## See also

- **docs/ARCHITECTURE.md** — System design, tool flow diagrams, MCP server lifecycle
- **docs/ADRs/** — Decision records (MCP 2025-11-25, schema validation, HTTP transport)
- **packages/sdk/AGENTS.md** — SDK-specific commands and conventions
- **packages/dashboard/AGENTS.md** — Next.js dashboard build and deployment
- **packages/mcp-server/AGENTS.md** — MCP server testing and debugging
- **CLAUDE.md** — Claude Code-specific hooks and model selection
- **.cursor/rules/project.mdc** — Cursor IDE overrides
- **CONTRIBUTING.md** — Pull request workflow, commit message style

---

## Links

- [agents.md specification](https://agents.md)
- [MCP 2025-11-25 spec](https://modelcontextprotocol.io/specification/2025-11-25)
- [Next.js 15 App Router](https://nextjs.org/docs)
- [pnpm workspaces](https://pnpm.io/workspaces)
- [Turbo docs](https://turbo.build)
- [Zod documentation](https://zod.dev)
- [Vitest docs](https://vitest.dev)
