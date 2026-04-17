# Agentic Patterns

## Summary

This document indexes the 10 most transferable agentic patterns: recurring, proven solutions to common problems in agent design. Each pattern is a way of thinking—a recipe that works across domains. Use this as your menu when designing agents; each pattern has a one-sentence rationale and links to examples and deeper docs.

---

## The 10 Patterns

### 1. **Tool Composition**
*Chain simpler tools into more complex behaviors; let the agent orchestrate.*

An agent with 5 focused tools (create_invoice, get_customer, validate_vat, send_email, log_event) can compose them into higher-order workflows (approve_invoice_batch, reconcile_account, audit_trail) without adding new tools. The agent does the reasoning; tools do the work.

**When to use**: When tools have clear input/output contracts and errors are recoverable.

**See also**: `/disciplines/tool-design.md`, `/references/tool-cookbook.md`

---

### 2. **Reflection and Self-Correction**
*Ask the agent to review its own work before committing.*

After composing a draft (e.g., invoice text), prompt the agent to review: "Does this invoice match the customer's account? Are the dates sensible? Could this confuse the customer?" The agent often catches mistakes it made in the first pass.

**When to use**: High-stakes tasks (financial, legal, compliance) where errors are costly.

**Pattern**:
```
1. Agent reasons and drafts result
2. Tool: review_draft(draft, constraints) → { approved: bool, issues: [] }
3. If not approved, agent refines and re-submits
```

**See also**: `/cookbook/reflection-pattern.md`

---

### 3. **Hierarchical Decomposition**
*Break large goals into sub-goals; assign each to an agent or tool.*

Goal: "Reconcile Q1 accounts." Agent breaks into:
- "Pull transactions for Jan–Mar"
- "Match transactions to invoices"
- "Calculate discrepancies"
- "Report results"

Each sub-goal is a focused task, easier to reason about and measure.

**When to use**: Long-running workflows (>5 minutes) or complex domains with multiple stages.

**See also**: `/disciplines/orchestration.md`, `/cookbook/goal-decomposition.md`

---

### 4. **Few-Shot Prompting via Tool Traces**
*Show the agent examples of how tools should be called.*

Instead of describing tools in prose, show traces:
```
Goal: "Categorize this transaction"
Example 1:
  Input: { amount: 50, description: "Starbucks" }
  Tool call: categorize_transaction(category: "Meals", confidence: 0.95)
  Result: { category: "Meals", tax_deductible: true }
Example 2:
  Input: { amount: 500, description: "Rent" }
  Tool call: categorize_transaction(category: "Office", confidence: 0.99)
  Result: { category: "Office", tax_deductible: false }
```

Models learn from examples better than from descriptions.

**When to use**: Whenever tool calls are complex or non-obvious.

**See also**: `/references/prompt-engineering.md`, `/cookbook/few-shot-examples.md`

---

### 5. **Constraint-Driven Reasoning**
*Encode hard constraints (budget limits, compliance rules) in tools, not prompts.*

Don't prompt: "Don't exceed the user's budget." Instead:
```typescript
const createInvoiceSchema = z.object({
  amount: z.number().min(0.01).max(userBudget), // Constraint built-in
});
```

The tool enforces the constraint; the agent never violates it (or gets a clear error).

**When to use**: Any domain with legal or financial rules.

**See also**: `/disciplines/tool-design.md#explicit-parameter-constraints`, `/references/safety.md`

---

### 6. **Error Recovery Loops**
*When a tool fails, give the agent a chance to recover before giving up.*

```
1. Try tool A (create_invoice)
2. If error "duplicate_invoice":
   - Tool B (get_existing_invoice) to fetch the duplicate
   - Agent decides: use existing or request human override
3. If error "invalid_date":
   - Prompt agent to re-examine input and try again
4. If error "rate_limited":
   - Tool C (enqueue_for_later) to defer the task
```

Each error type has a recovery path. Only unrecoverable errors escalate.

