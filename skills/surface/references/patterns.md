# Production Patterns

Ten patterns for production Mastra agent systems. The first eight are codified
from deployed projects; the last two are architecture patterns adapted from
distributed systems that apply equally well to Mastra workflows.

Apply these when generating scaffolding — they solve problems that surface
only in production.

---

## Pattern 1: Security-First Tools

**Problem:** LLMs can be tricked into passing fabricated user IDs or escalating privileges
through tool parameters.

**Rule:** User identity is ALWAYS injected server-side via RequestContext. Never accept
userId, teamId, or auth tokens as tool input parameters.

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

function resolveUserId(context: { requestContext?: Map<string, string> }): string {
  const userId = context.requestContext?.get("userId");
  if (!userId) throw new Error("userId not available in request context");
  return userId;
}

export const getUserDataTool = createTool({
  id: "get-user-data",
  description: "Get the current user's data. No user ID needed — identity is automatic.",
  inputSchema: z.object({
    // NO userId parameter — this is the whole point
    fields: z.array(z.string()).describe("Which fields to return"),
  }),
  outputSchema: z.object({
    data: z.record(z.unknown()),
  }),
  execute: async (input, context) => {
    const userId = resolveUserId(context);
    const data = await db.users.findById(userId);
    return { data };
  },
});
```

**API route setup:**
```typescript
import { RequestContext } from "@mastra/core";

// In your API route handler
const requestContext = new RequestContext([["userId", session.userId]]);
const result = await agent.stream(messages, { requestContext });
```

**When to apply:** Any tool that accesses user-scoped data. Every project with
authentication should use this pattern.

---

## Pattern 2: Tool Domain Grouping

**Problem:** As tool count grows (10+), flat tool directories become unmanageable.
Agents need composed tool sets, not monolithic lists.

**Rule:** Group tools by domain. Export as named objects. Agents compose from groups.

```typescript
// tools/reader/index.ts
import { getPieceTool } from "./get-piece";
import { searchPiecesTool } from "./search-pieces";
import { getConnectionsTool } from "./get-connections";

export const readerTools = {
  getPieceTool,
  searchPiecesTool,
  getConnectionsTool,
};

// tools/shared/index.ts
import { webSearchTool } from "./web-search";
import { webFetchTool } from "./web-fetch";

export const sharedTools = {
  webSearchTool,
  webFetchTool,
};

// agents/reading-companion.ts
import { readerTools } from "../tools/reader";
import { sharedTools } from "../tools/shared";

export const readingCompanion = new Agent({
  id: "reading-companion",
  tools: {
    ...readerTools,
    ...sharedTools,
  },
});
```

**When to apply:** Any project with more than 5 tools. Start grouping early —
restructuring later is painful.

---

## Pattern 3: Fire-and-Forget Triggers

**Problem:** Workflow execution blocks the API response. Heavy Node.js dependencies
(sharp, puppeteer) load at route init time even when not needed.

**Rule:** Use dynamic imports and void promises for workflow triggers. Never await
workflow completion in the request handler.

```typescript
// triggers.ts
export function onImageSaved(sourceImageId: string, imageUrl: string) {
  void import("./workflows/enrich-image")
    .then(({ enrichImageWorkflow }) => enrichImageWorkflow.createRun())
    .then((run) => run.start({ inputData: { imageUrl, sourceImageId } }))
    .catch((error) => console.error("Enrich workflow failed:", error));
}

export function onRecipeRequested(prompt: string, userId: string) {
  void import("./workflows/recipe-generation")
    .then(({ recipeWorkflow }) => recipeWorkflow.createRun())
    .then((run) => run.start({ inputData: { prompt, userId } }))
    .catch((error) => console.error("Recipe workflow failed:", error));
}
```

**Calling from API routes (e.g., tRPC):**
```typescript
// In your tRPC mutation or API route
await saveImage(imageData);
onImageSaved(imageId, imageUrl); // Fire and forget — no await
return { success: true };
```

**When to apply:** Any workflow triggered from an API route. The only exception is
when the response depends on workflow output (rare — prefer webhooks or polling).

---

## Pattern 4: Markdown-Based Instructions

**Problem:** Complex agent instructions bloat TypeScript files. Instructions need
domain expertise to write and should be editable without code changes.

**Rule:** For agents with instructions longer than ~20 lines, load from markdown files
organized by concern.

```
agents/instructions/
└── brand-intelligence/
    ├── role.md        # Identity and capabilities
    ├── domain.md      # Domain knowledge and terminology
    ├── tools.md       # When and how to use each tool
    └── playbook.md    # Step-by-step decision workflows
