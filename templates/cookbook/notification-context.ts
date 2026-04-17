/**
 * Notification Context Store
 *
 * Maintain conversation context across notification-driven message threads.
 * When the agent re-engages via a notification (e.g., daily digest, match alert),
 * inject prior context into the system prompt so the agent understands the event
 * in relation to the user's ongoing work.
 *
 * When to use:
 * - Pushing notifications that reference previous interactions
 * - Building "event + context" narratives (e.g., "you have 3 overdue invoices")
 * - Resuming multi-turn conversations after notification delivery
 * - Enriching notifications with user's recent activity
 *
 * Canonical docs:
 * - Redis patterns for context storage: https://redis.io/docs/develop/
 * - Notification best practices: https://www.intercom.com/blog/notification-design/
 * - Context injection in prompts: https://sdk.vercel.ai/docs/foundations/prompts
 *
 * // <CUSTOMISE>
 * - Replace Redis client with your store (DynamoDB, PostgreSQL, etc.)
 * - Adjust TTL (24h default) based on notification refresh cycle
 * - Extend context payload schema for your domain
 */

import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * Notification context payload (generic).
 * Describes the event and related entities that triggered a notification.
 */
export const NotificationContextPayloadSchema = z.object({
  eventKind: z
    .enum(["match", "alert", "reminder", "digest", "custom"])
    .describe("Type of event"),
  entityIds: z
    .array(z.string())
    .describe("IDs of affected entities (invoice IDs, ticket IDs, etc.)"),
  summary: z.string().describe("Plaintext summary of the event"),
  metadata: z
    .record(z.unknown())
    .optional()
    .describe("Additional context (counts, amounts, names)"),
  timestamp: z.number().describe("Unix timestamp when event occurred"),
});

export type NotificationContextPayload = z.infer<
  typeof NotificationContextPayloadSchema
>;

/**
 * In-memory or Redis-backed notification context store.
 * Stores the last notification context per user+platform with TTL.
 */
export class NotificationContextStore {
  // <CUSTOMISE> Replace with Redis client (ioredis or node-redis)
  private memory: Map<string, NotificationContextPayload> = new Map();
  private ttls: Map<string, number> = new Map();

  constructor(
    private ttlSeconds: number = 86400, // 24 hours default
    private redisClient?: { get: Function; set: Function },
  ) {}

  /**
   * Compute a cache key from userId + platform.
   */
  private cacheKey(userId: string, platform: string): string {
    const combined = `${userId}:${platform}`;
    return createHash("sha256").update(combined).digest("hex").slice(0, 16);
  }

  /**
   * Store the last notification context for a user on a platform.
   */
  async setLastNotificationContext(
    userId: string,
    platform: string,
    context: NotificationContextPayload,
  ): Promise<void> {
    const key = this.cacheKey(userId, platform);

    // Store in memory
    this.memory.set(key, context);
    const expiresAt = Date.now() + this.ttlSeconds * 1000;
    this.ttls.set(key, expiresAt);

    // <CUSTOMISE> Persist to Redis:
    // await this.redisClient?.set(key, JSON.stringify(context), 'EX', this.ttlSeconds);

    console.log(
      `[notification-context] stored context for user=${userId} platform=${platform}`,
    );
  }

  /**
   * Retrieve the last notification context for a user on a platform.
   * Returns null if expired or not found.
   */
  async getLastNotificationContext(
    userId: string,
    platform: string,
  ): Promise<NotificationContextPayload | null> {
    const key = this.cacheKey(userId, platform);

    // Check expiry in memory
    const expiresAt = this.ttls.get(key);
    if (expiresAt && expiresAt < Date.now()) {
      this.memory.delete(key);
      this.ttls.delete(key);
      return null;
    }

    // <CUSTOMISE> Try Redis if enabled:
    // if (this.redisClient) {
    //   const value = await this.redisClient.get(key);
    //   return value ? JSON.parse(value) : null;
    // }

    return this.memory.get(key) || null;
  }

