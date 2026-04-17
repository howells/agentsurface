/**
 * External App Meta-Tools
 *
 * Composio-style `search_tools` + `multi_execute` meta-tool pair.
 * Agent discovers external app actions dynamically, then executes them.
 * No predefined tool set; agent queries available actions at runtime.
 *
 * When to use:
 * - Integrating 3rd-party apps without hardcoding every action (Gmail, Slack, Notion)
 * - Building AI copilots that auto-discover capabilities
 * - Multi-tenant SaaS where each user has different apps connected
 * - Reducing context window by lazy-loading tool definitions
 *
 * Canonical docs:
 * - Composio API: https://www.composio.dev/docs/sdk/python
 * - OpenAI tool discovery: https://platform.openai.com/docs/guides/function-calling
 * - Dynamic tool loading: https://sdk.vercel.ai/docs/guides/tools#dynamic-tools
 *
 * // <CUSTOMISE>
 * - Replace mock app catalog with real Composio / Make.com / Zapier API calls
 * - Implement OAuth connection checks before advertising tools
 * - Add filtering for dangerous actions (delete, revoke, modify permissions)
 * - Extend action payload validation with more specific schemas
 */

import type { Tool } from "ai";
import { z } from "zod";

/**
 * Action definition: one capability of an external app.
 */
export const ExternalActionSchema = z.object({
  id: z.string().describe("Unique action ID (e.g., gmail_send_email)"),
  appName: z.string().describe("App name (e.g., Gmail, Slack, Notion)"),
  actionName: z.string().describe("Human-readable action (e.g., Send Email)"),
  description: z.string().describe("What this action does"),
  parameterSchema: z.record(z.string(), z.unknown()).describe("Input parameters (JSON schema)"),
  isConnectionRequired: z
    .boolean()
    .default(true)
    .describe("User must have app connected"),
  isDangerous: z
    .boolean()
    .default(false)
    .describe("Flag for delete/revoke/cancel actions"),
});

export type ExternalAction = z.infer<typeof ExternalActionSchema>;

/**
 * Mock app catalog (in production, query Composio API).
 */
const EXTERNAL_APPS: Record<string, ExternalAction[]> = {
  Gmail: [
    {
      id: "gmail_send_email",
      appName: "Gmail",
      actionName: "Send Email",
      description: "Send an email message",
      parameterSchema: {
        type: "object" as const,
        properties: {
          to: { type: "string", description: "Recipient email" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "Email body (HTML)" },
          cc: { type: "array", items: { type: "string" }, description: "CC list" },
        },
        required: ["to", "subject", "body"],
      },
      isConnectionRequired: true,
    },
    {
      id: "gmail_list_emails",
      appName: "Gmail",
      actionName: "List Emails",
      description: "Search and list emails",
      parameterSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Gmail search query" },
          limit: { type: "number", description: "Max results" },
        },
        required: ["query"],
      },
      isConnectionRequired: true,
    },
  ],
  Slack: [
    {
      id: "slack_send_message",
      appName: "Slack",
      actionName: "Send Message",
      description: "Post a message to a channel or DM",
      parameterSchema: {
        type: "object" as const,
        properties: {
          channel: { type: "string", description: "Channel name or ID" },
          text: { type: "string", description: "Message text" },
          blocks: {
            type: "array",
            description: "Slack Block Kit JSON",
          },
        },
        required: ["channel", "text"],
      },
      isConnectionRequired: true,
    },
    {
      id: "slack_list_channels",
      appName: "Slack",
      actionName: "List Channels",
      description: "Get all accessible channels",
      parameterSchema: {
        type: "object" as const,
        properties: {
          limit: { type: "number", description: "Max results" },
        },
      },
      isConnectionRequired: true,
    },
  ],
  "Google Calendar": [
    {
      id: "calendar_create_event",
      appName: "Google Calendar",
      actionName: "Create Event",
      description: "Create a calendar event",
      parameterSchema: {
        type: "object" as const,
        properties: {
          title: { type: "string" },
          startTime: { type: "string", description: "ISO 8601 datetime" },
          endTime: { type: "string", description: "ISO 8601 datetime" },
          description: { type: "string" },
          attendees: { type: "array", items: { type: "string" } },
        },
        required: ["title", "startTime", "endTime"],
      },
      isConnectionRequired: true,
    },
  ],
  Notion: [
    {
      id: "notion_create_page",
      appName: "Notion",
      actionName: "Create Page",
      description: "Create a new Notion page in a database",
      parameterSchema: {
        type: "object" as const,
        properties: {
          databaseId: { type: "string", description: "Notion database ID" },
          properties: {
            type: "object",
            description: "Page properties (title, status, etc.)",
          },
        },
        required: ["databaseId", "properties"],
      },
      isConnectionRequired: true,
    },
  ],
};

/**
 * Search for external app actions by app name + desired action.
 * Returns matching actions that are safe and the user has connected.
 */
export async function searchExternalActions(
  query: string,
  userConnectedApps: string[] = [],
): Promise<ExternalAction[]> {
  // <CUSTOMISE> Call real Composio API: https://backend.composio.dev/api/actions
  // For now, mock search by keyword matching
  const queryLower = query.toLowerCase();

  const results: ExternalAction[] = [];

  for (const [appName, actions] of Object.entries(EXTERNAL_APPS)) {
    // Filter by connected apps
    if (!userConnectedApps.includes(appName) && actions[0]?.isConnectionRequired) {
      continue;
    }

    // Match query against app name and action names
    for (const action of actions) {
      if (
        appName.toLowerCase().includes(queryLower) ||
        action.actionName.toLowerCase().includes(queryLower) ||
        action.description.toLowerCase().includes(queryLower)
      ) {
        // Exclude dangerous actions by default
        if (!action.isDangerous) {
          results.push(action);
        }
      }
    }
  }

  return results;
}

