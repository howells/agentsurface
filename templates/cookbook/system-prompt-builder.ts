/**
 * System Prompt Builder
 *
 * Compose a comprehensive system prompt from modular context blocks.
 * Includes identity, safety rules, tool routing, platform instructions,
 * upload context, and versioning metadata.
 *
 * When to use:
 * - Building persona-aware agents that adapt to user, tenant, locale
 * - Managing safety rules and tool authorization policies
 * - Multi-platform deployments (web, Slack, WhatsApp, SMS)
 * - Tracking prompt changes for reproducibility and debugging
 *
 * Canonical docs:
 * - Vercel AI SDK system prompts: https://sdk.vercel.ai/docs/foundations/prompts
 * - Prompt versioning: https://github.com/anthropics/anthropic-sdk-python/blob/main/CHANGELOG.md
 *
 * // <CUSTOMISE>
 * - Add your domain-specific tool categories (internal, external, web)
 * - Adjust safety rules to match your compliance requirements
 * - Update platform instructions for additional channels
 * - Configure file upload context sources
 */

import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * Zod schema for prompt context (all required inputs).
 */
export const PromptContextSchema = z.object({
  userId: z.string().describe("Unique user identifier"),
  userEmail: z.string().email().nullable().describe("User email or null"),
  userName: z.string().nullable().describe("User full name or null"),
  tenantId: z.string().describe("Workspace/organization ID"),
  tenantName: z.string().nullable().describe("Workspace name or null"),
  locale: z.string().default("en-US").describe("User locale (e.g., en-US)"),
  timezone: z.string().default("UTC").describe("User timezone (e.g., America/New_York)"),
  currency: z.string().default("USD").describe("Base currency code (e.g., USD)"),
  countryCode: z.string().nullable().describe("ISO 3166-1 alpha-2 country code"),
  platform: z
    .enum(["web", "slack", "whatsapp", "telegram", "sendblue", "dashboard"])
    .describe("Deployment platform"),
  dateFormat: z.string().nullable().describe("Date format string (e.g., DD/MM/YYYY)"),
  timeFormat: z.number().int().default(24).describe("12 or 24 hour clock"),
  recentUploadSummaries: z
    .array(z.string())
    .optional()
    .describe("OCR/extraction summaries of recent uploads"),
  connectedApps: z
    .array(z.string())
    .optional()
    .describe("Names of connected external services"),
  internalToolNames: z
    .array(z.string())
    .optional()
    .describe("Available internal tool names"),
  capabilities: z
    .object({
      canCreateRecords: z.boolean().default(true),
      canDeleteRecords: z.boolean().default(false),
      canIntegrate: z.boolean().default(true),
      canSearch: z.boolean().default(true),
    })
    .optional()
    .describe("Feature flags for permission control"),
});

export type PromptContext = z.infer<typeof PromptContextSchema>;

/**
 * Get current date/time context formatted for the user's locale/timezone.
 */
export function getDateContext(timezone: string, now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value || "2024";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";

  const date = `${year}-${month}-${day}`;
  const monthStart = `${year}-${month}-01`;
  const quarterNum = Math.floor((Number.parseInt(month) - 1) / 3) + 1;
  const quarterStart = `${year}-${(quarterNum - 1) * 3 + 1:02d}-01`;
  const yearStart = `${year}-01-01`;

  return {
    timezone,
    date,
    monthStart,
    quarter: quarterNum,
    quarterStart,
    year: Number.parseInt(year),
    yearStart,
  };
}

/**
 * Compute a stable version ID for the prompt (git-like hash).
 * Useful for reproducibility and debugging.
 */
