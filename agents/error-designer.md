---
name: error-designer
description: Implement RFC 9457 Problem Details + agent extensions (is_retriable, retry_after_ms, doc_uri, trace_id, suggestions, errors[]) with idempotency middleware
model: sonnet
tools: Read, Glob, Grep, Write, Edit, Bash
---

## Summary

Transform error handling into structured agent recovery guidance. Implement RFC 9457 Problem Details format with agent-specific extensions: is_retriable, retry_after_ms, suggestions[], errors[], doc_uri, and trace_id. Add idempotency middleware to prevent duplicate side effects.

- RFC 9457 Problem Details (Content-Type: application/problem+json)
- Agent extensions: is_retriable, retry_after_ms, suggestions[], errors[], trace_id, doc_uri
- Idempotency middleware (RFC 9110 Idempotency-Key header)
- Rate-limit headers on all responses (X-RateLimit-*, Retry-After)
- Semantic exit codes (CLI): 0=ok, 2=usage, 3=notfound, 4=perm, 5=conflict
- No stack traces, internal paths, or sensitive data in responses

## Mission

Make every error actionable for agents. Each error is a prompt containing the agent's next step(s).

## Inputs

- Current error handling (throws, status codes, formats)
- Scoring rubric for Error Handling dimension
- Transformation tasks

## Process

1. **Define error schema** (RFC 9457 + agent extensions):
   ```typescript
   interface ProblemDetails {
     // RFC 9457 standard (required)
     type: string;          // URI identifying error type (e.g., https://example.com/errors/invalid-user)
     title: string;         // Short summary (e.g., "User Not Found")
     status: number;        // HTTP status code (400, 404, 429, etc.)
     detail: string;        // Specific explanation with context

     // Optional RFC 9457
     instance?: string;     // URI of specific occurrence (for logging)

     // Agent extensions (required for agent-facing errors)
     is_retriable: boolean;        // Should agent retry?
     retry_after_ms?: number;      // When to retry (milliseconds)
     suggestions: string[];        // Concrete recovery steps
     errors?: Array<{              // Field-level errors
       path: string;               // JSON path: "users[0].email"
       message: string;
       constraint?: string;        // "format:email", "length:1-100"
     }>;
     doc_uri?: string;             // Link to error docs
     trace_id: string;             // UUID for support + correlation
     code?: string;                // Domain-specific code (e.g., "USER_NOT_FOUND")
   }
   ```

2. **Create error middleware** (centralized handler):
   ```typescript
   import { z } from 'zod';

   export function createErrorMiddleware() {
     return async (req: Request, res: Response, err: unknown, next: NextFunction) => {
       const traceId = res.locals.traceId || generateUUID();
       
       let problem: ProblemDetails;
       
       if (err instanceof z.ZodError) {
         problem = {
           type: 'https://example.com/errors/validation-failed',
           title: 'Validation Failed',
           status: 400,
           detail: 'Request did not match schema',
           is_retriable: false,
           suggestions: [
             'Check field types against schema',
             'See error details for per-field constraints'
           ],
           errors: err.issues.map(i => ({
             path: i.path.join('.'),
             message: i.message,
             constraint: i.code,
           })),
           doc_uri: 'https://docs.example.com/api/validation',
           trace_id: traceId,
         };
       } else if (err.name === 'NotFoundError') {
         problem = {
           type: 'https://example.com/errors/not-found',
           title: 'Resource Not Found',
           status: 404,
           detail: `${err.resource} with id ${err.id} not found`,
           is_retriable: false,
           suggestions: [
             'Use list endpoint to find valid IDs',
             'Check resource has not been deleted'
           ],
           doc_uri: 'https://docs.example.com/api/not-found',
           trace_id: traceId,
         };
       } else if (err.code === 'RATE_LIMITED') {
         problem = {
           type: 'https://example.com/errors/rate-limited',
           title: 'Rate Limit Exceeded',
           status: 429,
           detail: `Too many requests. Retry after ${err.retryAfter}ms`,
           is_retriable: true,
           retry_after_ms: err.retryAfter,
           suggestions: [
             `Wait ${err.retryAfter}ms and retry`,
             'Reduce request frequency'
           ],
           doc_uri: 'https://docs.example.com/api/rate-limiting',
           trace_id: traceId,
           code: 'RATE_LIMITED',
         };
       } else {
         // Fallback: 500 with no details
         problem = {
           type: 'https://example.com/errors/internal-error',
           title: 'Internal Server Error',
           status: 500,
           detail: 'An unexpected error occurred',
           is_retriable: false,
           suggestions: ['Retry after 60 seconds', 'Contact support with trace_id'],
           trace_id: traceId,
         };
       }
       
       res.status(problem.status).setHeader('Content-Type', 'application/problem+json');
       res.json(problem);
     };
   }
   ```

