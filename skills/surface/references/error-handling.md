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

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | Generic HTTP status codes only. No structured error body. "400 Bad Request" with no detail. | Error responses return plain text or empty bodies. No consistent error schema. |
| 1 | Some structured errors but inconsistent. Some endpoints return JSON errors, others don't. Error shape varies across routes. | Partial error schema (some endpoints have type/message, others don't). No is_retriable field. grep finds error responses without `type` or `status` on >30% of routes. |
| 2 | RFC 9457 Problem Details everywhere. `type`, `title`, `status`, `detail`, `instance` fields present. `is_retriable` boolean. `suggestions` array. `trace_id` for debugging. Rate-limit 429 includes `Retry-After`. | Grep finds `application/problem+json` or consistent envelope. All error routes return shape with type/status/detail. `is_retriable` on error responses. Suggestions or recovery_hint populated. Trace ID correlates with observability. |
| 3 | Full agent error design. `doc_uri` linking to RFC 9457 docs. Intent tracing on cancellation. Domain-specific error codes. `X-RateLimit-*` headers on every response (not just 429). CLI errors emit JSON to stderr with semantic exit codes. Tool errors return errors as output (not thrown). | `doc_uri` in error responses. Intent trace structure on abort/cancel. Rate limit headers on all responses. CLI produces `{ type, status, detail, trace_id }` JSON. MCP tools use `isError: true` convention. |

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

**Canonical:** [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) (March 2024; obsoletes RFC 7807 from April 2015)

**Media type:** `application/problem+json` (or `application/problem+xml` for XML responses)

**Core fields (required or recommended):**
- `type` (string, URI reference) — Stable identifier for the error class. e.g. `https://api.example.com/errors/validation-error`. If omitted, consumers assume `about:blank`.
- `title` (string) — Short, human-readable summary. e.g. "Validation Failed"
- `status` (integer) — HTTP status code mirrored in the body. Allows agents to reason about the error without parsing headers.
- `detail` (string) — Instance-specific explanation. e.g. "Field 'email' is not a valid RFC 5322 address"
- `instance` (string, URI reference) — Unique identifier for this occurrence. Typically a trace ID or request ID. Allows correlation with server logs.

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

- `code` (string) — Machine-readable domain code. e.g. "ERR_VALIDATION", "ERR_RATE_LIMITED", "ERR_AUTH_EXPIRED". Shorter than a type URI; useful for switch statements.
- `is_retriable` (boolean) — True if the agent should retry the request (transient error: network, rate limit, 5xx). False for terminal errors (invalid input, not found, unauthorized).
- `retry_after_seconds` (number) — Wait N seconds before retry. Preferred over Retry-After header for parsing consistency.
- `suggestions` (array of strings) — Human-readable recovery steps. e.g. ["Check the email format", "Wait 60 seconds and retry"]
- `recovery_hint` (string) — Primary action to recover. e.g. "Increase your API quota" or "Re-authenticate with a new token"
- `doc_uri` (string, URL) — Link to detailed error documentation, troubleshooting, and examples.
- `trace_id` (string) — Correlation ID matching server logs and observability spans. Should match `X-Request-ID` or OpenTelemetry `trace_id`.
- `fields` (array) — For validation errors only. Array of `{ path: "fieldName", rule: "maxLength", message: "..." }`. Lets agents fix form fields programmatically.
- `errors` (array) — RFC 9457 supports aggregating multiple errors. Useful for batch operations or multi-field validation.

