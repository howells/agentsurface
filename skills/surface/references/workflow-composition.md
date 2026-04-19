# Workflow Composition

Full Mastra workflow control flow API. Load this when scaffolding workflows that
go beyond simple `.then()` chaining — branching, loops, iteration, human-in-the-loop.

Source: mastra-ai/skills and absolutelyskilled/absolutelyskilled@mastra (MIT)

---

## Sequential (default)

```typescript
workflow.then(step1).then(step2).then(step3).commit()
```

## Parallel

Runs steps concurrently. Waits for all to complete. Output is keyed by step ID.

```typescript
workflow
  .then(fetchData)
  .parallel([analyzeText, analyzeImages, analyzeMeta])
  .then(mergeResults)
  .commit()
```

> If any step in a parallel block throws, the entire block fails. Use try/catch
> inside step `execute` functions and return typed success/failure objects rather
> than throwing, so the merge step can handle partial results.

## Branch

Conditional routing. Only the first matching predicate executes.
All branches must share the same input schema.

```typescript
workflow
  .then(classify)
  .branch([
    [({ inputData }) => inputData.type === "email", handleEmail],
    [({ inputData }) => inputData.type === "sms", handleSms],
    [() => true, handleDefault],  // fallback — always last
  ])
  .then(notify)
  .commit()
```

## Do-until Loop

Repeats a step until the condition returns `true`.

```typescript
workflow
  .dountil(pollStatus, ({ inputData }) => inputData.status === "complete")
  .then(processResult)
  .commit()
```

Use this for polling, retry-until-success, and iterative refinement.

## Do-while Loop

Repeats while condition is `true`.

```typescript
workflow
  .dowhile(refineOutput, ({ inputData }) => inputData.qualityScore < 0.9)
  .commit()
```

Use this for quality-gated generation (keep refining until good enough).

## Foreach (Batch Processing)

Iterates over an array, running a step per element. Control concurrency to
avoid overwhelming downstream services.

```typescript
workflow
  .then(getItems)
  .foreach(processItem, { concurrency: 5 })
  .then(aggregateResults)
  .commit()
```

> Default concurrency is 1 (sequential). Increase carefully — each concurrent
> run makes an LLM call. `concurrency: 5` on 100 items = 5 simultaneous LLM calls.

## Map (Schema Transformation)

Transform data between steps when output schema doesn't match the next step's
input schema. Avoids modifying step schemas to fit each other.

```typescript
workflow
  .then(fetchUser)
  .map(({ inputData }) => ({
    displayName: `${inputData.firstName} ${inputData.lastName}`,
  }))
  .then(sendWelcome)
  .commit()
```

## Nested Workflows

Use a workflow as a step inside another workflow. Good for reusing sub-pipelines.

```typescript
const parentWorkflow = createWorkflow({ id: "parent", ... })
  .then(prepareData)
  .then(enrichmentWorkflow)  // child workflow runs as a step
  .then(persistResults)
  .commit()
```

---

## Suspend / Resume (Human-in-the-Loop)

Pause a workflow mid-execution and wait for external input (approval, correction,
user decision). The workflow persists its state across the pause.

```typescript
const approvalStep = createStep({
  id: "wait-for-approval",
  inputSchema: z.object({ proposal: z.string() }),
  outputSchema: z.object({ approved: z.boolean(), notes: z.string().optional() }),
  execute: async ({ inputData, suspend }) => {
    // Suspends the workflow — returns control to the caller
    const resumeData = await suspend({ proposal: inputData.proposal })
    return { approved: resumeData.approved, notes: resumeData.notes }
  },
})

// Trigger side:
const run = workflow.createRun()
const result = await run.start({ inputData: { proposal: "Buy 100 units" } })

if (result.status === "suspended") {
  // Store run.id in your DB, wait for webhook/user action, then:
  const resumed = await run.resume({
    step: "wait-for-approval",
    data: { approved: true, notes: "Approved by finance" },
  })
}
```

---

## Result Status — Always Discriminate

Never access `result.result` without checking `result.status` first.

```typescript
const result = await run.start({ inputData })

switch (result.status) {
  case "success":
    return result.result      // typed output
  case "failed":
    throw result.error        // Error object
  case "suspended":
    // Store run reference, notify user to resume
    await db.pendingRuns.create({ runId: run.id, payload: result.suspendPayload })
    return { status: "pending" }
  case "tripwire":
    // Step limit exceeded
    console.warn("Workflow hit step limit:", result.tripwire)
    return { status: "incomplete" }
  case "paused":
    return { status: "paused" }
}
```

---

## Streaming Workflow Execution

Get step-level progress events as the workflow runs.

```typescript
const run = workflow.createRun()
const stream = run.stream({ inputData: { text: "Hello" } })

for await (const event of stream.fullStream) {
  // event contains step ID, status, partial output
  console.log(event)
}

const finalResult = await stream.result
```

---

## RequestContext in Steps

Pass per-request context (user tier, auth token, locale) into steps — same
pattern as tools.

```typescript
const step = createStep({
  id: "tiered-step",
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({ results: z.array(z.string()) }),
  execute: async ({ inputData, requestContext }) => {
    const tier = requestContext.get("user-tier")
    const limit = tier === "enterprise" ? 1000 : 50
    return { results: await search(inputData.query, limit) }
  },
})

// In your API route:
const run = workflow.createRun()
await run.start({
  inputData: { query: "..." },
  requestContext: new RequestContext([["user-tier", "enterprise"]]),
})
```

---

## Active Run Management

```typescript
// List all in-progress or suspended runs
const activeRuns = await workflow.listActiveWorkflowRuns()

// Restart a single run from its last active step
await run.restart()

// Restart all active runs (useful after deploy)
await workflow.restartAllActiveWorkflowRuns()
```

---

## Step-Level Scorers (Evals)

Attach quality evaluation to individual steps — runs asynchronously and doesn't
block the step's output.

```typescript
const step = createStep({
  id: "generate-response",
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({ answer: z.string() }),
  execute: async ({ inputData }) => ({ answer: await generate(inputData.query) }),
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: "openai/gpt-4.1-nano" }),
      sampling: { type: "ratio", rate: 0.1 },  // score 10% of calls
    },
  },
})
```

---

## Choosing the Right Control Flow

| Scenario | Use |
|----------|-----|
| Ordered steps, no branching | `.then()` |
| Multiple independent steps | `.parallel()` |
| Different logic per input type | `.branch()` |
| Poll until ready | `.dountil()` |
| Improve until good enough | `.dowhile()` |
| Process an array of items | `.foreach()` |
| Transform between steps | `.map()` |
| Wait for human decision | `suspend/resume` |
| Reuse a sub-pipeline | Nested workflow |
