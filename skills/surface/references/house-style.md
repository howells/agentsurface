# House Style Reference

Based on a surveyed production codebase, this document codifies the stack, conventions, and idioms for surface skill development. Use this as the canonical reference when building agents, tools, and supporting libraries.

---

## Executive Summary

**The Stack**:
```
Runtime:        Bun 1.3+ (dev, test, scripts, LSP-aware)
Language:       TypeScript 6.0+ (strict mode, ES2022+, NodeNext modules)
Monorepo:       Turborepo (workspace globs: apps/*, packages/*)
Framework:      Next.js 16 with App Router (server components default)
Frontend:       React 19, server-first, minimal client-side state
Database:       Drizzle ORM 0.45+ (PostgreSQL, type-safe migrations)
Linter:         Biome 2.4+ (single unified tool, no ESLint or Prettier)
Validation:     Zod 4.3+ (runtime validation on all API boundaries)
LLM/AI:         Vercel AI SDK 6.0+ (model-agnostic), Anthropic SDK for native features
Background:     Trigger.dev 4.4+ (durable task execution)
Queue:          BullMQ 5.7+ (for high-throughput job processing)
Cache:          Redis via @midday/cache wrapper (in-memory during dev)
Logging:        Pino 10+ (structured JSON logs to stdout)
Observability:  OpenTelemetry GenAI semconv, Sentry 10+, Openpanel (product telemetry)
Testing:        Bun test (native) + Vitest 4.1+ (shared test utilities)
API:            Hono 4.12+ (type-safe, Zod-validated, rate-limited)
Email:          Resend 6.9+ (transactional only, not bulk)
Auth:           Jose 6.2+ (JWT, cookie-based sessions)
Deployment:     Vercel (Next.js), Railway/Fly (background workers)
Package mgr:    Bun 1.3.11+ (lockfile format, workspace resolution)
```

**Personality**: Type-safe, observable, deployable. No magic. Explicit over implicit. No runtime surprises.

---

## Runtime: Bun

### Script Invocation

Use `bun run` for scripts, `bun x` for one-off CLI tools:

```bash
# Development scripts
bun run dev              # Start dev server (turbo dev --parallel)
bun run build            # Build all packages
bun run test             # Run all tests in parallel
bun run lint             # Lint all packages
bun run format           # Format with Biome

# One-off tools
bunx drizzle-kit push    # Run Drizzle migrations
bunx ts-node src/cli.ts  # Ad-hoc script
```

### Env and Config

- `NODE_ENV`: production, development, test (use explicitly; no inference)
- `.env.local`: Loaded by `bun run` automatically
- `process.env` access: Direct; Bun handles type-checking via jsr types

Example:
```typescript
// No dotenv() call needed in Bun
const apiKey = process.env.OPENAI_API_KEY ?? (() => {
  throw new Error("OPENAI_API_KEY not set");
})();
```

---

## Language: TypeScript

### Compiler Options

Base config (`packages/tsconfig/base.json`):
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["es2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true,
    "types": ["node", "bun"]
  }
}
```

**Key settings**:
- `strict: true` — Non-negotiable; catch errors at compile time
- `target: ES2022` — Supported by Node and Bun; modern enough
- `module: NodeNext` — Interop with `.mjs`, `.js`, and conditional exports
- `noUncheckedIndexedAccess: true` — Arrays/objects require index checks (`arr[i]?.prop`)

### Import Organization (Biome Auto-Sorts)

Biome handles import sorting; don't do it manually. Order (automatic):
1. Node/Bun stdlib (`"node:fs"`, `"bun:test"`)
2. Workspace packages (`"@midday/utils"`)
3. Third-party (`"zod"`, `"react"`)
4. Relative (`"./helpers"`, `"../types"`)

Example (before):
```typescript
import fs from "node:fs";
import { getUserId } from "../utils";
import { z } from "zod";
import type { User } from "./types";
import { getDb } from "@midday/db";
```

After `biome format --write`:
```typescript
import fs from "node:fs";
import { getDb } from "@midday/db";
import { z } from "zod";
import type { User } from "./types";
import { getUserId } from "../utils";
```

### Path Aliases

Use TypeScript `paths` (no `baseUrl`; it breaks bundlers):

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/types": ["./src/types/index.ts"],
      "@/utils": ["./src/utils/index.ts"]
    }
  }
}
```

Import:
```typescript
import { processInvoice } from "@/services/invoice";
import type { Invoice } from "@/types";
```

### Error Handling

Always use typed errors:

```typescript
// ✗ Bad
throw new Error("Something went wrong");

// ✓ Good
class ValidationError extends Error {
  constructor(public code: "INVALID_DATE" | "INVALID_AMOUNT", message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

throw new ValidationError("INVALID_DATE", "Due date must be in the future");
```

At API boundaries, convert to structured responses:

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

---

## Validation: Zod

All APIs, database operations, and tool invocations use Zod schemas.

### Schema Definition

