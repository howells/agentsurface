/**
 * Next.js 16 App Router error boundary + middleware for RFC 9457 responses
 * Canonical spec: https://www.rfc-editor.org/rfc/rfc9457.html
 * Use: Catch thrown errors in route handlers, format to Problem Details, return JSON
 *
 * <CUSTOMISE>
 * - Set the error domain and doc URLs in problem-details.ts
 * - Add custom error classes for domain-specific exceptions
 * </CUSTOMISE>
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ProblemCode, ProblemDetailsType, InvalidField } from "./problem-details";
import { internalProblem, problemDetails, problemDocUri, problemType } from "./problem-details";

/**
 * Domain error hierarchy for type-safe error handling
 */
export class DomainError extends Error {
  constructor(
    public code: ProblemCode,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("ERR_NOT_FOUND", 404, message, details);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("ERR_CONFLICT", 409, message, details);
    this.name = "ConflictError";
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = "Unauthorized", details?: Record<string, unknown>) {
    super("ERR_UNAUTHORIZED", 401, message, details);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = "Forbidden", details?: Record<string, unknown>) {
    super("ERR_FORBIDDEN", 403, message, details);
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends DomainError {
  constructor(
    message: string,
    public retryAfterMs: number = 60_000,
    details?: Record<string, unknown>,
  ) {
    super("ERR_RATE_LIMITED", 429, message, details);
    this.name = "RateLimitError";
  }
}

export class ValidationError extends DomainError {
  constructor(
    message: string,
    public invalidFields?: InvalidField[],
  ) {
    super("ERR_VALIDATION", 422, message);
    this.name = "ValidationError";
  }
}

/**
 * Generate a trace ID from X-Request-ID header or create a new one
 */
function getTraceId(req: NextRequest | Request): string {
  const headerTraceId = req.headers.get("x-request-id");
  if (headerTraceId) {
    return headerTraceId;
  }
  return `req-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Map thrown errors to RFC 9457 ProblemDetails.
 * A DomainError's message is written for callers, so it is returned as `detail`.
 * Anything else is unexpected: it is logged under the trace id and the body stays generic.
 */
function mapErrorToProblemDetails(err: unknown, traceId: string): ProblemDetailsType {
  if (err instanceof DomainError) {
    return problemDetails({
      code: err.code,
      detail: err.message,
      doc_uri: problemDocUri(err.code),
      invalid_fields: err instanceof ValidationError ? err.invalidFields : undefined,
      is_retriable: err instanceof RateLimitError,
      retry_after_ms: err instanceof RateLimitError ? err.retryAfterMs : undefined,
      status: err.statusCode,
      title: err.code.replace("ERR_", "").replace(/_/g, " "),
      trace_id: traceId,
      type: problemType(err.code),
    });
  }

  console.error(`[${traceId}] unhandled error in route handler`, err);
  return internalProblem(traceId);
}

/**
 * Higher-order function: wraps a route handler to catch errors and return RFC 9457 JSON
 *
 * Usage:
 * ```typescript
 * export const POST = withProblemDetails(async (req) => {
 *   const body = await req.json();
 *   if (!body.email) {
 *     throw new ValidationError('Email required', [
 *       { field: '/email', reason: 'Required field is missing', expected: 'An email address' },
 *     ]);
 *   }
 *   return NextResponse.json({ ok: true });
 * });
 * ```
 */
export function withProblemDetails(
  handler: (req: NextRequest) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    const traceId = getTraceId(req);

    try {
      return await handler(req);
    } catch (error) {
      const problem = mapErrorToProblemDetails(error, traceId);

      return NextResponse.json(problem, {
        headers: {
          "Content-Type": "application/problem+json",
          "X-Request-ID": traceId,
          ...(problem.is_retriable && problem.retry_after_ms
            ? { "Retry-After": String(Math.ceil(problem.retry_after_ms / 1000)) }
            : {}),
        },
        status: problem.status,
      });
    }
  };
}

/**
 * Proxy for Next.js 16 to attach traceId to requests (the `middleware.ts` convention was
 * renamed to `proxy.ts`). It receives only the request and returns a response; there is no
 * `next` callback. Mount in proxy.ts:
 *
 * ```typescript
 * import { errorMiddleware } from '@/lib/error-handler';
 * export const proxy = errorMiddleware;
 * export const config = { matcher: ['/api/:path*'] };
 * ```
 */
export function errorMiddleware(req: NextRequest): NextResponse {
  const traceId = getTraceId(req);

  // Clone headers and inject trace ID
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("X-Trace-ID", traceId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Global error.tsx boundary for uncaught errors in the app
 * Save to app/error.tsx
 *
 * ```typescript
 * 'use client';
 * import { useEffect } from 'react';
 * export default function Error({
 *   error,
 *   reset,
 * }: {
 *   error: Error & { digest?: string };
 *   reset: () => void;
 * }) {
 *   useEffect(() => {
 *     // Log to observability service
 *     console.error('Global error boundary:', error);
 *   }, [error]);
 *
 *   return (
 *     <div>
 *       <h1>Something went wrong</h1>
 *       <p>Request ID: {error.digest}</p>
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   );
 * }
 * ```
 */
