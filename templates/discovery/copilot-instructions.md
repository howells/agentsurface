<!--
copilot-instructions.md — GitHub Copilot custom instructions.

What: A concise markdown file that customizes GitHub Copilot's behavior for your project.
Placed at .github/copilot-instructions.md.

When to use: When Copilot should follow specific patterns (TypeScript strict, Zod schemas,
testing expectations) without asking.

What to customize:
1. Project name and description
2. Tech stack (Node version, package manager, frameworks)
3. Code style rules (naming, imports, error handling)
4. Commands (build, test, lint)
5. Boundaries (what Copilot should/shouldn't do)
6. Cross-reference AGENTS.md for shared context

Note: Copilot has lower context budget (~2k tokens vs Claude's 1M).
Keep this file <200 lines. Link to AGENTS.md for details.

Spec: https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-copilot
-->

# GitHub Copilot Custom Instructions

## Overview

These instructions customize GitHub Copilot for Acme Agent Tools.

**For complete project context:** See [AGENTS.md](../AGENTS.md).

---

## Project

**Acme Agent Tools** — TypeScript SDK + MCP server + Next.js dashboard for agent integration.

Monorepo: pnpm workspaces (packages/sdk, packages/api, packages/dashboard).

Node 20 LTS required (.nvmrc enforced).

---

## Code style

### TypeScript

- Strict mode always: `"strict": true`
- Explicit return types on functions
- Use Zod for validation: `const schema = z.object({ ... })`
- No `any` or `@ts-ignore`; use `@ts-expect-error` with reason

### Naming

- Files: kebab-case (`agent-executor.ts`)
- Functions: camelCase
- Components: PascalCase
- Constants: UPPER_SNAKE_CASE
- Zod schemas: `userSchema`, `toolInputSchema`

### Imports

```typescript
// 1. External packages (alphabetical)
import { z } from 'zod';
// 2. Acme monorepo
import { Agent } from '@acme/sdk';
// 3. Local relative
import { execute } from './execute';
```

### Error handling (RFC 9457)

Return errors as data, never throw:

```typescript
{
  success: false,
  error: {
    type: 'validation_error',
    status: 400,
    detail: 'Email is required.',
    instance: '/api/users/create#email',
  }
}
```

---

## Testing

- Framework: Vitest
- Location: colocated with implementation (`src/agent.test.ts`)
- Mock MCP server: `InMemoryTransport.createLinkedPair()`
- Coverage target: >80% branches

```sh
pnpm test              # Run all tests
pnpm test --coverage   # Generate coverage
```

---

## Monorepo commands

Always use `pnpm --filter=@acme/PACKAGE` for scoped work:

```sh
# SDK development
pnpm --filter=@acme/sdk dev
pnpm --filter=@acme/sdk test

# API development
pnpm --filter=@acme/api dev
pnpm --filter=@acme/api db:migrate

# Dashboard development
pnpm --filter=@acme/dashboard dev
pnpm --filter=@acme/dashboard build
```

Do NOT use `cd packages/X && npm` (breaks hoisting).

---

## What Copilot should do

- Generate TypeScript code with explicit types
- Create Zod schemas for all API inputs
- Write Vitest tests with >80% coverage
- Use camelCase for functions, PascalCase for components
- Suggest error responses in RFC 9457 shape
- Reference AGENTS.md conventions

---

## What Copilot should NOT do

- Generate JavaScript (use TypeScript only)
- Suggest `any` types (use `unknown` + narrowing)
- Commit code directly (propose via PR)
- Deploy to production
- Modify .env in git
- Hand-edit package.json versions (use `changeset add`)

---

## Quick reference

- **Build:** `pnpm build` (~3m)
- **Lint:** `pnpm lint` (ESLint + Prettier)
- **Test:** `pnpm test` (all packages)
- **Type-check:** `pnpm type-check` (full TypeScript)
- **Release:** `changeset add` → `changeset version` → `pnpm publish`

---

## See also

- [AGENTS.md](../AGENTS.md) — Complete project context
- [GitHub Copilot docs](https://docs.github.com/en/copilot)
- [Cursor rules](../.cursor/rules/project.mdc) — Cursor IDE (different tool)
- [Claude Code instructions](../CLAUDE.md) — Claude Code (different tool)
