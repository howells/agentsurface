/**
 * MCP Server (stdio) - Minimal canonical implementation
 *
 * Canonical spec: https://modelcontextprotocol.io/specification/2026-07-28
 * SDK: @modelcontextprotocol/server (v2, implements the 2026-07-28 spec)
 * Transport: stdio (local, single connection, trusted)
 * Authentication: OS-level (trust delegated to host process)
 *
 * 2026-07-28 dropped the initialize/notifications/initialized handshake and
 * the Mcp-Session-Id concept everywhere, including stdio - every request now
 * carries its own protocol version in `_meta`. Servers must implement
 * `server/discover` (McpServer answers it for you) so a client can probe
 * supported versions up front; clients may skip calling it. `serveStdio` owns
 * that decision per connection: it serves 2026-07-28 clients and, by default,
 * clients that still open with the 2025 handshake, from the same factory.
 *
 * When to use:
 * - Local development and testing
 * - Desktop agent integrations (Claude Desktop, ChatGPT desktop)
 * - Deployment as npm package or script
 * - Scenarios where single connection is acceptable
 *
 * When NOT to use:
 * - Multi-client, multi-tenant scenarios → use Streamable HTTP instead
 * - Horizontally scaled services → use Streamable HTTP instead
 * - Remote agents across network boundaries → use Streamable HTTP instead
 *
 * Customization checklist:
 * ✓ Update server name and version
 * ✓ Add/remove tools in createServer()
 * ✓ Update resource URIs and MIME types in createServer()
 * ✓ Add prompts if needed
 * ✓ Implement actual tool handlers (currently stubs)
 * ✓ Add structured logging
 * ✓ Test with InMemoryTransport.createLinkedPair()
 */

import { setTimeout as sleep } from "node:timers/promises";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import type { ServerContext, TextContent } from "@modelcontextprotocol/server";
import { z } from "zod";

// ===== Structured Logging =====

class Logger {
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: Record<string, unknown>): void {
    console.error(
      JSON.stringify({
        context: this.context,
        level: "INFO",
        message,
        timestamp: new Date().toISOString(),
        ...(data && { data }),
      }),
    );
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    console.error(
      JSON.stringify({
        context: this.context,
        error: error?.message,
        level: "ERROR",
        message,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        ...(data && { data }),
      }),
    );
  }
}

const logger = new Logger("mcp-server");

// ===== Input Schemas (Zod) =====

const searchDocsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10).describe("Maximum results to return"),
  query: z.string().min(1).describe("Search term (any string)"),
});

const createIssueSchema = z.object({
  assignee: z.string().optional().describe("User ID of assignee (optional)"),
  description: z.string().describe("Detailed description of the issue"),
  priority: z
    .enum(["low", "medium", "high", "critical"])
    .default("medium")
    .describe("Issue priority level"),
  title: z.string().min(1).describe("Issue title"),
});

// Clients give up on a request after 60 seconds by default, so the wait is
// capped below that. A build that needs longer returns "still running" and the
// model calls again; use the tasks extension for anything it should not poll.
const waitForBuildSchema = z.object({
  build_id: z.string().describe("Build identifier"),
  timeout_seconds: z
    .number()
    .int()
    .min(5)
    .max(50)
    .default(45)
    .describe("Maximum seconds to wait, at most 50"),
});

// ===== Tool Handlers =====

/**
 * search_docs: Read-only tool to search documentation
 *
 * Demonstrates:
 * - readOnlyHint annotation
 * - openWorldHint for arbitrary string inputs
 * - Structured error handling with isError: true
 * - outputSchema for structured results
 */
async function handleSearchDocs(input: z.infer<typeof searchDocsSchema>): Promise<{
  content: TextContent[];
  isError?: boolean;
}> {
  logger.info("search_docs called", { limit: input.limit, query: input.query });

  try {
    // Stub: in production, query a documentation index
    const mockResults = [
      {
        relevance: 0.95,
        title: "Getting Started with MCP",
        url: "https://modelcontextprotocol.io/docs/getting-started",
      },
      {
        relevance: 0.87,
        title: "Tool Design Best Practices",
        url: "https://www.anthropic.com/research/writing-tools-for-agents",
      },
    ].slice(0, input.limit);

    return {
      content: [
        {
          text: JSON.stringify(mockResults),
          type: "text",
        },
      ],
    };
  } catch (error) {
    // The cause goes to the log; the model gets something it can act on
    logger.error("search_docs failed", error as Error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            type: "https://api.example.com/errors/service-unavailable",
            title: "Search Unavailable",
            status: 503,
            detail: "The documentation index could not be searched.",
            is_retriable: true,
            retry_after_ms: 5000,
          }),
        },
      ],
      isError: true,
    };
  }
}

