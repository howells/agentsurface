/**
 * RFC 9457 Problem Details schema (obsoletes RFC 7807)
 * Canonical: https://www.rfc-editor.org/rfc/rfc9457.html
 * Use: Define structured error responses for HTTP APIs and CLI tools
 *
 * <CUSTOMISE>
 * - Set ERROR_TYPE_BASE and ERROR_DOC_BASE to your own domain
 * - Add your domain-specific problem kinds to PROBLEM_TITLES
 * </CUSTOMISE>
 */

import { z } from "zod";

/** <CUSTOMISE> Base of the `type` URIs. Each problem kind has one stable URI under it. */
const ERROR_TYPE_BASE = "https://api.example.com/errors";
/** <CUSTOMISE> Page that documents each problem kind. */
const ERROR_DOC_BASE = "https://api.example.com/docs/errors";

/** One failed input field in a validation error. */
const InvalidFieldSchema = z.object({
  field: z.string().describe('JSON Pointer to the failing field (e.g., "/email", "/address/zip")'),
  reason: z.string().describe("Why the value was rejected"),
  received: z.unknown().optional().describe("The value that was sent, when safe to echo"),
  expected: z.string().optional().describe("What a correct value looks like"),
});

export type InvalidField = z.infer<typeof InvalidFieldSchema>;

/**
 * RFC 9457 core fields: type, title, status, detail, instance
 * Plus agent-oriented extensions: is_retriable, retry_after_ms, doc_uri, trace_id, suggestions,
 * invalid_fields (field-level validation errors), next_operation / next_operation_args (the call
 * that satisfies an unmet precondition) and errors (nested Problem Details for batches)
 */
export const ProblemDetails = z.strictObject({
  // RFC 9457 core (5 members)
  type: z
    .string()
    .default("about:blank")
    .describe("URI reference identifying the error type; clients branch on it"),
  title: z.string().describe("Short human-readable summary"),
  status: z.number().int().min(400).max(599).describe("HTTP status code"),
  detail: z.string().describe("Instance-specific explanation"),
  instance: z.string().optional().describe("URI reference identifying this occurrence"),

  // Agent extensions
  is_retriable: z
    .boolean()
    .optional()
    .describe("True if retrying the same request unchanged might succeed"),
  retry_after_ms: z.number().int().positive().optional().describe("Wait N ms before retry"),
  doc_uri: z.string().url().optional().describe("Link to detailed error documentation"),
  trace_id: z.string().optional().describe("Correlation ID for server logs"),

  suggestions: z
    .array(z.string())
    .optional()
    .describe("Ordered recovery steps; the first is the most likely fix"),
  invalid_fields: z
    .array(InvalidFieldSchema)
    .optional()
    .describe("Validation errors for individual fields"),
  next_operation: z
    .string()
    .optional()
    .describe("Operation to call first when a precondition is unmet"),
  next_operation_args: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Arguments for next_operation"),
  // Zod 4 recursive schema: a getter keeps z.infer working under strict TypeScript
  get errors() {
    return z
      .array(ProblemDetails)
      .optional()
      .describe("Nested Problem Details, one per failed item in a batch");
  },
});

export type ProblemDetailsType = z.infer<typeof ProblemDetails>;

/**
 * <CUSTOMISE> Every problem kind this API returns: the slug of its `type` URI and its title.
 * Published `type` URIs are a contract clients branch on: never rename a slug.
 */
const PROBLEM_TITLES = {
  conflict: "Conflict",
  forbidden: "Forbidden",
  "internal-error": "Internal server error",
  "not-found": "Resource not found",
  "rate-limit-exceeded": "Rate limit exceeded",
  "service-unavailable": "Service temporarily unavailable",
  timeout: "Request timed out",
  unauthorized: "Unauthorized",
  unprocessable: "Unprocessable request",
  "validation-error": "Validation failed",
} as const;

export type ProblemKind = keyof typeof PROBLEM_TITLES;

/** Stable `type` URI for a kind: rate-limit-exceeded -> <base>/rate-limit-exceeded. */
export function problemType(kind: ProblemKind): string {
  return `${ERROR_TYPE_BASE}/${kind}`;
}

/** Human-readable title for a kind. */
export function problemTitle(kind: ProblemKind): string {
  return PROBLEM_TITLES[kind];
}

/** Documentation link for a kind. */
export function problemDocUri(kind: ProblemKind): string {
  return `${ERROR_DOC_BASE}#${kind}`;
}

/**
 * Helper to construct a ProblemDetails response
 */
export function problemDetails(init: Partial<ProblemDetailsType>): ProblemDetailsType {
  return ProblemDetails.parse({
    detail: init.detail ?? "",
    doc_uri: init.doc_uri,
    errors: init.errors,
    invalid_fields: init.invalid_fields,
    instance: init.instance,
    is_retriable: init.is_retriable,
    next_operation: init.next_operation,
    next_operation_args: init.next_operation_args,
    retry_after_ms: init.retry_after_ms,
    status: init.status ?? 500,
    suggestions: init.suggestions,
    title: init.title ?? "An error occurred",
    trace_id: init.trace_id,
    type: init.type ?? "about:blank",
  });
}

/**
 * Type guard: is this object a valid ProblemDetails?
 */
export function isProblemDetails(x: unknown): x is ProblemDetailsType {
  return ProblemDetails.safeParse(x).success;
}

/**
 * Problem for an error the service did not anticipate.
 *
 * The body never carries the exception text: database, upstream and library
 * messages leak internals. Log the error server-side under `traceId` and let the
 * caller quote that id. It is not marked retriable, because an unknown failure on
 * a non-idempotent request may already have taken effect.
 */
export function internalProblem(traceId?: string): ProblemDetailsType {
  return problemDetails({
    detail: "The server hit an unexpected error. Quote trace_id when reporting it.",
    doc_uri: problemDocUri("internal-error"),
    is_retriable: false,
    status: 500,
    title: problemTitle("internal-error"),
    trace_id: traceId,
    type: problemType("internal-error"),
  });
}

/**
 * Helper to build a 429 Rate Limited response
 */
export function rateLimitError(opts: {
  limit: number;
  /** Epoch milliseconds at which the quota resets. */
  resetAt: number;
  traceId?: string;
}): ProblemDetailsType {
  const waitMs = Math.max(100, opts.resetAt - Date.now());
  return problemDetails({
    detail: `You have exceeded your quota of ${opts.limit} requests.`,
    doc_uri: problemDocUri("rate-limit-exceeded"),
    is_retriable: true,
    retry_after_ms: waitMs,
    status: 429,
    suggestions: [`Wait ${Math.ceil(waitMs / 1000)} seconds, then retry the same request.`],
    title: problemTitle("rate-limit-exceeded"),
    trace_id: opts.traceId,
    type: problemType("rate-limit-exceeded"),
  });
}
