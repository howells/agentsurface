/**
 * Braintrust Eval Script - Agent evaluation with dataset management & human review
 *
 * **What it is:** Braintrust eval in TypeScript using the `braintrust` SDK's
 * `Eval(project, { data, task, scores })` and scorers from `autoevals`. Includes a
 * fixture loader, a task that calls your agent, and scorers (an LLM-judged factuality
 * score, tool-call order, cost, output match). Records per-case scores, token usage and
 * traces in Braintrust.
 *
 * **What it does not do:** it does not compute pass@k or pass^k. Set `trialCount` to run
 * each case several times, then derive those metrics from the per-trial results
 * (pass@k: at least one of k trials succeeds; pass^k: all k trials succeed).
 *
 * **When to use:**
 * - Continuous eval loop during agent development
 * - Tracking regressions in CI with baseline comparison
 * - Collecting human feedback and traces for offline analysis
 *
 * **Canonical URL:** https://www.braintrust.dev/docs
 *
 * **Customisation checklist:**
 * - [ ] Update AGENT_MODEL to your model ID (claude-opus-5-5, claude-sonnet-5-5, etc.)
 * - [ ] Customize runAgent() to call your actual agent
 * - [ ] Add domain-specific scorers (not just factuality)
 * - [ ] Load real production traces or a labelled dataset (see `initDataset`)
 * - [ ] Set up CI integration: `npx braintrust eval eval-braintrust.ts`
 * - [ ] Configure Braintrust API key in env or .env
 *
 * **Environment variables:**
 * - `BRAINTRUST_API_KEY` - Required. Get from https://www.braintrust.dev
 * - `OPENAI_API_KEY` - The default autoevals judge model is an OpenAI model. To judge with
 *   another provider, pass `model` and `client` to the scorer (see autoevals docs).
 *
 * **References:**
 * - Braintrust docs: https://www.braintrust.dev/docs
 * - autoevals scorers: https://github.com/braintrustdata/autoevals
 * - Anthropic evals: https://www.anthropic.com/research/demystifying-evals-for-ai-agents
 * - pass@k metrics: https://arxiv.org/abs/2107.03374
 */

import { Eval } from "braintrust";
import { Factuality } from "autoevals";
import { z } from "zod";

// <CUSTOMISE>: Update model and project
const AGENT_MODEL = "claude-opus-5-5";
const PROJECT_NAME = "agent-routing-eval";
// Claude Opus 5.5 list price per million tokens (claude-api skill, cached 2026-10-06):
// $4 input / $20 output. Check current pricing before relying on these numbers.
const INPUT_USD_PER_MTOK = 4;
const OUTPUT_USD_PER_MTOK = 20;

/**
 * Test case schema - what your fixture file contains
 */
const TestCaseSchema = z.object({
  category: z.enum(["happy_path", "edge_case", "adversarial"]).optional(),
  expected_output: z.string().optional().describe("Expected final output"),
  expected_tools: z.array(z.string()).describe("Tools that should be called"),
  id: z.string(),
  prompt: z.string().describe("User instruction for the agent"),
});

type TestCase = z.infer<typeof TestCaseSchema>;

/**
 * Agent response schema - what your agent returns
 */
const AgentResponseSchema = z.object({
  text: z.string().describe("Final response"),
  tokens: z.object({
    input: z.number(),
    output: z.number(),
  }),
  tool_calls: z.array(
    z.object({
      name: z.string(),
      arguments: z.record(z.string(), z.unknown()),
    }),
  ),
});

type AgentResponse = z.infer<typeof AgentResponseSchema>;

/** Case metadata carried alongside each Braintrust row. */
interface CaseMetadata extends Record<string, unknown> {
  category: string;
  expected_tools: string[];
  id: string;
}

/**
 * Custom scorer: Tool call order correctness
 */
function scoreToolCallOrder(
  expected: string[],
  actual: AgentResponse,
): { score: number; details: string } {
  const actualToolNames = actual.tool_calls.map((tc) => tc.name);

  if (JSON.stringify(expected) === JSON.stringify(actualToolNames)) {
    return { details: "Tool order matches exactly", score: 1 };
  }

  // Allow subset match (agent called all expected tools, order correct, may have extras)
  let idx = 0;
  for (const expectedTool of expected) {
    const found = actualToolNames.indexOf(expectedTool, idx);
    if (found === -1) {
      return { details: `Missing expected tool: ${expectedTool}`, score: 0 };
    }
    idx = found + 1;
  }

  return { details: "Tool order partially matches (extra tools called)", score: 0.5 };
}