```typescript
import { z } from "zod";

const createInvoiceInput = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive().max(999999.99),
  dueDate: z.coerce.date().min(new Date()),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string()).default([]),
});

type CreateInvoiceInput = z.infer<typeof createInvoiceInput>;
```

### API Validation

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-openapi";

const app = new Hono();

app.post("/invoices", zValidator("json", createInvoiceInput), async (c) => {
  const input = c.req.valid("json");
  // input is now typed and validated
  const invoice = await createInvoice(input);
  return c.json({ success: true, data: invoice });
});
```

### Database Queries

```typescript
// Always validate query results
const getUser = async (id: string) => {
  const result = await db.select().from(users).where(eq(users.id, id));
  return userSchema.parse(result[0]); // Throws if shape doesn't match
};
```

---

## Monorepo: Turborepo

### Workspace Structure

```
midday/
├── apps/
│   ├── api/              (Hono server, tRPC, MCP router)
│   ├── dashboard/        (Next.js web app)
│   ├── worker/           (Background job processor)
│   └── website/          (Public marketing site)
├── packages/
│   ├── db/               (Drizzle ORM, migrations, queries)
│   ├── ui/               (React components, shadcn/ui)
│   ├── utils/            (Helpers, constants)
│   ├── logger/           (Pino setup, structured logging)
│   ├── cache/            (Redis wrapper)
│   ├── events/           (Type-safe event emitter)
│   ├── tsconfig/         (Base TypeScript config)
│   └── ...
└── turbo.json
```

### Dependency Declaration

Use `workspace:*` for internal deps:

```json
{
  "dependencies": {
    "@midday/db": "workspace:*",
    "@midday/utils": "workspace:*",
    "zod": "^4.3.6"
  }
}
```

Bun resolves `workspace:*` to the local package; npm/pnpm require `workspace:` prefix.

### Running Scripts

Target a single package:
```bash
bun run --filter=@midday/api dev
bun run --filter=@midday/dashboard build
```

Run in dependency order:
```bash
turbo build  # Respects dependency graph
```

---

## Framework: Next.js 16 App Router

### Server Components Default

Opt-in to client with `"use client"`:

```typescript
// app/invoices/page.tsx (server by default)
import { getInvoices } from "@/db/queries";

export default async function InvoicesPage() {
  const invoices = await getInvoices();
  return (
    <div>
      {invoices.map((inv) => (
        <InvoiceCard key={inv.id} invoice={inv} />
      ))}
    </div>
  );
}
```

```typescript
// app/invoices/filters.tsx (client, needs interactivity)
"use client";

import { useState } from "react";

export function Filters() {
  const [category, setCategory] = useState("");
  return <select onChange={(e) => setCategory(e.target.value)} />;
}
```

### Data Fetching

- **On server**: Direct database queries (no API calls)
- **On client**: API routes or tRPC
- **Caching**: Next.js cache; invalidate with `revalidatePath` or `revalidateTag`

Example:

```typescript
// app/invoices/page.tsx
import { db } from "@midday/db";

export default async function InvoicesPage() {
  // Server-side query; no network round-trip
  const invoices = await db.query.invoices.findMany({
    where: (inv) => eq(inv.userId, getCurrentUserId()),
  });
  return <InvoiceList invoices={invoices} />;
}
```

### API Routes

Use Hono routers within Next.js:

```typescript
// app/api/invoices/route.ts
import { Hono } from "hono";
import { handle } from "hono/vercel";

const app = new Hono().basePath("/api");

app.get("/invoices", async (c) => {
  const invoices = await db.query.invoices.findMany();
  return c.json(invoices);
});

export const GET = handle(app);
```

---

## Database: Drizzle ORM

### Schema Definition

```typescript
import { pgTable, varchar, numeric, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey(),
  customerId: varchar("customer_id")
    .references(() => customers.id)
    .notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
});
```

### Queries

Use the query builder; avoid raw SQL when possible:

```typescript
import { eq } from "drizzle-orm";
import { db } from "@midday/db";

// Typed query
const invoice = await db.query.invoices.findFirst({
  where: (inv) => eq(inv.id, invoiceId),
  with: { customer: true }, // Eager load
});

// Result is typed automatically
console.log(invoice.customer.name); // ✓ TypeScript knows this is a string
```

### Migrations

Committed to version control:

```bash
bunx drizzle-kit generate:pg --name "add_invoice_status"
# Generates migrations/0002_add_invoice_status.sql

bunx drizzle-kit push  # Apply pending migrations
```

---

## Linting & Formatting: Biome

### Config

Single `biome.json` at repo root:

```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "a11y": { "useKeyWithClickEvents": "off" },
      "style": { "noNonNullAssertion": "off" },
      "correctness": { "noUnusedVariables": "warn" }
    }
  },
  "formatter": { "indentStyle": "space", "lineWidth": 100 },
  "organizeImports": { "enabled": true }
}
```

### Commands

```bash
biome check .                     # Lint + format check
biome check --write .             # Apply fixes
biome format --write .            # Format only (no lint)
```

Integrate with editor:
- VS Code: Install Biome extension; set as default formatter
- Configure on save: `"editor.formatOnSave": true`

### No Prettier, No ESLint

Biome replaces both. It's unified, fast, and opinionated.

---

## Testing: Bun Test + Vitest

### Bun Test (Preferred)

```typescript
import { describe, test, expect } from "bun:test";