**When to use**: Integrations with external systems, unreliable tools, or high-stakes tasks.

**See also**: `/references/error-handling.md`, `/cookbook/resilience-patterns.md`

---

### 7. **Retrieval-Augmented Generation (RAG)**
*Ground agent reasoning in external data (documents, database queries, real-time APIs).*

Agent goal: "Should we approve this loan?" Tool: retrieve_customer_credit_history(customer_id). Agent reasons over the retrieved history, not just general knowledge.

**When to use**: Any task requiring current or domain-specific data.

**See also**: `/disciplines/retrievability.md`, `/references/retrieval-cookbook.md`

---

### 8. **Multi-Turn Dialogue with Context Accumulation**
*Keep a conversation history; agent refines its understanding across turns.*

User: "I had $5000 last month. Now I have $3000. What happened?"
Agent (turn 1): Retrieves transactions, says "Transferred $2000 to savings."
User (turn 2): "No, that's not it. I didn't do a transfer."
Agent (turn 2): Sees the contradiction, re-queries, finds "Unexpected withdrawal $2000." Asks for clarification.

Context (user corrections) accumulates; agent adapts.

**When to use**: Interactive assistants, helpdesk agents, exploratory analysis.

**See also**: `/cookbook/conversation-management.md`, `/references/context-windows.md`

---

### 9. **Agentic Loops with Tool Telemetry**
*Instrument every tool call; measure what the agent is doing.*

Log:
```json
{
  "timestamp": "2026-04-17T12:34:56Z",
  "agent_id": "reconciler_v2",
  "goal": "reconcile_april",
  "tool": "retrieve_transactions",
  "params": { "month": "2026-04" },
  "duration_ms": 250,
  "result_count": 324,
  "success": true
}
```

Over time, you see: which tools are called most often, which are slow, which fail frequently, which add value.

**When to use**: Always. Observability is non-negotiable.

**See also**: `/references/observability.md`, `/references/logging.md`

---

### 10. **Staged Reasoning with Confidence Thresholds**
*Ask the agent to express confidence; only act on high-confidence decisions.*

```
1. Agent analyzes transaction, outputs: { category: "Office", confidence: 0.72 }
2. If confidence >= 0.9: Auto-approve
3. If 0.5 < confidence < 0.9: Queue for human review
4. If confidence <= 0.5: Ask agent for alternative explanations
```

Confidence gates determine routing. High-confidence outputs bypass humans; low-confidence escalate.

**When to use**: Any task with human-in-the-loop possibilities (approval workflows, QA).

**See also**: `/cookbook/confidence-routing.md`, `/references/uncertainty.md`

---

## Cross-Pattern Insights

**Composition is the foundation**: Patterns 1, 2, 3 are about breaking down complexity. Master these first.

**Grounding is the guardrail**: Patterns 5, 7, 10 ground reasoning in constraints, data, and uncertainty. They prevent hallucination and overconfidence.

**Resilience is often implicit**: Patterns 6, 8, 9 build robustness via recovery, context, and observation.

**Typical agent architecture**:
```
Input → Decompose (Pattern 3)
      → Compose tools (Pattern 1)
      → Retrieve external data (Pattern 7)
      → Reason with few-shot examples (Pattern 4)
      → Enforce constraints (Pattern 5)
      → Recover from errors (Pattern 6)
      → Express confidence (Pattern 10)
      → Reflect and refine (Pattern 2)
      → Accumulate context (Pattern 8)
      → Log telemetry (Pattern 9)
      → Output
```

Not every agent uses all patterns; choose the subset that fits your domain.

---

## See Also

- `/disciplines/` — Deep dives on foundational topics (tool design, orchestration, evaluation, retrievability, proactive agents)
- `/cookbook/` — Step-by-step recipes for each pattern
- `/templates/` — Copy-paste starting points for common agent types
- `AGENTS.md` (root) — Formal specification for tools and agents
