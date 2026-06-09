/**
 * Tool Registry with Annotations
 *
 * Register tools with metadata annotations (READ_ONLY, WRITE, DESTRUCTIVE).
 * Automatically surface annotations in system prompt.
 * Support role-based tool filtering and discovery.
 *
 * When to use:
 * - Controlling which users can call destructive tools
 * - Auditing high-risk operations (deletes, sends, cancellations)
 * - Building tool discovery UI (filter by capability)
 * - Enforcing data governance policies
 *
 * Canonical docs:
 * - MCP tool annotations: https://modelcontextprotocol.io/docs/concepts/tools
 * - Role-based access: https://en.wikipedia.org/wiki/Role-based_access_control
 * - Tool metadata: https://spec.openapis.org/oas/v3.1.0
 *
 * // <CUSTOMISE>
 * - Add your tools to the registry
 * - Define roles and their permitted annotations
 * - Implement real permission checks against your auth system
 * - Add audit logging for DESTRUCTIVE operations
 */

import type { Tool } from "ai";
import { z } from "zod";

/**
 * Tool annotation types.
 */
export enum ToolAnnotation {
  READ_ONLY = "READ_ONLY",
  WRITE = "WRITE",
  DESTRUCTIVE = "DESTRUCTIVE",
}

/**
 * Tool metadata with annotations.
 */
export const AnnotatedToolSchema = z.object({
  annotation: z.nativeEnum(ToolAnnotation).describe("Risk level"),
  auditLogged: z.boolean().default(false).describe("Log all invocations for compliance"),
  description: z.string().describe("Human-readable description"),
  name: z.string().describe("Tool identifier"),
  requiresConfirmation: z.boolean().default(false).describe("Ask user before executing"),
  roles: z.array(z.string()).optional().describe("Allowed roles (if omitted, all roles)"),
  tags: z.array(z.string()).optional().describe("Tool categories"),
});

export type AnnotatedTool = z.infer<typeof AnnotatedToolSchema>;

/**
 * Predefined tool annotations.
 */
export const ANNOTATION_POLICIES = {
  [ToolAnnotation.READ_ONLY]: {
    auditLogged: false,
    description: "Safe read operation, no side effects",
    requiresConfirmation: false,
    riskLevel: 0,
  },
  [ToolAnnotation.WRITE]: {
    auditLogged: true,
    description: "Create or update records, reversible",
    requiresConfirmation: false,
    riskLevel: 1,
  },
  [ToolAnnotation.DESTRUCTIVE]: {
    auditLogged: true,
    description: "Delete or cancel, irreversible",
    requiresConfirmation: true,
    riskLevel: 2,
  },
};

/**
 * Role-based permission matrix.
 */
export const ROLE_PERMISSIONS: Record<string, ToolAnnotation[]> = {
  admin: [ToolAnnotation.READ_ONLY, ToolAnnotation.WRITE, ToolAnnotation.DESTRUCTIVE],
  guest: [ToolAnnotation.READ_ONLY],
  system: [ToolAnnotation.READ_ONLY, ToolAnnotation.WRITE, ToolAnnotation.DESTRUCTIVE],
  user: [ToolAnnotation.READ_ONLY, ToolAnnotation.WRITE],
};

/**
 * Central tool registry.
 */
export class ToolRegistry {
  private tools = new Map<string, AnnotatedTool>();
  private implementations = new Map<string, Tool>();

  /**
   * Register a tool with annotations.
   */
  register(metadata: AnnotatedTool, implementation: Tool): void {
    this.tools.set(metadata.name, metadata);
    this.implementations.set(metadata.name, implementation);

    console.log(`[registry] Registered "${metadata.name}" (${metadata.annotation})`);
  }

  /**
   * Register multiple tools at once.
   */
  registerBatch(tools: { metadata: AnnotatedTool; implementation: Tool }[]): void {
    tools.forEach(({ metadata, implementation }) => {
      this.register(metadata, implementation);
    });
  }

  /**
   * Get a tool by name.
   */
  getTool(name: string): AnnotatedTool | null {
    return this.tools.get(name) || null;
  }

  /**
   * List all tools (optionally filtered by annotation or role).
   */
  listTools(options?: {
    annotation?: ToolAnnotation;
    role?: string;
    tags?: string[];
  }): AnnotatedTool[] {
    let results = [...this.tools.values()];

    // Filter by annotation
    if (options?.annotation) {
      results = results.filter((t) => t.annotation === options.annotation);
    }

    // Filter by role permission
    if (options?.role) {
      const allowedAnnotations = ROLE_PERMISSIONS[options.role] || [];
      results = results.filter(
        (t) =>
          allowedAnnotations.includes(t.annotation) && (!t.roles || t.roles.includes(options.role)),
      );
    }

    // Filter by tags
    if (options?.tags && options.tags.length > 0) {
      results = results.filter(
        (t) => t.tags && options.tags!.every((tag) => t.tags!.includes(tag)),
      );
    }

    return results;
  }

  /**
   * Check if a user role can call a tool.
   */
  canCallTool(toolName: string, userRole: string): boolean {
    const tool = this.getTool(toolName);
    if (!tool) {
      return false;
    }

    const allowedAnnotations = ROLE_PERMISSIONS[userRole] || [];
    if (!allowedAnnotations.includes(tool.annotation)) {
      return false;
    }

    if (tool.roles && !tool.roles.includes(userRole)) {
      return false;
    }

    return true;
  }

  /**
   * Get implementation of a tool.
   */
  getImplementation(name: string): Tool | null {
    return this.implementations.get(name) || null;
  }

