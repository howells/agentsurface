<!--
monorepo-AGENTS.md — Hierarchical context file pattern for pnpm/Turbo monorepos.

What: A template showing how to structure AGENTS.md across multiple packages while avoiding 
duplication. Root AGENTS.md provides commands + global boundaries; per-package AGENTS.md files 
add scoped detail.

When to use: Any monorepo with 3+ packages that need independent agent guidance.

What to customize:
1. Root: Replace tech stack, global commands, package layout
2. Per-package: Copy the pattern to each packages/X/AGENTS.md, customize per package
3. Update package.json entries and filter examples to match your workspace

Principle: "Nearest wins" — an agent reading packages/api/AGENTS.md will prioritize 
its commands over the root file. Avoid duplication; link from per-package back to root.

Citation: https://claude.code.com/docs/en/claude-code
-->

# ROOT: packages/AGENTS.md

```markdown
# Acme Agent Tools — Monorepo

Pnpm workspaces. Three packages: @acme/sdk (client library), @acme/api (Fastify backend), 
@acme/dashboard (Next.js frontend).

## Quick start (all packages)

**Development:**
```sh
pnpm dev          # All packages (SDK playground + API + dashboard)
pnpm test         # All tests
pnpm lint && pnpm type-check
```

**Build:**
```sh
pnpm build                    # All packages in dependency order
changeset add && pnpm publish # Version bump + npm release
```

**By package (faster for focused work):**
```sh
pnpm --filter=@acme/sdk dev          # http://localhost:5173
pnpm --filter=@acme/api dev          # http://localhost:3001
pnpm --filter=@acme/dashboard dev    # http://localhost:3000
```

## Layout

```
packages/
  sdk/          SDK client library (ESM + CJS)
  api/          Fastify backend (Node.js)
  dashboard/    Next.js 15 SPA
```

Each package has its own AGENTS.md with scoped commands and boundaries.
Root AGENTS.md covers shared commands, monorepo conventions, turbo setup, changesets.

## Global conventions

- Filenames: kebab-case
- Functions: camelCase
- Monorepo tool: pnpm + Turbo
- Version management: changesets (never hand-edit package.json versions)
- Node: 20 LTS (.nvmrc enforced)

## Global commands

Build + test must pass before merge:
```sh
turbo run test      # All packages in parallel
turbo run lint      # All packages in parallel
turbo run type-check
turbo run build     # Dependency order
```

Full example (filters + parallelism):
```sh
turbo run build --filter=@acme/api -- --minify    # Single package
turbo run test --parallel -- --coverage            # Parallel, all packages
```

## Global boundaries

**Always:**
- Read files, run tests, open draft PRs

**Ask first:**
- `pnpm add` (installs to root or single package?)
- `changeset add` (required before version bump)

**Never:**
- `pnpm publish` without changesets
- Deploy to production
- Rotate secrets

## See also

- `packages/sdk/AGENTS.md` — SDK-specific setup, exports, testing
- `packages/api/AGENTS.md` — API server routes, database, environment
- `packages/dashboard/AGENTS.md` — Next.js build, TypeScript paths, export strategy
- `docs/ARCHITECTURE.md` — Cross-package dataflow
- `CONTRIBUTING.md` — Pull request process (includes changesets walkthrough)

## Links

- [pnpm workspaces](https://pnpm.io/workspaces)
- [Turbo documentation](https://turbo.build)
- [Changesets CLI](https://github.com/changesets/changesets)
```

---

# PACKAGE TEMPLATE 1: packages/sdk/AGENTS.md

```markdown
# @acme/sdk (Client Library)

TypeScript client library for agent integration. Exports via pkg.json `exports` field 
(ESM + CommonJS, TypeScript `.d.ts` in both).

See `AGENTS.md` in repo root for global commands and boundaries.

## Setup

Dependency: None. Requires Node 20+.

## Commands (SDK-specific)

**Development (playground + docs):**
```sh
pnpm --filter=@acme/sdk dev      # Vite dev server (http://localhost:5173)
pnpm --filter=@acme/sdk test     # Vitest
pnpm --filter=@acme/sdk test:watch
pnpm --filter=@acme/sdk lint
pnpm --filter=@acme/sdk type-check
```

**Build:**
```sh
pnpm --filter=@acme/sdk build    # Outputs dist/ (ESM + CJS + .d.ts)
pnpm --filter=@acme/sdk preview  # Test bundle locally
```

## File structure

```
src/
  index.ts              # Main entry point
  agent.ts             # Agent class + methods
  tools.ts             # Tool builder helpers
  schemas/
    agent.ts           # Zod schemas (imported by shared)
    tool.ts
  __tests__/
    agent.test.ts      # Unit tests
    integration/       # Integration tests with mock MCP server
