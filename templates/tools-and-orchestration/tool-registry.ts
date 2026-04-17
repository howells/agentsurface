/**
 * tool-registry.ts
 *
 * Registry pattern for managing many tools with validation, grouping,
 * and role-based access control.
 *
 * When to use: When your agent has 10+ tools. Centralizes definitions,
 * enforces naming conventions, groups by safety level, and enables
 * runtime tool selection (only load relevant tools per task).
 *
 * Key patterns:
 * - Tool definitions centralised in a single module
 * - Unique name validation
 * - Group tools into "kits": read_only, mutating, dangerous, experimental
 * - Role-based filtering: select tools for a given user role
 * - allowedTools / deniedTools for runtime gating
 *
 * Citation: https://www.anthropic.com/engineering/writing-tools-for-agents
 * OpenAI strict mode: https://platform.openai.com/docs/guides/function-calling
 * MCP lazy loading: https://modelcontextprotocol.io/specification/2025-11-25
 *
 * CUSTOMISE:
 * - Add your tools to the registry below
 * - Define kits that match your permission model
 * - Extend selectToolsByRole() for your app's role hierarchy
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================================================
// TOOL DEFINITION TYPE
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodType;
  handler: (input: unknown) => Promise<unknown>;
  kit: 'read_only' | 'mutating' | 'dangerous' | 'experimental';
  idempotent: boolean;
  minContextWindow?: number; // If tool requires large context, set this
  costEstimate?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ============================================================================
// TOOL DEFINITIONS (CUSTOMISE: Add your tools here)
// ============================================================================

const searchDocsSchema = z.object({
  query: z.string().describe('Search query'),
  limit: z.number().int().min(1).max(100).default(10).describe('Max results'),
}).strict();

async function searchDocsHandler(input: unknown) {
  const parsed = searchDocsSchema.parse(input);
  // <CUSTOMISE> Your actual implementation
  return { success: true, results: [] };
}

const createIssueSchema = z.object({
  title: z.string().describe('Issue title'),
  body: z.string().describe('Issue description'),
  labels: z.array(z.string()).optional().describe('Labels'),
}).strict();

async function createIssueHandler(input: unknown) {
  const parsed = createIssueSchema.parse(input);
  // <CUSTOMISE> Your actual implementation
  return { success: true, id: 'issue-123' };
}

const deleteIssueSchema = z.object({
  id: z.string().describe('Issue ID to delete'),
}).strict();

async function deleteIssueHandler(input: unknown) {
  const parsed = deleteIssueSchema.parse(input);
  // <CUSTOMISE> Your actual implementation
  return { success: true };
}

const listEnvironmentsSchema = z.object({
  filter: z.enum(['prod', 'staging', 'dev']).optional(),
}).strict();

async function listEnvironmentsHandler(input: unknown) {
  // <CUSTOMISE> Your actual implementation
  return { success: true, environments: [] };
}

const deployToProductionSchema = z.object({
  version: z.string().describe('Version to deploy'),
  wait_for_approval: z.boolean().default(false).describe('Block until approved'),
}).strict();

async function deployToProductionHandler(input: unknown) {
  // <CUSTOMISE> Your actual implementation
  return { success: true, deployment_id: 'deploy-456' };
}

// ============================================================================
// REGISTRY (Centralized tool store)
// ============================================================================

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  /**
   * Register a tool. Validates unique naming.
   * <CUSTOMISE> Call this for every tool you define.
   */
  register(tool: ToolDefinition) {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" already registered. Tool names must be unique.`);
    }
    // Validate verb_noun naming convention
    if (!tool.name.match(/^[a-z_]+$/)) {
      throw new Error(
        `Tool name "${tool.name}" violates naming. Use lowercase + underscores (e.g. search_docs, create_issue)`
      );
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools at once.
   */
  registerBatch(tools: ToolDefinition[]) {
    tools.forEach(t => this.register(t));
  }

  /**
   * Get a single tool by name.
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * List all tools or filter by kit / criteria.
   * allowedKits: Only return tools in these kits.
   * denyNames: Exclude specific tool names.
   */
  listTools(options?: {
    allowedKits?: Array<'read_only' | 'mutating' | 'dangerous' | 'experimental'>;
    denyNames?: string[];
  }): ToolDefinition[] {
    let result = Array.from(this.tools.values());

    if (options?.allowedKits) {
      result = result.filter(t => options.allowedKits!.includes(t.kit));
    }

    if (options?.denyNames) {
      const deny = new Set(options.denyNames);
      result = result.filter(t => !deny.has(t.name));
    }

    return result;
  }

  /**
   * Get all tools in a specific kit (read_only, mutating, dangerous, etc.)
   */
  getKit(kit: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(t => t.kit === kit);
  }

  /**
   * Select tools for a given role. Encodes permission model.
   * <CUSTOMISE> Extend this for your role hierarchy.
   */
  selectToolsByRole(role: 'viewer' | 'developer' | 'admin'): ToolDefinition[] {
    switch (role) {
      case 'viewer':
        // Read-only access only
        return this.listTools({ allowedKits: ['read_only'] });

      case 'developer':
        // Read + create/update, but not delete
        return this.listTools({
          allowedKits: ['read_only', 'mutating'],
          denyNames: ['delete_issue', 'deploy_to_production'],
        });

      case 'admin':
        // All tools except experimental
        return this.listTools({
          allowedKits: ['read_only', 'mutating', 'dangerous'],
        });

      default:
        return [];
    }
  }

  /**
   * Validate runtime tool access. Use in middleware before calling a tool.
   */
  validateAccess(toolName: string, role: 'viewer' | 'developer' | 'admin'): { allowed: boolean; reason?: string } {
    const tool = this.get(toolName);
    if (!tool) {
      return { allowed: false, reason: `Tool "${toolName}" not found` };
    }

    const allowed = this.selectToolsByRole(role).some(t => t.name === toolName);
    if (!allowed) {
      return { allowed: false, reason: `Role "${role}" cannot access "${toolName}"` };
    }

    return { allowed: true };
  }

  /**
   * Convert all tools to OpenAI format (strict mode compatible).
   * Useful for passing to @openai/agents or other frameworks.
   */
  toOpenAIFormat(tools: ToolDefinition[] = Array.from(this.tools.values())) {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.schema),
    }));
  }

  /**
   * Count tools by kit.
   */
  stats() {
    const stats: Record<string, number> = {};
    this.tools.forEach(tool => {
      stats[tool.kit] = (stats[tool.kit] || 0) + 1;
    });
    return stats;
  }
}

