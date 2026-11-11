/**
 * MCP Test Harness - Property-based testing for MCP servers
 *
 * **What it is:** Vitest-based harness that spawns an MCP server over stdio,
 * enumerates tools via `tools/list`, generates inputs from each tool's JSON Schema with
 * fast-check, and asserts schema conformance + latency. It calls only tools annotated
 * `readOnlyHint: true`, because it invokes each tool many times with generated inputs. Useful for auditing an MCP during
 * `surface --dimension=mcp`.
 *
 * **When to use:**
 * - Testing an MCP server before integrating with agents
 * - Regression detection when MCP tools change
 * - Schema validation and latency profiling
 * - CI/CD gating on MCP quality
 *
 * **Canonical URL:** https://modelcontextprotocol.io/specification/2026-07-28
 *
 * **Customisation checklist:**
 * - [ ] Update MCP_SERVER_COMMAND to your server (e.g., node src/server.js)
 * - [ ] Define tool input generators for your domain (fast-check Arbitraries)
 * - [ ] Tune MAX_CALLS_PER_TOOL (default: 10 property-based calls)
 * - [ ] Configure latency thresholds
 * - [ ] Pass any credentials the server needs through its own environment variables
 * - [ ] Run in CI: `vitest run mcp-test-harness.ts`
 *
 * **Environment variables:**
 * - `MCP_SERVER_COMMAND` - How to spawn your server (e.g., node bin/server.js)
 * - `MCP_TEST_WRITE_TOOLS` - set to 1 to also call tools that are not read-only. Only against
 *   a disposable environment: generated inputs will create, change or delete real data.
 * - `MAX_CALLS_PER_TOOL` - Property-based calls per tool (default: 10)
 *
 * **References:**
 * - MCP spec 2026-07-28: https://modelcontextprotocol.io/specification/2026-07-28
 * - fast-check: https://fast-check.dev/
 * - Testing & Evaluation: https://www.anthropic.com/research/demystifying-evals-for-ai-agents
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import fc from "fast-check";

// Configuration
const { MCP_SERVER_COMMAND } = process.env;
if (!MCP_SERVER_COMMAND) {
  throw new Error("Set MCP_SERVER_COMMAND to the command that starts your MCP server");
}
const MAX_CALLS_PER_TOOL = Number.parseInt(process.env.MAX_CALLS_PER_TOOL || "10", 10);
const TEST_WRITE_TOOLS = process.env.MCP_TEST_WRITE_TOOLS === "1";

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>; // JSON Schema
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
}

interface TestMetrics {
  tool_name: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  avg_latency_ms: number;
  max_latency_ms: number;
  schema_violations: number;
}

let client: Client;
const metrics = new Map<string, TestMetrics>();

/**
 * Spawn the server over stdio and connect a client to it.
 */
async function connect(): Promise<Client> {
  const transport = new StdioClientTransport({
    args: ["-c", MCP_SERVER_COMMAND!],
    command: "sh",
    env: { ...process.env, MCP_DEBUG: "1" } as Record<string, string>,
  });

  const newClient = new Client({
    name: "test-client",
    version: "1.0.0",
  });

  await newClient.connect(transport);
  return newClient;
}

/**
 * Stop server
 */
async function stopServer(): Promise<void> {
  if (client) {
    await client.close();
  }
}

/**
 * Discover tools before Vitest collects the suite. Tests are registered while
 * the file is collected, which happens before any beforeAll hook runs, so a
 * list filled in a hook would still be empty when the per-tool tests are
 * declared. Top-level await keeps one test block per tool.
 */
async function discoverTools(): Promise<ToolDefinition[]> {
  const discoveryClient = await connect();
  try {
    const result = await discoveryClient.listTools();
    return result.tools as ToolDefinition[];
  } finally {
    await discoveryClient.close();
  }
}

const tools = await discoverTools();

/**
 * Validate response against tool's output schema (if available)
 */
