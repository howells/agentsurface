# Tool Design

## Summary

Agent-grade tools are not API endpoints; they are cognitive interfaces designed for autonomous reasoning. A well-designed tool exposes the *atomic actions* that an agent can take to achieve goals, with clear input contracts, predictable outputs, and explicit error modes. Tools should be simple enough to compose, powerful enough to be useful, and well-documented enough that an agent can infer intent from signature and description alone.

- **Atomicity**: Each tool does one thing; composition (chains, loops) is the agent's job
- **Clarity**: Signature, description, and error modes must be understandable at a glance
- **Observability**: Every invocation—success or failure—must be loggable and debuggable
- **Versioning**: Tools evolve; breaking changes require migration strategies
- **Grounding**: Connect tools to real-world semantics (e.g., "create invoice" not "POST /v1/invoices")

---

## Core Principle

> A tool is a lever, not a doorbell. It must move weight predictably.

An agent that misunderstands a tool's purpose or misapplies its parameters will produce nonsense or worse—unintended consequences. A tool's design is therefore a contract: if the agent follows the specification, the outcome is deterministic and safe.

---

## Principles

### 1. Atomic Intent, Not Generic Endpoints

A tool should map to a *user intent*, not a REST method.

**Bad**: `httpRequest(method, url, body)` — This requires the agent to build HTTP calls correctly; errors are legion.

**Good**: `invoiceCreate(customerId, amount, dueDate, notes?)` — Intent is clear, parameters are validated, error cases are explicit.

**Rationale**: Agents reason by intent, not by HTTP verbs. Each tool should be a complete, self-contained action that the agent can safely invoke without side reasoning.

### 2. Explicit Parameter Constraints

Every parameter should declare:
- **Type**: `string | number | enum`
- **Required vs. optional**: Use nullability or explicit optional markers
- **Range/length/format**: Constraints that prevent invalid states (e.g., `amount > 0`, `email matches RFC 5322`)
- **Default behavior**: If omitted, what happens? Is it an error or a sensible default?

**Pattern**: Use Zod schemas (or similar validation libraries) at the tool's entry point. Let the agent know what will be rejected before it tries.

```typescript
const invoiceCreateSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
  notes: z.string().max(500).optional(),
});
```

The agent sees the schema and knows exactly what is required, what is optional, and what formats are valid.

### 3. Deterministic Error Handling

Tools must fail gracefully and predictably.

- Return structured error objects with a `code` field (e.g., `CUSTOMER_NOT_FOUND`, `INSUFFICIENT_FUNDS`)
- Include actionable context (e.g., which customer ID was not found)
- Distinguish between *recoverable* errors (retry-safe) and *fatal* errors (agent should abandon this path)

**Example**:
```typescript
type ToolResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; retryable: boolean } }
```

This pattern ensures the agent can branch on error type and decide whether to retry, escalate, or try an alternative approach.

### 4. Tool Composition Through Outputs

A tool's output should be consumable by downstream tools.

- Return data in a consistent, normalized format (e.g., always a `{ id, ...fields }` shape for entities)
- Include reference IDs (e.g., `customerId`, `invoiceId`) so the agent can chain tools without parsing
- Avoid embedding irrelevant context; be terse

**Principle**: Output is the next tool's input. Design for chaining.

### 5. Observable Execution

Every tool invocation should produce a log entry with:
- Input parameters (sanitized for secrets)
- Execution duration
- Success/failure status
- Result summary (or full result if <1KB)

This allows you to:
- Debug agent reasoning ("why did it call this tool with these params?")
- Measure tool performance (slow tool → optimize or decompose)
- Audit access patterns (for security and compliance)

---

## Anti-Patterns

### 1. "God Tools"
A single tool that does everything (e.g., `transactionProcess` handles matching, categorization, and reconciliation). Agents will struggle to reason about side effects and error modes.

**Fix**: Break into `transactionMatch`, `transactionCategorize`, `transactionReconcile`. Let the agent compose.

### 2. Implicit State or Side Effects
A tool that modifies global state or depends on undocumented context (e.g., "if this is the 5th call, behavior changes").

**Fix**: All state must be passed as parameters or returned explicitly. Tools are functions, not stateful objects.

### 3. Vague Error Messages
```typescript
{ success: false, error: "Something went wrong" }
```

The agent learns nothing; it cannot recover or escalate meaningfully.

**Fix**: Be specific. `{ code: "DUPLICATE_INVOICE", customerId: "cust_123", existingInvoiceId: "inv_456" }`

### 4. Unbounded Outputs
A tool that returns the entire customer record when the agent only needs the ID.

**Fix**: Return minimal, relevant data. If the agent needs more, let it ask for it explicitly via a separate tool.

### 5. Undersigned Tools
No description, no schema, no examples.

**Fix**: Every tool must have:
- One-sentence purpose
- Full parameter documentation (types, constraints, examples)
- At least one success and one failure example
- A note about idempotency (if applicable)

---

## See Also

- `/references/tool-cookbook.md` — 20+ patterns for common agent tasks
- `/references/safety.md` — Tool design for high-stakes domains (finance, healthcare)
- `/cookbook/agent-loops.md` — How tools are orchestrated within agent loops
- AGENTS.md specification (root) — Formal tool schema
