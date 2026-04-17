/**
 * Next.js 16 App Router error boundary + middleware for RFC 9457 responses
 * Canonical spec: https://www.rfc-editor.org/rfc/rfc9457.html
 * Use: Catch thrown errors in route handlers, format to Problem Details, return JSON
 *
 * <CUSTOMISE>
 * - Update error domain URLs to your service
 * - Add custom error classes for domain-specific exceptions
 * - Set your service's doc_uri base URL
 * </CUSTOMISE>
 */

import { NextRequest, NextResponse } from 'next/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ProblemDetails, problemDetails, toProblemResponse } from './problem-details';

/**
 * Domain error hierarchy for type-safe error handling
 */
export class DomainError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('ERR_NOT_FOUND', 404, message, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('ERR_CONFLICT', 409, message, details);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized', details?: Record<string, unknown>) {
    super('ERR_UNAUTHORIZED', 401, message, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = 'Forbidden', details?: Record<string, unknown>) {
    super('ERR_FORBIDDEN', 403, message, details);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends DomainError {
  constructor(
    message: string,
    public retryAfterMs: number = 60000,
    details?: Record<string, unknown>
  ) {
    super('ERR_RATE_LIMITED', 429, message, details);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public fields?: Array<{ field: string; code: string; message: string }>) {
    super('ERR_VALIDATION', 422, message);
    this.name = 'ValidationError';
  }
}

/**
 * Generate a trace ID from X-Request-ID header or create a new one
 */
function getTraceId(req: NextRequest | Request): string {
  const headerTraceId = req.headers.get('x-request-id');
  if (headerTraceId) return headerTraceId;
  return `req-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Map thrown errors to RFC 9457 ProblemDetails
 */
function mapErrorToProblemDetails(
  err: DomainError | Error | unknown,
  traceId: string
): ProblemDetails {
  if (err instanceof DomainError) {
    const baseProblem = problemDetails({
      type: `https://api.example.com/errors/${err.code.toLowerCase()}`,
      title: err.code.replace('ERR_', '').replace(/_/g, ' '),
      status: err.statusCode,
      detail: err.message,
      code: err.code,
      trace_id: traceId,
      doc_uri: `https://api.example.com/docs/errors#${err.code}`,
    });

    if (err instanceof RateLimitError) {
      baseProblem.is_retriable = true;
      baseProblem.retry_after_ms = err.retryAfterMs;
    } else if (err instanceof ValidationError && err.fields) {
      baseProblem.errors = err.fields;
    }

    return baseProblem;
  }

  // Generic error fallback
  const genericErr = toProblemResponse(err, { traceId });
  return genericErr;
}

/**
 * Higher-order function: wraps a route handler to catch errors and return RFC 9457 JSON
 *
 * Usage:
 * ```typescript
 * export const POST = withProblemDetails(async (req) => {
 *   if (!req.body.email) throw new ValidationError('Email required');
 *   return NextResponse.json({ ok: true });
 * });
 * ```
 */
export function withProblemDetails(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    const traceId = getTraceId(req);

    try {
      return await handler(req);
    } catch (err) {
      const problemDetails = mapErrorToProblemDetails(err, traceId);
      const status = problemDetails.status ?? 500;

      return NextResponse.json(problemDetails, {
        status,
        headers: {
          'Content-Type': 'application/problem+json',
          'X-Request-ID': traceId,
          ...(problemDetails.is_retriable && problemDetails.retry_after_ms
            ? { 'Retry-After': String(Math.ceil(problemDetails.retry_after_ms / 1000)) }
            : {}),
        },
      });
    }
  };
}

/**
 * Middleware for Next.js to attach traceId to requests
 * Mount in middleware.ts:
 *
 * ```typescript
 * import { errorMiddleware } from '@/lib/error-handler';
 * export const middleware = errorMiddleware;
 * export const config = { matcher: ['/api/:path*'] };
 * ```
 */
export function errorMiddleware(req: NextRequest): NextResponse {
  const traceId = getTraceId(req);

  // Clone headers and inject trace ID
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('X-Trace-ID', traceId);

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
 *       <p>{error.message}</p>
 *       <p>Request ID: {error.digest}</p>
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   );
 * }
 * ```
 */