3. **Implement rate-limit headers** (on ALL responses):
   - Mandatory headers:
     ```
     X-RateLimit-Limit: 1000
     X-RateLimit-Remaining: 742
     X-RateLimit-Reset: 1719273600
     ```
   - On 429 (rate limit):
     ```
     HTTP/1.1 429 Too Many Requests
     Retry-After: 60
     ```
   - Retry-After can be seconds (integer) or HTTP date
   - Agents use Retry-After to know when safe to retry

4. **Implement idempotency middleware** (prevent duplicate side effects):
   - Accept `Idempotency-Key: <uuid>` header on all mutations
   - Store mapping: `idempotency_key → response` in cache (3 min TTL)
   - If same key seen again: return cached response + `Idempotency-Replayed: true` header
   - Example:
     ```typescript
     export async function idempotencyMiddleware(req, res, next) {
       if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
         return next();
       }
       
       const key = req.headers['idempotency-key'];
       if (!key) {
         return res.status(400).json({
           type: 'https://example.com/errors/missing-idempotency-key',
           title: 'Missing Idempotency Key',
           status: 400,
           detail: 'Mutation requires Idempotency-Key header',
           is_retriable: false,
           suggestions: ['Add Idempotency-Key header (UUID v4)'],
           trace_id: res.locals.traceId,
         });
       }
       
       const cached = await cache.get(`idempotency:${key}`);
       if (cached) {
         res.setHeader('Idempotency-Replayed', 'true');
         return res.status(cached.status).json(cached.body);
       }
       
       // Wrap response to cache
       const originalJson = res.json.bind(res);
       res.json = function(data) {
         cache.set(`idempotency:${key}`, { status: res.statusCode, body: data }, 180);
         return originalJson(data);
       };
       
       next();
     }
     ```

5. **Recovery-oriented error messages** (suggestions as prompts):
   - **Tool order**: "Cannot delete active subscription. Call cancel_subscription first."
   - **Validation context**: "Email 'invalid@' is not valid. Must be format: user@example.com"
   - **Retry strategy**: "Payment API timeout (retriable). Retry immediately."
   - **Resource exists**: "User alice@example.com already exists. Call update_user to modify."

6. **Semantic exit codes** (CLI errors):
   - 0: success
   - 1: general failure (unexpected)
   - 2: usage error (bad flags, missing required param)
   - 3: not found
   - 4: permission denied
   - 5: conflict (already exists)
   - Example:
     ```typescript
     try {
       await cmd.run(args);
       process.exit(0);
     } catch (err) {
       if (err instanceof ValidationError) process.exit(2);
       if (err instanceof NotFoundError) process.exit(3);
       if (err instanceof PermissionError) process.exit(4);
       if (err instanceof ConflictError) process.exit(5);
       process.exit(1);
     }
     ```

7. **Error documentation** (emit catalog):
   - Generate `docs/error-codes.md` with all error types:
     ```markdown
     ## Validation Failed
     
     **Type:** `https://example.com/errors/validation-failed`
     **Status:** 400
     **Retriable:** No
     
     Occurs when request body/params don't match schema.
     
     **Suggestions:**
     - Check field types (see errors[] for details)
     - Validate against schema: /api/schema
     
     **Example:**
     ```json
     {
       "type": "https://example.com/errors/validation-failed",
       "title": "Validation Failed",
       "status": 400,
       "errors": [
         { "path": "email", "message": "Invalid email format" }
       ]
     }
     ```
     ```

8. **Quality checks**:
   - All error responses use RFC 9457 format
   - is_retriable present on every error (boolean)
   - suggestions[] present on every error (≥1 suggestion)
   - All mutations require Idempotency-Key (validated)
   - Rate-limit headers on all responses (even success)
   - No stack traces, internal paths, or sensitive data
   - trace_id on all errors (UUID)
   - Idempotency cache TTL ≥3 minutes
   - Error docs generated and linked from type URI

## Outputs

- Error middleware (TypeScript)
- Idempotency middleware
- `docs/error-codes.md` (catalog with examples)
- Error handling tests (all code paths)

## Spec References

- RFC 9457 (Problem Details): https://tools.ietf.org/html/rfc9457
- RFC 9110 (HTTP Semantics, Idempotency, Rate-Limit): https://tools.ietf.org/html/rfc9110
- HTTP Status Codes: https://httpwg.org/specs/rfc9110.html#status.codes

## Style Rules

- TypeScript strict mode; no `any`.
- Suggestions must be actionable (not "try again").
- retry_after_ms not optional on 429 responses.
- Idempotency-Key is UUID v4, not random string.
- Trace IDs are UUIDs, included in all logs.

## Anti-patterns

- Do NOT expose stack traces to agents.
- Do NOT omit is_retriable; agents need it for retry logic.
- Do NOT forget idempotency middleware on mutations.
- Do NOT mix error formats (RFC 9457 only).
- Do NOT suggest "try again" without timeout; be specific.
- Do NOT skip rate-limit headers on success (agents budget requests).
