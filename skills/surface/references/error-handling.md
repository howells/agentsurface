# Error Handling

Dimension 6: whether an error tells an agent if it can retry, what to change,
and how to match the error to server logs. Always applicable.

## Contents

- Rubric
- Evidence to gather
- The house profile (the Problem Details shape)
- Idempotency
- Client retry policy
- Rate limits
- CLI and tool errors
- Build
- Templates

## Rubric

- **0**: Bare status codes; plain-text or empty error bodies.
- **1**: Some routes return structured errors, others don't, or shapes vary
  (`{ error }` here, `{ message }` there). No retriable flag.
- **2**: RFC 9457 Problem Details on every HTTP API error, plus `is_retriable`,
  `suggestions` and a correlation ID; 429 carries `Retry-After`.
- **3**: Level 2 plus `doc_uri`, documented `type` URIs, intent context on
  cancellation, rate-limit headers on every response, CLI errors as JSON with
  semantic exit codes, and tool errors returned, not thrown.

HTML pages for people and JSON-RPC protocol errors are outside this rule; MCP
tool errors are covered under CLI and tool errors below.

## Evidence to gather

- `application/problem+json`, `ProblemDetails`, `is_retriable`, `doc_uri`,
  `trace_id`, `Retry-After`, `Idempotency-Key`, `RateLimit`, `X-RateLimit-`
- The error handler: Next.js `error.tsx` and route wrappers, Express error
  middleware (check its order), Fastify `setErrorHandler` and
  `setNotFoundHandler`, FastAPI `exception_handler`
- Trigger real errors (bad input, missing auth, unknown ID, unknown route, rate
  limit) and compare the shapes. One inconsistent route caps the score at 1,
  including a framework default (an empty 405, an HTML 404) on a path the
  product serves. A product with no rate limit isn't marked down for lacking
  rate-limit headers.

## The house profile

RFC 9457 makes every member optional and keeps bodies flat (members at the
root, never under `error`), served as `application/problem+json`. Agents branch
on `type`, then on `is_retriable`. This is the whole shape:

```ts
interface Problem {
  type: string; // URI of a documented error type; the page it resolves to explains it
  title: string; // stable per type
  status: number; // 400-599, equal to the HTTP status
  detail: string; // this occurrence
  instance?: string;
  is_retriable?: boolean; // the same request, unchanged, might succeed
  retry_after_ms?: number; // body copy of Retry-After
  doc_uri?: string;
  trace_id?: string; // matches server logs, X-Request-ID or the OpenTelemetry trace
  suggestions?: string[]; // recovery steps, most likely first
  errors?: Problem[]; // nested problems for batch operations
  // Validation failures only. `field` is a JSON Pointer into the request body.
  invalid_fields?: { field: string; reason: string; received?: unknown; expected?: string }[];
  // Unmet precondition only: the operation that unblocks this one.
  next_operation?: string;
  next_operation_args?: Record<string, unknown>;
}
```

Every error carries `type`, `title`, `status`, `detail`, `is_retriable`, at
least one entry in `suggestions`, and `trace_id`. A 429 also carries
`retry_after_ms`.

```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation failed",
  "status": 422,
  "detail": "1 field failed validation.",
  "is_retriable": false,
  "suggestions": ["Send currency as an ISO 4217 code, then resubmit with a new Idempotency-Key"],
  "invalid_fields": [
    {
      "field": "/currency",
      "reason": "Unsupported currency",
      "received": "usd",
      "expected": "One of USD, EUR, GBP"
    }
  ],
  "doc_uri": "https://docs.example.com/errors/validation-error",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736"
}
```

- **Type slugs** are a published contract: `/errors/validation-error`,
  `/errors/not-found`, `/errors/rate-limit-exceeded`, `/errors/internal-error`,
  `/errors/service-unavailable`. Add product types beside them and keep
  released slugs unchanged.
- **Retriability.** An explicit `is_retriable` overrides any status-code
  heuristic. Validation errors are `false`. An unexpected 500 is `false` too:
  the outcome is unknown, so the suggestion is to check whether the operation
  took effect.
- **Status.** 4xx for caller errors (400 malformed, 422 validation, 401 auth,
  403 permission, 404 missing); 5xx only for server faults. Responses carry the
  profile's fields and nothing internal: stack traces and file paths stay in
  the logs under the same `trace_id`.
- **Suggestions** name the next action: "Call `cancel_subscription` first",
  "Call `get_payment` with the same Idempotency-Key to check the charge, then
  retry with that key".
