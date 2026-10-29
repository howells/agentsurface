# Error Handling

## Summary

Dimension 6 scores error information sufficiency for agent recovery. Agents need three things: (1) identification of transient vs. terminal errors (is_retriable), (2) actionable next steps (suggestions, recovery hints), (3) trace context (trace_id, doc_uri) for debugging. Baseline is RFC 9457 Problem Details JSON everywhere. Frontier includes domain-specific codes, CLI semantic exit codes (0–5), intent tracing on cancellation, and rate-limit headers on all responses (not just 429). Errors are feedback loops enabling agent autonomy.

- **0**: Generic HTTP status codes, opaque error bodies (blocker)
- **1**: Some structured errors, inconsistent schema across routes
- **2**: RFC 9457 Problem Details, is_retriable, suggestions, trace_id
- **3**: doc_uri, domain-specific codes, semantic CLI exit codes, rate-limit headers always
- **Evidence**: application/problem+json grep, is_retriable fields, trace correlation, Retry-After headers

---

Errors are the agent's feedback loop. If they're opaque, the agent can't recover; if they're structured, it can retry, degrade, or escalate. Agents need three things: (1) enough information to decide if an error is transient or terminal, (2) actionable next steps, and (3) trace context to correlate with logs.

## Scoring rubric

| Score | Criteria                                                                                                                                                                                                                                                                                                                                   | Detection                                                                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Generic HTTP status codes only. No structured error body. "400 Bad Request" with no detail.                                                                                                                                                                                                                                                | Error responses return plain text or empty bodies. No consistent error schema.                                                                                                                                                          |
| 1     | Some structured errors but inconsistent. Some endpoints return JSON errors, others don't. Error shape varies across routes.                                                                                                                                                                                                                | Partial error schema (some endpoints have type/message, others don't). No is_retriable field. grep finds error responses without `type` or `status` on >30% of routes.                                                                  |
| 2     | RFC 9457 Problem Details everywhere. `type`, `title`, `status`, `detail`, `instance` fields present. `is_retriable` boolean. `suggestions` array. `trace_id` for debugging. Rate-limit 429 includes `Retry-After`.                                                                                                                         | Grep finds `application/problem+json` or consistent envelope. All error routes return shape with type/status/detail. `is_retriable` on error responses. Suggestions or recovery_hint populated. Trace ID correlates with observability. |
| 3     | Full agent error design. `doc_uri` linking to RFC 9457 docs. Intent tracing on cancellation. Domain-specific error codes. Rate-limit headers (`X-RateLimit-*` or the IETF `RateLimit` fields) on every response (not just 429). CLI errors emit JSON to stderr with semantic exit codes. Tool errors return errors as output (not thrown). | `doc_uri` in error responses. Intent trace structure on abort/cancel. Rate limit headers on all responses. CLI produces `{ type, status, detail, trace_id }` JSON. MCP tools use `isError: true` convention.                            |

## Evidence to gather

**Grep for structural signals:**

- `ProblemDetails` (TypeScript type/interface)
- `application/problem+json` (Content-Type)
- `is_retriable`, `retriable` (boolean field)
- `doc_uri`, `documentation_url` (link field)
- `trace_id`, `traceId`, `requestId` (correlation)
- `Retry-After` (header on 429/503)
- `Idempotency-Key` (header support on POST/PATCH/DELETE)
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (headers)

**Locate error handlers:**

- Next.js: `app/error.tsx`, `app/api/[...]/route.ts` error boundary, `middleware.ts`
- Express: app.use((err, req, res, next)) error middleware stack order
- Fastify: setErrorHandler registration
- FastAPI: @app.exception_handler(Exception)
- CLI (Node): process.stderr, process.exitCode, yargs/commander error handlers

**Consistency checks:**

- Do all routes return the same envelope shape, or do some return `{ error: "..." }` and others `{ message: "..." }`?
- Are all 4xx/5xx responses structured, or only some?
- Is rate limiting signalled only on 429, or on every response?

## Deep dive

### RFC 9457 Problem Details

**Canonical:** [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) (July 2023; obsoletes RFC 7807 from March 2016)

**Media type:** `application/problem+json` (or `application/problem+xml` for XML responses)

**Core fields (required or recommended):**

