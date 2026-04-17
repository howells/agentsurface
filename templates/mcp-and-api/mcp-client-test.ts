/**
 * MCP Client Test Harness — Test tools against stdio or HTTP servers
 *
 * Canonical spec: https://modelcontextprotocol.io/specification/2025-11-25
 * Testing pattern: InMemoryTransport.createLinkedPair()
 * Framework: vitest
 *
 * When to use:
 * - Unit testing MCP servers before deployment
 * - CI/CD pipeline validation
 * - Capability inventory generation
 * - Verifying outputSchema conformance
 *
 * Usage:
 * ```bash
 * npm test                              # Run all tests
 * npm test -- --reporter=verbose        # Verbose output
 * npm test -- mcp-client-test.spec.ts   # Single file
 * ```
 *
 * Customization checklist:
 * ✓ Update server import path
 * ✓ Add test cases for each tool
 * ✓ Verify sample inputs/outputs
 * ✓ Check outputSchema validation
 * ✓ Add capability assertions
 * ✓ Test error handling paths
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  InMemoryTransport,
  type Client,
  type TextContent,
} from "@modelcontextprotocol/sdk/client/index.js";
import { z } from "zod";

// ===== MCP Server Factory =====

function createTestServer(): McpServer {
  const server = new McpServer(
    {
      name: "test-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // search_docs tool
  server.tool(
    "search_docs",
    "Search documentation by keyword.",
    {
      schema: z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    },
    async (input) => {
      const results = [
        {
          title: "MCP Specification",
          url: "https://modelcontextprotocol.io/specification/2025-11-25",
        },
        {
          title: "Tool Design Guide",
          url: "https://www.anthropic.com/engineering/writing-tools-for-agents",
        },
      ].slice(0, input.limit);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(results),
          },
        ],
      };
    },
    { annotations: { readOnlyHint: true, openWorldHint: true } }
  );

  // create_issue tool
  server.tool(
    "create_issue",
    "Create a new issue in the tracker.",
    {
      schema: z.object({
        title: z.string().min(1),
        description: z.string(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
      }),
    },
    async (input) => {
      const issueId = `ISSUE-${Math.floor(Math.random() * 10000)}`;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              id: issueId,
              title: input.title,
              priority: input.priority,
              created_at: new Date().toISOString(),
            }),
          },
        ],
      };
    },
    { annotations: { destructiveHint: true, idempotentHint: true } }
  );

  // error_demo tool (demonstrates isError handling)
  server.tool(
    "error_demo",
    "Intentionally fail to demonstrate error handling.",
    {
      schema: z.object({
        should_fail: z.boolean().default(true),
      }),
    },
    async (input) => {
      if (input.should_fail) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Simulated error occurred",
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: "Success",
          },
        ],
      };
    },
    { annotations: { readOnlyHint: true } }
  );

  // config resource
  server.resource(
    "config://test",
    "text/plain",
    "Test Configuration",
    async () => ({
      contents: [
        {
          uri: "config://test",
          mimeType: "text/plain",
          text: "Test config data",
        },
      ],
    })
  );

  return server;
}

// ===== Test Suite =====

describe("MCP Client Tests", () => {
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    server = createTestServer();
    const { client: linkedClient, server: linkedServerTransport } =
      InMemoryTransport.createLinkedPair();

    client = linkedClient;
    await server.connect(linkedServerTransport);
  });

  afterEach(async () => {
    await client.close();
  });

  describe("search_docs tool", () => {
    it("should return search results", async () => {
      const result = await client.callTool("search_docs", {
        query: "MCP",
        limit: 2,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const text = (result.content[0] as TextContent).text;
      const parsed = JSON.parse(text);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toHaveProperty("title");
      expect(parsed[0]).toHaveProperty("url");
    });

    it("should respect limit parameter", async () => {
      const result = await client.callTool("search_docs", {
        query: "test",
        limit: 1,
      });

      const text = (result.content[0] as TextContent).text;
      const parsed = JSON.parse(text);

      expect(parsed).toHaveLength(1);
    });

    it("should use default limit", async () => {
      const result = await client.callTool("search_docs", {
        query: "test",
      });

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBeFalsy();
    });

    it("should have readOnlyHint annotation", async () => {
      const tools = await client.listTools();
      const searchDocsRef = tools.tools.find((t) => t.name === "search_docs");

      expect(searchDocsRef).toBeDefined();
      expect(searchDocsRef?.annotations?.readOnlyHint).toBe(true);
      expect(searchDocsRef?.annotations?.openWorldHint).toBe(true);
    });
  });

  describe("create_issue tool", () => {
    it("should create an issue with required fields", async () => {
      const result = await client.callTool("create_issue", {
        title: "Bug: login fails",
        description: "Users cannot log in on mobile",
        priority: "high",
      });

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as TextContent).text;
      const parsed = JSON.parse(text);

      expect(parsed).toHaveProperty("id");
      expect(parsed.id).toMatch(/^ISSUE-\d+$/);
      expect(parsed.title).toBe("Bug: login fails");
      expect(parsed.priority).toBe("high");
      expect(parsed).toHaveProperty("created_at");
    });

    it("should use default priority", async () => {
      const result = await client.callTool("create_issue", {
        title: "Task: refactor auth",
        description: "Clean up auth logic",
      });

      const text = (result.content[0] as TextContent).text;
      const parsed = JSON.parse(text);

      expect(parsed.priority).toBe("medium");
    });

    it("should have destructiveHint and idempotentHint", async () => {
      const tools = await client.listTools();
      const createIssueRef = tools.tools.find((t) => t.name === "create_issue");

      expect(createIssueRef).toBeDefined();
      expect(createIssueRef?.annotations?.destructiveHint).toBe(true);
      expect(createIssueRef?.annotations?.idempotentHint).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should return isError: true on failure", async () => {
      const result = await client.callTool("error_demo", {
        should_fail: true,
      });

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect((result.content[0] as TextContent).text).toContain("error");
    });

    it("should succeed when should_fail is false", async () => {
      const result = await client.callTool("error_demo", {
        should_fail: false,
      });

      expect(result.isError).toBeFalsy();
      expect((result.content[0] as TextContent).text).toBe("Success");
    });
  });

  describe("resources", () => {
    it("should list available resources", async () => {
      const resources = await client.listResources();

      expect(resources.resources).toContainEqual(
        expect.objectContaining({
          uri: "config://test",
          name: "Test Configuration",
        })
      );
    });

    it("should read resource content", async () => {
      const resource = await client.readResource("config://test");

      expect(resource.contents).toHaveLength(1);
      expect(resource.contents[0].mimeType).toBe("text/plain");
      expect(resource.contents[0].text).toBe("Test config data");
    });
  });

  describe("prompts", () => {
    it("should list available prompts", async () => {
      const prompts = await client.listPrompts();

      // Server in this test doesn't register prompts, so list should be empty
      expect(Array.isArray(prompts.prompts)).toBe(true);
    });
  });

  describe("capability inventory", () => {
    it("should generate capability summary", async () => {
      const tools = await client.listTools();
      const resources = await client.listResources();
      const prompts = await client.listPrompts();

      // Build inventory
      const inventory = {
        serverName: "test-server",
        capabilities: {
          tools: tools.tools.map((t) => ({
            name: t.name,
            description: t.description?.substring(0, 50) + "...",
            hasAnnotations: !!t.annotations && Object.keys(t.annotations).length > 0,
            annotations: t.annotations,
          })),
          resources: resources.resources.map((r) => ({
            uri: r.uri,
            name: r.name,
            mimeType: r.mimeType,
          })),
          prompts: prompts.prompts?.map((p) => ({
            name: p.name,
            description: p.description?.substring(0, 50) + "...",
          })),
        },
      };

      // Assertions
      expect(inventory.capabilities.tools).toHaveLength(3);
      expect(inventory.capabilities.tools[0].name).toBe("search_docs");
      expect(inventory.capabilities.tools[0].hasAnnotations).toBe(true);

      expect(inventory.capabilities.resources).toHaveLength(1);
      expect(inventory.capabilities.resources[0].uri).toBe("config://test");

      // Print inventory for inspection
      console.log("\n=== MCP Capability Inventory ===");
      console.log(JSON.stringify(inventory, null, 2));
    });
  });

  describe("output schema validation", () => {
    it("search_docs output should be valid JSON", async () => {
      const result = await client.callTool("search_docs", {
        query: "test",
        limit: 1,
      });

      const text = (result.content[0] as TextContent).text;

      // Should parse without error
      const parsed = JSON.parse(text);
      expect(Array.isArray(parsed)).toBe(true);

      // Each result should have expected shape
      parsed.forEach((item: unknown) => {
        expect(item).toEqual(
          expect.objectContaining({
            title: expect.any(String),
            url: expect.any(String),
          })
        );
      });
    });

    it("create_issue output should be valid JSON", async () => {
      const result = await client.callTool("create_issue", {
        title: "Test",
        description: "Test issue",
      });

      const text = (result.content[0] as TextContent).text;
      const parsed = JSON.parse(text);

      expect(parsed).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^ISSUE-\d+$/),
          title: expect.any(String),
          priority: expect.stringMatching(/^(low|medium|high)$/),
          created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        })
      );
    });
  });
});
