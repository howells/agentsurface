/**
 * Autonomous Worker: Scheduled Workflows
 *
 * Temporal TypeScript workflow skeleton for periodic agent work:
 * - Weekly insights generation (Mondays 07:00 local)
 * - Hourly job runner with exponential backoff
 * - Per-minute notification flusher
 *
 * Alternative stacks commented: Inngest + Bun cron.
 * Includes idempotency keys, retry policies, and activity deduplication.
 *
 * When to use:
 * - Scheduled agent tasks (insights, reports, batch operations)
 * - Durable workflows that survive process restarts
 * - Activities with strong failure guarantees and replay semantics
 * - Multi-step coordination (fan-out, wait-all-complete)
 *
 * Canonical docs:
 * - Temporal TypeScript SDK: https://temporal.io/typescript
 * - Durable execution: https://temporal.io/docs/concepts/what-is-temporal
 * - Inngest alternative: https://www.inngest.com/docs
 * - Bun cron: https://bun.sh/docs/api/cron
 *
 * // <CUSTOMISE>
 * - Replace insight generation with your domain logic
 * - Update cron expressions for your timezone/frequency
 * - Implement retry policies (max attempts, backoff)
 * - Add real activity code (API calls, database writes)
 */

import { proxyActivities, sleep, defineSignal } from "@temporalio/workflow";
import type { Activity } from "@temporalio/activity";
import { Worker } from "@temporalio/worker";
import { Connection, Client } from "@temporalio/client";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

/**
 * Activity definitions (pure, deterministic functions called by workflows).
 */
const activities = proxyActivities<typeof import("./activities")>({
  startToCloseTimeout: "10 minutes",
  retryPolicy: {
    initialInterval: "1 second",
    maximumInterval: "1 minute",
    maximumAttempts: 5,
    backoffCoefficient: 2,
  },
});

/**
 * Signal handlers (allow external events to modify workflow state).
 */
const signalCancelledByUser = defineSignal<[{ reason: string }]>(
  "cancelledByUser",
);

/**
 * Workflow: Generate weekly insights (Mondays 07:00 local time).
 */
export async function* weeklyInsightsWorkflow(input: {
  userId: string;
  timezone: string;
  lookbackDays: number;
}): AsyncGenerator<Promise<unknown> | null> {
  const workflowId = `insights-${input.userId}-${Date.now()}`;
  let cancelled = false;

  // Allow cancellation
  yield defineSignal("cancelledByUser", ({ reason }) => {
    console.log(`[insights] Cancelled: ${reason}`);
    cancelled = true;
  });

  if (cancelled) {
    return;
  }

  try {
    // Fetch user's recent activity
    const activity = yield activities.fetchUserActivitySummary({
      userId: input.userId,
      lookbackDays: input.lookbackDays,
      idempotencyKey: `summary-${input.userId}-${Math.floor(Date.now() / 1000 / 86400)}`,
    });

    if (!activity) {
      console.log(`[insights] No activity for user ${input.userId}`);
      return;
    }

    // Generate insights (e.g., ML-based recommendations)
    const insights = yield activities.generateInsights({
      activity,
      userId: input.userId,
      idempotencyKey: `insights-${input.userId}-${Math.floor(Date.now() / 1000 / 86400)}`,
    });

    // Send notification
    yield activities.sendNotification({
      userId: input.userId,
      channel: "email",
      title: "Your Weekly Insights",
      body: insights,
      idempotencyKey: `notify-${input.userId}-${Math.floor(Date.now() / 1000 / 86400)}`,
    });

    console.log(`[insights] Completed for user ${input.userId}`);
  } catch (error) {
    console.error(`[insights] Error for user ${input.userId}:`, error);
    throw error;
  }
}

/**
 * Workflow: Hourly job runner (retry with exponential backoff).
 */
