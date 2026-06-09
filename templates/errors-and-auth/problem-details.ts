/**
 * RFC 9457 Problem Details schema (obsoletes RFC 7807)
 * Canonical: https://www.rfc-editor.org/rfc/rfc9457.html
 * Use: Define structured error responses for HTTP APIs and CLI tools
 *
 * <CUSTOMISE>
 * - Extend `type` URI to your domain: "https://api.yourservice.com/errors/..."
 * - Set `doc_uri` to your error documentation landing page
 * - Add domain-specific error codes to the `code` enum
 * </CUSTOMISE>
 */

import { z } from "zod";

/**
 * RFC 9457 core fields: type, title, status, detail, instance
 * Plus agent-oriented extensions: is_retriable, retry_after_ms, doc_uri, trace_id, suggestions, errors
 */
const ErrorSuggestion = z.object({
  action: z.string().describe("Recovery action the agent can take"),
  payload: z.unknown().optional().describe("Structured data for the action"),
});

const ErrorField = z.object({
  code: z.string().describe("Validation error code"),
  field: z.string().describe('Field path (e.g., "email", "address.zipCode")'),
  message: z.string().describe("Human-readable error message"),
});

export const ProblemDetails = z
  .object({
    // RFC 9457 core (5 members)
    type: z
      .string()
      .url()
      .default("about:blank")
      .describe("URI reference identifying the error type"),
    title: z.string().describe("Short human-readable summary"),
    status: z.number().int().min(400).max(599).describe("HTTP status code"),
    detail: z.string().describe("Instance-specific explanation"),
    instance: z.string().optional().describe("Unique identifier for this occurrence (trace ID)"),

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
      ])
      .optional()
      .describe("Machine-readable domain code"),
    is_retriable: z.boolean().optional().describe("True if the agent should retry"),
    retry_after_ms: z.number().int().positive().optional().describe("Wait N ms before retry"),
    doc_uri: z.string().url().optional().describe("Link to detailed error documentation"),
    trace_id: z.string().optional().describe("Correlation ID for server logs"),

    suggestions: z
      .array(ErrorSuggestion)
      .optional()
      .describe("Recovery actions the agent can take"),
    errors: z.array(ErrorField).optional().describe("Validation errors for individual fields"),
  })
  .strict();

export type ProblemDetailsType = z.infer<typeof ProblemDetails>;

/**
 * Helper to construct a ProblemDetails response
 */
export function problemDetails(init: Partial<ProblemDetailsType>): ProblemDetailsType {
  return ProblemDetails.parse({
    code: init.code,
    detail: init.detail ?? "",
    doc_uri: init.doc_uri,
    errors: init.errors,
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
  try {
    ProblemDetails.parse(x);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a thrown Error to a RFC 9457 response
 * <CUSTOMISE> Map your domain errors to appropriate status codes and is_retriable flags
 */
export function toProblemResponse(
  err: Error | unknown,
  options?: {
    status?: number;
    traceId?: string;
    docUri?: string;
  },
): ProblemDetailsType {
  const message = err instanceof Error ? err.message : String(err);
  const isNetworkError = message.includes("timeout") || message.includes("ECONNREFUSED");
  const isValidationError = message.includes("validation") || message.includes("invalid");

  return problemDetails({
    detail: message,
    doc_uri: options?.docUri,
    is_retriable: isNetworkError,
    retry_after_ms: isNetworkError ? 1000 : undefined,
    status: options?.status ?? (isValidationError ? 422 : 500),
    title: isValidationError ? "Validation Error" : "Internal Server Error",
    trace_id: options?.traceId,
    type: isValidationError
      ? "https://api.example.com/errors/validation"
      : "https://api.example.com/errors/internal",
  });
}

/**
 * Helper to build a 429 Rate Limited response
 */
export function rateLimitError(opts: {
  remaining: number;
  limit: number;
  resetAt: number;
  traceId?: string;
}): ProblemDetailsType {
  const waitMs = Math.max(100, opts.resetAt - Date.now());
  return problemDetails({
    code: "ERR_RATE_LIMITED",
    detail: `You have exceeded your ${opts.limit} requests-per-minute quota.`,
    is_retriable: true,
    retry_after_ms: waitMs,
    status: 429,
    suggestions: [
      {
        action: "wait_and_retry",
        payload: { wait_ms: waitMs },
      },
    ],
    title: "Rate Limit Exceeded",
    trace_id: opts.traceId,
    type: "https://api.example.com/errors/rate-limited",
  });
}