**TypeScript schema (Zod):**
```typescript
import { z } from 'zod';

const ProblemDetails = z.object({
  type: z.string().url().optional().default('about:blank'),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string(),
  instance: z.string().optional(),
  code: z.string().optional(),
  is_retriable: z.boolean().optional(),
  retry_after_seconds: z.number().optional(),
  suggestions: z.array(z.string()).optional(),
  recovery_hint: z.string().optional(),
  doc_uri: z.string().url().optional(),
  trace_id: z.string().optional(),
  fields: z.array(z.object({
    path: z.string(),
    rule: z.string(),
    message: z.string(),
  })).optional(),
  errors: z.array(z.lazy(() => ProblemDetails)).optional(),
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

Safe idempotent retries require server deduplication. Use the `Idempotency-Key` header ([Stripe pattern](https://stripe.com/docs/api/idempotent_requests)):

**Client sends:**
```http
POST /api/payments HTTP/1.1
Idempotency-Key: my-unique-txn-id-12345
Content-Type: application/json

{ "amount": 100, "currency": "USD" }
```

**Server deduplicates within a window (24h typical):**
- First request: processes, stores result (amount, customer, timestamp)
- Duplicate request (same Idempotency-Key): returns cached result without re-processing

**TypeScript middleware (Next.js):**
```typescript
import { NextRequest, NextResponse } from 'next/server';

const idempotencyCache = new Map<string, { response: any; expiresAt: number }>();

export function middleware(req: NextRequest) {
  if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
    const key = req.headers.get('idempotency-key');
    if (!key) {
      return NextResponse.json(
        { type: 'https://example.com/errors/missing-idempotency-key', detail: 'Idempotency-Key header required' },
        { status: 400 }
      );
    }

    const cached = idempotencyCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.response, { status: 200, headers: { 'X-Idempotency-Cached': 'true' } });
    }
  }
  return NextResponse.next();
}
```

### Rate limiting

Always emit rate-limit headers on every response—not just 429s. This signals remaining quota to agents before they exhaust it:

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
  "retry_after_seconds": 60,
  "recovery_hint": "Wait 60 seconds or upgrade your plan."
}
```

`Retry-After` can be seconds (integer) or an HTTP date. Prefer integer seconds for parsing simplicity.

### CLI errors

CLIs must emit errors as structured JSON to stderr so parent scripts/agents can parse them:

**stderr (human-readable summary):**
```
Error: Connection timeout to database
```

**stdout (structured JSON):**
```json
{
  "type": "error:connection_timeout",
  "status": 503,
  "title": "Connection Timeout",
  "detail": "Failed to connect to db.example.com:5432 after 30s",
  "trace_id": "cli-run-abc123",
  "is_retriable": true,
  "retry_after_seconds": 5
}
```

**Semantic exit codes:**
- `0` — Success
- `1` — Generic error
- `2` — Misuse/invalid CLI arguments
- `64` — Not found (ERR_NOT_FOUND)
- `66` — Conflict (ERR_CONFLICT)
- `69` — Service unavailable (ERR_UNAVAILABLE)
- `77` — Permission denied (ERR_PERMISSION)

### MCP tool errors

MCP tools should return errors as tool output (not throw exceptions), preserving agent context:

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

### Tool-call errors (Agents SDK / Vercel AI SDK / LangGraph)