function validateResponse(response: any, toolName: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // <CUSTOMISE>: Add output schema validation per tool
  // For now, just check that response is an object with content
  if (typeof response !== "object" || !response.content) {
    errors.push('Response missing required "content" field');
  }

  return { errors, valid: errors.length === 0 };
}

/**
 * Arbitrary for one JSON Schema property. Covers enums, strings, numbers, integers and
 * booleans with their length and range bounds.
 *
 * <CUSTOMISE>: anything else (pattern, format, arrays, nested objects) throws, so add a
 * hand-written Arbitrary for that tool rather than sending inputs the schema rejects.
 */
function propertyArbitrary(toolName: string, propName: string, prop: Record<string, any>) {
  if (Array.isArray(prop.enum)) {
    return fc.constantFrom(...prop.enum);
  }
  if (prop.type === "string" && !prop.pattern && !prop.format) {
    return fc.string({ maxLength: prop.maxLength, minLength: prop.minLength ?? 0 });
  }
  if (prop.type === "integer") {
    return fc.integer({ max: prop.maximum, min: prop.minimum });
  }
  if (prop.type === "number") {
    return fc.double({ max: prop.maximum, min: prop.minimum, noNaN: true });
  }
  if (prop.type === "boolean") {
    return fc.boolean();
  }
  throw new Error(
    `${toolName}.${propName}: no generator for ${JSON.stringify(prop)}; write an Arbitrary for it`,
  );
}

/**
 * Generate arbitrary valid inputs for a tool (fast-check). Required properties are always
 * present; optional ones are sometimes omitted.
 */
function generateToolInputArbitrary(toolDef: ToolDefinition): fc.Arbitrary<Record<string, any>> {
  const schema = toolDef.inputSchema;
  const arbitraries: Record<string, fc.Arbitrary<any>> = {};

  for (const [propName, propSchema] of Object.entries(schema.properties ?? {})) {
    arbitraries[propName] = propertyArbitrary(
      toolDef.name,
      propName,
      propSchema as Record<string, any>,
    );
  }

  return fc.record(arbitraries, { requiredKeys: schema.required ?? [] });
}

/**
 * Test suite: MCP server validation
 */
