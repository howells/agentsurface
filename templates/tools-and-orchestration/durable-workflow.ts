/**
 * durable-workflow.ts
 *
 * Durable execution for agent tasks using Temporal TypeScript SDK.
 * Demonstrates workflow definition, activities, signals, and queries.
 *
 * When to use: Long-running agent tasks that must survive crashes, timeouts,
 * or require human-in-the-loop approvals. Example: analyze file -> run tests -> deploy.
 * Each step is checkpointed; if crashed, resume from last checkpoint (not from scratch).
 *
 * Why Temporal:
 * - Deterministic replay: exact same execution path every time
 * - Automatic retries with exponential backoff
 * - Signals: interrupt workflow mid-flight (e.g., user approval)
 * - Queries: check status without modifying state
 * - Industrial-grade (used at Stripe, Uber, Netflix)
 *
 * Alternatives:
 * - Inngest: Event-driven, simpler, TS-first, free tier
 * - Trigger.dev: Serverless, webhook-based, easiest API
 * - AWS Durable Functions, Cloudflare Workflows, Vercel Workflow DevKit (newer)
 *
 * Citation:
 * - Temporal TypeScript SDK: https://github.com/temporalio/sdk-typescript
 * - Docs: https://docs.temporal.io
 *
 * CUSTOMISE:
 * - Define your activities (actual work: run agent, call API, wait for approval)
 * - Implement signals (how workflow responds to interrupts)
 * - Add queries (what status should be queryable?)
 * - Point to Temporal server (local dev or Cloud)
 */

import {
  Activity,
  ActivityFailure,
  ApplicationFailure,
  defineActivity,
  defineQuery,
  defineSignal,
  proxyActivities,
  setHandler,
  sleep,
  workflowInfo,
} from '@temporalio/workflow';
import {
  Client,
  WorkflowFailedError,
  WorkflowExecutionAlreadyStartedError,
  Duration,
} from '@temporalio/client';
import { Anthropic } from '@anthropic-ai/sdk';

// ============================================================================
// ACTIVITIES (actual work; can be retried independently)
// ============================================================================

/**
 * Activity: Run an agent turn (LLM call).
 * Retried automatically on timeout.
 * <CUSTOMISE> Replace with your actual agent logic.
 */
export const runAgentTurn = defineActivity(
  async (prompt: string, context: string): Promise<string> => {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 500,
      system: `You are an AI agent. ${context}`,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.content[0]?.type === 'text' ? response.content[0].text : '';
  }
);

/**
 * Activity: Call a tool (e.g., run tests, deploy).
 */
export const callTool = defineActivity(
  async (toolName: string, params: unknown): Promise<any> => {
    // <CUSTOMISE> Route to actual tool
    switch (toolName) {
      case 'run_tests':
        return { status: 'passed', count: 127 };
      case 'deploy':
        return { status: 'success', deployment_id: 'deploy-123' };
      default:
        throw new ApplicationFailure(`Unknown tool: ${toolName}`);
    }
  }
);

/**
 * Activity: Wait for human approval (blocking).
 * Timed activity; fails if approval doesn't arrive in time.
 */
export const waitForApproval = defineActivity(
  async (reason: string): Promise<boolean> => {
    console.log(`⏳ Waiting for approval: ${reason}`);
    // In real scenario: emit event, wait on approval signal
    // For demo: auto-approve after 10 seconds
    await sleep(Duration.seconds(10));
    return true; // Approved
  }
);

/**
 * Activity: Log status (lightweight, no retries).
 */
