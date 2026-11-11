/**
 * RFC 9457 Problem Details schema (obsoletes RFC 7807)
 * Canonical: https://www.rfc-editor.org/rfc/rfc9457.html
 * Use: Define structured error responses for HTTP APIs and CLI tools
 *
 * <CUSTOMISE>
 * - Set ERROR_TYPE_BASE and ERROR_DOC_BASE to your own domain
 * - Add domain-specific error codes to the `code` enum
 * </CUSTOMISE>
 */

import { z } from "zod";

/** <CUSTOMISE> Base of the `type` URIs. Each code maps to one stable URI under it. */
const ERROR_TYPE_BASE = "https://api.example.com/errors";
/** <CUSTOMISE> Page that documents each error code. */
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
 * invalid_fields (field-level validation errors) and errors (nested Problem Details for batches)
 */
export const ProblemDetails = z.strictObject({
  // RFC 9457 core (5 members)
  type: z
    .string()
    .url()
    .default("about:blank")
    .describe("URI reference identifying the error type"),
  title: z.string().describe("Short human-readable summary"),
  status: z.number().int().min(400).max(599).describe("HTTP status code"),
  detail: z.string().describe("Instance-specific explanation"),
  instance: z.string().optional().describe("URI reference identifying this occurrence"),

  // Agent extensions
  code: z
    .enum([
      "ERR_VALIDATION",
      "ERR_NOT_FOUND",
      "ERR_CONFLICT",
      "ERR_UNAUTHORIZED",
      "ERR_FORBIDDEN",
      "ERR_RATE_LIMITED",
      "ERR_UNAVAILABLE",
      "ERR_TIMEOUT",
      "ERR_UNPROCESSABLE",
      "ERR_INTERNAL",
    ])
    .optional()
    .describe("Machine-readable domain code"),
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
  // Zod 4 recursive schema: a getter keeps z.infer working under strict TypeScript
  get errors() {
    return z
      .array(ProblemDetails)
      .optional()
      .describe("Nested Problem Details, one per failed item in a batch");
  },
});

export type ProblemDetailsType = z.infer<typeof ProblemDetails>;

/** Machine-readable domain codes accepted in the `code` member. */
export type ProblemCode = NonNullable<ProblemDetailsType["code"]>;

/** Stable `type` URI for a code: ERR_RATE_LIMITED -> <base>/rate-limited. */
export function problemType(code: ProblemCode): string {
  return `${ERROR_TYPE_BASE}/${code.slice("ERR_".length).toLowerCase().replaceAll("_", "-")}`;
}

/** Documentation link for a code. */
export function problemDocUri(code: ProblemCode): string {
  return `${ERROR_DOC_BASE}#${code}`;
}

/**
 * Helper to construct a ProblemDetails response
 */
export function problemDetails(init: Partial<ProblemDetailsType>): ProblemDetailsType {
  return ProblemDetails.parse({
    code: init.code,
    detail: init.detail ?? "",
    doc_uri: init.doc_uri,
    errors: init.errors,
    invalid_fields: init.invalid_fields,
    instance: init.instance,
    is_retriable: init.is_retriable,
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
    code: "ERR_INTERNAL",
    detail: "The server hit an unexpected error. Quote trace_id when reporting it.",
    doc_uri: problemDocUri("ERR_INTERNAL"),
    is_retriable: false,
    status: 500,
    title: "Internal Server Error",
    trace_id: traceId,
    type: problemType("ERR_INTERNAL"),
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
    code: "ERR_RATE_LIMITED",
    detail: `You have exceeded your quota of ${opts.limit} requests.`,
    doc_uri: problemDocUri("ERR_RATE_LIMITED"),
    is_retriable: true,
    retry_after_ms: waitMs,
    status: 429,
    suggestions: [`Wait ${Math.ceil(waitMs / 1000)} seconds, then retry the same request.`],
    title: "Rate Limit Exceeded",
    trace_id: opts.traceId,
    type: problemType("ERR_RATE_LIMITED"),
  });
}