export function promptVersion(context: PromptContext, prompts: Record<string, string>): string {
  const content = JSON.stringify({ context, prompts }, null, 2);
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

/**
 * Build identity block: user, tenant, locale, timezone, currency.
 */
function buildIdentityBlock(ctx: PromptContext): string {
  const dateCtx = getDateContext(ctx.timezone);
  const timeLabel = ctx.timeFormat === 12 ? "12-hour (AM/PM)" : "24-hour";
  const currentTime = new Date().toISOString();

  return `## Identity & Context
- User: ${ctx.userName ?? "Guest"} (${ctx.userEmail ?? "no email"})
- Workspace: ${ctx.tenantName ?? "default"} (ID: ${ctx.tenantId})
- Locale: ${ctx.locale}${ctx.countryCode ? ` (${ctx.countryCode})` : ""}
- Timezone: ${dateCtx.timezone}
- Current time: ${currentTime}
- Today: ${dateCtx.date} (Q${dateCtx.quarter} ${dateCtx.year})
- This month: ${dateCtx.monthStart} to ${dateCtx.date}
- This quarter: ${dateCtx.quarterStart} to ${dateCtx.date}
- This year: ${dateCtx.yearStart} to ${dateCtx.date}
- Date format: ${ctx.dateFormat ?? "locale default"}
- Time format: ${timeLabel}
- Currency: ${ctx.currency}`;
}

/**
 * Build safety rules block: constraints and behavioral guidelines.
 */
function buildSafetyBlock(): string {
  return `## Critical Rules
1. NEVER invent numbers, amounts, dates, names, or IDs. Every fact must come from a tool call.
2. When combining data from multiple sources, clearly state where each number originates.
3. Before destructive actions (delete, cancel, send), confirm explicitly. Never proceed without user consent.
4. When a request lacks required information, ask one concise question instead of guessing.
5. Address the user by their first name when appropriate.
6. If a task is outside your capabilities, say so briefly and suggest the alternative in the UI.`;
}

/**
 * Build tool routing block: how to classify and dispatch tool calls.
 */
function buildToolRoutingBlock(ctx: PromptContext): string {
  const internalDomains = ctx.internalToolNames?.join(", ") || "records, orders, customers";
  const externalApps = ctx.connectedApps?.join(", ") || "Gmail, Slack, Notion";

  return `## Tool Routing
### Internal tools (native data)
You have tools for: ${internalDomains}. These cover all native data.
Call search_tools to discover specific tools for any domain.

### Real-time web search
Use web_search for:
- Product prices, market data, exchange rates
- Tax rules, compliance, industry benchmarks
- News and events relevant to the user's work

### Connected apps (external services)
Use COMPOSIO meta-tools to interact with: ${externalApps}.
Workflow: 1) Call COMPOSIO_SEARCH_TOOLS with "app_name + action", 2) Execute via COMPOSIO_MULTI_EXECUTE_TOOL.
Rules:
- Act immediately when the user names an external service.
- If the service is not connected, tell the user to connect it in Settings.
- NEVER use COMPOSIO for internal/native actions (use search_tools instead).`;
}

/**
 * Build platform-specific instructions.
 */
function getPlatformInstructions(platform: PromptContext["platform"]): string {
  const instructionsMap: Record<PromptContext["platform"], string> = {
    dashboard: `
## Platform: Dashboard
- Emit one short sentence (under 10 words) before tool calls.
- Use markdown tables, entity links, and rich formatting.
- Acknowledge file uploads and continue helping with follow-up actions.`,

    web: `
## Platform: Web
- Emit one short sentence (under 10 words) before tool calls.
- Use markdown tables, entity links, and rich formatting.
- Acknowledge file uploads and continue helping with follow-up actions.`,

    slack: `
## Platform: Slack
- Use Slack blocks and markdown tables when helpful.
- Do NOT use entity links (they only work on dashboard).
- Keep responses concise; use threading for long discussions.`,

    whatsapp: `
## Platform: WhatsApp
- Produce ZERO text output until you have the final result.
- NO markdown, tables, or entity links. Use plain text only.
- After creating a draft, respond with ONE message: details + preview link + confirmation.
- Keep responses under 3 sentences.`,

    telegram: `
## Platform: Telegram
- Produce ZERO text output until you have the final result.
- NO markdown tables. Use numbered lists for 3+ items.
- NO entity links. When previews are available, include plain URLs.
- Keep responses under 3 sentences.`,

    sendblue: `
## Platform: iMessage
- Plain text only. NO markdown, code blocks, tables, or links.
- Produce ZERO text output until you have the final result.
- After creating a draft, ONE message: details + plain URL + ask to send.
- Keep responses under 3 sentences.`,
  };

  return instructionsMap[platform] || "";
}

/**
 * Build upload context block (OCR/extraction summaries).
 */
function buildUploadContextBlock(summaries?: string[]): string {
  if (!summaries || summaries.length === 0) {
    return "## File Uploads\nNo recent uploads.";
  }

  return `## File Uploads (Recent Extractions)
${summaries.map((summary, idx) => `${idx + 1}. ${summary}`).join("\n")}

When the user references these files, use the extracted data to create or update records.`;
}

/**
 * Build capabilities block (feature flags for permission control).
 */
function buildCapabilitiesBlock(
  capabilities?: PromptContext["capabilities"],
): string {
  if (!capabilities) {
    return "## Capabilities\nAll features enabled.";
  }

  const features = [
    capabilities.canCreateRecords && "Create records",
    capabilities.canDeleteRecords && "Delete records",
    capabilities.canIntegrate && "Integrate external apps",
    capabilities.canSearch && "Search",
  ].filter(Boolean);

  return `## Capabilities
Available: ${features.join(", ") || "None"}`;
}

/**
 * Main: compose full system prompt from context.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
  const blocks = [
    "You are an AI assistant for business operations. Help users manage their work via internal tools, web search, and connected apps.",
    "",
    buildIdentityBlock(ctx),
    "",
    buildSafetyBlock(),
    "",
    buildToolRoutingBlock(ctx),
    "",
    getPlatformInstructions(ctx.platform),
    "",
    buildUploadContextBlock(ctx.recentUploadSummaries),
    "",
    buildCapabilitiesBlock(ctx.capabilities),
    "",
    "## Language",
    "Respond in English unless the user explicitly requests another language.",
  ];

  return blocks.join("\n");
}

/**
 * Snapshot test stub: validate prompt structure.
 */
export function validatePrompt(prompt: string): boolean {
  const required = [
    "Identity & Context",
    "Critical Rules",
    "Tool Routing",
    "Platform:",
    "Capabilities",
  ];

  return required.every((section) => prompt.includes(section));
}

/**
 * Example usage:
 */
export async function exampleUsage() {
  const ctx: PromptContext = {
    userId: "user-123",
    userEmail: "alice@example.com",
    userName: "Alice Smith",
    tenantId: "org-456",
    tenantName: "Acme Corp",
    locale: "en-US",
    timezone: "America/New_York",
    currency: "USD",
    countryCode: "US",
    platform: "web",
    dateFormat: "MM/DD/YYYY",
    timeFormat: 12,
    recentUploadSummaries: [
      "Invoice #1234, amount: $5,000, customer: Acme Inc",
    ],
    connectedApps: ["Gmail", "Slack", "Google Calendar"],
    internalToolNames: ["tickets_create", "orders_list", "customers_search"],
    capabilities: {
      canCreateRecords: true,
      canDeleteRecords: false,
      canIntegrate: true,
      canSearch: true,
    },
  };

  const prompt = buildSystemPrompt(ctx);
  const version = promptVersion(ctx, { main: prompt });

  console.log("System Prompt (first 200 chars):", prompt.slice(0, 200));
  console.log("Prompt Version:", version);
  console.log("Validation passed:", validatePrompt(prompt));
}