```

## Exports (package.json)

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./agent": {
      "types": "./dist/agent.d.ts",
      "import": "./dist/agent.mjs",
      "require": "./dist/agent.cjs"
    }
  }
}
```

SDK consumers import as: `import { Agent } from '@acme/sdk'` or `import { Agent } from '@acme/sdk/agent'`.

## Testing

```sh
pnpm --filter=@acme/sdk test -- --coverage
```

Integration tests mock the MCP server. See `src/__tests__/integration/` for setup pattern.

## Boundaries (SDK-specific)

**Always:**
- Modify `src/` (types, implementations, tests)
- Update `package.json` `version` via changesets (never by hand)

**Ask first:**
- Add new export (may break downstream consumers)
- Change `exports` field structure

**Never:**
- Publish directly (`npm publish`; use `pnpm publish` from root after changesets)

## Key dependency: @acme/shared

SDK imports types from `@acme/shared/schemas/`. Schema changes in shared propagate here.
Test with: `pnpm --filter=@acme/sdk test` after shared updates.

## See also

- Root AGENTS.md (global commands, version workflow)
- `docs/api/sdk.md` — Public API reference
- `src/agent.ts` — Agent class implementation
```

---

# PACKAGE TEMPLATE 2: packages/api/AGENTS.md

```markdown
# @acme/api (Backend Server)

Fastify Node.js server. Exposes REST API for dashboard and SDK consumers.

See `AGENTS.md` in repo root for global commands and boundaries.

## Setup

Requirements: Node 20, PostgreSQL 14+ (local dev: docker-compose up -d).

```sh
pnpm --filter=@acme/api install
# Copy .env.example to .env.local and fill in DATABASE_URL
```

## Commands (API-specific)

**Development:**
```sh
pnpm --filter=@acme/api dev       # http://localhost:3001
pnpm --filter=@acme/api test      # Vitest
pnpm --filter=@acme/api test:watch
pnpm --filter=@acme/api db:migrate  # Run pending migrations
pnpm --filter=@acme/api db:seed     # Populate test data
```

**Database:**
```sh
pnpm --filter=@acme/api db:create      # Create database
pnpm --filter=@acme/api db:migrate     # Apply migrations (always idempotent)
pnpm --filter=@acme/api db:rollback    # Undo last migration (dev only; ask in prod)
```

## File structure

```
src/
  index.ts              # Server entry + plugin registration
  routes/               # Fastify route handlers
    agents.ts          # POST /agents
    tools.ts           # GET /tools, POST /tools/:id/call
  db/
    schema.ts          # Database schema (schema.org types)
    migrations/        # SQL migrations (timestamp-named)
  middleware/           # Fastify middleware
    error-handler.ts   # RFC 9457 error responses
  __tests__/            # Integration tests
```

## Environment (.env.local)

```
DATABASE_URL=postgresql://postgres:pw@localhost:5432/acme_dev
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug
```

## Testing

```sh
pnpm --filter=@acme/api test -- --coverage
```

Tests spin up isolated PostgreSQL containers (testcontainers). No manual DB setup needed for test suite.

## Database migrations (ask before running)

Migrations are append-only SQL files in `src/db/migrations/`.

```sh
pnpm --filter=@acme/api db:migrate  # Apply pending
```

Rollback only in dev; production requires data migration support.

## Boundaries (API-specific)

**Always:**
- Modify `src/routes/`, `src/middleware/`, tests
- Run `pnpm --filter=@acme/api test`

**Ask first:**
- `pnpm --filter=@acme/api db:migrate` (modifies database schema)
- Modify `src/db/schema.ts` (requires migration)
- Change environment variables in `.env`

**Never:**
- Modify `.env` in git
- Rotate database credentials
- Delete migration files (append-only)

## Key dependency: @acme/shared

