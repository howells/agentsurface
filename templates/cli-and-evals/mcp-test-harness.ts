/**
 * MCP Test Harness — Property-based testing for MCP servers
 *
 * **What it is:** Vitest-based harness that spawns any MCP server (stdio or HTTP),
 * enumerates tools via `tools/list`, synthesizes valid inputs (via Zod + fast-check),
 * and asserts schema conformance + latency. Useful for auditing an MCP during
 * `surface --dimension=mcp`.
 *
 * **When to use:**
 * - Testing an MCP server before integrating with agents
 * - Regression detection when MCP tools change
 * - Schema validation and latency profiling
 * - CI/CD gating on MCP quality
 *
 * **Canonical URL:** https://modelcontextprotocol.io/specification/2025-11-25
 *
 * **Customisation checklist:**
 * - [ ] Update MCP_SERVER_COMMAND to your server (e.g., node src/server.js)
 * - [ ] Define tool input generators for your domain (fast-check Arbitraries)
 * - [ ] Tune MAX_CALLS_PER_TOOL (default: 10 property-based calls)
 * - [ ] Configure latency thresholds
 * - [ ] Add MCP_AUTH env var if server requires authentication
 * - [ ] Run in CI: `vitest run mcp-test-harness.ts`
 *
 * **Environment variables:**
 * - `MCP_SERVER_COMMAND` — How to spawn your server (e.g., node bin/server.js)
 * - `MCP_TRANSPORT` — stdio (default) or http
 * - `MCP_ENDPOINT` — HTTP endpoint if using http transport
 * - `MAX_CALLS_PER_TOOL` — Property-based calls per tool (default: 10)
 *
 * **References:**
 * - MCP spec 2025-11-25: https://modelcontextprotocol.io/specification/2025-11-25
 * - fast-check: https://fast-check.dev/
 * - Testing & Evaluation: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client, Server } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, StdioServerTransport } from '@modelcontextprotocol/sdk/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { spawn, ChildProcess } from 'child_process';
import { z } from 'zod';
import fc from 'fast-check';

// Configuration
const MCP_SERVER_COMMAND = process.env.MCP_SERVER_COMMAND || 'node src/server.js';
const MCP_TRANSPORT = process.env.MCP_TRANSPORT || 'stdio';
const MAX_CALLS_PER_TOOL = parseInt(process.env.MAX_CALLS_PER_TOOL || '10');

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>; // JSON Schema
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
let serverProcess: ChildProcess | null = null;
const metrics: Map<string, TestMetrics> = new Map();

/**
 * Start MCP server (stdio transport)
 */
