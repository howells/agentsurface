# Production Gotchas

Critical failure modes that appear in production but not in development.
Load this file when wiring up agents, workflows, or memory.

Sources: absolutelyskilled/absolutelyskilled@mastra (MIT), production incidents
from deployed Mastra projects.

---

## 1. Forgetting `.commit()` — silent no-op workflow

A workflow chain that's missing `.commit()` at the end won't throw at definition
time, but calling `workflow.createRun()` will either fail silently or produce
unexpected behavior.

```typescript
// WRONG — looks valid, fails at runtime
const workflow = createWorkflow({ id: "my-workflow", ... })
  .then(stepOne)
  .then(stepTwo)
// Missing .commit()!

// CORRECT
const workflow = createWorkflow({ id: "my-workflow", ... })
  .then(stepOne)
  .then(stepTwo)
  .commit()  // ← always required
```

**Rule:** Every workflow chain must end with `.commit()`.

---

## 2. Direct agent access bypasses telemetry and logging

Importing and calling an agent instance directly skips the Mastra registry's
wiring — no trace data, no logger output, no resource access via the registered
Mastra instance.

```typescript
// WRONG — bypasses Mastra registry
import { myAgent } from "./agents/my-agent"
const result = await myAgent.generate("hello")

// CORRECT — always resolve through mastra
const agent = mastra.getAgent("my-agent")
const result = await agent.generate("hello")
```

**Rule:** Inside step `execute` functions and API routes, always call
`mastra.getAgent("id")`. Never import agent instances directly.

---

## 3. `mcp.listTools()` caches at initialization time

`MCPClient.listTools()` captures the available tools at the moment it's called.
If the MCP server's tools change after `MCPClient` initializes, the agent won't
see the new tools until the process restarts.

For multi-user scenarios where tools or credentials differ per request:

```typescript
// WRONG for multi-user — tools frozen at init
const tools = await mcp.listTools()
const agent = new Agent({ tools })

// CORRECT for multi-user — toolsets resolved per request
const res = await agent.generate(prompt, {
  toolsets: await mcp.listToolsets(),
})
await mcp.disconnect()  // ← always disconnect after dynamic use
```

**Rule:** Use `listToolsets()` per request for multi-user scenarios. Use
`listTools()` only for single-user or CLI tools that won't change.

---

## 4. Memory resource scope — cross-user data leakage

If two users share the same `resource` ID, their working memory and semantic
recall overlap. This is a data leak.

```typescript
// WRONG — static resource ID leaks data across users
await agent.generate("Remember my name is Alice", {
  memory: { thread: { id: "thread-1" }, resource: "default" },
})

// CORRECT — resource ID derived from unique user identifier
await agent.generate("Remember my name is Alice", {
  memory: {
    thread: { id: `thread-${sessionId}` },
    resource: userId,  // ← must be unique per user
  },
})
```

**Rule:** Always derive `resource` from a unique, authenticated identifier
(user ID, session ID). Never use a static string as the resource ID.

Also: the memory system has no built-in access control. Always verify user
authorization in your application before querying any `resourceId`.

---

## 5. Step schema mismatches — cryptic runtime errors

When a step's `outputSchema` doesn't match the next step's `inputSchema`, Mastra
throws a Zod parse error at runtime, not at definition time. The error message
often points to the schema parse failure rather than identifying which step
transition caused it.

```typescript
// Step 1 outputs: { firstName: string, lastName: string }
// Step 2 expects: { displayName: string }

// WRONG — runtime Zod error with no context
workflow.then(fetchUser).then(greetUser).commit()

// CORRECT — use .map() to transform between mismatched schemas
workflow
  .then(fetchUser)
  .map(({ inputData }) => ({
    displayName: `${inputData.firstName} ${inputData.lastName}`,
  }))
  .then(greetUser)
  .commit()
```

**Rule:** When chaining steps with different schemas, always use `.map()` to
bridge them. Verify schema compatibility with a test payload during development.

---

## 6. Parallel step failures cascade

If any step in a `.parallel([...])` block throws, the entire parallel block
fails — including steps that completed successfully. Their results are discarded.

```typescript
// If any of these throws, ALL results are lost
.parallel([classifyStep, paletteStep, embedStep])

// CORRECT — handle errors inside each step, return typed results
const classifyStep = createStep({
  execute: async ({ inputData }) => {
    try {
      const result = await classify(inputData.imageUrl)
      return { success: true, classifications: result }
    } catch (err) {
      return { success: false, classifications: null, error: err.message }
    }
  },
})
```

**Rule:** For parallel steps that should be independent, handle errors inside each
step's `execute` and return a typed success/failure object rather than throwing.

---

## 7. Environment variables in trigger functions

Dynamic imports in fire-and-forget triggers run in a new module context. If your
workflow depends on environment variables that aren't available at import time,
the workflow silently receives `undefined`.

```typescript
// Can fail silently if env vars aren't loaded yet
export function onImageSaved(imageUrl: string) {
  void import("./workflows/enrich-image")
    .then(({ enrichImageWorkflow }) => enrichImageWorkflow.createRun())
    .then((run) => run.start({ inputData: { imageUrl } }))
    .catch((error) => console.error("Enrich workflow failed:", error))
    // ↑ Always attach .catch() — fire-and-forget swallows errors otherwise
}
```

**Rule:** Always attach `.catch()` on trigger promises. Verify env vars are
available at server startup, not inside workflow steps.