API validates request bodies with Zod schemas from `@acme/shared/schemas/`. Breaking schema 
changes require coordination with dashboard team.

## See also

- Root AGENTS.md
- `docs/api/routes.md` — REST endpoint reference
- `docs/ARCHITECTURE.md` — API dataflow + agent integration points
```

---

# PACKAGE TEMPLATE 3: packages/dashboard/AGENTS.md

```markdown
# @acme/dashboard (Frontend)

Next.js 15 SPA (Static Export). Consumes @acme/sdk + REST API from @acme/api.

See `AGENTS.md` in repo root for global commands and boundaries.

## Commands (Dashboard-specific)

**Development:**
```sh
pnpm --filter=@acme/dashboard dev       # http://localhost:3000
pnpm --filter=@acme/dashboard test      # Vitest
pnpm --filter=@acme/dashboard test:watch
pnpm --filter=@acme/dashboard lint
```

**Build:**
```sh
pnpm --filter=@acme/dashboard build     # Static export to out/
pnpm --filter=@acme/dashboard start     # Local preview of build
```

## File structure

```
app/
  layout.tsx          # Root layout + JSON-LD (SoftwareApplication)
  page.tsx            # Landing page
  agents/
    page.tsx          # Agent list
    [id]/
      page.tsx        # Agent detail + tool explorer
  docs/
    [slug]/
      page.tsx        # Content negotiation (Accept: text/markdown)
  api/
    ask/              # POST /api/ask (NLWeb-style)
    mcp/              # /.well-known/mcp.json handler
  __tests__/          # Vitest + React Testing Library
public/
  llms.txt            # Agent discovery index
  robots-ai.txt       # AI crawler policy
next.config.ts        # TypeScript, static export config
```

## Environment (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Testing

```sh
pnpm --filter=@acme/dashboard test
```

Uses Vitest + React Testing Library. Snapshots kept minimal (no UI snapshots; use jest-dom assertions).

## Content negotiation

Dashboard supports `Accept: text/markdown` on docs pages (`/docs/*`).

Request: `GET /docs/getting-started -H "Accept: text/markdown"`
Response: Markdown version + `Content-Type: text/markdown`

Implemented in `app/docs/[slug]/page.tsx` via `headers()` API.

## JSON-LD schemas

Root layout generates:
- `SoftwareApplication` (project identity)
- `WebAPI` (API reference)
- `FAQPage` (docs structure)

See `app/layout.tsx` for implementation pattern.

## Boundaries (Dashboard-specific)

**Always:**
- Modify `app/` routes, components, tests
- Update JSON-LD schemas in metadata

**Ask first:**
- Install new dependencies (affects bundle size)
- Modify `next.config.ts`
- Change environment variable names

**Never:**
- Deploy without passing `pnpm build`
- Commit `.env` or `.env.local`

## Build expectations

`pnpm build` must complete in <2m. Failing tests block build.

## Key dependencies

- `@acme/sdk` — Agent definitions + tool schemas
- `@acme/shared` — Type exports
- API runs at `NEXT_PUBLIC_API_URL` (environment variable)

## See also

- Root AGENTS.md
- `docs/api/dashboard.md` — Routes + endpoints
- `app/layout.tsx` — JSON-LD implementation
- `app/docs/[slug]/page.tsx` — Content negotiation pattern
```

---

# Precedence / "Nearest wins" rule

When an agent reads a monorepo:

1. **Agent in packages/api/** → reads `packages/api/AGENTS.md` first; falls back to root for missing sections
2. **Agent at repo root** → reads root `AGENTS.md`
3. **Agent in packages/shared/** (no AGENTS.md) → reads root `AGENTS.md`

Example: Agent working in packages/api sees:
- Commands from packages/api/AGENTS.md (e.g., `pnpm --filter=@acme/api db:migrate`)
- Global conventions from root (filenames, import order)
- Boundaries from packages/api/AGENTS.md; if not specified, falls back to root

This scales: each package can override without repeating root guidance.

---

## See also

- [pnpm workspaces docs](https://pnpm.io/workspaces)
- [Turbo filtering](https://turbo.build/repo/docs/reference/command-line-reference/run#--filter)
- [Changesets CLI](https://github.com/changesets/changesets)
- Root `AGENTS.md` (global context)
- Root `CONTRIBUTING.md` (pull request workflow with changesets)
