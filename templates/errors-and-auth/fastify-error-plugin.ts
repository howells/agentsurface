/**
 * Fastify v5 plugin for RFC 9457 Problem Details error handling
 * Canonical spec: https://www.rfc-editor.org/rfc/rfc9457.html
 * Use: Decorate Fastify with automatic error formatting to application/problem+json
 *
 * <CUSTOMISE>
 * - Update error domain URLs to your service
 * - Map your custom FastifyError subclasses to appropriate status codes
 * - Set your doc_uri base URL
 * </CUSTOMISE>
 */

import fastifyPlugin from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { ProblemDetails, problemDetails } from './problem-details';

/**
 * Fastify error hierarchy
 */
export class FastifyDomainError extends Error implements FastifyError {
  public statusCode: number;
  public code: string;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FastifyDomainError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationErrorFastify extends FastifyDomainError {
  constructor(message: string, public fields?: Array<{ field: string; code: string; message: string }>) {
    super('ERR_VALIDATION', 422, message);
    this.name = 'ValidationErrorFastify';
  }
}

/**
 * Generate trace ID from request
 */
function getTraceId(request: FastifyRequest): string {
  return request.id || `req-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Map Fastify errors and custom domain errors to RFC 9457 ProblemDetails
 */
function mapFastifyErrorToProblemDetails(
  err: FastifyError | Error,
  traceId: string
): ProblemDetails {
  // Handle validation errors from Fastify's built-in validator
  if ('validation' in err && Array.isArray((err as any).validation)) {
    const validationErrors = (err as any).validation.map(
      (v: { instancePath: string; keyword: string; message: string }) => ({
        field: v.instancePath || 'root',
        code: v.keyword,
        message: v.message,
      })
    );

    return problemDetails({
      type: 'https://api.example.com/errors/ERR_VALIDATION',
      title: 'Validation Failed',
      status: 400,
      detail: 'One or more validation errors occurred',
      code: 'ERR_VALIDATION',
      trace_id: traceId,
      doc_uri: 'https://api.example.com/docs/errors#ERR_VALIDATION',
      errors: validationErrors,
    });
  }

  // Handle custom domain errors
  if (err instanceof FastifyDomainError) {
    const response = problemDetails({
      type: `https://api.example.com/errors/${err.code.toLowerCase()}`,
      title: err.code.replace('ERR_', '').replace(/_/g, ' '),
      status: err.statusCode,
      detail: err.message,
      code: err.code,
      trace_id: traceId,
      doc_uri: `https://api.example.com/docs/errors#${err.code}`,
    });

    if (err instanceof ValidationErrorFastify && err.fields) {
      response.errors = err.fields;
    }

    return response;
  }

  // Handle FastifyError with statusCode
  if ('statusCode' in err) {
    const fastErr = err as FastifyError;
    return problemDetails({
      type: `https://api.example.com/errors/fastify_error`,
      title: 'HTTP Error',
      status: fastErr.statusCode || 500,
      detail: fastErr.message,
      trace_id: traceId,
      is_retriable: fastErr.statusCode >= 500,
    });
  }

  // Fallback for generic errors
  return problemDetails({
    type: 'https://api.example.com/errors/internal_error',
    title: 'Internal Server Error',
    status: 500,
    detail: err.message || 'An unexpected error occurred',
    trace_id: traceId,
    is_retriable: true,
    retry_after_ms: 1000,
  });
}

/**
 * Fastify plugin: registers error handler and decorates reply with error helpers
 */
const errorPlugin = fastifyPlugin(
  async (fastify: FastifyInstance) => {
    // Set global error handler
    fastify.setErrorHandler(async (err: any, request: FastifyRequest, reply: FastifyReply) => {
      const traceId = getTraceId(request);
      const problemDetail = mapFastifyErrorToProblemDetails(err, traceId);

      const status = problemDetail.status || 500;

      // Set headers
      reply.header('Content-Type', 'application/problem+json');
      reply.header('X-Request-ID', traceId);

      if (problemDetail.is_retriable && problemDetail.retry_after_ms) {
        reply.header('Retry-After', String(Math.ceil(problemDetail.retry_after_ms / 1000)));
      }

      // Log error for observability
      if (status >= 500) {
        fastify.log.error(
          {
            err,
            traceId,
            method: request.method,
            url: request.url,
          },
          'Unhandled server error'
        );
      }

      return reply.status(status).send(problemDetail);
    });

    // Decorator: helper to throw domain errors
    fastify.decorate('throwValidationError', (message: string, fields?: any) => {
      throw new ValidationErrorFastify(message, fields);
    });

    fastify.decorate('throwDomainError', (code: string, statusCode: number, message: string) => {
      throw new FastifyDomainError(code, statusCode, message);
    });
  },
  {
    name: 'error-handler-plugin',
    version: '1.0.0',
  }
);

export default errorPlugin;

/**
 * TypeScript module augmentation for Fastify decorators
 */
declare module 'fastify' {
  interface FastifyInstance {
    throwValidationError: (message: string, fields?: any) => never;
    throwDomainError: (code: string, statusCode: number, message: string) => never;
  }
}

/**
 * Example usage in a route:
 *
 * ```typescript
 * fastify.post<{ Body: { email: string } }>('/users', async (request, reply) => {
 *   const { email } = request.body;
 *   if (!email) {
 *     fastify.throwValidationError('Email is required', [
 *       { field: 'email', code: 'required', message: 'Email is required' },
 *     ]);
 *   }
 *   return { ok: true };
 * });
 * ```
 */