- `type` (string, URI reference) - Stable identifier for the error class. e.g. `https://api.example.com/errors/validation-error`. If omitted, consumers assume `about:blank`.
- `title` (string) - Short, human-readable summary. e.g. "Validation Failed"
- `status` (integer) - HTTP status code mirrored in the body. Allows agents to reason about the error without parsing headers.
- `detail` (string) - Instance-specific explanation. e.g. "Field 'email' is not a valid RFC 5322 address"
- `instance` (string, URI reference) - Unique identifier for this occurrence. Typically a trace ID or request ID. Allows correlation with server logs.

**Example (RFC 9457):**

```json
{
  "type": "https://example.com/errors/out-of-credit",
  "title": "You do not have enough credit.",
  "status": 403,
  "detail": "Your account balance is 30, but that transaction costs 50.",
  "instance": "/account/12345/msgs/abc"
}
```

The `type` URI should resolve to human-readable documentation explaining the error, recovery steps, and status codes that may co-occur.

### Agent-oriented extensions (recommended additions to RFC 9457)

Build on the standard with these fields:

- `code` (string) - Machine-readable domain code. e.g. "ERR_VALIDATION", "ERR_RATE_LIMITED", "ERR_AUTH_EXPIRED". Shorter than a type URI; useful for switch statements.
- `is_retriable` (boolean) - True if retrying the same request unchanged might succeed (rate limit, temporary outage, a conflicting operation still in flight). False for terminal errors where the request itself is wrong (invalid input, not found, unauthorized). The explicit flag overrides any status-code heuristic, and retrying a mutation also needs an idempotency guarantee.
- `retry_after_ms` (number) - Wait N milliseconds before retry. The body equivalent of the `Retry-After` header, preferred for parsing consistency.
- `suggestions` (array of strings) - Human-readable recovery steps. e.g. ["Check the email format", "Wait 60 seconds and retry"]
- `recovery_hint` (string) - Primary action to recover. e.g. "Increase your API quota" or "Re-authenticate with a new token"
- `doc_uri` (string, URL) - Link to detailed error documentation, troubleshooting, and examples.
- `trace_id` (string) - Correlation ID matching server logs and observability spans. Should match `X-Request-ID` or OpenTelemetry `trace_id`.
- `fields` (array) - For validation errors only. Array of `{ path: "fieldName", rule: "maxLength", message: "..." }`. Lets agents fix form fields programmatically.
- `errors` (array) - Nested Problem Details for batch operations (an extension; RFC 9457 itself shows an `errors` member only as an example). Field-level validation errors go in `fields`, not here.

**TypeScript schema (Zod):**

```typescript
import { z } from "zod";

const ProblemDetails = z.object({
  type: z.string().url().optional().default("about:blank"),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string(),
  instance: z.string().optional(),
  code: z.string().optional(),
  is_retriable: z.boolean().optional(),
  retry_after_ms: z.number().int().positive().optional(),
  suggestions: z.array(z.string()).optional(),
  recovery_hint: z.string().optional(),
  doc_uri: z.string().url().optional(),
  trace_id: z.string().optional(),
  fields: z
    .array(
      z.object({
        path: z.string(),
        rule: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
  // Zod 4 recursive schema: a getter keeps z.infer working under strict TypeScript
  get errors() {
    return z.array(ProblemDetails).optional();
  },
});

type ErrorResponse = z.infer<typeof ProblemDetails>;
```

### Intent tracing on cancellation

When an agent cancels a request in-flight (e.g., user hits Ctrl-C, multi-step operation aborts, timeout fires), include context so the agent can reason about what was pending:

```json
{
  "type": "https://api.example.com/errors/operation-cancelled",
  "title": "Operation Cancelled",
  "status": 408,
  "detail": "Request aborted by client after 5000ms",
  "instance": "req-abc123",
  "trace_id": "span-xyz789",
  "intent": {
    "operation": "create_invoice",
    "resource_id": "inv-pending-123",
    "state_before_cancel": "payment_processing",
    "recovery": "Operation may be in progress server-side. Poll GET /invoices/inv-pending-123 to check status."
  }
}
```

### Idempotency keys