  /**
   * Clear context for a user+platform (e.g., after notification is read).
   */
  async clearNotificationContext(
    userId: string,
    platform: string,
  ): Promise<void> {
    const key = this.cacheKey(userId, platform);
    this.memory.delete(key);
    this.ttls.delete(key);

    // <CUSTOMISE> Clear from Redis:
    // await this.redisClient?.del(key);
  }

  /**
   * Clear all expired contexts (cleanup task).
   */
  async evictExpired(): Promise<number> {
    const now = Date.now();
    let count = 0;

    for (const [key, expiresAt] of this.ttls.entries()) {
      if (expiresAt < now) {
        this.memory.delete(key);
        this.ttls.delete(key);
        count++;
      }
    }

    console.log(`[notification-context] evicted ${count} expired contexts`);
    return count;
  }
}

/**
 * Inject notification context into the system prompt.
 * Helps the agent understand the current event in relation to user history.
 */
export function injectNotificationContext(
  systemPrompt: string,
  context: NotificationContextPayload | null,
): string {
  if (!context) {
    return systemPrompt;
  }

  const contextBlock = `
## Recent Notification Context
- Event: ${context.eventKind}
- Summary: ${context.summary}
- Entities: ${context.entityIds.join(", ")}
- Time: ${new Date(context.timestamp).toISOString()}
${context.metadata ? `- Details: ${JSON.stringify(context.metadata)}` : ""}

Use this context to understand what happened and why the user is interacting with you now.`;

  return systemPrompt + "\n" + contextBlock;
}

/**
 * Example: Building a notification context from multiple events.
 */
export function buildNotificationContextFromEvents(
  events: Array<{ kind: string; entityId: string; amount?: number }>,
): NotificationContextPayload {
  const eventKinds = [...new Set(events.map((e) => e.kind))];
  const entityIds = [...new Set(events.map((e) => e.entityId))];
  const summary =
    eventKinds.length === 1
      ? `You have ${events.length} ${eventKinds[0]} event(s)`
      : `You have ${events.length} events`;

  return {
    eventKind: "custom",
    entityIds,
    summary,
    metadata: {
      eventKinds,
      eventCount: events.length,
      totalAmount: events.reduce((sum, e) => sum + (e.amount || 0), 0),
    },
    timestamp: Date.now(),
  };
}

/**
 * Example: Match notification context.
 */
export function createMatchNotificationContext(
  inboxId: string,
  transactionId: string,
  summary: string,
): NotificationContextPayload {
  return {
    eventKind: "match",
    entityIds: [inboxId, transactionId],
    summary,
    metadata: {
      inboxId,
      transactionId,
      matchType: "high_confidence",
    },
    timestamp: Date.now(),
  };
}

/**
 * Example: Alert notification context (e.g., overdue invoice).
 */
export function createAlertNotificationContext(
  invoiceId: string,
  daysOverdue: number,
  amount?: number,
): NotificationContextPayload {
  return {
    eventKind: "alert",
    entityIds: [invoiceId],
    summary: `Invoice is ${daysOverdue} day(s) overdue${amount ? ` ($${amount})` : ""}`,
    metadata: {
      invoiceId,
      daysOverdue,
      amount,
    },
    timestamp: Date.now(),
  };
}

/**
 * Example: Daily digest notification context.
 */
export function createDigestNotificationContext(
  digest: {
    newOrders: number;
    overdueInvoices: number;
    totalRevenue: number;
  },
): NotificationContextPayload {
  return {
    eventKind: "digest",
    entityIds: [],
    summary: `Daily summary: ${digest.newOrders} new order(s), ${digest.overdueInvoices} overdue invoice(s)`,
    metadata: {
      ...digest,
    },
    timestamp: Date.now(),
  };
}

/**
 * Middleware: auto-inject notification context into system prompt.
 */
export async function withNotificationContext(
  systemPrompt: string,
  store: NotificationContextStore,
  userId: string,
  platform: string,
): Promise<string> {
  const context = await store.getLastNotificationContext(userId, platform);
  return injectNotificationContext(systemPrompt, context);
}

/**
 * Periodic cleanup task (e.g., run every hour).
 */
export async function cleanupExpiredContexts(
  store: NotificationContextStore,
): Promise<void> {
  await store.evictExpired();
}