async function startServer(): Promise<Client> {
  serverProcess = spawn('sh', ['-c', MCP_SERVER_COMMAND], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, MCP_DEBUG: '1' },
  });

  const transport = new StdioClientTransport({
    command: 'sh',
    args: ['-c', MCP_SERVER_COMMAND],
  });

  const newClient = new Client({
    name: 'test-client',
    version: '1.0.0',
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
  if (serverProcess) {
    serverProcess.kill();
  }
}

/**
 * Validate response against tool's output schema (if available)
 */
function validateResponse(response: any, toolName: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // <CUSTOMISE>: Add output schema validation per tool
  // For now, just check that response is an object with content
  if (typeof response !== 'object' || !response.content) {
    errors.push('Response missing required "content" field');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate arbitrary valid inputs for a tool (fast-check)
 */
function generateToolInputArbitrary(toolDef: ToolDefinition): fc.Arbitrary<Record<string, any>> {
  const schema = toolDef.inputSchema;

  // <CUSTOMISE>: Build custom Arbitraries per tool schema
  // This is a simplified example
  if (!schema.properties) {
    return fc.object();
  }

  const arbitraries: Record<string, fc.Arbitrary<any>> = {};

  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    const prop = propSchema as Record<string, any>;

    if (prop.type === 'string') {
      arbitraries[propName] = fc.string();
    } else if (prop.type === 'number') {
      arbitraries[propName] = fc.integer();
    } else if (prop.type === 'boolean') {
      arbitraries[propName] = fc.boolean();
    } else if (prop.enum) {
      arbitraries[propName] = fc.constantFrom(...prop.enum);
    } else {
      arbitraries[propName] = fc.json();
    }
  }

  return fc.record(arbitraries);
}

/**
 * Test suite: MCP server validation
 */
describe('MCP server test suite', () => {
  beforeAll(async () => {
    client = await startServer();
  }, 30000);

  afterAll(async () => {
    await stopServer();
  });

  it('connects successfully', async () => {
    expect(client).toBeDefined();
  });

  it('lists tools', async () => {
    const result = await client.listTools();
    expect(result.tools).toBeDefined();
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools.length).toBeGreaterThan(0);
  });

  describe('tool schema compliance', () => {
    let tools: ToolDefinition[];

    beforeAll(async () => {
      const result = await client.listTools();
      tools = result.tools as ToolDefinition[];
    });

    tools?.forEach((tool) => {
      describe(`tool: ${tool.name}`, () => {
        it('has description', () => {
          expect(tool.description).toBeTruthy();
          expect(tool.description.length).toBeGreaterThan(5);
        });

        it('has valid input schema', () => {
          expect(tool.inputSchema).toBeDefined();
          expect(tool.inputSchema.type).toBe('object');
        });

        // <CUSTOMISE>: Add tool-specific property tests
        it('handles valid inputs', { timeout: 60000 }, async () => {
          const metrics: TestMetrics = {
            tool_name: tool.name,
            total_calls: 0,
            successful_calls: 0,
            failed_calls: 0,
            avg_latency_ms: 0,
            max_latency_ms: 0,
            schema_violations: 0,
          };

          const latencies: number[] = [];
          const arbitrary = generateToolInputArbitrary(tool);

          // Run property-based tests
          await new Promise<void>((resolve, reject) => {
            fc.assert(
              fc.asyncProperty(arbitrary, async (input) => {
                metrics.total_calls++;

                try {
                  const startTime = Date.now();
                  const result = await client.callTool(tool.name, input);
                  const latency = Date.now() - startTime;
                  latencies.push(latency);

                  if (result.isError) {
                    metrics.failed_calls++;
                  } else {
                    metrics.successful_calls++;

                    // Validate response schema
                    const validation = validateResponse(result, tool.name);
                    if (!validation.valid) {
                      metrics.schema_violations++;
                    }
                  }
                } catch (err) {
                  metrics.failed_calls++;
                  throw err;
                }
              }),
              { numRuns: MAX_CALLS_PER_TOOL }
            ).then(() => resolve()).catch(reject);
          });

          // Compute metrics
          metrics.avg_latency_ms = latencies.length > 0 ? latencies.reduce((a, b) => a + b) / latencies.length : 0;
          metrics.max_latency_ms = latencies.length > 0 ? Math.max(...latencies) : 0;

          // Assertions
          expect(metrics.successful_calls).toBeGreaterThan(0);
          expect(metrics.schema_violations).toBe(0);
          expect(metrics.avg_latency_ms).toBeLessThan(5000); // < 5s avg

          // Store metrics for summary
          MCPTestHarness.metrics.set(tool.name, metrics);

          console.log(`\n${tool.name}:`);
          console.log(`  Calls: ${metrics.total_calls}, Success: ${metrics.successful_calls}, Failed: ${metrics.failed_calls}`);
          console.log(`  Latency: avg ${metrics.avg_latency_ms.toFixed(1)}ms, max ${metrics.max_latency_ms}ms`);
        });
      });
    });
  });

  // <CUSTOMISE>: Add integration tests (tool chains)
  describe('tool chaining', () => {
    it('can chain search_docs then extract_code', { timeout: 30000 }, async () => {
      // Example: search for docs, then extract code snippet
      // This tests the agent's ability to use tools in sequence

      // Placeholder assertion
      expect(client).toBeDefined();
    });
  });

  // Summary metrics
  describe('overall metrics', () => {
    it('computes latency and success statistics', async () => {
      let totalCalls = 0;
      let totalSuccess = 0;
      let totalLatency = 0;

      for (const metric of MCPTestHarness.metrics.values()) {
        totalCalls += metric.total_calls;
        totalSuccess += metric.successful_calls;
        totalLatency += metric.avg_latency_ms;
      }

      const overallSuccessRate = totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 0;

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
 * Example MCP server (src/server.js):
 *
 * ```typescript
 * import { Server } from '@modelcontextprotocol/sdk/server/index.js';
 *
 * const server = new Server({ name: 'test-mcp', version: '1.0.0' });
 *
 * server.tool('search_docs', 'Search documentation', {
 *   type: 'object',
 *   properties: {
 *     query: { type: 'string', description: 'Search query' },
 *   },
 *   required: ['query'],
 * }, async (args) => {
 *   // Simulate search
 *   return { content: [{ type: 'text', text: `Results for ${args.query}` }] };
 * });
 * ```
 *
 * Usage:
 *
 * ```bash
 * # Test with stdio transport (default)
 * MCP_SERVER_COMMAND="node src/server.js" pnpm vitest run mcp-test-harness.ts
 *
 * # With custom settings
 * MAX_CALLS_PER_TOOL=20 MCP_SERVER_COMMAND="npm run start:server" pnpm vitest run
 * ```
 */