Naturally idempotent operations (GET, PUT, DELETE by method definition, RFC 9110) can be repeated safely without a key store. To make retries of non-idempotent effects such as POST safe, the server must deduplicate: use the `Idempotency-Key` header (draft-ietf-httpapi-idempotency-key-header-08, still a draft; see also [Stripe's implementation](https://docs.stripe.com/api/idempotent_requests)):

**Client sends:**

```http
POST /api/payments HTTP/1.1
Idempotency-Key: "8e03978e-40d5-43e8-bc93-6894a57f9324"
Content-Type: application/json

{ "amount": 100, "currency": "USD" }
```

The value is a quoted Structured Field String; document whether you also accept the legacy unquoted form.

**Server contract** (deduplicate within a published window, 24h typical):

- Authorise the caller first, then namespace the key by principal and operation.
- Reserve the key atomically before doing any work, and fingerprint the request body.
- First request: process it and store the outcome, including the original status and headers.
- Same key and same body after completion: replay the stored response with its original status (not always 200).
- Same key while the first request is still in flight: `409 Conflict`.
- Same key with a different body: `422 Unprocessable Content`.

This needs a route-handler wrapper with a shared atomic store (such as Redis `SET NX`), not request middleware that can only short-circuit. The Agent Surface template [`templates/errors-and-auth/idempotency-middleware.ts`](https://github.com/howells/agentsurface/blob/main/templates/errors-and-auth/idempotency-middleware.ts) implements this contract with a renewed, fenced in-flight lease, and records a thrown error as an outcome-unknown result rather than releasing the key. Handlers that know a request had no effect can release the key explicitly. Still check that its retention window and release rules match your endpoint's guarantees.

### Retry policy (client side)

- Retry when `is_retriable` is true, or when it is absent and the status is 429 or 5xx; an explicit `is_retriable: false` wins over any status. Retry a mutation only when it carries an idempotency key, generated once per logical operation and reused on every attempt.
- Exponential backoff with jitter (`base * 2^attempt + random(0, base)`), capped at 60 seconds, and honour `Retry-After` or `retry_after_ms` when present.
- A retry budget per operation and a circuit breaker after consecutive failures, so many agents do not stampede a recovering service.
- When the budget runs out, check a machine-readable status endpoint (linked from the API catalog) before escalating, to tell an outage from a broken integration.
- After a timeout or outcome-unknown error on a mutation, check the resource's state (or replay with the same key) before sending a new operation.
- Distinguish an automatic retry (same request, same key) from correcting the request after a non-retriable error, which is a new operation with a new key.

Canonical: `/docs/error-handling/retry-patterns`.

### Rate limiting

Emit rate-limit headers on every response - not just 429s - so agents see remaining quota before they exhaust it. `X-RateLimit-*` is a widespread but unstandardised convention; the IETF `RateLimit` and `RateLimit-Policy` fields (draft-ietf-httpapi-ratelimit-headers, still a draft) are its emerging replacement, so consider sending both:

**On every HTTP response:**

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1681234567
Content-Type: application/json

{ "data": [...] }
```

**On 429 Too Many Requests:**

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1681234567
Retry-After: 60
Content-Type: application/problem+json

{
  "type": "https://example.com/errors/rate-limited",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded your 1000 requests-per-minute quota.",
  "is_retriable": true,
  "retry_after_ms": 60000,
  "recovery_hint": "Wait 60 seconds or upgrade your plan."
}
```

`Retry-After` can be seconds (integer) or an HTTP date. Prefer integer seconds for parsing simplicity.

### CLI errors

CLIs must emit errors as structured JSON to stderr so parent scripts/agents can parse them:

**stderr (structured JSON; stdout carries data only, and the command exits non-zero):**

```json
{
  "type": "error:connection_timeout",
  "status": 503,
  "title": "Connection Timeout",
  "detail": "Failed to connect to db.example.com:5432 after 30s",
  "trace_id": "cli-run-abc123",
  "is_retriable": true,
  "retry_after_ms": 5000
}
```

**Semantic exit codes** (the 0-5 contract from `cli-design.md`; publish whichever contract your CLI uses):

- `0` - Success
- `1` - Failure (unexpected error)
- `2` - Usage error (invalid flags or arguments)
- `3` - Not found
- `4` - Permission denied
- `5` - Conflict

### MCP tool errors

MCP tools should return recoverable execution errors as tool output with `isError: true` rather than throwing, so the model sees the error and can recover. Protocol errors (unknown tool, malformed request) are still JSON-RPC errors; see below:

**Wrong (throws; agent loses context):**

```typescript
const myTool = tool('fetch_data', 'Get data', schema, async (input) => {
  if (!input.id) throw new Error('ID required');
  return { data: [...] };
});
```

**Right (returns structured error):**

```typescript
const myTool = tool('fetch_data', 'Get data', schema, async (input) => {
  if (!input.id) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            type: 'https://example.com/errors/validation',
            title: 'Validation Error',
            status: 400,
            detail: 'Field "id" is required',
            is_retriable: false,
          }),
        },
      ],
    };
  }
  return { content: [{ type: 'text', text: JSON.stringify({ data: [...] }) }] };
});
```

The agent can then read the error, extract `is_retriable`, and decide whether to retry or escalate.

#### Protocol-level JSON-RPC codes

Tool-level failures use `isError: true`. Protocol-level failures use JSON-RPC error codes, and the current MCP 2026-07-28 revision changes how those codes are allocated:

- **Resource not found moves from `-32002` to `-32602`**, aligning with the JSON-RPC "invalid params" code. Clients written against 2025-11-25 should tolerate both during the transition.
- **A formal allocation policy** now splits the range: `-32000` to `-32019` is implementation-defined (existing uses are grandfathered), and `-32020` to `-32099` is reserved for the specification. Do not invent codes inside the reserved band.
- **Existing spec codes were renumbered** into the reserved band: `HeaderMismatch` `-32001` → `-32020`, `MissingRequiredClientCapability` `-32003` → `-32021`, `UnsupportedProtocolVersion` `-32004` → `-32022`.

If you define custom protocol errors, keep them in `-32000`..`-32019` and document each one alongside your tool catalogue.

### Tool-call errors (Agents SDK / Vercel AI SDK / LangGraph)

Prefer returning errors as structured tool output so the model can reason about recovery (12-factor agents Factor #9: "Compact errors into context"). What a thrown exception does depends on the SDK: the AI SDK turns an `execute` exception into a tool-error part the model sees on the next step, and the OpenAI Agents SDK passes it through a configurable `errorFunction`. Choose the SDK's mechanism deliberately instead of assuming a throw aborts the loop.

**Vercel AI SDK pattern:**

```typescript
import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";

const result = await generateText({
  model: openai("gpt-6.1-terra"),
  // Without more than one step, the model never sees the tool result to recover from it
  stopWhen: stepCountIs(3),
  tools: {
    fetch_data: tool({
      description: "Fetch data",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        // A plain result object the model reads; this `error` shape is the app's own
        // convention, not an AI SDK error marker (a thrown error becomes a tool-error part).
        const record = await findRecord(id);
        if (!record) {
          return {
            error: {
              type: "https://example.com/errors/not-found",
              detail: `No record ${id}`,
              is_retriable: false,
              suggestions: ["Call search_records to find a valid ID"],
            },
          };
        }
        return { data: record };
      },
    }),
  },
  prompt: "Fetch the user data.",
});

// On the next step the model sees the error and can retry or fall back
```

## Cross-vendor notes

**Claude Agent SDK:**

- MCP and SDK tool errors are returned as `{ isError: true, content: [...] }`. Include ProblemDetails JSON in the content string. The model reads it and decides what to do; no SDK retries automatically on a custom `is_retriable` field, so any automatic retry policy is the application's own.

**OpenAI Agents SDK (TypeScript):**

- Return expected failures as tool result JSON. Exceptions thrown by a tool go through the tool's `errorFunction` (which by default reports the error to the model, and can be set to rethrow). Strict schemas are a separate setting.

**Google Gemini ADK:**

- `FunctionResponse` must include error details in the `response` body. Preserve `thoughtSignature` in subsequent tool calls to maintain reasoning context.

**MCP (Model Context Protocol):**

- Tool execution errors return `{ isError: true, content: [{ type: 'text', text: '...' }] }`; protocol errors (unknown tool, invalid request) use JSON-RPC errors. Log the JSON-RPC request ID alongside the trace ID so the two can be mapped; they are different identifiers.

## Anti-patterns

- **Plain text `{ error: "something went wrong" }`** - No `type`, `is_retriable`, or recovery hints. Agent cannot reason about whether to retry.
- **500s for user errors** - 400/422 for validation, 401 for auth, 403 for permission, 404 for not found. Reserve 5xx for server faults.
- **Inconsistent error shape** - Some endpoints return `{ message: "..." }`, others `{ error: "..." }`. Agent must parse every variant.
- **Missing Retry-After on 429** - Agent cannot know how long to wait; may retry immediately and worsen congestion.
- **Throwing inside tool handlers** - Aborts the agent loop. Return errors as output instead.
- **Exposing stack traces to clients** - Leaks internals. Use `trace_id` to let clients correlate with server logs.
- **Wrapping HTTP Problem Details in an envelope** - RFC 9457 bodies are flat: `type`, `status`, `detail` at the root, not under `error`. (A CLI's JSON envelope may use an `error` key; keep it consistent with its documented contract.)
- **No correlation ID** - Without a `trace_id` (or an `instance` URI reference identifying the occurrence) the error cannot be matched to server logs. RFC 9457 makes `instance` optional; this skill's profile requires a correlation ID of some kind.

## Templates and tooling

### /templates/errors-and-auth/problem-details.ts

Zod schema for RFC 9457 + agent extensions. Drop-in schema for API responses and CLI errors.

### /templates/errors-and-auth/next-error-handler.ts

Next.js App Router error boundary and API error middleware wrapper. Catches thrown errors, formats to RFC 9457, includes trace ID from `X-Request-ID`.

### /templates/errors-and-auth/fastify-error-plugin.ts

Fastify plugin that wraps all route handlers, catches errors and returns RFC 9457 JSON, keeping the error's own status code or falling back to 500.

### /templates/errors-and-auth/mcp-tool-error.ts

MCP tool wrapper that catches sync/async errors and returns `{ isError: true, content: [...] }` with ProblemDetails JSON payload.

### /templates/errors-and-auth/idempotency-middleware.ts

Route wrapper that deduplicates POST/PATCH via the Idempotency-Key header (Redis): an atomic, renewed in-flight lease with fenced completion, request fingerprinting, every outcome recorded (a thrown error as outcome-unknown), an explicit release for requests that certainly had no effect, and byte-exact replay of status, headers and body.

### /templates/errors-and-auth/rate-limit-headers.ts

Parse `RateLimit-*` and `Retry-After` headers (delta-seconds and HTTP-date), compute wait times, emit `RateLimit-*` headers server-side, and produce structured `{ retryable, waitMs, reason }` retry guidance an agent can act on.

**Libraries (TypeScript/JavaScript):**

- `@hapi/boom` - HTTP-friendly error factory
- `http-problem-details` - RFC 9457 helpers
- `zod` - Schema validation and type inference
- `ts-rest` - OpenAPI + type-safe endpoints with integrated error handling

**Python:** `python-json-logger`, `pydantic` with error schemas

## Citations

- [RFC 9457 Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html) - Canonical spec, obsoletes RFC 7807
- [Anthropic: Writing Tools for Agents](https://www.anthropic.com/research/writing-tools-for-agents) - actionable, token-efficient error responses
- [12-factor agents](https://github.com/humanlayer/12-factor-agents) - Factor #9 (errors) and tracing patterns
- [MCP 2026-07-28 specification](https://modelcontextprotocol.io/specification/2026-07-28/) - current error-code allocation policy
- [Stripe API Error Handling](https://stripe.com/docs/api/errors) - Industry-standard error shape and Idempotency-Key
- [OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) - trace_id and correlation

## See also

- [docs/error-handling](/docs/error-handling) - Detailed error handling guide
- [references/tool-design.md](/references/tool-design.md) - Tool-call error patterns
- [references/api-surface.md](/references/api-surface.md) - Error schemas per operation
- [templates/errors-and-auth/problem-details.ts](/templates/errors-and-auth/problem-details.ts) - Zod schema
- [templates/errors-and-auth/next-error-handler.ts](/templates/errors-and-auth/next-error-handler.ts) - Next.js integration
