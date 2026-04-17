/**
 * MCP tool error handling via RFC 9457 Problem Details
 * Canonical spec: https://modelcontextprotocol.io/specification/2025-11-25
 * Use: Return structured errors from MCP tools as { isError: true, content: [...] }
 *
 * <CUSTOMISE>
 * - Update error domain URLs to your service
 * - Map your custom error classes to problem detail types
 * </CUSTOMISE>
 */

import type { TextContent, ToolResultBlockParam } from '@modelcontextprotocol/sdk/types';
import { ProblemDetails, problemDetails } from './problem-details';

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

/**
 * Map thrown errors to RFC 9457 ProblemDetails JSON
 */
function mapErrorToProblemDetails(err: Error | unknown, traceId: string): ProblemDetails {
  const message = err instanceof Error ? err.message : String(err);

  // Detect error patterns
  const isValidation = message.match(/validation|invalid|required/i);
  const isNotFound = message.match(/not found|not exist|404/i);
  const isNetwork = message.match(/timeout|econnrefused|network/i);
  const isAuth = message.match(/unauthorized|forbidden|auth/i);

  let statusCode = 500;
  let code = 'ERR_INTERNAL';
  let type = 'https://api.example.com/errors/internal_error';

  if (isValidation) {
    statusCode = 422;
    code = 'ERR_VALIDATION';
    type = 'https://api.example.com/errors/ERR_VALIDATION';
  } else if (isNotFound) {
    statusCode = 404;
    code = 'ERR_NOT_FOUND';
    type = 'https://api.example.com/errors/ERR_NOT_FOUND';
  } else if (isAuth) {
    statusCode = 401;
    code = 'ERR_UNAUTHORIZED';
    type = 'https://api.example.com/errors/ERR_UNAUTHORIZED';
  } else if (isNetwork) {
    statusCode = 503;
    code = 'ERR_UNAVAILABLE';
    type = 'https://api.example.com/errors/ERR_UNAVAILABLE';
  }

  return problemDetails({
    type,
    title: code.replace('ERR_', '').replace(/_/g, ' '),
    status: statusCode,
    detail: message,
    code,
    trace_id: traceId,
    is_retriable: statusCode >= 500 || isNetwork,
    retry_after_ms: isNetwork ? 5000 : undefined,
    doc_uri: `https://api.example.com/docs/errors#${code}`,
  });
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
 *       if (!input.id) throw new Error('ID is required');
 *       const user = await db.getUser(input.id);
 *       return toolOk({ user });
 *     } catch (err) {
 *       return toolError({ error: err });
 *     }
 *   },
 * };
 * ```
 */
export function toolError(opts: {
  error: Error | unknown;
  traceId?: string;
}): MCPToolErrorResult {
  const traceId = opts.traceId || generateTraceId();
  const problemDetail = mapErrorToProblemDetails(opts.error, traceId);

  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(problemDetail),
      },
    ],
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
export function toolOk(data: unknown, opts?: { traceId?: string }): MCPToolOkResult {
  return {
    isError: false,
    content: [
      {
        type: 'text',
        text: JSON.stringify(data),
      },
    ],
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
  traceId?: string
): (input: any) => Promise<MCPToolResult> {
  return async (input: any) => {
    const id = traceId || generateTraceId();
    try {
      const result = await handler(input);
      return toolOk(result, { traceId: id });
    } catch (err) {
      return toolError({ error: err, traceId: id });
    }
  };
}

/**
 * MCP SDK v1 (TypeScript SDK) style wrapper
 * If using @modelcontextprotocol/sdk:
 *
 * ```typescript
 * import { Tool } from '@modelcontextprotocol/sdk/types';
 * import { withToolErrorHandling, toolOk } from './mcp-tool-error';
 *
 * const myTool: Tool = {
 *   name: 'fetch_data',
 *   description: 'Fetch data by ID',
 *   inputSchema: { type: 'object', properties: { id: { type: 'string' } } },
 *   execute: withToolErrorHandling(async (input) => {
 *     if (!input.id) throw new Error('ID is required');
 *     const data = await fetchData(input.id);
 *     return toolOk({ data });
 *   }),
 * };
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
 *           type: 'tool_result',
 *           content: [{ type: 'text', text: JSON.stringify(result) }],
 *         },
 *         id,
 *       };
 *     }
 *   } catch (err) {
 *     const errorResult = toolError({ error: err });
 *     return {
 *       jsonrpc: '2.0',
 *       result: {
 *         type: 'tool_result',
 *         ...errorResult,
 *       },
 *       id,
 *     };
 *   }
 * }
 * ```
 */
