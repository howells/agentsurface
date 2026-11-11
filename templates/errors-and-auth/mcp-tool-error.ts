/**
 * MCP tool error handling via RFC 9457 Problem Details
 * Canonical spec: https://modelcontextprotocol.io/specification/2026-07-28
 * Use: Return structured errors from MCP tools as { isError: true, content: [...] }
 *
 * <CUSTOMISE>
 * - Set the error domain and doc URLs in problem-details.ts
 * - Throw ToolError from your handlers for every failure the model should act on
 * </CUSTOMISE>
 */

import type { TextContent } from "@modelcontextprotocol/server";
import type { ProblemCode, ProblemDetailsType, InvalidField } from "./problem-details";
import { internalProblem, problemDetails, problemDocUri, problemType } from "./problem-details";

/**
 * Tool result with error flag
 */
interface MCPToolErrorResult {
  isError: true;
  content: TextContent[];
}

interface MCPToolOkResult {
  isError?: false;
  content: TextContent[];
}

export type MCPToolResult = MCPToolErrorResult | MCPToolOkResult;

/**
 * Generate a trace ID for correlation
 */
function generateTraceId(): string {
  return `tool-${crypto.randomUUID().slice(0, 12)}`;
}

const STATUS_BY_CODE: Record<ProblemCode, number> = {
  ERR_CONFLICT: 409,
  ERR_FORBIDDEN: 403,
  ERR_INTERNAL: 500,
  ERR_NOT_FOUND: 404,
  ERR_RATE_LIMITED: 429,
  ERR_TIMEOUT: 504,
  ERR_UNAUTHORIZED: 401,
  ERR_UNAVAILABLE: 503,
  ERR_UNPROCESSABLE: 422,
  ERR_VALIDATION: 422,
};

/**
 * An error the model can act on. Throw this from a tool handler; its message is
 * returned to the model, so write it for the caller and keep internals out of it.
 * The category comes from `code`, never from matching words in a message.
 */
export class ToolError extends Error {
  constructor(
    public code: ProblemCode,
    message: string,
    public options: {
      invalidFields?: InvalidField[];
      /** Set when retrying the same call unchanged can succeed. */
      retryAfterMs?: number;
      suggestions?: string[];
    } = {},
  ) {
    super(message);
    this.name = "ToolError";
  }
}

/**
 * Map thrown errors to RFC 9457 ProblemDetails JSON.
 * Anything that is not a ToolError is unexpected: it is logged to stderr (stdout
 * is the protocol channel under stdio) and the model sees a generic problem.
 */
function mapErrorToProblemDetails(err: unknown, traceId: string): ProblemDetailsType {
  if (err instanceof ToolError) {
    return problemDetails({
      code: err.code,
      detail: err.message,
      doc_uri: problemDocUri(err.code),
      invalid_fields: err.options.invalidFields,
      is_retriable: err.options.retryAfterMs !== undefined,
      retry_after_ms: err.options.retryAfterMs,
      status: STATUS_BY_CODE[err.code],
      suggestions: err.options.suggestions,
      title: err.code.replace("ERR_", "").replace(/_/g, " "),
      trace_id: traceId,
      type: problemType(err.code),
    });
  }

  console.error(`[${traceId}] unhandled error in tool handler`, err);
  return internalProblem(traceId);
}

/**
 * Build an MCP tool error result
 *
 * Usage:
 * ```typescript
 * export const myTool: Tool = {
 *   name: 'fetch_user',
 *   description: 'Fetch a user by ID',
 *   inputSchema: { type: 'object', properties: { id: { type: 'string' } } },
 *   execute: async (input: any) => {
 *     try {
 *       const user = await db.getUser(input.id);
 *       if (!user) throw new ToolError('ERR_NOT_FOUND', `No user has id ${input.id}`);
 *       return toolOk({ user });
 *     } catch (err) {
 *       return toolError({ error: err });
 *     }
 *   },
 * };
 * ```
 */
export function toolError(opts: { error: unknown; traceId?: string }): MCPToolErrorResult {
  const traceId = opts.traceId || generateTraceId();
  const problemDetail = mapErrorToProblemDetails(opts.error, traceId);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(problemDetail),
      },
    ],
    isError: true,
  };
}

/**
 * Build an MCP tool success result
 *
 * Usage:
 * ```typescript
 * return toolOk({ user });
 * ```
 */
export function toolOk(data: unknown): MCPToolOkResult {
  return {
    content: [
      {
        type: "text",
        // A handler that returns nothing still needs text: JSON.stringify(undefined) is undefined
        text: JSON.stringify(data ?? null),
      },
    ],
    isError: false,
  };
}

/**
 * Wrapper to auto-handle errors in an async tool handler
 *
 * Usage:
 * ```typescript
 * execute: withToolErrorHandling(async (input: any) => {
 *   const user = await db.getUser(input.id);
 *   return { user };
 * }),
 * ```
 */
export function withToolErrorHandling(
  handler: (input: any) => Promise<unknown> | unknown,
): (input: any) => Promise<MCPToolResult> {
  return async (input: any) => {
    try {
      return toolOk(await handler(input));
    } catch (error) {
      return toolError({ error });
    }
  };
}

/**
 * MCP TypeScript SDK v2 style wrapper
 * If using `@modelcontextprotocol/server` (v2 replaced the monolithic
 * `@modelcontextprotocol/sdk` package with separate server/client packages):
 *
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/server';
 * import { z } from 'zod';
 * import { ToolError, withToolErrorHandling } from './mcp-tool-error';
 *
 * const server = new McpServer({ name: 'example', version: '1.0.0' });
 *
 * server.registerTool(
 *   'fetch_data',
 *   {
 *     description: 'Fetch data by ID',
 *     inputSchema: z.object({ id: z.string() }), // a Zod (Standard Schema) object, not raw JSON Schema
 *   },
 *   // The wrapper builds the MCP content envelope itself: return plain data, not toolOk(...)
 *   withToolErrorHandling(async (input: { id: string }) => {
 *     const data = await fetchData(input.id);
 *     if (!data) throw new ToolError('ERR_NOT_FOUND', `Nothing has id ${input.id}`);
 *     return { data };
 *   }),
 * );
 * ```
 */

/**
 * Manual JSON-RPC 2.0 style (for low-level integrations)
 *
 * ```typescript
 * function handleToolCall(jsonRpcCall: { method: string; params: any; id: string }) {
 *   const { method, params, id } = jsonRpcCall;
 *
 *   try {
 *     if (method === 'tools/call') {
 *       const result = toolHandler[params.name](params.arguments);
 *       return {
 *         jsonrpc: '2.0',
 *         result: {
 *           content: [{ type: 'text', text: JSON.stringify(result) }],
 *         },
 *         id,
 *       };
 *     }
 *   } catch (err) {
 *     const errorResult = toolError({ error: err });
 *     return {
 *       jsonrpc: '2.0',
 *       result: errorResult, // { isError: true, content: [...] }
 *       id,
 *     };
 *   }
 * }
 * ```
 */