describe("MCP server test suite", () => {
  beforeAll(async () => {
    client = await connect();
  }, 30_000);

  afterAll(async () => {
    await stopServer();
  });

  it("connects successfully", async () => {
    expect(client).toBeDefined();
  });

  it("lists tools", async () => {
    const result = await client.listTools();
    expect(result.tools).toBeDefined();
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools.length).toBeGreaterThan(0);
  });

  describe("tool schema compliance", () => {
    tools.forEach((tool) => {
      describe(`tool: ${tool.name}`, () => {
        it("has description", () => {
          expect(tool.description).toBeTruthy();
          expect(tool.description.length).toBeGreaterThan(5);
        });

        it("has valid input schema", () => {
          expect(tool.inputSchema).toBeDefined();
          expect(tool.inputSchema.type).toBe("object");
        });

        // Each tool is called MAX_CALLS_PER_TOOL times, plus more while fast-check shrinks a
        // failure, so tools that are not read-only are skipped unless explicitly opted in.
        const callable = tool.annotations?.readOnlyHint === true || TEST_WRITE_TOOLS;

        // <CUSTOMISE>: Add tool-specific property tests
        it.skipIf(!callable)("handles valid inputs", { timeout: 60_000 }, async () => {
          const toolMetrics: TestMetrics = {
            avg_latency_ms: 0,
            failed_calls: 0,
            max_latency_ms: 0,
            schema_violations: 0,
            successful_calls: 0,
            tool_name: tool.name,
            total_calls: 0,
          };

          const latencies: number[] = [];
          const arbitrary = generateToolInputArbitrary(tool);

          // Run property-based tests (fc.assert returns a promise for async properties)
          await fc.assert(
            fc.asyncProperty(arbitrary, async (input) => {
              toolMetrics.total_calls++;

              try {
                const startTime = Date.now();
                const result = await client.callTool({ arguments: input, name: tool.name });
                const latency = Date.now() - startTime;
                latencies.push(latency);

                if (result.isError) {
                  toolMetrics.failed_calls++;
                } else {
                  toolMetrics.successful_calls++;

                  // Validate response schema
                  const validation = validateResponse(result, tool.name);
                  if (!validation.valid) {
                    toolMetrics.schema_violations++;
                  }
                }
              } catch (error) {
                toolMetrics.failed_calls++;
                throw error;
              }
            }),
            { numRuns: MAX_CALLS_PER_TOOL },
          );

          // Compute metrics
          toolMetrics.avg_latency_ms =
            latencies.length > 0 ? latencies.reduce((a, b) => a + b) / latencies.length : 0;
          toolMetrics.max_latency_ms = latencies.length > 0 ? Math.max(...latencies) : 0;

          // Assertions
          expect(toolMetrics.successful_calls).toBeGreaterThan(0);
          expect(toolMetrics.schema_violations).toBe(0);
          expect(toolMetrics.avg_latency_ms).toBeLessThan(5000); // < 5s avg

          // Store metrics for summary
          MCPTestHarness.metrics.set(tool.name, toolMetrics);

          console.log(`\n${tool.name}:`);
          console.log(
            `  Calls: ${toolMetrics.total_calls}, Success: ${toolMetrics.successful_calls}, Failed: ${toolMetrics.failed_calls}`,
          );
          console.log(
            `  Latency: avg ${toolMetrics.avg_latency_ms.toFixed(1)}ms, max ${toolMetrics.max_latency_ms}ms`,
          );
        });
      });
    });
  });

  // <CUSTOMISE>: Add integration tests (tool chains). Reported as todo until written.
  describe("tool chaining", () => {
    it.todo("chains one tool's output into the next");
  });

  // Summary metrics
  describe("overall metrics", () => {
    it("computes latency and success statistics", async () => {
      let totalCalls = 0;
      let totalSuccess = 0;
      let totalLatency = 0;

      for (const metric of MCPTestHarness.metrics.values()) {
        totalCalls += metric.total_calls;
        totalSuccess += metric.successful_calls;
        totalLatency += metric.avg_latency_ms;
      }

      expect(totalCalls, "no tool was called; mark tools readOnlyHint or opt in").toBeGreaterThan(
        0,
      );
      const overallSuccessRate = (totalSuccess / totalCalls) * 100;

      console.log(`\n=== Overall Metrics ===`);
      console.log(`Total calls: ${totalCalls}`);
      console.log(`Success rate: ${overallSuccessRate.toFixed(1)}%`);
      console.log(`Avg latency: ${(totalLatency / MCPTestHarness.metrics.size).toFixed(1)}ms`);

      expect(overallSuccessRate).toBeGreaterThanOrEqual(90);
    });
  });
});

/**
 * Helper class to store metrics across test runs
 */
class MCPTestHarness {
  static metrics = metrics;
}

/**
 * Example MCP server (src/server.ts, compiled to src/server.js):
 *
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/server';
 * import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
 * import { z } from 'zod';
 *
 * const server = new McpServer({ name: 'test-mcp', version: '1.0.0' });
 *
 * server.registerTool('search_docs', {
 *   description: 'Search documentation',
 *   inputSchema: z.object({ query: z.string().describe('Search query') }),
 *   annotations: { readOnlyHint: true },
 * }, async (args) => {
 *   // Simulate search
 *   return { content: [{ type: 'text', text: `Results for ${args.query}` }] };
 * });
 *
 * await server.connect(new StdioServerTransport());
 * ```
 *
 * Usage:
 *
 * ```bash
 * # Test with stdio transport (default)
 * MCP_SERVER_COMMAND="node src/server.js" pnpm vitest run mcp-test-harness.ts
 *
 * # With custom settings
 * MAX_CALLS_PER_TOOL=20 MCP_SERVER_COMMAND="npm run start:server" pnpm vitest run mcp-test-harness.ts
 * ```
 */