/**
 * Execute an external app action.
 * Input parameters must match the action's parameterSchema.
 */
export async function executeExternalAction(
  actionId: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // <CUSTOMISE> Call real Composio API execution endpoint
  console.log(`[external-app] Executing action ${actionId} with input:`, input);

  // Mock responses by action type
  if (actionId === "gmail_send_email") {
    return {
      success: true,
      messageId: `msg-${Date.now()}`,
      to: input.to,
    };
  }

  if (actionId === "slack_send_message") {
    return {
      success: true,
      messageId: `slack-${Date.now()}`,
      channel: input.channel,
      timestamp: Date.now(),
    };
  }

  if (actionId === "calendar_create_event") {
    return {
      success: true,
      eventId: `event-${Date.now()}`,
      title: input.title,
    };
  }

  if (actionId === "notion_create_page") {
    return {
      success: true,
      pageId: `page-${Date.now()}`,
      url: `https://notion.so/page-${Date.now()}`,
    };
  }

  return { success: false, error: "Unknown action" };
}

/**
 * Meta-tool: `search_tools` (find available external app actions).
 * Agent calls this first to discover what's possible.
 */
export const searchToolsMetaTool: Tool = {
  description:
    "Search for available external app actions. " +
    "Returns list of apps (Gmail, Slack, Notion, etc.) and their capabilities. " +
    "Query format: 'gmail send email', 'slack post message', 'create calendar event'",
  parameters: z.object({
    query: z
      .string()
      .describe("Search query: app name + desired action (e.g., 'gmail send email')"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Max results to return"),
  }),
  execute: async ({ query, limit }) => {
    // <CUSTOMISE> Get user's connected apps from context
    const userConnectedApps = ["Gmail", "Slack", "Google Calendar", "Notion"];

    const actions = await searchExternalActions(query, userConnectedApps);

    return {
      query,
      resultsCount: actions.length,
      results: actions.slice(0, limit).map((action) => ({
        id: action.id,
        appName: action.appName,
        actionName: action.actionName,
        description: action.description,
      })),
      notConnected: Array.from(new Set(
        Object.keys(EXTERNAL_APPS).filter((app) => !userConnectedApps.includes(app)),
      )),
    };
  },
};

/**
 * Meta-tool: `multi_execute` (execute one or more external app actions).
 * Agent calls this after discovering actions via search_tools.
 */
export const multiExecuteMetaTool: Tool = {
  description:
    "Execute one or more external app actions. " +
    "Takes action IDs (from search_tools results) and their input parameters. " +
    "Executes in parallel; fails gracefully if one action fails.",
  parameters: z.object({
    actions: z
      .array(
        z.object({
          id: z.string().describe("Action ID from search_tools"),
          input: z.record(z.string(), z.unknown()).describe("Input parameters for this action"),
        }),
      )
      .describe("List of actions to execute"),
  }),
  execute: async ({ actions }) => {
    const results = await Promise.allSettled(
      actions.map(({ id, input }) => executeExternalAction(id, input)),
    );

    const responses = results.map((result, idx) => {
      if (result.status === "fulfilled") {
        return {
          actionId: actions[idx]!.id,
          success: true,
          result: result.value,
        };
      } else {
        return {
          actionId: actions[idx]!.id,
          success: false,
          error: String(result.reason),
        };
      }
    });

    return {
      executedCount: actions.length,
      successCount: responses.filter((r) => r.success).length,
      responses,
    };
  },
};

/**
 * Helper: Build system prompt guidance for external app usage.
 */
export function buildExternalAppPromptBlock(): string {
  return `## External Apps (Gmail, Slack, Notion, Google Calendar, etc.)

When the user mentions connecting to an external app or asks to "send an email", "post a message", etc.:

1. **Search first**: Call \`search_tools\` with the app name + desired action
   - Example: "gmail send email", "slack post message", "notion create page"
   - This discovers what's available and returns action IDs

2. **Execute**: Call \`multi_execute\` with the action ID(s) and parameters
   - Use the action's parameter schema from search_tools results
   - Include all required fields from the schema
   - Execute multiple actions in one call if they're independent

3. **Handle missing connections**: If search_tools says an app isn't connected,
   - Tell the user: "X isn't connected yet. You can set it up in Settings."
   - Do NOT try to execute actions for unconnected apps

4. **Error handling**: If execution fails, retry once then report the error to the user

Examples:
- User: "Send an email to john@example.com about the invoice"
  1. search_tools("gmail send email")
  2. multi_execute([{ id: "gmail_send_email", input: { to: "john@...", subject: "...", body: "..." } }])

- User: "Create a new Notion page with these details"
  1. search_tools("notion create page")
  2. multi_execute([{ id: "notion_create_page", input: { databaseId: "...", properties: {...} } }])`;
}

/**
 * Example: Agent workflow with external app tools.
 */
export async function exampleExternalAppFlow() {
  // Step 1: Agent calls search_tools
  console.log("\n[Step 1] Searching for Gmail send action...");
  const searchResult = await searchToolsMetaTool.execute({
    query: "gmail send email",
    limit: 5,
  });
  console.log("Search result:", searchResult);

  // Step 2: Agent extracts action ID and calls multi_execute
  const actionId = "gmail_send_email";
  console.log(`\n[Step 2] Executing action ${actionId}...`);

  const executeResult = await multiExecuteMetaTool.execute({
    actions: [
      {
        id: actionId,
        input: {
          to: "recipient@example.com",
          subject: "Meeting Tomorrow",
          body: "<p>Hi, let's sync at 2pm tomorrow.</p>",
        },
      },
    ],
  });

  console.log("Execute result:", executeResult);
}