// ============================================================================
// SINGLETON INSTANCE (bootstrap)
// ============================================================================

export const registry = new ToolRegistry();

// <CUSTOMISE> Register all your tools here
registry.registerBatch([
  {
    name: 'search_docs',
    description: 'Search internal documentation by keyword.',
    schema: searchDocsSchema,
    handler: searchDocsHandler,
    kit: 'read_only',
    idempotent: true,
    costEstimate: { inputTokens: 200, outputTokens: 100 },
  },
  {
    name: 'create_issue',
    description: 'Create a new issue in the tracker.',
    schema: createIssueSchema,
    handler: createIssueHandler,
    kit: 'mutating',
    idempotent: false,
  },
  {
    name: 'delete_issue',
    description: 'Delete an existing issue. Irreversible.',
    schema: deleteIssueSchema,
    handler: deleteIssueHandler,
    kit: 'dangerous',
    idempotent: false,
  },
  {
    name: 'list_environments',
    description: 'List deployment environments.',
    schema: listEnvironmentsSchema,
    handler: listEnvironmentsHandler,
    kit: 'read_only',
    idempotent: true,
  },
  {
    name: 'deploy_to_production',
    description: 'Deploy a version to production. Requires careful handling.',
    schema: deployToProductionSchema,
    handler: deployToProductionHandler,
    kit: 'dangerous',
    idempotent: false,
  },
]);

// ============================================================================
// MIDDLEWARE: Runtime tool gating
// ============================================================================

/**
 * Middleware for agent frameworks. Validates tool access before execution.
 * Use in Claude Agent SDK, OpenAI Agents SDK, etc.
 *
 * Example (Claude Agent SDK):
 * const allowed = toolGateMiddleware(toolName, userRole);
 * if (!allowed) throw new Error('Access denied');
 */
export function toolGateMiddleware(
  toolName: string,
  userRole: 'viewer' | 'developer' | 'admin'
): boolean {
  const { allowed } = registry.validateAccess(toolName, userRole);
  return allowed;
}

/**
 * Build a filtered tool list for an agent based on role + context.
 * Pass the result to your agent's allowedTools parameter.
 */
export function getAgentToolsForRole(role: 'viewer' | 'developer' | 'admin'): string[] {
  return registry.selectToolsByRole(role).map(t => t.name);
}

// ============================================================================
// TESTING & DEBUGGING
// ============================================================================

/**
 * Log all registered tools and their kits. Useful for debugging.
 */
export function debugRegistry() {
  console.log('=== Tool Registry ===');
  registry.listTools().forEach(tool => {
    console.log(
      `${tool.name.padEnd(30)} [${tool.kit.padEnd(15)}] ${tool.idempotent ? '(idempotent)' : '(has side-effects)'}`
    );
  });
  console.log('\n=== Stats ===');
  console.log(registry.stats());
}

/**
 * For testing: Mock all tools to return success without side effects.
 */
export function createMockRegistry(): ToolRegistry {
  const mock = new ToolRegistry();
  registry.listTools().forEach(tool => {
    mock.register({
      ...tool,
      handler: async () => ({ success: true, _mock: true }),
    });
  });
  return mock;
}
