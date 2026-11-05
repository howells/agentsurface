# Error Handling

Dimension 6: whether an error tells an agent if it can retry, what to change,
and how to match the error to server logs.

## Score

- **0**: Bare status codes; plain-text or empty error bodies.
- **1**: Some routes return structured errors, others don't, or shapes vary
  (`{ error }` here, `{ message }` there). No retriable flag.
- **2**: RFC 9457 Problem Details on every error route, plus `is_retriable`,
  `suggestions` and a correlation ID; 429 carries `Retry-After`.
- **3**: Level 2 plus `doc_uri`, domain error codes, intent context on
  cancellation, rate-limit headers on every response, CLI errors as JSON with
  semantic exit codes, and tool errors returned, not thrown.

## Evidence to gather

- `application/problem+json`, `ProblemDetails`, `is_retriable`, `doc_uri`,
  `trace_id`, `Retry-After`, `Idempotency-Key`, `RateLimit`, `X-RateLimit-`
- The error handler: Next.js `error.tsx` and route wrappers, Express error
  middleware (check its order), Fastify `setErrorHandler`, FastAPI
  `exception_handler`
- Trigger real errors (bad input, missing auth, unknown ID, rate limit) and
  compare the shapes. One inconsistent route caps the score at 1.

## The house profile

RFC 9457 makes every member optional and keeps bodies flat (`type`, `status`,
`detail` at the root, never under `error`). The house profile requires `type`,
`title`, `status`, `detail` and a correlation ID (`trace_id`, or `instance`),
and adds:

| Field            | Meaning                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `code`           | Short domain code for switch statements (`ERR_AUTH_EXPIRED`)            |
| `is_retriable`   | The same request, unchanged, might succeed. Validation errors are false |
| `retry_after_ms` | Body copy of `Retry-After`                                              |
| `suggestions`    | Recovery steps                                                          |
| `recovery_hint`  | The single primary action                                               |
| `doc_uri`        | Page explaining the error; the `type` URI should resolve to one too     |
| `trace_id`       | Matches server logs, `X-Request-ID` or the OpenTelemetry trace          |
| `fields`         | Validation only: `[{ path, rule, message }]`                            |
| `errors`         | Nested problems for batch operations                                    |

An explicit `is_retriable` overrides any status-code heuristic. Retrying a
mutation also needs an idempotency key. No stack traces in responses. 4xx for
caller errors (400/422 validation, 401 auth, 403 permission, 404 missing); 5xx
only for server faults.

**Cancellation.** When a request is aborted mid-operation, include an `intent`
object (operation, resource ID, state before cancel, how to check the outcome)
so the agent knows what may still be running.

## Idempotency

GET, PUT and DELETE are idempotent by definition (RFC 9110); POST effects need
deduplication through `Idempotency-Key` (still a draft; the value is a quoted
Structured Field string, so say whether you also accept the unquoted form). The
server contract, within a published window (24 hours is typical):

- Authorise first, then namespace the key by principal and operation.
- Reserve the key atomically before any work (for example Redis `SET NX`) and
  fingerprint the body.
- Same key, same body, completed: replay the stored response with its original
  status and headers.
- Same key while still in flight: `409`. Same key, different body: `422`.
- A thrown error is outcome-unknown, not a release; release only when the
  request certainly had no effect.

This needs a route wrapper over a shared atomic store; plain middleware can
only short-circuit.

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
`RateLimit` and `RateLimit-Policy` fields are still a draft. Send both. Prefer
integer seconds in `Retry-After`.

## CLI and tool errors

- CLI: the problem JSON goes to stderr, stdout carries data only, and the exit
  code follows the CLI's published contract (cli-design.md).
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

## Templates

- `templates/errors-and-auth/problem-details.ts`
- `templates/errors-and-auth/next-error-handler.ts`
- `templates/errors-and-auth/fastify-error-plugin.ts`
- `templates/errors-and-auth/mcp-tool-error.ts`
- `templates/errors-and-auth/idempotency-middleware.ts` (renewed, fenced lease;
  byte-exact replay)
- `templates/errors-and-auth/rate-limit-headers.ts`