```

```typescript
import { loadAgentInstructions } from "./load-instructions";

export const brandIntelligence = new Agent({
  id: "brand-intelligence",
  instructions: loadAgentInstructions("brand-intelligence"),
  // ...
});
```

**When to apply:** Agents with complex decision-making logic or domain expertise.
Simple utility agents (3-5 line instructions) can stay inline.

---

## Pattern 5: Data Sanitization with Zod

**Problem:** Tool output may contain sensitive fields (passwords, internal IDs,
billing data) that leak into the LLM context window.

**Rule:** Define Zod output schemas that whitelist safe fields. Parse all data
through the schema before returning from tools.

```typescript
import { z } from "zod";

// Define what's safe to expose to the LLM
const safeCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.string(),
  // Note: no password_hash, no billing_address, no internal_notes
});

function sanitize<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

function sanitizeArray<T>(schema: z.ZodType<T>, data: unknown[]): T[] {
  return data.map((item) => schema.parse(item));
}

// In tool execute:
execute: async (input, context) => {
  const raw = await db.customers.findMany();
  return { customers: sanitizeArray(safeCustomerSchema, raw) };
},
```

**When to apply:** Any tool that returns database records or API responses.
Especially important when the data model has sensitive fields.

---

## Pattern 6: MCP Annotations

**Problem:** Agents waste tokens trying dangerous operations, or proceed with
mutations without understanding consequences.

**Rule:** Annotate every tool with MCP hints so the model understands safety characteristics.

```typescript
// Read-only tool
mcp: {
  annotations: {
    title: "Search Recipes",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
},

// Write tool (creates data)
mcp: {
  annotations: {
    title: "Create Invoice",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
},

// Dangerous tool (deletes data)
mcp: {
  annotations: {
    title: "Delete Customer",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
  },
},
```

**When to apply:** Every tool. Default to read-only annotations and adjust as needed.

---

## Pattern 7: Workflow State for Fan-Out/Fan-In

**Problem:** Complex workflows with parallel steps need to share intermediate results.
Strict input/output chaining doesn't work when parallel branches write different fields.

**Rule:** Use `stateSchema` for shared workflow state. Parallel steps write via `setState()`.
Bridge steps read from state and prepare the next sequential phase.

```typescript
// state.ts
export const enrichmentState = z.object({
  description: z.string().optional(),
  classifications: z.record(z.unknown()).optional(),
  visualDescription: z.string().optional(),
  embedding: z.array(z.number()).optional(),
});

// Parallel step writes to state
const descriptionStep = createStep({
  id: "generate-description",
  inputSchema: z.object({ recipeId: z.string() }),
  outputSchema: z.object({ description: z.string() }),
  execute: async ({ inputData, setState }) => {
    const description = await generateDescription(inputData.recipeId);
    setState({ description });
    return { description };
  },
});

// Bridge step merges parallel outputs
const mergeEnrichmentStep = createStep({
  id: "merge-enrichment",
  inputSchema: z.object({}),
  outputSchema: enrichmentState,
  execute: async ({ state }) => {
    // All parallel results are in state
    return {
      description: state.description,
      classifications: state.classifications,
      visualDescription: state.visualDescription,
      embedding: state.embedding,
    };
  },
});

// Workflow composition
export const enrichWorkflow = createWorkflow({
  id: "enrich",
  inputSchema: z.object({ recipeId: z.string() }),
  outputSchema: enrichmentState,
  stateSchema: enrichmentState,
})
  .parallel([descriptionStep, classificationStep, visualStep, embedStep])
  .then(mergeEnrichmentStep)
  .commit();
```

**When to apply:** Any workflow with parallel steps that produce different output types.
Sequential-only workflows can use plain input/output chaining.

---

## Pattern 8: Content Truncation

**Problem:** Tool responses with large text bodies (articles, documents) can blow out
the context window or increase prompt injection surface area.

**Rule:** Truncate content fields in tool responses. Keep structured metadata intact
but limit free-text content.

```typescript
const MAX_CONTENT_LENGTH = 2000;

execute: async (input, context) => {
  const piece = await getPiece(input.id);

  return {
    id: piece.id,
    title: piece.title,
    author: piece.author,
    // Truncate the body to limit context consumption
    body: piece.body.length > MAX_CONTENT_LENGTH
      ? piece.body.slice(0, MAX_CONTENT_LENGTH) + "... [truncated]"
      : piece.body,
    wordCount: piece.body.split(/\s+/).length,
  };
},
```

**When to apply:** Any tool that returns user-generated content, article bodies,
document text, or other unbounded string fields. Especially important for agents
that handle many pieces of content per conversation.

---

## Pattern 9: Saga / Compensation

**Problem:** Multi-step workflows that modify external systems (payment, inventory,
notifications) need a way to undo completed steps if a later step fails. Without this,
partial failures leave the system in an inconsistent state.

**Rule:** For each step that has a side effect, register a compensation function before
executing it. On failure, run compensations in reverse order (LIFO).

```typescript
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

type Compensation = () => Promise<void>;

const bookingWorkflow = createWorkflow({
  id: "booking",
  inputSchema: z.object({ userId: z.string(), itemId: z.string() }),
  outputSchema: z.object({ bookingId: z.string() }),
  stateSchema: z.object({ compensations: z.array(z.string()).optional() }),
})
  .then(
    createStep({
      id: "reserve-inventory",
      inputSchema: z.object({ userId: z.string(), itemId: z.string() }),
      outputSchema: z.object({ reservationId: z.string() }),
      execute: async ({ inputData, setState, state }) => {
        const reservationId = await inventory.reserve(inputData.itemId);
        // Register compensation BEFORE using the result downstream
        setState({
          compensations: [...(state.compensations ?? []), `release:${reservationId}`],
        });
        return { reservationId };
      },
    })
  )
  .then(
    createStep({
      id: "charge-payment",
      inputSchema: z.object({ userId: z.string(), reservationId: z.string() }),
      outputSchema: z.object({ chargeId: z.string() }),
      execute: async ({ inputData, setState, state }) => {
        try {
          const chargeId = await payments.charge(inputData.userId);
          setState({
            compensations: [...(state.compensations ?? []), `refund:${chargeId}`],
          });
          return { chargeId };
        } catch (err) {
          // Run all registered compensations in reverse
          for (const comp of (state.compensations ?? []).reverse()) {
            const [action, id] = comp.split(":");
            if (action === "release") await inventory.release(id);
          }
          throw err;
        }
      },
    })
  )
  .commit();
```

**Key rules:**
- Register the compensation **before** you need it (before downstream steps run)
- Compensations must be **idempotent** (safe to run more than once)
- Run in **reverse order** — last-registered, first-compensated
- Only compensate completed steps, not the step that failed

**When to apply:** Any workflow that touches external systems with side effects —
payments, inventory, email sends, calendar bookings, database writes across services.

---

## Pattern 10: Entity Agent (Long-Lived Agent per Entity)

**Problem:** Some domains naturally map to an agent that represents a single
long-lived entity — a persona, a project, a conversation room. Creating a new
agent instance per request loses continuity and context.

**Rule:** Scope memory and agent sessions to an entity ID. One agent + one thread
per entity, not one per request.

```typescript
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PgVector, PostgresStore } from "@mastra/pg";

// The agent definition is shared
export const personaAgent = new Agent({
  id: "persona-agent",
  instructions: "You are a persistent persona in a dialogue room...",
  model: agentModel(),
  memory,
});

// Entity scope is established per call — not per agent instance
export async function runPersonaTurn(
  projectId: string,
  personaId: string,
  messages: CoreMessage[]
) {
  const agent = mastra.getAgent("persona-agent");

  return agent.generate(messages, {
    memory: {
      // Thread ID scoped to this specific entity
      thread: { id: `${projectId}:${personaId}` },
      // Resource ID for cross-thread semantic recall
      resource: personaId,
    },
  });
}
```

**Benefits:**
- The agent accumulates context across conversations for the same entity
- Semantic recall works across all past threads for that entity
- Multiple entities run independently without context bleed

**When to apply:** Personas, project-specific assistants, customer support threads,
long-running research sessions. Any use case where "the agent knows this entity."

**Cloudflare-native mapping:** Cloudflare Agents and Durable Objects are a strong
fit for this pattern. Use the Durable Object ID as the entity key, keep the
agent's short-term state in the object, and attach long-term recall through
Agent Memory, Vectorize, AI Search, AutoRAG, or an external vector store. This
is especially useful for agents that need WebSocket continuity, scheduled work,
or edge-local state without introducing a separate Node service.
