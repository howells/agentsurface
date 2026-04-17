/**
 * langgraph-swarm.ts
 *
 * LangGraph swarm pattern: peer agents hand off to each other mid-task.
 * More dynamic than supervisor pattern; agents decide when to delegate.
 *
 * When to use: When agents are peers (no central authority) and can hand off
 * work dynamically based on context. Example: code review agent -> test agent -> deploy agent.
 * Agents are autonomous; supervision happens via shared memory.
 *
 * Key pattern:
 * - Each agent is a node with its own LLM call
 * - Agents can return a handoff command + next agent name
 * - Shared state passed between agents
 * - No central supervisor; orchestration is distributed
 *
 * ⚠️  Cognition consensus: Single agent is usually simpler. Swarms add complexity;
 * justify with clear handoff heuristics and independent worker logic.
 *
 * Citation: https://langchain-ai.github.io/langgraphjs/tutorials/agents/multi_agent_systems/#swarm
 * LangGraph Command: https://langchain-ai.github.io/langgraphjs/concepts/low_level_conceptual_index/#command
 *
 * CUSTOMISE:
 * - Define your agents (codeReviewer, testRunner, deployer, etc.)
 * - Implement handoff logic (when does agent X delegate to agent Y?)
 * - Define shared state schema
 * - Tune model + max iterations
 */

import { Annotation, StateGraph, START, END, Command } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { Anthropic } from '@anthropic-ai/sdk';

// ============================================================================
// STATE SCHEMA (shared across all agents)
// ============================================================================

const SwarmState = Annotation.Root({
  task: Annotation<string>({
    description: 'Original task or code review request',
  }),

  // Code being reviewed/tested/deployed
  code_diff: Annotation<string>({
    description: 'Git diff or code snippet',
    default: '',
  }),

  // Agent-specific outputs (accumulated)
  review_comments: Annotation<string>({
    description: 'Code review feedback from reviewer agent',
    default: '',
  }),
  test_results: Annotation<string>({
    description: 'Test execution results from test agent',
    default: '',
  }),
  deploy_status: Annotation<string>({
    description: 'Deployment status from deploy agent',
    default: '',
  }),

  // Shared context
  current_agent: Annotation<string>({
    description: 'Name of agent currently handling task',
    default: 'reviewer',
  }),
  messages: Annotation<Array<{ role: 'user' | 'assistant'; content: string }>>({
    description: 'Conversation history for agent context',
    default: [],
  }),
  step_count: Annotation<number>({
    description: 'Prevent infinite loops',
    default: 0,
  }),
});

type SwarmStateType = typeof SwarmState.State;

// ============================================================================
// AGENTS (peer workers, autonomous)
// ============================================================================

/**
 * Code review agent. Analyzes code and decides whether to:
 * - Continue review (provide more feedback)
 * - Hand off to test agent (code looks good, needs testing)
 * - Stop (satisfied with findings)
 */
async function codeReviewerAgent(state: SwarmStateType): Promise<Command<SwarmStateType>> {
  const anthropic = new Anthropic();

  const systemPrompt = `You are a senior code reviewer. Your job: review code for quality, security, and style.
After reviewing, decide what to do next:
- "CONTINUE_REVIEW" — Provide additional feedback
- "HANDOFF:test_runner" — Code looks good, send to tests
- "HANDOFF:deployer" — Code is excellent, ready to deploy
- "STOP" — Done reviewing

Format: [DECISION] [optional context]`;

  const userMessage = `Review this code:\n\n${state.code_diff}\n\nPrevious feedback:\n${state.review_comments}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 800,
    system: systemPrompt,
    messages: [
      ...state.messages,
      { role: 'user', content: userMessage },
    ],
  });

  const responseText =
    response.content[0]?.type === 'text' ? response.content[0].text : '';

  const newReviewComments = state.review_comments + '\n---\n' + responseText;

  // Parse decision from response
  let nextNode = END;
  if (responseText.includes('CONTINUE_REVIEW')) {
    nextNode = 'reviewer'; // Stay on this agent
  } else if (responseText.includes('HANDOFF:test_runner')) {
    nextNode = 'test_runner';
  } else if (responseText.includes('HANDOFF:deployer')) {
    nextNode = 'deployer';
  }

  return new Command({
    update: {
      review_comments: newReviewComments,
      current_agent: 'reviewer',
      messages: [
        ...state.messages,
        { role: 'assistant', content: responseText },
      ],
      step_count: state.step_count + 1,
    },
    goto: nextNode,
  });
}

/**
 * Test runner agent. Executes tests and decides:
 * - Tests pass → hand off to deploy agent
 * - Tests fail → hand back to reviewer (code changes needed)
 * - Some tests flaky → request manual approval
 */
async function testRunnerAgent(state: SwarmStateType): Promise<Command<SwarmStateType>> {
  const anthropic = new Anthropic();

  const systemPrompt = `You are a test automation agent. Analyze the code and test results.
Decide next step:
- "HANDOFF:deployer" — All tests pass, ready to deploy
- "HANDOFF:reviewer" — Tests failed, code needs review
- "MANUAL_APPROVAL" — Some tests are flaky, needs human review
- "STOP" — Done testing

Format: [DECISION] [reason]`;

  const userMessage = `Code to test:\n${state.code_diff}\n\nReview feedback so far:\n${state.review_comments}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: systemPrompt,
    messages: [
      ...state.messages,
      { role: 'user', content: userMessage },
    ],
  });

  const responseText =
    response.content[0]?.type === 'text' ? response.content[0].text : '';

  const newTestResults = state.test_results + '\n---\n' + responseText;

  let nextNode = END;
  if (responseText.includes('HANDOFF:deployer')) {
    nextNode = 'deployer';
  } else if (responseText.includes('HANDOFF:reviewer')) {
    nextNode = 'reviewer';
  } else if (responseText.includes('MANUAL_APPROVAL')) {
    nextNode = END; // Escalate to human
  }

  return new Command({
    update: {
      test_results: newTestResults,
      current_agent: 'test_runner',
      messages: [
        ...state.messages,
        { role: 'assistant', content: responseText },
      ],
      step_count: state.step_count + 1,
    },
    goto: nextNode,
  });
}