- **Cancellation.** When a request is aborted mid-operation, include an
  `intent` object (operation, resource ID, state before cancel, how to check
  the outcome) so the agent knows what may still be running.

## Idempotency

GET, PUT and DELETE are idempotent by definition (RFC 9110); POST effects, and
PATCH where it isn't naturally idempotent, need deduplication through
`Idempotency-Key` (draft-ietf-httpapi-idempotency-key-header, still a draft;
the value is a quoted Structured Field string, so say whether you also accept
the unquoted form). The server contract, within a published retention window
(24 hours is typical) that the store's TTL enforces:

- Authorise first, then namespace the key by principal and operation.
- Reserve the key atomically before any work (for example Redis `SET NX`) and
  fingerprint the body.
- Same key, same body, completed: replay the stored response with its original
  status and headers, marked `Idempotency-Replayed: true` (a convention).
- Same key while still in flight: `409`. Same key, different body: `422`.
- A thrown error is outcome-unknown, not a release; release only when the
  request certainly had no effect.

This needs a route wrapper over a shared atomic store; plain middleware can
only short-circuit. Atomic reservation and body matching are correctness
properties, so an unscoped response cache is not a smaller version of this.

## Client retry policy

- Retry when `is_retriable` is true, or when it's absent and the status is 429
  or 5xx. Retry mutations only with an idempotency key made once per logical
  operation.
- Exponential backoff with jitter, capped at 60 s; honour `Retry-After` or
  `retry_after_ms`. A retry budget and a circuit breaker so many agents don't
  stampede a recovering service.
- Out of budget: check the status endpoint before escalating.
- After a timeout on a mutation, check the resource (or replay with the same
  key) before sending anything new. Fixing a non-retriable request is a new
  operation with a new key.

## Rate limits

Headers on every response, not only 429, so agents see quota before they run
out. `X-RateLimit-Limit/Remaining/Reset` is common but unstandardised; the IETF
`RateLimit` and `RateLimit-Policy` fields are still a draft. Send both. Every
429 carries `Retry-After`, in integer seconds.

## CLI and tool errors

- CLI: a failure writes one object to stderr with a semantic exit code:
  `{ error, message, suggestions, failing_input?, invalid_args?, trace_id? }`.
  That shape and the exit codes are owned by cli-design.md; HTTP Problem
  Details are a separate contract and never appear on a CLI's stderr.
- MCP: recoverable execution errors return `{ isError: true, content: [...] }`
  with the problem JSON as text, so the model sees them. Unknown tools and
  malformed requests remain JSON-RPC errors; error codes are in mcp-servers.md.
  Log the JSON-RPC request ID beside the trace ID; they differ.
- SDKs handle throws differently: the AI SDK turns an `execute` exception into a
  tool-error part the model sees on the next step (only if `stopWhen` allows
  more than one step); the OpenAI Agents SDK routes it through `errorFunction`,
  which reports to the model by default and can rethrow. Pick the mechanism
  deliberately. No SDK retries on a custom `is_retriable` field; that policy is
  the application's.
- Gemini `FunctionResponse` carries the error in `response`; keep thought
  signatures intact on later calls.

## Build

Extend the project's existing error handler; one handler owns the shape.

1. **One problem module** with the shape above and a slug-to-title table.
   Done when every error path builds its body through it.
2. **Central handler** mapping validation, not-found (unknown routes included),
   auth, rate-limit and unexpected errors. Done when a request for each returns
   `application/problem+json` with the required fields and the 500 body holds
   no message or stack from the thrown error.
3. **Rate-limit headers** on every response. Done when a 200 and a 429 both
   carry them and the 429 has `Retry-After` and `retry_after_ms`.
4. **Idempotency** on each non-idempotent mutation, releasing the key only for
   failures that certainly had no effect. Done when a test shows replay, `409`
   in flight, `422` on a changed body, and two principals using one key
   without collision.
5. **Error catalogue**: one documented entry per `type` (status, retriable,
   suggestions, example), reachable from the `type` URI and `doc_uri`. Done
   when every `type` the code can emit has an entry.

## Templates

- `templates/errors-and-auth/problem-details.ts`
- `templates/errors-and-auth/next-error-handler.ts`
- `templates/errors-and-auth/fastify-error-plugin.ts`
- `templates/errors-and-auth/mcp-tool-error.ts`
- `templates/errors-and-auth/idempotency-middleware.ts`: exports
  `withIdempotency(handler, { getPrincipalId })` and `releaseIdempotencyKey`,
  needs `REDIS_URL`; renewed, fenced lease and byte-exact replay
- `templates/errors-and-auth/rate-limit-headers.ts`