export async function* hourlyJobRunnerWorkflow(input: {
  jobType: "sync_data" | "process_queue" | "cleanup";
  batchSize: number;
}): AsyncGenerator<Promise<unknown> | null> {
  const maxAttempts = 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const result = yield activities.executeJob({
        jobType: input.jobType,
        batchSize: input.batchSize,
        attempt,
        idempotencyKey: `job-${input.jobType}-${Math.floor(Date.now() / 1000 / 3600)}`,
      });

      console.log(`[hourly-job] Completed: ${input.jobType}`);
      return result;
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) {
        console.error(`[hourly-job] Failed after ${maxAttempts} attempts:`, error);
        throw error;
      }

      // Exponential backoff
      const delayMs = Math.pow(2, attempt) * 1000;
      console.log(
        `[hourly-job] Retry attempt ${attempt + 1} in ${delayMs}ms`,
      );
      yield sleep(delayMs);
    }
  }
}

/**
 * Workflow: Per-minute notification flusher.
 * Batches pending notifications and sends them.
 */
export async function* notificationFlusherWorkflow(): AsyncGenerator<
  Promise<unknown> | null
> {
  const flushWindowMs = 60000; // 1 minute

  try {
    // Collect all pending notifications
    const batch = yield activities.fetchPendingNotifications({
      limit: 1000,
      maxAgeMs: flushWindowMs,
      idempotencyKey: `flush-${Math.floor(Date.now() / flushWindowMs)}`,
    });

    if (batch.length === 0) {
      console.log(`[flusher] No pending notifications`);
      return;
    }

    // Send in parallel (fan-out)
    const sendPromises = batch.map((notification) =>
      activities.sendNotification({
        userId: notification.userId,
        channel: notification.channel,
        title: notification.title,
        body: notification.body,
        idempotencyKey: `send-${notification.id}`,
      }),
    );

    yield Promise.all(sendPromises);

    console.log(`[flusher] Sent ${batch.length} notifications`);
  } catch (error) {
    console.error(`[flusher] Error:`, error);
    throw error;
  }
}

/**
 * Activity: Fetch user's activity summary (last N days).
 */
export async function fetchUserActivitySummary(input: {
  userId: string;
  lookbackDays: number;
  idempotencyKey: string;
}): Promise<{
  ordersCount: number;
  invoicesSent: number;
  totalRevenue: number;
}> {
  // <CUSTOMISE> Implement real database query
  console.log(
    `[activity] Fetching activity for ${input.userId} (key: ${input.idempotencyKey})`,
  );

  return {
    ordersCount: Math.floor(Math.random() * 100),
    invoicesSent: Math.floor(Math.random() * 50),
    totalRevenue: Math.floor(Math.random() * 50000),
  };
}

/**
 * Activity: Generate insights based on user activity.
 */
export async function generateInsights(input: {
  activity: Record<string, unknown>;
  userId: string;
  idempotencyKey: string;
}): Promise<string> {
  // <CUSTOMISE> Call your ML/LLM backend
  console.log(
    `[activity] Generating insights (key: ${input.idempotencyKey})`,
  );

  return `Based on your activity this week, you're on track for a great month!`;
}

/**
 * Activity: Send notification (email, SMS, push, etc.).
 */
export async function sendNotification(input: {
  userId: string;
  channel: "email" | "sms" | "push";
  title: string;
  body: string;
  idempotencyKey: string;
}): Promise<{ sent: boolean; messageId: string }> {
  // <CUSTOMISE> Implement real notification sending
  console.log(
    `[activity] Sending ${input.channel} to ${input.userId} (key: ${input.idempotencyKey})`,
  );

  return {
    sent: true,
    messageId: uuidv4(),
  };
}

/**
 * Activity: Execute a batch job.
 */
export async function executeJob(input: {
  jobType: string;
  batchSize: number;
  attempt: number;
  idempotencyKey: string;
}): Promise<{ processed: number; failed: number }> {
  // <CUSTOMISE> Implement real job execution
  console.log(
    `[activity] Executing ${input.jobType} (attempt ${input.attempt + 1}, key: ${input.idempotencyKey})`,
  );

  if (input.attempt === 0 && Math.random() < 0.3) {
    // Simulate occasional failure
    throw new Error(`Simulated job failure on attempt 1`);
  }

  return {
    processed: input.batchSize,
    failed: 0,
  };
}

/**
 * Activity: Fetch pending notifications.
 */