Prefer returning errors as tool output so the agent can reason about recovery. Throwing aborts the agent loop and loses context (12-factor agents Factor #9: "Compact errors into context").

**Vercel AI SDK pattern:**
```typescript
import { generateText } from 'ai';

const result = await generateText({
  model: openai('gpt-5.4'),
  tools: {
    fetch_data: tool({
      description: 'Fetch data',
      parameters: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        if (!id) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: JSON.stringify({ type: 'validation_error', detail: 'ID required' }),
              },
            ],
          };
        }
        return { data: [...] };
      },
    }),
  },
  prompt: 'Fetch the user data.',
});

// Agent sees the error and can retry/fallback
```

## Cross-vendor notes

**Anthropic Claude Code SDK:**
- Tool errors returned as `{ isError: true, content: [...] }`. Include ProblemDetails JSON in the content string. Agent examines the error and recurses if `is_retriable: true`.

**OpenAI Agents SDK (TypeScript):**
- Strict function calling. Errors returned as tool result JSON, never thrown. Agents parse the result and decide retry logic.

**Google Gemini ADK:**
- `FunctionResponse` must include error details in the `response` body. Preserve `thoughtSignature` in subsequent tool calls to maintain reasoning context.

**MCP (Model Context Protocol):**
- Tools return `{ isError: true, content: [{ type: 'text', text: '...' }] }`. Server errors should include trace IDs matching MCP request IDs. No exception throwing; all errors surface as tool outputs.

## Anti-patterns

- **Plain text `{ error: "something went wrong" }`** — No `type`, `is_retriable`, or recovery hints. Agent cannot reason about whether to retry.
- **500s for user errors** — 400/422 for validation, 401 for auth, 403 for permission, 404 for not found. Reserve 5xx for server faults.
- **Inconsistent error shape** — Some endpoints return `{ message: "..." }`, others `{ error: "..." }`. Agent must parse every variant.
- **Missing Retry-After on 429** — Agent cannot know how long to wait; may retry immediately and worsen congestion.
- **Throwing inside tool handlers** — Aborts the agent loop. Return errors as output instead.
- **Exposing stack traces to clients** — Leaks internals. Use `trace_id` to let clients correlate with server logs.
- **Using `error` as the envelope key** — Conflicts with JavaScript reserved semantics and JSON Schema `error` keyword. Use RFC 9457 flat structure: `type`, `status`, `detail` at root.
- **Missing `instance` (trace ID)** — Cannot correlate with server logs. Always include trace ID.

## Templates and tooling

### /templates/problem-details.ts
Zod schema for RFC 9457 + agent extensions. Drop-in schema for API responses and CLI errors.

### /templates/next-error-handler.ts
Next.js App Router error boundary and API error middleware wrapper. Catches thrown errors, formats to RFC 9457, includes trace ID from `X-Request-ID`.

### /templates/fastify-error-plugin.ts
Fastify plugin that wraps all route handlers, catches errors, returns RFC 9457 JSON with 500 → 503 mapping for retryable faults.

### /templates/mcp-tool-error.ts
MCP tool wrapper that catches sync/async errors and returns `{ isError: true, content: [...] }` with ProblemDetails JSON payload.

### /templates/idempotency-middleware.ts
Middleware for POST/PATCH/DELETE that deduplicates via Idempotency-Key header and in-memory cache (or Redis).

### /templates/rate-limit-headers.ts
Middleware that calculates and attaches `X-RateLimit-*` headers on every response based on token bucket or sliding window.

**Libraries (TypeScript/JavaScript):**
- `@hapi/boom` — HTTP-friendly error factory
- `http-problem-details` — RFC 9457 helpers
- `zod` — Schema validation and type inference
- `ts-rest` — OpenAPI + type-safe endpoints with integrated error handling

**Python:** `python-json-logger`, `pydantic` with error schemas

## Citations

- [RFC 9457 Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html) — Canonical spec, obsoletes RFC 7807
- [Anthropic: Writing Tools for Agents](https://www.anthropic.com/engineering/writing-tools-for-agents) — Factor #9: compact errors into context
- [12-factor agents](https://github.com/humanlayer/12-factor-agents) — Factor #9 (errors) and tracing patterns
- [MCP 2025-11-25 Specification](https://modelcontextprotocol.io/specification/2025-11-25) — `isError` convention for tool results
- [Stripe API Error Handling](https://stripe.com/docs/api/errors) — Industry-standard error shape and Idempotency-Key
- [OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) — trace_id and correlation

## See also

- [docs/error-handling](/docs/error-handling) — Detailed error handling guide
- [references/tool-design.md](/references/tool-design.md) — Tool-call error patterns
- [references/api-surface.md](/references/api-surface.md) — Error schemas per operation
- [templates/problem-details.ts](/templates/problem-details.ts) — Zod schema
- [templates/next-error-handler.ts](/templates/next-error-handler.ts) — Next.js integration
