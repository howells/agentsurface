/**
 * Braintrust Eval Script — Agent evaluation with dataset management & human review
 *
 * **What it is:** Complete Braintrust eval harness in TypeScript. Includes dataset loader,
 * task function that calls your agent, and scorers (e.g. Factuality, ToolCallOrder, Cost).
 * Emits metrics: pass@k, pass^k, trajectory traces, token usage.
 *
 * **When to use:**
 * - Continuous eval loop during agent development
 * - Tracking regressions in CI with baseline comparison
 * - Collecting human feedback and traces for offline analysis
 *
 * **Canonical URL:** https://braintrust.dev/docs
 *
 * **Customisation checklist:**
 * - [ ] Update AGENT_MODEL to your model ID (opus-4-7, sonnet-4-6, etc.)
 * - [ ] Customize task() function to call your actual agent
 * - [ ] Add domain-specific graders (not just Factuality)
 * - [ ] Load real production traces or labelled dataset
 * - [ ] Set up CI integration: `pnpm braintrust eval -e`
 * - [ ] Configure Braintrust API key in env or .env
 *
 * **Environment variables:**
 * - `BRAINTRUST_API_KEY` — Required. Get from https://www.braintrust.dev
 * - `BRAINTRUST_ORG_NAME` — Optional. Project org (default: personal)
 *
 * **References:**
 * - Braintrust docs: https://braintrust.dev/docs
 * - Anthropic evals: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
 * - pass@k metrics: https://arxiv.org/abs/2010.03174
 */

import Braintrust from '@braintrust/eval';
import { z } from 'zod';

// <CUSTOMISE>: Update model and dataset loading
const AGENT_MODEL = 'claude-opus-4-7';
const DATASET_NAME = 'agent-tasks-v1';
const EVAL_NAME = 'agent-routing-eval';

/**
 * Test case schema — what your dataset contains
 */
const TestCaseSchema = z.object({
  id: z.string(),
  prompt: z.string().describe('User instruction for the agent'),
  expected_tools: z.array(z.string()).describe('Tools that should be called'),
  expected_output: z.string().optional().describe('Expected final output'),
  category: z.enum(['happy_path', 'edge_case', 'adversarial']).optional(),
});

type TestCase = z.infer<typeof TestCaseSchema>;

/**
 * Agent response schema — what your agent returns
 */
const AgentResponseSchema = z.object({
  text: z.string().describe('Final response'),
  tool_calls: z.array(z.object({
    name: z.string(),
    arguments: z.record(z.string(), z.unknown()),
  })),
  tokens: z.object({
    input: z.number(),
    output: z.number(),
  }),
});

type AgentResponse = z.infer<typeof AgentResponseSchema>;

/**
 * Custom scorer: Tool call order correctness
 */
async function scoreToolCallOrder(
  expected: string[],
  actual: AgentResponse
): Promise<{ score: number; details: string }> {
  const actualToolNames = actual.tool_calls.map((tc) => tc.name);

  if (JSON.stringify(expected) === JSON.stringify(actualToolNames)) {
    return { score: 1, details: 'Tool order matches exactly' };
  }

  // Allow subset match (agent called all expected tools, order correct, may have extras)
  let idx = 0;
  for (const expected_tool of expected) {
    const found = actualToolNames.indexOf(expected_tool, idx);
    if (found === -1) return { score: 0, details: `Missing expected tool: ${expected_tool}` };
    idx = found + 1;
  }

  return { score: 0.5, details: 'Tool order partially matches (extra tools called)' };
}

/**
 * Custom scorer: Cost (sum of input + output tokens)
 */
async function scoreCost(response: AgentResponse): Promise<{ score: number; cost: number }> {
  // Example: $0.003 per 1M input tokens, $0.015 per 1M output tokens (Opus 4.7)
  const inputCost = (response.tokens.input / 1e6) * 0.003;
  const outputCost = (response.tokens.output / 1e6) * 0.015;
  const totalCost = inputCost + outputCost;

  // Score: higher is better. Invert cost as score.
  return { score: 1 / (1 + totalCost), cost: totalCost };
}

/**
 * Your agent function — integrate your actual agent here
 *
 * <CUSTOMISE>: Replace with your agent implementation
 */
