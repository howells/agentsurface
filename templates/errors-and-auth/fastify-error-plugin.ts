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

import fastifyPlugin from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from "fastify";
import type { ProblemDetails } from "./problem-details";
import { problemDetails } from "./problem-details";

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
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "FastifyDomainError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationErrorFastify extends FastifyDomainError {
  constructor(
    message: string,
    public fields?: { field: string; code: string; message: string }[],
  ) {
    super("ERR_VALIDATION", 422, message);
    this.name = "ValidationErrorFastify";
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
  traceId: string,
): ProblemDetails {
  // Handle validation errors from Fastify's built-in validator
  if ("validation" in err && Array.isArray((err as any).validation)) {
    const validationErrors = (err as any).validation.map(
      (v: { instancePath: string; keyword: string; message: string }) => ({
        code: v.keyword,
        field: v.instancePath || "root",
        message: v.message,
      }),
    );

    return problemDetails({
      code: "ERR_VALIDATION",
      detail: "One or more validation errors occurred",
      doc_uri: "https://api.example.com/docs/errors#ERR_VALIDATION",
      errors: validationErrors,
      status: 400,
      title: "Validation Failed",
      trace_id: traceId,
      type: "https://api.example.com/errors/ERR_VALIDATION",
    });
  }

  // Handle custom domain errors
  if (err instanceof FastifyDomainError) {
    const response = problemDetails({
      code: err.code,
      detail: err.message,
      doc_uri: `https://api.example.com/docs/errors#${err.code}`,
      status: err.statusCode,
      title: err.code.replace("ERR_", "").replace(/_/g, " "),
      trace_id: traceId,
      type: `https://api.example.com/errors/${err.code.toLowerCase()}`,
    });

    if (err instanceof ValidationErrorFastify && err.fields) {
      response.errors = err.fields;
    }

    return response;
  }

  // Handle FastifyError with statusCode
  if ("statusCode" in err) {
    const fastErr = err as FastifyError;
    return problemDetails({
      detail: fastErr.message,
      is_retriable: fastErr.statusCode >= 500,
      status: fastErr.statusCode || 500,
      title: "HTTP Error",
      trace_id: traceId,
      type: `https://api.example.com/errors/fastify_error`,
    });
  }

  // Fallback for generic errors
  return problemDetails({
    detail: err.message || "An unexpected error occurred",
    is_retriable: true,
    retry_after_ms: 1000,
    status: 500,
    title: "Internal Server Error",
    trace_id: traceId,
    type: "https://api.example.com/errors/internal_error",
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
      reply.header("Content-Type", "application/problem+json");
      reply.header("X-Request-ID", traceId);

      if (problemDetail.is_retriable && problemDetail.retry_after_ms) {
        reply.header("Retry-After", String(Math.ceil(problemDetail.retry_after_ms / 1000)));
      }

      // Log error for observability
      if (status >= 500) {
        fastify.log.error(
          {
            err,
            method: request.method,
            traceId,
            url: request.url,
          },
          "Unhandled server error",
        );
      }

      return reply.status(status).send(problemDetail);
    });

    // Decorator: helper to throw domain errors
    fastify.decorate("throwValidationError", (message: string, fields?: any) => {
      throw new ValidationErrorFastify(message, fields);
    });

    fastify.decorate("throwDomainError", (code: string, statusCode: number, message: string) => {
      throw new FastifyDomainError(code, statusCode, message);
    });
  },
  {
    name: "error-handler-plugin",
    version: "1.0.0",
  },
);

export default errorPlugin;

/**
 * TypeScript module augmentation for Fastify decorators
 */
declare module "fastify" {
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