/**
 * Custom scorer: Cost (sum of input + output tokens)
 */
function scoreCost(response: AgentResponse): { score: number; cost: number } {
  const inputCost = (response.tokens.input / 1e6) * INPUT_USD_PER_MTOK;
  const outputCost = (response.tokens.output / 1e6) * OUTPUT_USD_PER_MTOK;
  const totalCost = inputCost + outputCost;

  // Score: higher is better. Invert cost as score.
  return { cost: totalCost, score: 1 / (1 + totalCost) };
}

/**
 * Your agent function - integrate your actual agent here
 *
 * <CUSTOMISE>: Replace with your agent implementation
 */
async function runAgent(prompt: string): Promise<AgentResponse> {
  // Example stub; replace with actual agent SDK call
  const response = await fetch("http://localhost:3000/agent", {
    body: JSON.stringify({ model: AGENT_MODEL, prompt }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Agent error: ${response.statusText}`);
  }

  const json = await response.json();
  return AgentResponseSchema.parse(json);
}

/**
 * Load the test dataset.
 */
async function loadDataset(): Promise<TestCase[]> {
  // <CUSTOMISE>: Implement your dataset loader
  // Option 1: Load from Braintrust. Pass `data: initDataset({ project, dataset })` to Eval
  // instead of an array (import { initDataset } from "braintrust").

  // Option 2: Load from a JSON file
  const fs = await import("node:fs/promises");
  const data = await fs.readFile("./evals/fixtures.json", "utf-8");
  const records: unknown[] = JSON.parse(data);
  return records.map((r) => TestCaseSchema.parse(r));
}

const dataset = await loadDataset();
console.log(`Loaded ${dataset.length} test cases`);

/**
 * The eval. Run it with `npx braintrust eval eval-braintrust.ts` (or `npx tsx` for a local run).
 * Eval() returns a summary with the experiment name and URL, per-score averages and the
 * results for each case.
 */
export const result = await Eval(PROJECT_NAME, {
  // Each row: input goes to the task, expected and metadata go to the scorers.
  data: dataset.map((testCase) => ({
    expected: testCase.expected_output ?? null,
    input: testCase.prompt,
    metadata: {
      category: testCase.category ?? "unspecified",
      expected_tools: testCase.expected_tools,
      id: testCase.id,
    } satisfies CaseMetadata,
  })),
  experimentName: `${AGENT_MODEL}-baseline`,
  metadata: {
    eval_timestamp: new Date().toISOString(),
    model: AGENT_MODEL,
  },
  // Run each case this many times to see variance; compute pass@k / pass^k from the trials.
  trialCount: 1,
  task: async (input: string) => runAgent(input),
  scores: [
    // LLM-judged factuality against the expected answer (autoevals). Needs an expected value.
    async ({ input, output, expected }) => {
      if (!expected) {
        return null; // Skip when there is no ground truth
      }
      return Factuality({ expected, input, output: output.text });
    },

    // Custom scorer: tool order
    ({ metadata, output }) => {
      const result = scoreToolCallOrder((metadata as CaseMetadata).expected_tools, output);
      return {
        metadata: { details: result.details },
        name: "tool_call_order",
        score: result.score,
      };
    },

    // Custom scorer: cost
    ({ output }) => {
      const result = scoreCost(output);
      return { metadata: { cost_usd: result.cost }, name: "cost_efficiency", score: result.score };
    },

    // Pass/fail: did the agent produce the expected output?
    ({ expected, output }) => {
      if (!expected) {
        return null; // Skip if no ground truth
      }
      const match = output.text.includes(expected);
      return {
        metadata: {
          details: match ? "Output matched" : `Expected substring not found: ${expected}`,
        },
        name: "output_match",
        score: match ? 1 : 0,
      };
    },
  ],
});

console.log("\n=== Eval Results ===");
console.log(`Experiment: ${result.summary.experimentName}`);
for (const [name, score] of Object.entries(result.summary.scores)) {
  console.log(`${name}: ${score.score.toFixed(3)}`);
}
console.log(`\nView results: ${result.summary.experimentUrl}`);

export type { TestCase, AgentResponse };
export { loadDataset, runAgent };

/**
 * Usage:
 *
 * ```bash
 * # Run evaluation
 * BRAINTRUST_API_KEY=sk_... npx braintrust eval eval-braintrust.ts
 *
 * # Or from package.json:
 * "scripts": {
 *   "eval": "braintrust eval eval-braintrust.ts",
 *   "eval:watch": "braintrust eval --watch eval-braintrust.ts"
 * }
 * ```
 */