async function runAgent(prompt: string): Promise<AgentResponse> {
  // Example stub; replace with actual agent SDK call
  const response = await fetch('http://localhost:3000/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) throw new Error(`Agent error: ${response.statusText}`);

  const json = await response.json();
  return AgentResponseSchema.parse(json);
}

/**
 * Load test dataset from Braintrust
 */
async function loadDataset(client: typeof Braintrust): Promise<TestCase[]> {
  // <CUSTOMISE>: Implement your dataset loader
  // Option 1: Load from Braintrust
  // const dataset = await client.getDataset({ name: DATASET_NAME });
  // return dataset.records.map((r) => TestCaseSchema.parse(r.input));

  // Option 2: Load from JSON file
  const fs = await import('fs/promises');
  const data = await fs.readFile('./evals/fixtures.json', 'utf-8');
  const records = JSON.parse(data);
  return records.map((r: any) => TestCaseSchema.parse(r));
}

/**
 * Main eval function
 */
async function runEval() {
  const client = Braintrust();

  const dataset = await loadDataset(client);
  console.log(`Loaded ${dataset.length} test cases`);

  const eval_results = await client.Eval(EVAL_NAME, {
    data: () => dataset,
    task: async (testCase) => {
      try {
        const response = await runAgent(testCase.prompt);
        return {
          output: response,
          metadata: {
            category: testCase.category || 'unspecified',
          },
        };
      } catch (err) {
        console.error(`Task failed for ${testCase.id}:`, err);
        throw err;
      }
    },
    scores: [
      // Built-in Braintrust scorers
      Braintrust.Factuality.Score(),
      Braintrust.Summary.Score(),

      // Custom scorer: tool order
      {
        name: 'tool_call_order',
        description: 'Verifies tools are called in the expected order',
        score: async (testCase: TestCase, response: AgentResponse) => {
          const result = await scoreToolCallOrder(testCase.expected_tools, response);
          return {
            name: 'tool_call_order',
            score: result.score,
            details: result.details,
          };
        },
      },

      // Custom scorer: cost
      {
        name: 'cost_efficiency',
        description: 'Token usage cost (lower is better)',
        score: async (testCase: TestCase, response: AgentResponse) => {
          const result = await scoreCost(response);
          return {
            name: 'cost_efficiency',
            score: result.score,
            metadata: { cost_usd: result.cost },
          };
        },
      },

      // Pass/fail: did agent produce expected output?
      {
        name: 'output_match',
        description: 'Final output matches expected (if provided)',
        score: async (testCase: TestCase, response: AgentResponse) => {
          if (!testCase.expected_output) {
            return { name: 'output_match', score: null }; // Skip if no ground truth
          }

          const match = response.text.includes(testCase.expected_output);
          return {
            name: 'output_match',
            score: match ? 1 : 0,
            details: match ? 'Output matched' : `Expected substring not found: ${testCase.expected_output}`,
          };
        },
      },
    ],
    metadata: {
      model: AGENT_MODEL,
      dataset_version: '1.0',
      eval_timestamp: new Date().toISOString(),
    },
  });

  console.log('\n=== Eval Results ===');
  console.log(`Total cases: ${eval_results.summary.total}`);
  console.log(`Passed: ${eval_results.summary.passed}`);
  console.log(`Failed: ${eval_results.summary.failed}`);
  console.log(`Pass rate: ${((eval_results.summary.passed / eval_results.summary.total) * 100).toFixed(1)}%`);

  // Detailed metrics by scorer
  for (const [name, metrics] of Object.entries(eval_results.metrics ?? {})) {
    console.log(`\n${name}:`);
    console.log(`  mean: ${metrics.mean?.toFixed(3)}`);
    console.log(`  std: ${metrics.std?.toFixed(3)}`);
  }

  console.log(`\nView results: ${eval_results.html_url}`);
}

// CLI entry
if (require.main === module) {
  runEval().catch(console.error);
}

export { runEval, loadDataset, runAgent, TestCase, AgentResponse };

/**
 * Usage:
 *
 * ```bash
 * # Run evaluation
 * BRAINTRUST_API_KEY=sk_... pnpm tsx eval-braintrust.ts
 *
 * # Or from package.json:
 * "scripts": {
 *   "eval": "tsx eval-braintrust.ts",
 *   "eval:watch": "tsx --watch eval-braintrust.ts"
 * }
 *
 * # Via Braintrust CLI:
 * pnpm braintrust eval
 * ```
 */
