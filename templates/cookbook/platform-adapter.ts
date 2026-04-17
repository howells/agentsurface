/**
 * Platform Adapter Pattern
 *
 * Normalize incoming messages from any platform (web, Slack, WhatsApp, etc.)
 * to a canonical format. Format responses back to platform-native syntax.
 * Resolve user identity across platforms using linking codes or OAuth.
 *
 * When to use:
 * - Supporting multiple messaging platforms (Slack, WhatsApp, Telegram, etc.)
 * - Abstracting platform-specific syntax (Slack blocks vs. WhatsApp templates)
 * - Resolving user identity across disconnected platforms
 * - Routing requests to backend based on platform constraints
 *
 * Canonical docs:
 * - Slack Block Kit: https://api.slack.com/block-kit
 * - WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
 * - Message normalization: https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/message.py
 *
 * // <CUSTOMISE>
 * - Add adapters for your supported platforms
 * - Implement identity resolution (Redis, database, OAuth)
 * - Update formatting rules for platform-specific constraints
 * - Add rich media support (images, files)
 */

import type { ModelMessage } from "ai";
import { z } from "zod";

/**
 * Canonical message format used internally.
 */
export const CanonicalMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  platform: z.enum(["web", "slack", "whatsapp", "telegram", "sendblue"]),
  userId: z.string(),
  metadata: z
    .object({
      timestamp: z.number(),
      richContent: z
        .array(
          z.object({
            type: z.enum(["text", "image", "link", "table"]),
            data: z.record(z.string(), z.unknown()),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type CanonicalMessage = z.infer<typeof CanonicalMessageSchema>;

/**
 * Generic platform adapter interface.
 */
export interface PlatformAdapter {
  /**
   * Normalize incoming platform-native message to canonical format.
   */
  normalize(incoming: unknown): Promise<CanonicalMessage>;

  /**
   * Format response from canonical format to platform-native syntax.
   */
  format(response: CanonicalMessage): Promise<unknown>;

  /**
   * Get platform-specific instructions to inject into system prompt.
   */
  getInstructions(): string;
}

/**
 * Web adapter: supports rich markdown, entity links, React components.
 */
export class WebAdapter implements PlatformAdapter {
  async normalize(incoming: unknown): Promise<CanonicalMessage> {
    const data = incoming as Record<string, unknown>;

    return {
      id: String(data.id || ""),
      role: data.role === "user" ? "user" : "assistant",
      content: String(data.content || ""),
      platform: "web",
      userId: String(data.userId || ""),
      metadata: {
        timestamp: Date.now(),
      },
    };
  }

  async format(msg: CanonicalMessage): Promise<unknown> {
    return {
      id: msg.id,
      content: msg.content,
      html: this.markdownToHtml(msg.content),
      richContent: msg.metadata?.richContent,
    };
  }

  getInstructions(): string {
    return `
## Platform: Web
- Emit one short sentence before tool calls.
- Use markdown tables, entity links (#entity:ID), and formatting.
- Include rich content: tables for 3+ items, links for navigation.`;
  }

  /**
   * Convert markdown to HTML (stub; use marked.js in production).
   */
  private markdownToHtml(md: string): string {
    // <CUSTOMISE> Use marked.js, remark, or similar
    return md.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }
}

/**
 * Slack adapter: Block Kit format, no nested markdown, entity links forbidden.
 */
export class SlackAdapter implements PlatformAdapter {
  async normalize(incoming: unknown): Promise<CanonicalMessage> {
    const data = incoming as Record<string, unknown>;
    const slackEvent = data.event as Record<string, unknown> | undefined;

    return {
      id: String(slackEvent?.ts || ""),
      role: "user",
      content: String(slackEvent?.text || ""),
      platform: "slack",
      userId: String(slackEvent?.user || ""),
      metadata: {
        timestamp: Number(slackEvent?.ts) * 1000,
      },
    };
  }

  async format(msg: CanonicalMessage): Promise<unknown> {
    // Convert markdown to Slack Block Kit
    const blocks = this.markdownToBlocks(msg.content);

    return {
      blocks,
      text: this.blockToPlainText(blocks), // Fallback for clients that don't support blocks
    };
  }

  getInstructions(): string {
    return `
## Platform: Slack
- Use Slack blocks and markdown tables when helpful.
- Do NOT use entity links; those only work on dashboard.
- Keep responses concise; use threading for long discussions.`;
  }

  /**
   * Convert markdown to Slack Block Kit JSON.
   */
  private markdownToBlocks(md: string): Array<Record<string, unknown>> {
    // <CUSTOMISE> Implement full markdown → Block Kit conversion
    // For now, simple text blocks:
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: md,
        },
      },
    ];
  }

  /**
   * Extract plain text from blocks (for fallback).
   */
  private blockToPlainText(blocks: Array<Record<string, unknown>>): string {
    return blocks
      .map((block) => {
        if (block.type === "section" && block.text) {
          return String((block.text as Record<string, unknown>).text || "");
        }
        return "";
      })
      .join("\n");
  }
}

/**
 * WhatsApp adapter: template messages, no markdown, plain text only.
 */
export class WhatsAppAdapter implements PlatformAdapter {
  async normalize(incoming: unknown): Promise<CanonicalMessage> {
    const data = incoming as Record<string, unknown>;
    const message = data.messages?.[0] as Record<string, unknown> | undefined;

    return {
      id: String(message?.id || ""),
      role: "user",
      content: String(message?.text?.body || ""),
      platform: "whatsapp",
      userId: String(message?.from || ""),
      metadata: {
        timestamp: Number(message?.timestamp) * 1000,
      },
    };
  }

  async format(msg: CanonicalMessage): Promise<unknown> {
    // WhatsApp accepts plain text or template messages
    return {
      messaging_product: "whatsapp",
      to: msg.userId,
      type: "text",
      text: {
        body: msg.content,
      },
    };
  }

  getInstructions(): string {
    return `
## Platform: WhatsApp
- Produce ZERO text output until you have the final result.
- Plain text only. NO markdown, tables, or entity links.
- Keep responses under 3 sentences.
- After creating drafts, ONE message: details + preview URL + ask to send.`;
  }
}

/**
 * Telegram adapter: supports markdown, inline buttons, but limited formatting.
 */
export class TelegramAdapter implements PlatformAdapter {
  async normalize(incoming: unknown): Promise<CanonicalMessage> {
    const data = incoming as Record<string, unknown>;
    const message = data.message as Record<string, unknown> | undefined;

    return {
      id: String(message?.message_id || ""),
      role: "user",
      content: String(message?.text || ""),
      platform: "telegram",
      userId: String(message?.from?.id || ""),
      metadata: {
        timestamp: (message?.date as number) * 1000,
      },
    };
  }

  async format(msg: CanonicalMessage): Promise<unknown> {
    return {
      chat_id: msg.userId,
      text: msg.content,
      parse_mode: "Markdown",
    };
  }

  getInstructions(): string {
    return `
## Platform: Telegram
- Produce ZERO text output until you have the final result.
- NO wide tables. Use numbered lists for 3+ items.
- NO entity links. Include plain URLs when needed.
- Keep responses under 3 sentences.`;
  }
}

/**
 * Inaccessible linkage store: maps user email → userId across platforms.
 * In production, use Redis or a database.
 */
export class IdentityLinkStore {
  private links: Map<string, string> = new Map();

  /**
   * Generate a linking code (QR code or short code).
   * User scans in their platform to link their account.
   */
  generateLinkingCode(email: string): string {
    // <CUSTOMISE> Implement real linking code generation (UUID + store)
    return `link-${Date.now()}`;
  }

  /**
   * Verify linking code and associate userId with email.
   */
  async verifyLink(
    email: string,
    linkingCode: string,
    userId: string,
  ): Promise<boolean> {
    // <CUSTOMISE> Validate code, check TTL, then store
    this.links.set(email, userId);
    return true;
  }

  /**
   * Resolve userId from email (linked during onboarding).
   */
  async resolveUserId(email: string): Promise<string | null> {
    // <CUSTOMISE> Query Redis/database
    return this.links.get(email) || null;
  }
}

/**
 * Platform factory: instantiate the correct adapter.
 */
export function getPlatformAdapter(
  platform: "web" | "slack" | "whatsapp" | "telegram" | "sendblue",
): PlatformAdapter {
  switch (platform) {
    case "web":
      return new WebAdapter();
    case "slack":
      return new SlackAdapter();
    case "whatsapp":
      return new WhatsAppAdapter();
    case "telegram":
      return new TelegramAdapter();
    case "sendblue":
      // <CUSTOMISE> Implement SendblueAdapter
      return new WhatsAppAdapter(); // Placeholder
    default:
      return new WebAdapter(); // Default to web
  }
}

/**
 * Example: Process a message through the adapter pipeline.
 */
export async function processMessage(
  incoming: unknown,
  platform: "web" | "slack" | "whatsapp" | "telegram" | "sendblue",
): Promise<CanonicalMessage> {
  const adapter = getPlatformAdapter(platform);
  const canonical = await adapter.normalize(incoming);
  return canonical;
}

/**
 * Example: Format a response back to platform.
 */
export async function formatResponse(
  msg: CanonicalMessage,
): Promise<unknown> {
  const adapter = getPlatformAdapter(
    msg.platform as "web" | "slack" | "whatsapp" | "telegram" | "sendblue",
  );
  return adapter.format(msg);
}