describe("createInvoice", () => {
  test("creates invoice with valid input", async () => {
    const invoice = await createInvoice({
      customerId: "cust_123",
      amount: 100,
      dueDate: new Date("2026-05-17"),
    });
    expect(invoice.id).toBeDefined();
    expect(invoice.amount).toBe(100);
  });

  test("rejects negative amount", async () => {
    expect(() =>
      createInvoice({ customerId: "cust_123", amount: -50, dueDate: new Date() })
    ).toThrow();
  });
});
```

### Running Tests

```bash
bun test src/**/*.test.ts              # All tests
bun test --watch src                   # Watch mode
bun test --exit --timeout 30000 src    # Long timeout for integration tests
```

### Vitest (for advanced mocking)

```typescript
import { describe, test, expect, mock } from "vitest";

const mockDb = {
  query: { invoices: { findFirst: mock() } },
};

describe("getInvoice", () => {
  test("calls database", async () => {
    mockDb.query.invoices.findFirst.mockResolvedValue({ id: "inv_1" });
    const result = await getInvoice("inv_1");
    expect(mockDb.query.invoices.findFirst).toHaveBeenCalledWith("inv_1");
  });
});
```

---

## API Design: Hono + Zod

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-openapi";

const app = new Hono();

// Validate request body
const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
});

app.post("/invoices", zValidator("json", createInvoiceSchema), async (c) => {
  const input = c.req.valid("json");

  try {
    const invoice = await createInvoice(input);
    return c.json({ success: true, data: invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return c.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: 400 }
      );
    }
    throw error;
  }
});

export default app;
```

---

## Logging: Structured (Pino)

```typescript
import { logger } from "@midday/logger";

// Structured logging; always JSON to stdout
logger.info(
  { userId: "user_123", invoiceCount: 5, duration: 234 },
  "Exported invoices"
);
// Output: {"level":"info","userId":"user_123","invoiceCount":5,"duration":234,"msg":"Exported invoices","timestamp":"2026-04-17T12:34:56Z"}

logger.error({ error: error.message, code: "DB_ERROR" }, "Database failure");
logger.warn({ attempts: 3 }, "Retrying failed request");
```

**Never use**:
- `console.log()` (no structure)
- Alert-style logging (`logger.info("❌ Failed")` — emojis break parsing)

---

## Observability

### OpenTelemetry GenAI Semconv

```typescript
import { tracer } from "@midday/observe";

const span = tracer.startSpan("invoke_agent", {
  attributes: {
    "llm.model": "claude-opus-4-1",
    "llm.usage.prompt_tokens": 1200,
    "llm.usage.completion_tokens": 450,
    "llm.temperature": 0.7,
  },
});

try {
  const result = await agent.run(goal);
  span.addEvent("agent.complete", { "agent.success": true });
} finally {
  span.end();
}
```

### Sentry Integration

```typescript
import { captureException } from "@sentry/bun";

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    level: "warning",
    tags: { domain: "invoicing" },
    extra: { invoiceId: "inv_123" },
  });
}
```

---

## Deployment

### Web (Vercel)

```bash
# Automatic on push to main
# Env vars set in Vercel dashboard
bun run build  # Next.js build
# → .next/standalone
```

### Background Workers (Railway/Fly)

```dockerfile
FROM oven/bun:1.3
WORKDIR /app
COPY . .
RUN bun install
CMD ["bun", "run", "apps/worker/src/index.ts"]
```

```bash
# Deploy
flyctl deploy
railway up
```

### Serverless (Cloud Run)

```dockerfile
FROM oven/bun:1.3 AS builder
WORKDIR /app
COPY . .
RUN bun install --production

FROM oven/bun:1.3
COPY --from=builder /app .
EXPOSE 3000
CMD ["bun", "run", "apps/api/src/index.ts"]
```

---

## Summary Grid

| Concern | Choice | Why |
|---------|--------|-----|
| Runtime | Bun | Fast, TypeScript-native, dev/test/prod aligned |
| Language | TypeScript strict | Catch errors early; production confidence |
| Monorepo | Turborepo | Fast builds, incremental, easy to parallelize |
| Frontend | Next.js 16 App Router | Server-first, simple data fetching, SEO |
| Styling | Tailwind (via shadcn) | Utility-first, composable, no CSS-in-JS overhead |
| Database | Drizzle + PostgreSQL | Type-safe, migrations versioned, no magic |
| Validation | Zod | Runtime + compile-time, composable, clear errors |
| API | Hono | Lightweight, type-safe, works everywhere |
| Logging | Pino | Structured JSON, fast, machine-parseable |
| Testing | Bun test | Native, no setup, matches runtime |
| Linting | Biome | All-in-one, fast, opinionated (no ESLint wars) |
| Deployment | Vercel (web), Railway (worker) | Managed, auto-scale, good DX |