  /**
   * Build system prompt block listing tools by annotation.
   */
  buildToolListingPrompt(): string {
    const byAnnotation: Record<ToolAnnotation, AnnotatedTool[]> = {
      [ToolAnnotation.READ_ONLY]: [],
      [ToolAnnotation.WRITE]: [],
      [ToolAnnotation.DESTRUCTIVE]: [],
    };

    for (const tool of this.tools.values()) {
      byAnnotation[tool.annotation].push(tool);
    }

    let prompt = "## Available Tools\n\n";

    for (const [annotation, tools] of Object.entries(byAnnotation)) {
      if (tools.length === 0) {
        continue;
      }

      const policy = ANNOTATION_POLICIES[annotation as ToolAnnotation];
      prompt += `### ${annotation} (${policy.description})\n`;

      for (const tool of tools) {
        prompt += `- **${tool.name}**: ${tool.description}\n`;
        if (tool.requiresConfirmation) {
          prompt += `  ⚠️ Requires explicit user confirmation\n`;
        }
        if (tool.auditLogged) {
          prompt += `  📋 Audit logged for compliance\n`;
        }
      }

      prompt += "\n";
    }

    return prompt;
  }
}

/**
 * Example: Register tools for a ticket management system.
 */
export function createExampleRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  // READ_ONLY tools
  registry.register(
    {
      annotation: ToolAnnotation.READ_ONLY,
      description: "List tickets with filtering by status, assignee, priority",
      name: "tickets_list",
      tags: ["tickets", "search"],
    },
    {
      description: "List tickets",
      execute: async ({ status, limit }) => {
        console.log(`[tickets_list] status=${status} limit=${limit}`);
        return { tickets: [], total: 0 };
      },
      parameters: z.object({
        status: z.enum(["open", "closed", "in-progress"]).optional(),
        limit: z.number().int().min(1).max(100).default(25),
      }),
    },
  );

  // WRITE tools
  registry.register(
    {
      annotation: ToolAnnotation.WRITE,
      auditLogged: true,
      description: "Create a new ticket (draft, not yet assigned)",
      name: "tickets_create",
      tags: ["tickets", "create"],
    },
    {
      description: "Create a ticket",
      execute: async ({ title, description, priority }) => {
        console.log(`[tickets_create] title="${title}" priority=${priority}`);
        return { ticketId: `ticket-${Date.now()}`, status: "draft" };
      },
      parameters: z.object({
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
      }),
    },
  );

  // DESTRUCTIVE tools
  registry.register(
    {
      annotation: ToolAnnotation.DESTRUCTIVE,
      auditLogged: true,
      description: "Delete a ticket and all its comments (irreversible)",
      name: "tickets_delete",
      requiresConfirmation: true,
      tags: ["tickets", "delete"],
    },
    {
      description: "Delete a ticket",
      execute: async ({ ticketId }) => {
        console.log(`[tickets_delete] ticketId=${ticketId}`);
        return { deleted: true, ticketId };
      },
      parameters: z.object({
        ticketId: z.string(),
      }),
    },
  );

  return registry;
}

/**
 * Audit logger: log tool invocations for compliance.
 */
export interface AuditLog {
  timestamp: number;
  userId: string;
  toolName: string;
  annotation: ToolAnnotation;
  input: Record<string, unknown>;
  result: unknown;
  success: boolean;
  errorMessage?: string;
}

export class AuditLogger {
  private logs: AuditLog[] = [];

  log(entry: Omit<AuditLog, "timestamp">): void {
    this.logs.push({
      timestamp: Date.now(),
      ...entry,
    });

    // <CUSTOMISE> Persist to database, CloudWatch, Datadog, etc.
    console.log(`[audit] ${entry.userId} called ${entry.toolName} (${entry.annotation})`);
  }

  getLogs(options?: { userId?: string; annotation?: ToolAnnotation; limit?: number }): AuditLog[] {
    let results = this.logs;

    if (options?.userId) {
      results = results.filter((log) => log.userId === options.userId);
    }

    if (options?.annotation) {
      results = results.filter((log) => log.annotation === options.annotation);
    }

    if (options?.limit) {
      results = results.slice(-options.limit);
    }

    return results;
  }
}

/**
 * Wrapper: call tool with permission check + audit logging.
 */
export async function callToolSafely(
  registry: ToolRegistry,
  auditLogger: AuditLogger,
  options: {
    toolName: string;
    userRole: string;
    userId: string;
    input: Record<string, unknown>;
  },
): Promise<unknown> {
  const { toolName, userRole, userId, input } = options;

  // Permission check
  if (!registry.canCallTool(toolName, userRole)) {
    const error = new Error(`User role "${userRole}" cannot call tool "${toolName}"`);
    auditLogger.log({
      annotation: ToolAnnotation.READ_ONLY,
      errorMessage: error.message,
      input,
      result: null,
      success: false,
      toolName,
      userId,
    });
    throw error;
  }

  // Confirmation check (for DESTRUCTIVE tools)
  const tool = registry.getTool(toolName)!;
  if (tool.requiresConfirmation) {
    console.log(`[callToolSafely] Destructive operation requires user confirmation: ${toolName}`);
    // <CUSTOMISE> Implement user confirmation flow (modal, email, etc.)
  }

  // Execute tool
  const impl = registry.getImplementation(toolName)!;
  let result: unknown;
  let success = false;

  try {
    result = await impl.execute(input);
    success = true;
  } catch (error) {
    result = null;
    auditLogger.log({
      annotation: tool.annotation,
      errorMessage: String(error),
      input,
      result,
      success,
      toolName,
      userId,
    });
    throw error;
  }

  // Audit logging
  if (tool.auditLogged) {
    auditLogger.log({
      annotation: tool.annotation,
      input,
      result,
      success,
      toolName,
      userId,
    });
  }

  return result;
}