/**
 * Deploy agent. Handles deployment to production.
 * Communicates final status back to orchestrator.
 */
async function deployerAgent(state: SwarmStateType): Promise<Command<SwarmStateType>> {
  const anthropic = new Anthropic();

  const systemPrompt = `You are a deployment agent. Review code + tests, then decide:
- "DEPLOY" — All checks pass, proceed to production
- "ABORT" — Something is wrong, do not deploy
- "REQUEST_APPROVAL" — Ready, but needs human sign-off

Format: [DECISION] [reason]`;

  const userMessage = `Final check before deployment:\nReview: ${state.review_comments}\nTests: ${state.test_results}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      ...state.messages,
      { role: 'user', content: userMessage },
    ],
  });

  const responseText =
    response.content[0]?.type === 'text' ? response.content[0].text : '';

  const deployStatus = responseText.includes('DEPLOY')
    ? 'SUCCESS: Deployed to production'
    : responseText.includes('ABORT')
      ? 'FAILED: Deployment aborted'
      : 'PENDING: Awaiting manual approval';

  return new Command({
    update: {
      deploy_status: deployStatus,
      current_agent: 'deployer',
      messages: [
        ...state.messages,
        { role: 'assistant', content: responseText },
      ],
      step_count: state.step_count + 1,
    },
    goto: END,
  });
}

// ============================================================================
// GRAPH CONSTRUCTION
// ============================================================================

export function createSwarmWorkflow() {
  const workflow = new StateGraph(SwarmState)
    // Add agent nodes
    .addNode('reviewer', codeReviewerAgent)
    .addNode('test_runner', testRunnerAgent)
    .addNode('deployer', deployerAgent)

    // Entry point: always start with code reviewer
    .addEdge(START, 'reviewer')

    // Agents emit Command with goto; no explicit edges needed
    // LangGraph follows the Command's goto field

    // Compile with checkpointer
    .compile({
      checkpointer: new MemorySaver(),
    });

  return workflow;
}

// ============================================================================
// EXECUTION EXAMPLE
// ============================================================================

export async function runSwarmExample() {
  const workflow = createSwarmWorkflow();

  const codeDiff = `
diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,6 +10,7 @@ export async function validateToken(token: string): Promise<boolean> {
   const decoded = jwt.verify(token, process.env.JWT_SECRET);
+  const user = await db.users.findById(decoded.id);
+  return user && user.active;
-  return !!decoded;
}
  `;

  const input = {
    task: 'Review, test, and deploy code change to production',
    code_diff: codeDiff,
  };

  const threadId = `swarm-${Date.now()}`;

  // Run workflow
  // <CUSTOMISE> Set maxSteps to prevent runaway loops
  const result = await workflow.invoke(input, {
    configurable: { thread_id: threadId },
  });

  console.log('=== Swarm Workflow Complete ===');
  console.log('Steps executed:', result.step_count);
  console.log('Review feedback:', result.review_comments);
  console.log('Test results:', result.test_results);
  console.log('Deploy status:', result.deploy_status);

  return result;
}

// ============================================================================
// MULTI-AGENT NOTE (same as supervisor)
// ============================================================================

/**
 * Swarm vs. Supervisor:
 *
 * Supervisor:
 * - Centralized routing logic
 * - One node decides all transitions
 * - Suitable when clear hierarchy exists
 *
 * Swarm:
 * - Distributed decision-making
 * - Each agent decides who to hand off to
 * - Suitable for peer agents with autonomous logic
 *
 * Both require:
 * - Clear state schema (typed)
 * - Checkpointing for crash recovery
 * - Explicit handoff heuristics (not guesswork)
 * - max iterations to prevent loops
 *
 * Cognition reminder: "Single agent is often better."
 * Multi-agent adds complexity; measure success rate vs. single agent before deploying.
 */
