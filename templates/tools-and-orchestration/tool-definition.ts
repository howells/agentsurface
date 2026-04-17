/**
 * tool-definition.ts
 *
 * Canonical pattern for a single, agent-grade tool in TypeScript.
 * Demonstrates one tool exported three ways: (a) raw MCP format, (b) Claude Agent SDK,
 * (c) @openai/agents with strict: true.
 *
 * When to use: Define any tool that an agent will call. Follow this pattern for
 * consistency, portability, and AI-readiness.
 *
 * Key principles:
 * - Verb-first naming: search_docs, create_issue, update_config
 * - Descriptions read like onboarding; include "Use when..." and "Do not use for..."
 * - Zod schemas everywhere; flat structure; .strict() for OpenAI compatibility
 * - Every field described; enums exhaustive; examples in descriptions
 * - Errors returned in response, not thrown; include recovery hints
 * - Idempotency markers and token budget estimates in metadata
 *
 * Citation: https://www.anthropic.com/engineering/writing-tools-for-agents
 * MCP spec: https://modelcontextprotocol.io/specification/2025-11-25
 * OpenAI function calling: https://platform.openai.com/docs/guides/function-calling
 * Vercel AI SDK: https://ai-sdk.dev/docs/reference/ai-sdk-core/
 *
 * CUSTOMISE:
 * - Replace "search_docs" with your tool name (verb_noun)
 * - Update description with your use case
 * - Modify schema fields to match your API
 * - Point handler to your actual backend
 */

import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { tool as createVercelTool } from 'ai';
import { Tool as OpenAITool } from '@openai/agents';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================================================
// SHARED SCHEMA & METADATA (framework-neutral)
// ============================================================================

/**
 * Input schema using Zod for type safety.
 * Keep structure flat (1–2 levels max). Every field described + typed.
 * <CUSTOMISE> Replace with your actual parameters.
 */
const searchDocsSchema = z.object({
  query: z.string()
    .describe(
      'Free-text search query. Examples: "authentication", "rate limits", "error 429". ' +
      'Supports quoted phrases ("exact match") and field filters (status:draft).'
    ),
  limit: z.number().int().min(1).max(100).default(10)
    .describe('Max results to return. Default 10, maximum 100. Use lower values to reduce token spend.'),
  offset: z.number().int().min(0).default(0)
    .describe('Pagination offset for large result sets. Increment by limit to fetch next page.'),
  response_format: z.enum(['concise', 'detailed']).default('concise')
    .describe(
      'concise: title + URL only (low tokens). ' +
      'detailed: full snippet + metadata (higher tokens, better for analysis).'
    ),
}).strict(); // <CUSTOMISE> Ensure .strict() for OpenAI strict mode compatibility

type SearchDocsInput = z.infer<typeof searchDocsSchema>;

/**
 * Response schema (for reference). Not validated by the tool itself,
 * but documents what callers should expect.
 */
const searchDocsResponseSchema = z.object({
  results: z.array(z.object({
    id: z.string().describe('Semantic ID (not opaque)'),
    title: z.string(),
    url: z.string().describe('Full URL for direct access'),
    snippet: z.string().optional().describe('Matching excerpt (only in detailed mode)'),
    rank: z.number().describe('Relevance rank (0–100)'),
  })),
  has_more: z.boolean().describe('True if more results exist beyond limit'),
  next_offset: z.number().optional().describe('Offset for next page query'),
  total_count: z.number().describe('Total matching documents (estimate)'),
});

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Actual handler. Receives validated input; returns structured response or error.
 * Errors are returned as fields, never thrown (agent can reason about recovery).
 * <CUSTOMISE> Point to your backend service.
 */
async function searchDocsHandler(input: SearchDocsInput) {
  const { query, limit, offset, response_format } = input;

  try {
    // <CUSTOMISE> Call your actual search backend
    const response = await fetch('https://api.example.com/docs/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DOCS_API_KEY}`,
        'X-Trace-Id': crypto.randomUUID(), // Propagate trace for observability
      },
      body: JSON.stringify({
        query,
        limit: limit + 1, // Fetch one extra to detect has_more
        offset,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: {
          message: `Search API returned ${response.status}`,
          code: response.status === 401 ? 'AUTH_FAILED' : 'API_ERROR',
          is_retriable: response.status >= 500 || response.status === 429,
          suggestions: [
            response.status === 401
              ? 'Check DOCS_API_KEY environment variable and token expiry'
              : 'Service temporarily unavailable; retry in 30 seconds',
          ],
          doc_uri: 'https://docs.example.com/api-errors',
        },
      };
    }

    const data = await response.json();
    const results = data.results.slice(0, limit); // Truncate if we fetched extra
    const has_more = data.results.length > limit;

    return {
      success: true,
      results: results.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        url: doc.url,
        ...(response_format === 'detailed' && { snippet: doc.snippet }),
        rank: doc.relevance_score,
      })),
      has_more,
      next_offset: has_more ? offset + limit : undefined,
      total_count: data.total_count,
    };
  } catch (err: any) {
    return {
      success: false,
      error: {
        message: err.message || 'Unknown error during search',
        code: 'SEARCH_ERROR',
        is_retriable: true,
        suggestions: [
          'Check network connectivity',
          'Verify query syntax (no special chars, quoted phrases)',
          'Try simpler query or reduce limit',
        ],
        doc_uri: 'https://docs.example.com/search-guide',
      },
    };
  }
}

