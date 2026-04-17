# Proactive Agents

## Summary

Most agents are reactive: a user sends a request, the agent responds. Proactive agents initiate action without a user request—they monitor for conditions, trigger on events, and notify users of results. This requires rethinking scheduling (cron → event-driven), state management (agents read and write persistent state), and notification continuity (agent work → user inbox). A well-designed proactive agent feels like a collaborator, not a background job.

- **Event-driven scheduling**: Trigger on data changes, time intervals, or external signals, not just cron
- **Persistent state**: Agents read workflow state, update it, and resume on interruption
- **Notification continuity**: Work flows from agent → user inbox (message, email, notification)
- **Batching windows**: Collect work into batches (hourly, daily) to reduce overhead
- **Degradation**: If an agent falls behind, catch up gracefully (replay events, batch larger chunks)

---

## Core Principle

> Proactive agents are invisible helpers. They should leave minimal trace and maximum clarity.

---

## Principles

### 1. Event-Driven Over Time-Driven

Cron jobs run on a schedule, indifferent to whether there's work to do.

**Time-driven**:
```
Every day at 2 AM, run reconciliation_agent
→ Even if no transactions changed, agent runs, wastes compute
```

**Event-driven**:
```
When a transaction is inserted (event), enqueue "reconcile_for_date:2026-04-17"
→ Agent runs only if there's work
→ Runs on the cadence of actual changes
```

**Pattern**: Use event streams (Pub/Sub, Kafka) or database triggers to emit events. Agents consume and act.

**Hybrid approach** (best): Time-driven schedule (once daily) + event-driven spikes (real-time on new data).

### 2. Persistent Workflow State

A proactive agent may run for hours. It must tolerate interruption.

Store state in a database:
```typescript
type WorkflowState = {
  id: string;
  agentId: string;
  taskId: string;
  status: "pending" | "in_progress" | "paused" | "completed" | "failed";
  checkpoint: Record<string, any>; // last tool call, result, etc.
  createdAt: Date;
  updatedAt: Date;
};
```

On resumption:
1. Agent reads current state
2. Replays last tool call if in_progress (idempotent)
3. Continues from checkpoint

**Idempotency is critical**: If an agent calls "create_invoice", and the tool returns "already created", the agent must detect and skip, not retry.

### 3. Notification Continuity

Agent work should surface to the user naturally.

**Bad**: Agent runs, logs result to database. User never knows unless they check.

**Good**: Agent work → notification:
- Email: "Your reconciliation for April is ready. 2 discrepancies found. [View](link)"
- In-app notification: Badge on dashboard + detailed card
- Webhook: System integration (e.g., Slack: "Invoice #123 approved by agent")

**Implementation**:
```typescript
const result = await agent.run(task);
if (result.status === "success") {
  await notificationService.send({
    userId: task.userId,
    type: "reconciliation_complete",
    data: result,
  });
}
```

Users should feel the agent is part of their workflow, not a hidden background process.

### 4. Batching Windows

Collecting work into batches reduces per-task overhead and improves agent efficiency.

**Example: Invoice Agent**
- Without batching: Process each invoice immediately (1s/invoice if serialized)
- With batching: Collect invoices created in the last hour, process 100 at once in a single agent run (50ms/invoice)

**Batching windows**:
- Hourly: Good for high-frequency events (daily for medium-frequency)
- Daily: Good for expensive operations (reconciliation, tax calculations)
- Adaptive: If queue grows beyond threshold, trigger early

**Pattern**:
```typescript
// Every hour, or when queue size > 100:
const batch = await queue.dequeueBatch(maxSize: 100, maxAge: 1h);
await agent.processBatch(batch);
```

### 5. Graceful Degradation and Catchup

Proactive agents may fall behind (slow database, API rate limits, agent crash).

**Strategies**:

**Exponential backoff on failure**: If an agent fails, retry exponentially (1s, 2s, 4s, 8s, ...). After max retries, alert human.

**Partial success**: If a batch of 100 items, and 97 succeed, proceed. Log the 3 failures separately for manual review.

**Catchup batches**: If the agent falls behind by >24 hours, increase batch size and reduce latency SLA (accept p95 instead of p50).

**Alerting**: If agent latency exceeds SLA or error rate spikes, notify ops. Avoid cascading failures.

### 6. Monitoring Proactive Agents

Proactive agents are harder to monitor (no explicit user to complain if they fail).

**Metrics**:
- **Freshness**: How old is the oldest pending task? Alert if >SLA
- **Throughput**: Tasks processed per hour (track over time)
- **Error rate**: % of tasks that failed (target <1%)
- **Latency**: p50, p95 time from event to completion

**Logging**: Every agent invocation logs start, end, tool calls, result. Use structured logs (JSON).

**Dashboards**: Track all metrics in a single pane. Make it visible to the team.

---

## Anti-Patterns

### 1. Unbounded Agent Runs
An agent starts at 2 AM and is still running at 8 AM. Cascading failures.

**Fix**: Set a timeout per agent (e.g., 5 minutes). Exceed timeout → pause, resume next batch window.

### 2. No Notification
Agent runs silently. User doesn't know if it succeeded or failed.

**Fix**: Every completion generates a notification. Route to user's preferred channel (email, in-app, webhook).

### 3. Lost State on Crash
Agent crashes mid-task. No checkpoint. Task is lost or retried blindly.

**Fix**: Persist state every tool call. On resume, read state and continue.

### 4. Too Many Batches
Scheduling 1000 tiny batches per day (one per minute). Orchestration overhead dominates.

**Fix**: Tune batching window and size. Aim for 10-100 batches per day.

### 5. No Feedback Loop
Agent makes a mistake (e.g., approves an invalid invoice). Human corrects it. Agent has no way to learn.

**Fix**: Log corrections. Use them to improve prompts or tool constraints. Audit trail is essential.

---

## See Also

- `/references/scheduling-cookbook.md` — Temporal, Trigger.dev, Inngest setups for proactive agents
- `/references/state-management.md` — Workflow state, checkpointing, resumption patterns
- `/references/notifications.md` — Email, webhook, in-app notification patterns
- `/disciplines/orchestration.md` — Scheduling, queues, and event streams