/**
 * create_issue: Non-idempotent write tool
 *
 * Demonstrates:
 * - destructiveHint: false (it only adds; nothing is deleted or overwritten)
 * - idempotentHint: false (each call creates a new issue; only advertise
 *   idempotentHint: true if the handler really deduplicates repeat calls)
 * - Validation before execution
 * - RFC 9457-style error payload
 */
async function handleCreateIssue(input: z.infer<typeof createIssueSchema>): Promise<{
  content: TextContent[];
  isError?: boolean;
}> {
  logger.info("create_issue called", {
    priority: input.priority,
    title: input.title,
  });

  try {
    // Stub: in production, persist to issue tracker
    const issueId = `ISSUE-${crypto.randomUUID()}`;

    return {
      content: [
        {
          text: JSON.stringify({
            id: issueId,
            title: input.title,
            priority: input.priority,
            created_at: new Date().toISOString(),
          }),
          type: "text",
        },
      ],
    };
  } catch (error) {
    logger.error("create_issue failed", error as Error);
    return {
      content: [
        {
          type: "text",
          // The cause is in the log. Not retriable: the issue may have been created.
          text: JSON.stringify({
            type: "https://api.example.com/errors/internal-error",
            title: "Issue Creation Failed",
            status: 500,
            detail:
              "The issue tracker failed part-way. Check whether the issue exists before trying again.",
            is_retriable: false,
          }),
        },
      ],
      isError: true,
    };
  }
}

/**
 * wait_for_build: Long-running tool, hand-rolled polling loop
 *
 * This tool blocks inside the handler and polls with exponential backoff.
 * As of 2026-07-28, the spec-native way to model a long-running operation is
 * the io.modelcontextprotocol/tasks extension: a tool call returns a task
 * handle, the client polls it with tasks/get, and can push input with
 * tasks/update. Reach for that extension when a client needs to observe
 * progress or cancel independently; this in-handler loop is the simpler
 * option when the client is content to just wait for the final result.
 *
 * The loop stops as soon as the client cancels the request, so an abandoned
 * call does not keep polling the build system.
 */
async function handleWaitForBuild(
  input: z.infer<typeof waitForBuildSchema>,
  ctx: ServerContext,
): Promise<{
  content: TextContent[];
  isError?: boolean;
}> {
  logger.info("wait_for_build called", {
    build_id: input.build_id,
    timeout_seconds: input.timeout_seconds,
  });

  const { signal } = ctx.mcpReq;
  const startTime = Date.now();
  const deadline = startTime + input.timeout_seconds * 1000;

  // Stub: poll build status until completion, timeout or cancellation
  let pollCount = 0;
  let backoffMs = 500;

  while (Date.now() < deadline && !signal.aborted) {
    pollCount++;
    logger.info("build_poll", {
      build_id: input.build_id,
      elapsed_ms: Date.now() - startTime,
      poll_count: pollCount,
    });

    // Stub: in production, query CI/CD system
    const status = pollCount > 3 ? "completed" : "in_progress";

    if (status === "completed") {
      return {
        content: [
          {
            text: JSON.stringify({
              build_id: input.build_id,
              status: "success",
              duration_seconds: Math.round((Date.now() - startTime) / 1000),
              artifacts: [
                {
                  name: "app.wasm",
                  url: "s3://builds/app-1.0.wasm",
                },
              ],
            }),
            type: "text",
          },
        ],
      };
    }

    // Wait, doubling each time (500ms, 1s, 2s ... capped at 10s), never past
    // the deadline, and wake at once if the client cancels.
    const waitMs = Math.min(backoffMs, deadline - Date.now());
    backoffMs = Math.min(backoffMs * 2, 10_000);
    try {
      await sleep(waitMs, undefined, { signal });
    } catch (error) {
      // Cancellation ends the wait early; anything else is a real failure.
      if (!signal.aborted) {
        throw error;
      }
    }
  }

  // Still running: not a failure of the build, so say what to do next
  return {
    content: [
      {
        text: JSON.stringify({
          type: "https://api.example.com/errors/timeout",
          title: "Build Still Running",
          status: 504,
          detail: `Build ${input.build_id} did not complete within ${input.timeout_seconds}s.`,
          is_retriable: true,
          suggestions: ["Call wait_for_build again with the same build_id."],
        }),
        type: "text",
      },
    ],
    isError: true,
  };
}