// ============================================================================
// METADATA (MCP 2025-11-25 annotations)
// ============================================================================

const toolMetadata = {
  name: 'search_docs',
  description: `Search internal documentation by keyword or phrase. Use this when the user asks to find setup guides, API references, troubleshooting steps, or any existing written knowledge. Do not use this for general web search (use web_search tool instead), to create new docs (use create_doc), or to modify existing docs (use update_doc). Returns results ranked by relevance. Requires DOCS_API_KEY environment variable.`,

  // Anthropic supports toModelOutput for token efficiency on large responses
  toModelOutput: (output: any) => {
    if (!output.success) return JSON.stringify(output);
    const summary = `Found ${output.total_count} matching docs. ` +
      `Top result: "${output.results[0]?.title}" (${output.results[0]?.url}). ` +
      `Use results[].id to fetch full content. ${output.has_more ? `More pages available.` : 'No additional pages.'}`;
    return summary;
  },

  // Token budget estimate (for agents doing cost optimization)
  _meta: {
    estimated_input_tokens: 200,
    estimated_output_tokens_per_result: 30, // Per doc in results
    idempotent: true, // Safe to call multiple times
    rate_limited: true, // May return 429; include backoff
  },
};

// ============================================================================
// EXPORT: RAW MCP SERVER
// ============================================================================

export function createMCPServer() {
  const server = new Server({
    name: 'docs-search-mcp',
    version: '1.0.0',
  });

  // <CUSTOMISE> Connect your actual handler
  server.tool(
    toolMetadata.name,
    toolMetadata.description,
    searchDocsSchema,
    searchDocsHandler,
    {
      readOnlyHint: true,          // Query-only, no mutations
      idempotentHint: true,        // Safe to retry
      openWorldHint: false,        // No side effects beyond this API
    }
  );

  return server;
}

// ============================================================================
// EXPORT: Claude Agent SDK (Anthropic)
// ============================================================================

export const claudeSearchDocsTool = {
  name: toolMetadata.name,
  description: toolMetadata.description,
  input_schema: searchDocsSchema,
  handler: searchDocsHandler,
  _meta: toolMetadata._meta,
};

// For use with @anthropic-ai/claude-agent-sdk:
// const agent = await query(
//   { prompt: 'Find docs on authentication' },
//   { tools: [claudeSearchDocsTool], allowedTools: ['search_docs'] }
// );

// ============================================================================
// EXPORT: Vercel AI SDK
// ============================================================================

export const vercelSearchDocsTool = createVercelTool({
  description: toolMetadata.description,
  parameters: zodToJsonSchema(searchDocsSchema) as Record<string, unknown>,
  execute: searchDocsHandler,
});

// For use with ai (Vercel):
// const { text } = await generateText({
//   model: openai('gpt-5.4'),
//   prompt: 'Find docs on authentication',
//   tools: { search_docs: vercelSearchDocsTool },
//   maxSteps: 5,
// });

// ============================================================================
// EXPORT: OpenAI Agents SDK (with strict: true)
// ============================================================================

export const openaiSearchDocsTool = new OpenAITool({
  name: toolMetadata.name,
  description: toolMetadata.description,
  // strict: true is enforced at Agent level, not per-tool
  parameters: zodToJsonSchema(searchDocsSchema) as Record<string, unknown>,
  execute: async (params: unknown) => {
    const validated = searchDocsSchema.parse(params);
    return await searchDocsHandler(validated);
  },
});

// For use with @openai/agents:
// const agent = new Agent({
//   model: 'gpt-5.4',
//   tools: [openaiSearchDocsTool],
// });
// const session = agent.createSession();
// const result = await session.run('Find docs on authentication');

// ============================================================================
// SHARED UTILITIES
// ============================================================================

/**
 * Type-safe tool input for external validation or testing.
 * Use in unit tests or agent evals.
 */
export type ToolInput = z.infer<typeof searchDocsSchema>;
export type ToolOutput = Awaited<ReturnType<typeof searchDocsHandler>>;

/**
 * Validate input against schema. Useful in middleware or evals.
 */
export function validateToolInput(input: unknown): { valid: true; data: ToolInput } | { valid: false; error: string } {
  try {
    const data = searchDocsSchema.parse(input);
    return { valid: true, data };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