export const logStatus = defineActivity(
  async (status: string): Promise<void> => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${status}`);
  }
);

// ============================================================================
// WORKFLOW STATE & SIGNALS
// ============================================================================

/**
 * State passed through workflow execution.
 */
interface WorkflowState {
  task: string;
  status: 'running' | 'waiting_approval' | 'failed' | 'completed';
  result: string;
  step: number;
}

/**
 * Signal: User cancels workflow mid-flight.
 */
const cancelSignal = defineSignal<void>('cancel');

/**
 * Signal: User approves a pending action.
 */
const approveSignal = defineSignal<boolean>('approve');

/**
 * Query: Check current workflow status.
 */
const statusQuery = defineQuery<string>('status');

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

export async function agentWorkflow(
  task: string
): Promise<string> {
  // Initialize state
  let state: WorkflowState = {
    task,
    status: 'running',
    result: '',
    step: 0,
  };

  // Handle cancel signal: halt workflow
  let shouldCancel = false;
  setHandler(cancelSignal, () => {
    shouldCancel = true;
  });

  // Handle approval signal: resume from wait
  let approvalReceived = false;
  setHandler(approveSignal, (approved: boolean) => {
    approvalReceived = approved;
  });

  // Handle status query: return current state
  setHandler(statusQuery, () => {
    return JSON.stringify(state);
  });

  const activities = proxyActivities<typeof import('./durable-workflow')>({
    startToCloseTimeout: Duration.seconds(300), // 5 min max per activity
    retryPolicy: {
      initialInterval: Duration.seconds(1),
      maximumInterval: Duration.seconds(60),
      maximumAttempts: 3,
    },
  });

  try {
    // Step 1: Analyze task
    state.step = 1;
    state.status = 'running';
    const analysis = await activities.runAgentTurn(
      `Analyze this task: ${task}`,
      'You are an analyst.'
    );
    state.result = analysis;
    await activities.logStatus(`Step 1 (analysis): Complete`);

    if (shouldCancel) throw new ApplicationFailure('Workflow cancelled');

    // Step 2: Plan approach
    state.step = 2;
    const plan = await activities.runAgentTurn(
      `Based on this analysis, create a plan: ${analysis}`,
      'You are a planner.'
    );
    state.result = plan;
    await activities.logStatus(`Step 2 (planning): Complete`);

    if (shouldCancel) throw new ApplicationFailure('Workflow cancelled');

    // Step 3: Request approval (human-in-the-loop)
    state.step = 3;
    state.status = 'waiting_approval';
    await activities.logStatus(
      `Step 3: Awaiting approval for plan. Timeout: 5 minutes`
    );

    // Wait for signal or timeout
    let approvalTimeout = false;
    await Promise.race([
      new Promise<void>((resolve) => {
        // Set up handler once, but check approvalReceived
        const checkInterval = setInterval(() => {
          if (approvalReceived || shouldCancel) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      }),
      sleep(Duration.minutes(5)).then(() => {
        approvalTimeout = true;
      }),
    ]);

    if (approvalTimeout) {
      throw new ApplicationFailure('Approval timeout (5 min)');
    }
    if (shouldCancel) throw new ApplicationFailure('Workflow cancelled');

    state.status = 'running';
    await activities.logStatus(`Step 3: Approval received`);

    // Step 4: Execute plan (call tools)
    state.step = 4;
    const toolResult = await activities.callTool('run_tests', {
      suite: 'integration',
    });
    state.result = JSON.stringify(toolResult);
    await activities.logStatus(`Step 4 (tool call): ${toolResult.status}`);

    if (shouldCancel) throw new ApplicationFailure('Workflow cancelled');

    // Step 5: Summarize
    state.step = 5;
    const summary = await activities.runAgentTurn(
      `Summarize results: ${state.result}`,
      'You are a summarizer.'
    );
    state.result = summary;
    state.status = 'completed';
    await activities.logStatus(`Step 5: Workflow complete`);

    return summary;
  } catch (err: any) {
    state.status = 'failed';
    state.result = err.message;
    await activities.logStatus(`Workflow failed: ${err.message}`);
    throw err;
  }
}

// ============================================================================
// CLIENT: Submit & Monitor Workflow
// ============================================================================

export async function submitAgentWorkflow(task: string): Promise<void> {
  // Connect to Temporal server (local: localhost:7233)
  const client = new Client({
    connection: {
      address: process.env.TEMPORAL_SERVER || 'localhost:7233',
    },
  });

  const workflowHandle = await client.workflow.start(agentWorkflow, {
    args: [task],
    taskQueue: 'agent-tasks',
    workflowId: `agent-${Date.now()}`,
  });

  console.log(`Started workflow: ${workflowHandle.workflowId}`);

  // Check status every 2 seconds
  let done = false;
  while (!done) {
    await sleep(Duration.seconds(2));

    try {
      const status = await workflowHandle.query(statusQuery);
      const parsed = JSON.parse(status);
      console.log(
        `Status: ${parsed.status} (step ${parsed.step}), result: ${parsed.result.substring(0, 100)}...`
      );

      if (parsed.status === 'completed' || parsed.status === 'failed') {
        done = true;
      }
    } catch (err) {
      // Query may fail if workflow not yet started
      console.log('(waiting for workflow to start)');
    }
  }

  // Wait for final result
  const result = await workflowHandle.result();
  console.log('Workflow result:', result);
}

// ============================================================================
// CLIENT: Interrupt Workflow (send signal)
// ============================================================================

export async function approveWorkflow(workflowId: string): Promise<void> {
  const client = new Client();
  const workflowHandle = client.workflow.getHandle(workflowId);

  console.log(`Approving workflow ${workflowId}`);
  await workflowHandle.signal(approveSignal, true);
}

export async function cancelWorkflow(workflowId: string): Promise<void> {
  const client = new Client();
  const workflowHandle = client.workflow.getHandle(workflowId);

  console.log(`Cancelling workflow ${workflowId}`);
  await workflowHandle.signal(cancelSignal);
}

// ============================================================================
// COMPARISON: Temporal vs. Inngest vs. Trigger.dev
// ============================================================================

/**
 * Temporal (complex, industrial):
 * - Pro: Deterministic replay, extreme reliability, fine-grained state control
 * - Con: Steep learning curve, requires Temporal server (self-hosted or Cloud)
 * - Best for: Mission-critical workflows, complex orchestration, financial/payment flows
 * - Example: Stripe, Uber, Netflix
 * - Docs: https://temporal.io
 *
 * Inngest (event-driven, TS-first, simpler):
 * - Pro: Serverless, no infra to manage, event-driven, great DX
 * - Con: Less control than Temporal, smaller ecosystem
 * - Best for: Startups, webhooks, serverless workflows, quick iteration
 * - Pricing: Free tier (1k invocations/month)
 * - Docs: https://inngest.com
 *
 * Trigger.dev (webhooks, simplest API):
 * - Pro: Easiest API, webhook-native, TS-first, great for Next.js
 * - Con: Less powerful orchestration than Temporal
 * - Best for: Quick prototypes, webhook-driven tasks, SaaS integrations
 * - Docs: https://trigger.dev
 *
 * AWS Durable Functions / Cloudflare Workflows / Vercel Workflow DevKit (new, 2025):
 * - Pro: Integrated with existing cloud platform, low friction
 * - Con: Early stage, limited cross-platform adoption
 * - Best for: AWS/Cloudflare/Vercel-exclusive projects
 *
 * For this template: Temporal chosen for educational completeness.
 * For production: Choose based on infra (serverless? VM? hybrid?), team expertise, cost.
 */

// ============================================================================
// TESTING (local, in-memory)
// ============================================================================

export async function testWorkflowLocally(): Promise<void> {
  // Simulate workflow (for testing without Temporal server)
  console.log('Testing agent workflow...');

  const task = 'Analyze code changes and deploy if tests pass';
  try {
    const result = await agentWorkflow(task);
    console.log('Test passed. Result:', result);
  } catch (err) {
    console.error('Test failed:', err);
  }
}
