/**
 * Fastify v5 plugin for RFC 9457 Problem Details error handling
 * Canonical spec: https://www.rfc-editor.org/rfc/rfc9457.html
 * Use: Decorate Fastify with automatic error formatting to application/problem+json
 *
 * <CUSTOMISE>
 * - Set the error domain and doc URLs in problem-details.ts
 * - Map your custom FastifyError subclasses to appropriate status codes
 * </CUSTOMISE>
 */

import fastifyPlugin from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from "fastify";
import type { ProblemCode, ProblemDetailsType, InvalidField } from "./problem-details";
import { internalProblem, problemDetails, problemDocUri, problemType } from "./problem-details";

/**
 * Fastify error hierarchy
 */
export class FastifyDomainError extends Error implements FastifyError {
  public statusCode: number;
  public code: ProblemCode;

  constructor(
    code: ProblemCode,
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
    public invalidFields?: InvalidField[],
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
): ProblemDetailsType {
  // Handle validation errors from Fastify's built-in validator
  if ("validation" in err && Array.isArray(err.validation)) {
    const invalidFields: InvalidField[] = err.validation.map((v) => ({
      field: v.instancePath || "/",
      reason: v.message ?? "Invalid value",
    }));

    return problemDetails({
      code: "ERR_VALIDATION",
      detail: "One or more validation errors occurred",
      doc_uri: problemDocUri("ERR_VALIDATION"),
      invalid_fields: invalidFields,
      is_retriable: false,
      status: 422,
      title: "Validation Failed",
      trace_id: traceId,
      type: problemType("ERR_VALIDATION"),
    });
  }

  // Handle custom domain errors. Their messages are written for callers, so they are safe to return.
  if (err instanceof FastifyDomainError) {
    return problemDetails({
      code: err.code,
      detail: err.message,
      doc_uri: problemDocUri(err.code),
      invalid_fields: err instanceof ValidationErrorFastify ? err.invalidFields : undefined,
      is_retriable: false,
      status: err.statusCode,
      title: err.code.replace("ERR_", "").replace(/_/g, " "),
      trace_id: traceId,
      type: problemType(err.code),
    });
  }

  // Fastify's own 4xx errors (malformed JSON, unsupported media type, body too large)
  // describe the request, not the server, so their message is safe to return.
  if ("statusCode" in err && err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return problemDetails({
      detail: err.message,
      is_retriable: false,
      status: err.statusCode,
      title: "Bad Request",
      trace_id: traceId,
    });
  }

  // Anything else is unexpected: the handler logs it, the body stays generic.
  return internalProblem(traceId);
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
    fastify.decorate("throwValidationError", (message: string, invalidFields?: InvalidField[]) => {
      throw new ValidationErrorFastify(message, invalidFields);
    });

    fastify.decorate(
      "throwDomainError",
      (code: ProblemCode, statusCode: number, message: string) => {
        throw new FastifyDomainError(code, statusCode, message);
      },
    );
  },
  {
    name: "error-handler-plugin",
  },
);

export default errorPlugin;

/**
 * TypeScript module augmentation for Fastify decorators
 */
declare module "fastify" {
  interface FastifyInstance {
    throwValidationError: (message: string, invalidFields?: InvalidField[]) => never;
    throwDomainError: (code: ProblemCode, statusCode: number, message: string) => never;
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
 *       { field: '/email', reason: 'Required field is missing', expected: 'An email address' },
 *     ]);
 *   }
 *   return { ok: true };
 * });
 * ```
 */