// ===== Server Factory =====

// `serveStdio` calls this once per connection.
// Tasks moved out of core into the io.modelcontextprotocol/tasks extension;
// declare it under `extensions` rather than a core `tasks` capability, and
// only when you actually implement tasks/get + tasks/update polling.
function createServer(): McpServer {
  const server = new McpServer({
    name: "example-agent-api",
    version: "1.0.0",
  });

  // ===== Tool Registration =====

  server.registerTool(
    "search_docs",
    {
      description:
        "Search project documentation by keyword. Use when you need to find relevant docs or API references. Accepts any search term. Returns up to 50 results ranked by relevance.",
      inputSchema: searchDocsSchema,
      annotations: {
        openWorldHint: true,
        readOnlyHint: true,
      },
    },
    handleSearchDocs,
  );

  server.registerTool(
    "create_issue",
    {
      description:
        "Create a new issue in the project tracker. Use when you need to report a bug, request a feature, or log a task. Do not use for general communication. Each call creates a new issue; issues cannot be edited through this server.",
      inputSchema: createIssueSchema,
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
        readOnlyHint: false,
      },
    },
    handleCreateIssue,
  );

  server.registerTool(
    "wait_for_build",
    {
      description:
        "Poll and wait for a CI/CD build to complete. Use when you need to monitor long-running build processes. Returns build status, duration, and artifact URLs. Blocks until completion or timeout (at most 50 seconds); on timeout, call it again with the same build_id. This tool polls internally rather than using the io.modelcontextprotocol/tasks extension - reach for that extension instead when a client should be able to check progress independently.",
      inputSchema: waitForBuildSchema,
      annotations: {
        openWorldHint: true,
        readOnlyHint: true,
      },
    },
    handleWaitForBuild,
  );

  // ===== Resource Handlers =====

  /**
   * Resources: Static data exposed via stable URIs.
   * Agents can query these without tool invocation.
   */
  server.registerResource(
    "api-docs",
    "config://api-docs",
    { description: "API Documentation Overview", mimeType: "text/markdown" },
    async () => {
      const docs = `# API Documentation

## Tools

### search_docs
Search project documentation.

### create_issue
Create a new issue.

### wait_for_build
Monitor CI/CD builds.

## Resources

- config://api-docs - this document
- config://schemas - JSON Schema definitions

## Prompts

- analyze_thread - analyze a discussion thread

See https://modelcontextprotocol.io/specification/2026-07-28 for spec details.
`;

      return {
        contents: [
          {
            mimeType: "text/markdown",
            text: docs,
            uri: "config://api-docs",
          },
        ],
      };
    },
  );

  server.registerResource(
    "schemas",
    "config://schemas",
    { description: "Tool input schemas (JSON Schema)", mimeType: "application/json" },
    async () => {
      // Generated from the Zod schemas the tools validate with, so they cannot drift
      const schemas = {
        CreateIssueInput: z.toJSONSchema(createIssueSchema),
        SearchDocsInput: z.toJSONSchema(searchDocsSchema),
        WaitForBuildInput: z.toJSONSchema(waitForBuildSchema),
      };

      return {
        contents: [
          {
            mimeType: "application/json",
            text: JSON.stringify(schemas, null, 2),
            uri: "config://schemas",
          },
        ],
      };
    },
  );

  // ===== Prompt Handlers =====

  /**
   * Prompts: Re-usable workflow templates parameterized by client.
   */
  server.registerPrompt(
    "analyze_thread",
    {
      description:
        "Analyze a discussion thread for sentiment, consensus, and action items. Use when you need to summarize multi-person conversations.",
      argsSchema: z.object({
        max_messages: z.string().optional().describe("Maximum messages to analyze (default 100)"),
        thread_id: z.string().describe("The unique identifier of the thread"),
      }),
    },
    async (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Analyze thread ${args.thread_id} (up to ${args.max_messages ?? "100"} messages) for: 1) overall sentiment, 2) consensus points, 3) open action items, 4) key blockers. Format as markdown with sections.`,
          },
        },
      ],
    }),
  );

  return server;
}

// ===== Connection & Transport =====

serveStdio(createServer, {
  onerror: (error) => {
    logger.error("server error", error);
  },
});
logger.info("serving on stdio");
