/**
 * Tool Loop with Vercel AI SDK v3+
 *
 * Minimal example of `generateText` and `streamText` tool loops using Vercel AI SDK.
 * Demonstrates `stopWhen: stepCountIs(10)` pattern, dynamic tool windowing via
 * `experimental_prepareStep`, and `smoothStream()` for token + tool-call streaming.
 * Error responses surface as RFC 9457 problem detail objects.
 *
 * When to use:
 * - Building a conversational agent that calls tools sequentially
 * - Streaming token + tool-call events to clients
 * - Limiting runaway loops with step count termination
 *
 * Canonical docs:
 * - Vercel AI SDK: https://sdk.vercel.ai/docs
 * - ToolLoopAgent: https://sdk.vercel.ai/docs/agents/tool-loop-agent
 * - RFC 9457 Problem Details: https://tools.ietf.org/html/rfc9457
 *
 * // <CUSTOMISE>
 * - Replace openai("gpt-4.1-mini") with your model
 * - Adjust stopWhen: stepCountIs(N) step limit
 * - Add your MCP/external tools to the tools map
 * - Customize system prompt for your domain
 */

import { openai } from "@ai-sdk/openai";
import type { ModelMessage, Tool } from "ai";
import { ToolLoopAgent, generateText, smoothStream, stepCountIs, streamText } from "ai";
import { z } from "zod";

/**
 * Example custom tool: fetch search results from external API.
 * In production, this would query a real search backend.
 */
const searchToolDefinition: Tool = {
  description: "Search for information across records and documents",
  execute: async ({ query, limit }) => {
    // <CUSTOMISE> Replace with real search backend
    console.log(`[search] query="${query}" limit=${limit}`);
    return {
      results: [
        {
          id: "result-1",
          title: "Sample Result",
          snippet: `Matched "${query}"`,
          source: "documents",
        },
      ],
      total: 1,
    };
  },
  parameters: z.object({
    query: z.string().describe("Search query string"),
    limit: z.number().int().min(1).max(50).optional().default(10),
  }),
};

/**
 * Example tool: create a record (WRITE action, not destructive).
 * Returns a draft ID for confirmation flow.
 */
const createRecordTool: Tool = {
  description: "Create a new record (ticket, order, task, etc.)",
  execute: async ({ type, title, description }) => {
    // <CUSTOMISE> Replace with real database insert
    const recordId = `${type}-${Date.now()}`;
    return {
      success: true,
      recordId,
      preview: {
        type,
        title,
        description: description || "(no description)",
      },
    };
  },
  parameters: z.object({
    type: z.enum(["ticket", "order", "task"]),
    title: z.string(),
    description: z.string().optional(),
  }),
};

/**
 * Non-streaming tool invocation: one synchronous round trip.
 * Useful for batch workflows or server-side processing.
 */
export async function runToolLoopSync(userMessage: string): Promise<string> {
  const messages: ModelMessage[] = [{ content: userMessage, role: "user" }];

  const result = await generateText({
    maxSteps: 10,
    messages,
    model: openai("gpt-4.1-mini"),
    stopWhen: stepCountIs(10), // Halt after 10 steps
    system:
      "You are a helpful assistant. Use tools to search and create records. " +
      "Always call search_tool first to gather information before creating records.",
    tools: {
      create_record: createRecordTool,
      search_tool: searchToolDefinition,
    },
  });

  return result.text;
}

/**
 * Streaming tool invocation: stream tokens and tool calls in real-time.
 * Wraps result in smoothStream() to merge token and tool events.
 */
export async function runToolLoopStream(userMessage: string) {
  const messages: ModelMessage[] = [{ content: userMessage, role: "user" }];

  const result = await streamText({
    experimental_transform: smoothStream(),
    maxSteps: 10,
    messages,
    model: openai("gpt-4.1-mini"),
    stopWhen: stepCountIs(10),
    system:
      "You are a helpful assistant. Use tools to search and create records. " +
      "Always call search_tool first to gather information before creating records.",
    tools: {
      create_record: createRecordTool,
      search_tool: searchToolDefinition,
    },
  });

  return result;
}

/**
 * Dynamic tool windowing via prepareStep (advanced).
 * The model sees only `maxTools` most-relevant tools per step.
 * This reduces context bloat and token cost for large tool registries.
 *
 * In production, pair with embedding-based tool selection (see toolpick.ts).
 */
import type { PrepareStepFunction } from "ai";

export function buildDynamicPrepareStep<T extends Record<string, Tool>>(
  maxTools: number,
  alwaysActive: string[] = [],
): PrepareStepFunction<T> {
  return async (input) => {
    const allToolNames = Object.keys(input.tools);
    const active = new Set(alwaysActive);

    // <CUSTOMISE>
    // Implement your tool selection logic here.
    // Example: compute relevance scores based on user message + conversation history
    const selectedNames = allToolNames.slice(0, maxTools);

    selectedNames.forEach((name) => active.add(name));

    return {
      tools: Object.fromEntries(
        [...active].map((name) => [name, input.tools[name as keyof T]]),
      ) as T,
    };
  };
}

/**
 * Agent with custom prepareStep for tool windowing.
 * The agent only "sees" up to `maxTools` tools per step.
 */
export async function runToolLoopWithWindowing(userMessage: string) {
  const messages: ModelMessage[] = [{ content: userMessage, role: "user" }];

  interface ToolMap {
    search_tool: typeof searchToolDefinition;
    create_record: typeof createRecordTool;
  }

  const agent = new ToolLoopAgent<ToolMap>({
    instructions: "You are a helpful assistant. Use tools to search and create records.",
    model: openai("gpt-4.1-mini"),
    onFinish: async () => {
      console.log("[agent] finished");
    },
    prepareStep: buildDynamicPrepareStep(2, ["search_tool"]),
    stopWhen: stepCountIs(10),
    tools: {
      create_record: createRecordTool,
      search_tool: searchToolDefinition,
    },
  });

  const result = await agent.stream({
    experimental_transform: smoothStream(),
    messages,
  });

  return result;
}

/**
 * Error handling: RFC 9457 Problem Detail response.
 * When a tool execution fails, wrap the error as a structured problem object.
 */
export interface ProblemDetail {
  type: string; // e.g., "https://example.com/errors/invalid-input"
  title: string; // e.g., "Invalid Input"
  status: number; // e.g., 400
  detail: string; // e.g., "The 'query' parameter is required"
  instance?: string; // Optional: URI identifying the specific occurrence
}

export function toolErrorToProblemDetail(error: unknown): ProblemDetail {
  if (error instanceof z.ZodError) {
    return {
      detail: error.errors[0]?.message || "Input validation failed",
      status: 400,
      title: "Validation Error",
      type: "https://api.example.com/errors/validation",
    };
  }

  if (error instanceof Error) {
    return {
      detail: error.message,
      status: 500,
      title: "Tool Execution Failed",
      type: "https://api.example.com/errors/tool-execution",
    };
  }

  return {
    detail: "An unexpected error occurred",
    status: 500,
    title: "Unknown Error",
    type: "https://api.example.com/errors/unknown",
  };
}
