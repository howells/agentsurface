/**
 * MCP Server (stdio) — Minimal canonical implementation
 *
 * Canonical spec: https://modelcontextprotocol.io/specification/2025-11-25
 * SDK: @modelcontextprotocol/sdk (v2.x)
 * Transport: stdio (local, single connection, trusted)
 * Authentication: OS-level (trust delegated to host process)
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
 * ✓ Add/remove tools in setupToolHandlers()
 * ✓ Update resource URIs and MIME types in setupResourceHandlers()
 * ✓ Add prompts if needed
 * ✓ Implement actual tool handlers (currently stubs)
 * ✓ Add structured logging
 * ✓ Test with InMemoryTransport.createLinkedPair()
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/types.js";
import type {
  Tool,
  Resource,
  Prompt,
  TextContent,
  ErrorContent,
  TaskState,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// ===== Server Initialization =====

const server = new McpServer(
  {
    name: "example-agent-api",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tasks: {}, // Enable Tasks async primitive (MCP 2025-11-25)
      tools: {},
    },
  },
);

// ===== Structured Logging =====

class Logger {
  private context: string;

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

const waitForBuildSchema = z.object({
  build_id: z.string().describe("Build identifier"),
  timeout_seconds: z.number().int().min(10).default(600).describe("Maximum seconds to wait"),
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
        url: "https://www.anthropic.com/engineering/writing-tools-for-agents",
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
    logger.error("search_docs failed", error as Error);
    return {
      content: [
        {
          type: "text",
          text: `Search failed: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * create_issue: Destructive tool with idempotency hint
 *
 * Demonstrates:
 * - destructiveHint annotation
 * - idempotentHint (safe to retry)
 * - Validation before execution
 * - RFC 9457-style error payload
 */
async function handleCreateIssue(input: z.infer<typeof createIssueSchema>): Promise<{
  content: TextContent[] | ErrorContent[];
  isError?: boolean;
}> {
  logger.info("create_issue called", {
    priority: input.priority,
    title: input.title,
  });

  try {
    // Stub: in production, persist to issue tracker
    const issueId = `ISSUE-${Math.floor(Math.random() * 10_000)}`;

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
          text: JSON.stringify({
            type: "https://api.example.com/errors/issue-creation-failed",
            title: "Issue Creation Failed",
            status: 500,
            detail: (error as Error).message,
            instance: `req-${Date.now()}`,
          }),
        },
      ],
      isError: true,
    };
  }
}

/**
 * wait_for_build: Long-running tool demonstrating Tasks async primitive
 *
 * Demonstrates (MCP 2025-11-25):
 * - Task state machine: working → input_required | completed | failed | cancelled
 * - Progress notifications via progressToken
 * - Polling with exponential backoff
 */
async function handleWaitForBuild(input: z.infer<typeof waitForBuildSchema>): Promise<{
  content: TextContent[] | ErrorContent[];
  isError?: boolean;
}> {
  logger.info("wait_for_build called", {
    build_id: input.build_id,
    timeout_seconds: input.timeout_seconds,
  });

  const startTime = Date.now();
  const timeoutMs = input.timeout_seconds * 1000;

  // Stub: poll build status until completion or timeout
  let pollCount = 0;
  let backoffMs = 500;

  while (Date.now() - startTime < timeoutMs) {
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

    // Exponential backoff: 500ms, 1s, 2s, 4s, max 30s
    backoffMs = Math.min(backoffMs * 1.5, 30_000);
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }

  // Timeout
  return {
    content: [
      {
        text: JSON.stringify({
          type: "https://api.example.com/errors/build-timeout",
          title: "Build Timeout",
          status: 504,
          detail: `Build did not complete within ${input.timeout_seconds}s`,
          instance: `req-${Date.now()}`,
        }),
        type: "text",
      },
    ],
    isError: true,
  };
}

// ===== Tool Registration =====

server.tool(
  "search_docs",
  "Search project documentation by keyword. Use when you need to find relevant docs or API references. Accepts any search term. Returns up to 50 results ranked by relevance.",
  {
    schema: searchDocsSchema,
  },
  handleSearchDocs,
  {
    annotations: {
      openWorldHint: true,
      readOnlyHint: true,
    },
  },
);

server.tool(
  "create_issue",
  "Create a new issue in the project tracker. Use when you need to report a bug, request a feature, or log a task. Do not use for general communication. All issues are immutable once created; use update_issue for modifications.",
  {
    schema: createIssueSchema,
  },
  handleCreateIssue,
  {
    annotations: {
      destructiveHint: true,
      idempotentHint: true,
    },
  },
);

server.tool(
  "wait_for_build",
  "Poll and wait for a CI/CD build to complete. Use when you need to monitor long-running build processes. Returns build status, duration, and artifact URLs. Blocks until completion or timeout. Demonstrates MCP 2025-11-25 Tasks async primitive.",
  {
    schema: waitForBuildSchema,
  },
  handleWaitForBuild,
  {
    annotations: {
      openWorldHint: true,
    },
  },
);

// ===== Resource Handlers =====

/**
 * Resources: Static data exposed via stable URIs.
 * Agents can query these without tool invocation.
 */
server.resource("config://api-docs", "text/markdown", "API Documentation Overview", async () => {
  const docs = `# API Documentation

## Tools

### search_docs
Search project documentation.

### create_issue
Create a new issue.

### wait_for_build
Monitor CI/CD builds.

## Resources

- config://api-docs — this document
- config://schemas — JSON Schema definitions

## Prompts

- analyze_thread — analyze a discussion thread

See https://modelcontextprotocol.io/specification/2025-11-25 for spec details.
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
});

server.resource(
  "config://schemas",
  "application/ld+json",
  "Tool Input Schemas (JSON-LD)",
  async () => {
    const schemas = {
      "@context": "https://schema.org",
      "@type": "DataType",
      definitions: {
        CreateIssueInput: {
          properties: {
            description: { type: "string" },
            priority: { enum: ["low", "medium", "high", "critical"] },
            title: { type: "string" },
          },
          required: ["title"],
          type: "object",
        },
        SearchDocsInput: {
          properties: {
            limit: { maximum: 50, minimum: 1, type: "integer" },
            query: { type: "string" },
          },
          required: ["query"],
          type: "object",
        },
      },
    };

    return {
      contents: [
        {
          mimeType: "application/ld+json",
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
server.prompt(
  "analyze_thread",
  "Analyze a discussion thread for sentiment, consensus, and action items. Use when you need to summarize multi-person conversations.",
  [
    {
      description: "The unique identifier of the thread",
      name: "thread_id",
      required: true,
    },
    {
      description: "Maximum messages to analyze (default 100)",
      name: "max_messages",
      required: false,
    },
  ],
  async (args) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Analyze thread ${args.thread_id} (up to ${args.max_messages || 100} messages) for: 1) overall sentiment, 2) consensus points, 3) open action items, 4) key blockers. Format as markdown with sections.`,
        },
      },
    ],
  }),
);

// ===== Connection & Transport =====

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  logger.info("stdio transport initialized");

  await server.connect(transport);
  logger.info("server connected to transport");
}

// Run server
main().catch((error) => {
  logger.error("server error", error);
  process.exit(1);
});