export async function fetchPendingNotifications(input: {
  limit: number;
  maxAgeMs: number;
  idempotencyKey: string;
}): Promise<
  Array<{
    id: string;
    userId: string;
    channel: "email" | "sms" | "push";
    title: string;
    body: string;
  }>
> {
  // <CUSTOMISE> Query notification queue
  console.log(
    `[activity] Fetching pending notifications (key: ${input.idempotencyKey})`,
  );

  return [];
}

/**
 * Worker setup (runs activities, polls for workflows).
 */
export async function setupTemporalWorker() {
  const connection = await Connection.connect({
    address: "localhost:7233", // Default Temporal server
  });

  const worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: "agent-tasks",
    workflowsPath: require.resolve("./autonomous-worker.ts"),
    activities: {
      fetchUserActivitySummary,
      generateInsights,
      sendNotification,
      executeJob,
      fetchPendingNotifications,
    },
  });

  console.log("[worker] Starting Temporal worker...");
  await worker.run();
}

/**
 * Client setup (schedules workflows).
 */
export async function scheduleWorkflows() {
  const connection = await Connection.connect({
    address: "localhost:7233",
  });

  const client = new Client({ connection });

  // Schedule weekly insights (Mondays 07:00)
  const weeklyHandle = await client.workflow.start(
    weeklyInsightsWorkflow,
    {
      taskQueue: "agent-tasks",
      workflowId: "weekly-insights-scheduler",
      cronSchedule: "0 7 ? * MON", // Cron: Mondays at 07:00 UTC
    },
  );

  console.log(`[scheduler] Started weekly insights workflow: ${weeklyHandle.workflowId}`);

  // Schedule hourly job runner
  const hourlyHandle = await client.workflow.start(hourlyJobRunnerWorkflow, {
    taskQueue: "agent-tasks",
    workflowId: "hourly-job-runner",
    cronSchedule: "0 * * * *", // Cron: Every hour
  });

  console.log(`[scheduler] Started hourly job runner: ${hourlyHandle.workflowId}`);
}

/**
 * ALTERNATIVE: Inngest serverless workflows
 * (Comment out Temporal setup and use this instead)
 *
 * import { Inngest, serve } from "inngest";
 *
 * const inngest = new Inngest({ id: "agent-workflows" });
 *
 * // Weekly insights
 * inngest.createFunction(
 *   { id: "weekly-insights" },
 *   { cron: "0 7 ? * MON" },
 *   async ({ step }) => {
 *     const activity = await step.run("fetch-activity", async () =>
 *       fetchUserActivitySummary({ userId: "user-123", lookbackDays: 7 })
 *     );
 *     const insights = await step.run("generate-insights", async () =>
 *       generateInsights({ activity, userId: "user-123" })
 *     );
 *     await step.run("send-notification", async () =>
 *       sendNotification({ userId: "user-123", channel: "email", title: "Weekly", body: insights })
 *     );
 *   }
 * );
 *
 * export default serve(inngest, [weeklyInsightsFunction]);
 */

/**
 * ALTERNATIVE: Bun cron
 * (For lightweight, in-process scheduling)
 *
 * import { CronJob } from "bun";
 *
 * // Weekly insights every Monday at 07:00
 * new CronJob("0 7 * * 1", async () => {
 *   console.log("[bun-cron] Weekly insights task");
 *   const activity = await fetchUserActivitySummary({
 *     userId: "user-123",
 *     lookbackDays: 7,
 *     idempotencyKey: `bun-${Date.now()}`,
 *   });
 *   const insights = await generateInsights({
 *     activity,
 *     userId: "user-123",
 *     idempotencyKey: `bun-${Date.now()}`,
 *   });
 *   await sendNotification({
 *     userId: "user-123",
 *     channel: "email",
 *     title: "Weekly Insights",
 *     body: insights,
 *     idempotencyKey: `bun-notify-${Date.now()}`,
 *   });
 * });
 *
 * // Hourly job runner
 * new CronJob("0 * * * *", async () => {
 *   console.log("[bun-cron] Hourly job task");
 *   await executeJob({
 *     jobType: "sync_data",
 *     batchSize: 100,
 *     attempt: 0,
 *     idempotencyKey: `bun-${Date.now()}`,
 *   });
 * });
 */
