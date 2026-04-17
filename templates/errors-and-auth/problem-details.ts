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

import { z } from 'zod';

/**
 * RFC 9457 core fields: type, title, status, detail, instance
 * Plus agent-oriented extensions: is_retriable, retry_after_ms, doc_uri, trace_id, suggestions, errors
 */
const ErrorSuggestion = z.object({
  action: z.string().describe('Recovery action the agent can take'),
  payload: z.unknown().optional().describe('Structured data for the action'),
});

const ErrorField = z.object({
  field: z.string().describe('Field path (e.g., "email", "address.zipCode")'),
  code: z.string().describe('Validation error code'),
  message: z.string().describe('Human-readable error message'),
});

export const ProblemDetails = z.object({
  // RFC 9457 core (5 members)
  type: z
    .string()
    .url()
    .default('about:blank')
    .describe('URI reference identifying the error type'),
  title: z.string().describe('Short human-readable summary'),
  status: z.number().int().min(400).max(599).describe('HTTP status code'),
  detail: z.string().describe('Instance-specific explanation'),
  instance: z.string().optional().describe('Unique identifier for this occurrence (trace ID)'),

  // Agent extensions
  code: z
    .enum([
      'ERR_VALIDATION',
      'ERR_NOT_FOUND',
      'ERR_CONFLICT',
      'ERR_UNAUTHORIZED',
      'ERR_FORBIDDEN',
      'ERR_RATE_LIMITED',
      'ERR_UNAVAILABLE',
      'ERR_TIMEOUT',
      'ERR_UNPROCESSABLE',
    ])
    .optional()
    .describe('Machine-readable domain code'),
  is_retriable: z.boolean().optional().describe('True if the agent should retry'),
  retry_after_ms: z.number().int().positive().optional().describe('Wait N ms before retry'),
  doc_uri: z.string().url().optional().describe('Link to detailed error documentation'),
  trace_id: z.string().optional().describe('Correlation ID for server logs'),

  suggestions: z
    .array(ErrorSuggestion)
    .optional()
    .describe('Recovery actions the agent can take'),
  errors: z.array(ErrorField).optional().describe('Validation errors for individual fields'),
}).strict();

export type ProblemDetailsType = z.infer<typeof ProblemDetails>;

/**
 * Helper to construct a ProblemDetails response
 */
export function problemDetails(init: Partial<ProblemDetailsType>): ProblemDetailsType {
  return ProblemDetails.parse({
    type: init.type ?? 'about:blank',
    title: init.title ?? 'An error occurred',
    status: init.status ?? 500,
    detail: init.detail ?? '',
    instance: init.instance,
    code: init.code,
    is_retriable: init.is_retriable,
    retry_after_ms: init.retry_after_ms,
    doc_uri: init.doc_uri,
    trace_id: init.trace_id,
    suggestions: init.suggestions,
    errors: init.errors,
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
  }
): ProblemDetailsType {
  const message = err instanceof Error ? err.message : String(err);
  const isNetworkError = message.includes('timeout') || message.includes('ECONNREFUSED');
  const isValidationError = message.includes('validation') || message.includes('invalid');

  return problemDetails({
    type: isValidationError
      ? 'https://api.example.com/errors/validation'
      : 'https://api.example.com/errors/internal',
    title: isValidationError ? 'Validation Error' : 'Internal Server Error',
    status: options?.status ?? (isValidationError ? 422 : 500),
    detail: message,
    is_retriable: isNetworkError,
    retry_after_ms: isNetworkError ? 1000 : undefined,
    trace_id: options?.traceId,
    doc_uri: options?.docUri,
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
    type: 'https://api.example.com/errors/rate-limited',
    title: 'Rate Limit Exceeded',
    status: 429,
    detail: `You have exceeded your ${opts.limit} requests-per-minute quota.`,
    code: 'ERR_RATE_LIMITED',
    is_retriable: true,
    retry_after_ms: waitMs,
    trace_id: opts.traceId,
    suggestions: [
      {
        action: 'wait_and_retry',
        payload: { wait_ms: waitMs },
      },
    ],
  });
}
