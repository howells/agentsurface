# Orchestration

## Summary

Orchestration is the art of scaling from a single agent with tools to multi-agent systems. The decision hinges on *scope, state, and specialization*: Does the problem require multiple loosely coupled specialists, or can one generalizer reason through it? Single agents scale up to ~10 tools with shared state; multi-agent systems become necessary when specialists must operate in parallel, maintain isolated state, or have incompatible reasoning styles.

- **Single agent**: Generalist, shared context, simple composition. Best for <10 tools, <5-minute tasks.
- **Multi-agent**: Specialists with boundaries, parallel execution, state isolation. Necessary for long-running workflows, multiple domains, or high throughput.
- **Tool loops**: The commodity layer; optimize there first before adding agents.
- **Stateful orchestration**: Workflows, task queues, event streams—choose based on SLA and complexity.
- **Deployment**: Agents as HTTP services, scheduled workers, or long-lived daemons.

---

## Core Principle

> One agent per problem domain. Agents don't gossip; they hand over state.

A tightly coupled multi-agent system (e.g., agents calling other agents directly) defeats the purpose. Use queues, databases, or event streams as the exchange layer. This decouples scheduling from logic and enables resilience.

---

## Principles

### 1. Single Agent First

Start with one generalist agent and a growing toolkit. Grow until:
- Context window becomes a constraint (>100K tokens of reasoning)
- Latency exceeds SLA (agent reasoning takes >5 seconds)
- State conflicts arise (two tools need mutually exclusive setup)
- Throughput demands force parallelism

**Checklist**: Before adding a second agent, ask:
- Can this task be solved by adding a tool instead of an agent?
- Are the two agents reasoning about the same domain, or different ones?
- Does one agent need to wait for the other's output, or can they run in parallel?

If "one tool instead" or "sequential dependency", stick with one agent.

### 2. Specialization by Domain

When you do split, partition by *problem domain*, not by task type.

**Bad**: Agent-for-retrieval, Agent-for-summarization, Agent-for-routing. They'll fight over shared documents and context.

**Good**: 
- **Bookkeeper agent** (transactions, accounts, reconciliation)
- **Tax agent** (calculations, filings, compliance)
- **HR agent** (payroll, benefits, compliance)

Each owns a domain and all tools within it. Communication happens via events or task queues, not direct calls.

### 3. Stateful Orchestration with Queues or Workflows

In multi-agent systems, state is sacred. Use one of:

**Workflow engines** (Temporal, Inngest, Trigger.dev):
- Durable task execution; failures are retried automatically
- State is persisted between steps
- Good for: long-running, high-assurance workflows (invoicing, reconciliation)

**Event streams** (Kafka, Pub/Sub):
- Agents listen for domain events and publish results as new events
- Good for: high-throughput, loosely coupled systems
- Each agent consumes and produces on its own schedule

**Task queues** (BullMQ, Resque):
- Simple, lower-latency; best for <1-hour jobs
- State is in the database; agents check in and out
- Good for: background jobs, periodic reconciliation

**Pattern**: Agents never call each other directly. They accept a job ID, do their work, and record the result (in DB, event stream, or queue). The next agent reads the result and continues.

### 4. Tool Loops as the Optimization Layer

Within a single agent, tool invocation is a *loop*:
1. Agent reasons about state and chooses a tool
2. Tool executes, returns result
3. Agent reasons about result and chooses next tool (or stops)

Optimize here first:
- Reduce token overhead by minifying tool descriptions
- Cache results of repeated tool calls
- Use `n_tokens` field to track reasoning tokens vs. total
- Consider tool calling vs. function calling (model's native feature)

A well-optimized single agent with 10 tools can outperform a hastily-built multi-agent system.

### 5. Parallel Execution and Resource Isolation

Multi-agent systems enable parallelism. Use it:
- **Fan-out**: One coordinator splits a task (e.g., "process 100 invoices") and farms to N worker agents
- **Isolation**: Each agent runs in its own process/container, so a crash doesn't cascade
- **Backpressure**: Queue-based orchestration naturally handles load spikes

**Example architecture**:
```
[Coordinator Agent] 
  → enqueues "process_invoice:123, process_invoice:124, ..." to InvoiceProcessorQueue
[N Worker Agents]
  → each consumes a task, runs independently
  → on success, enqueues result to ResultsTopic
[Aggregator Agent]
  → consumes ResultsTopic, reconciles results
```

Each agent is replaceable and independently deployable.

### 6. Deployment Patterns

**Scheduled worker**: A single agent runs on a schedule (hourly, daily).
```typescript
// Runs every hour via cron or Trigger.dev
const agent = new Agent(tools);
const result = await agent.run(context);
await db.logResult(result);
```

**HTTP service**: Agent exposed as an API endpoint. One request = one agent invocation.
```typescript
POST /api/agent/reason { goal: "...", context: {...} }
→ Agent executes, returns { result, toolCalls, ... }
```

**Long-lived daemon**: Agent runs indefinitely, consuming from a queue.
```typescript
while (true) {
  const task = await queue.dequeue();
  const result = await agent.run(task);
  await queue.ack(task.id);
}
```

**Serverless**: Agent invoked by event (e.g., webhook, queue message). Scales to zero when idle.

---

## Anti-Patterns

### 1. N-Agent Meshes
Every agent can call every other agent. Chaos ensues: cycles, deadlocks, infinite loops.

**Fix**: Use queues. Publish results, don't call.

### 2. Shared Mutable State
Two agents modifying the same database row without coordination.

**Fix**: Event sourcing or optimistic locking. Ensure only one agent owns a state transition.

### 3. Unbounded Context Growth
An agent that accumulates all previous reasoning and tool calls in its context window.

**Fix**: Summarize or archive old reasoning. Keep context window <10% of model's limit.

### 4. No Retry Logic
A tool call fails; the agent abandons the entire goal.

**Fix**: Orchestration layer (queue, workflow engine) retries failed tasks. Agents don't retry; orchestrators do.

### 5. Synchronous Agent-to-Agent Calls
Agent A calls Agent B via HTTP, waits for response.

**Fix**: Use async handoffs. Agent A enqueues a task for Agent B, continues with other work. Agent B publishes result to a topic; Agent A (or a trigger) consumes it.

---

## See Also

- `/disciplines/agentic-patterns.md` — Indexing multi-agent patterns and topologies
- `/references/orchestration-cookbook.md` — Temporal, Inngest, Trigger.dev examples
- `AGENTS.md` (root) — Formal tool and agent schemas
- 12-factor app principles — Stateless processes, externalized config
- Cognition paper ("Towards Autonomous Agents") — Reasoning about scope and state
