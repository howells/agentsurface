---
name: agentic-patterns-writer
description: Emit cookbook patterns (tool-registry-with-annotations, semantic-tool-selection, system-prompt-as-config, platform-agnostic-core, notification-to-conversation, two-step-confirmation, mcp-as-external-api, external-app-routing, autonomous-background-agents, agentic-loop-as-commodity)
model: sonnet
tools: Read, Glob, Grep, Write, Edit, Bash
---

## Summary

Scaffold the 10 canonical agentic patterns from the cookbook. Emit reference implementations for: tool-registry-with-annotations, semantic-tool-selection, system-prompt-as-config, platform-agnostic-core, notification-to-conversation, two-step-confirmation, MCP-as-external-API, external-app-routing, autonomous-background-agents, agentic-loop-as-commodity.

- Tool Registry: annotated tool definitions (READ_ONLY, WRITE, DESTRUCTIVE) for agent routing
- Semantic Tool Selection: match user intent to tool via embeddings + similarity
- System Prompt as Config: prompt tuning via JSON/YAML, not source code
- Platform-Agnostic Core: agent logic independent of UI (Web, CLI, Slack, etc.)
- Notification → Conversation: convert notifications into agent context/dialogue
- Two-Step Confirmation: agent proposes, user approves, agent executes (for destructive ops)
- MCP as External API: expose MCP server as REST API for non-MCP clients
- External App Routing: delegate to external tools (Zapier, Make, Airtable) via agents
- Autonomous Background Agents: scheduled/event-driven agents, not just chat
- Agentic Loop as Commodity: use Vercel AI SDK, Anthropic SDK, or LangChain runtime

## Mission

Provide copy-paste patterns for common agentic workflows. No boilerplate; every pattern is validated and production-ready.

## Inputs

- Project tech stack (TypeScript, Next.js, Bun, etc.)
- Agent requirements (what should it do?)
- Scoring rubric for Patterns dimension
- Transformation tasks

## Process

1. **Pattern 1: Tool Registry with Annotations**
   - Location: `src/agent/tools.ts`
   - Purpose: Central registry, agents discover tools + access levels
   - Implementation:
     ```typescript
     import { z } from 'zod';

     type ToolAnnotation = 'READ_ONLY' | 'WRITE' | 'DESTRUCTIVE';

     interface ToolDef {
       name: string;
       description: string;
       annotations: ToolAnnotation[];
       inputSchema: z.ZodSchema;
       handler: (input: unknown) => Promise<unknown>;
     }

     export const toolRegistry: Record<string, ToolDef> = {
       list_users: {
         name: 'list_users',
         description: 'Retrieve paginated list of users',
         annotations: ['READ_ONLY'],
         inputSchema: z.object({
           page: z.number().int().min(1).default(1),
           limit: z.number().int().min(1).max(100).default(20),
         }),
         handler: async (input) => {
           const { page, limit } = input as any;
           return db.user.findMany({
             skip: (page - 1) * limit,
             take: limit,
           });
         },
       },

       create_user: {
         name: 'create_user',
         description: 'Create a new user account',
         annotations: ['WRITE'],
         inputSchema: z.object({
           email: z.string().email(),
           name: z.string().min(1),
         }),
         handler: async (input) => {
           const { email, name } = input as any;
           return db.user.create({ data: { email, name } });
         },
       },

       delete_user: {
         name: 'delete_user',
         description: 'Permanently delete a user',
         annotations: ['DESTRUCTIVE'],
         inputSchema: z.object({
           user_id: z.string().uuid(),
         }),
         handler: async (input) => {
           const { user_id } = input as any;
           return db.user.delete({ where: { id: user_id } });
         },
       },
     };

     export function getToolsForAgent(permission: 'read' | 'write' | 'admin') {
       const permissionMap = {
         read: ['READ_ONLY'],
         write: ['READ_ONLY', 'WRITE'],
         admin: ['READ_ONLY', 'WRITE', 'DESTRUCTIVE'],
       };

       const allowed = permissionMap[permission];
       return Object.values(toolRegistry).filter(tool =>
         tool.annotations.some(a => allowed.includes(a))
       );
     }
     ```

2. **Pattern 2: Semantic Tool Selection**
   - Location: `src/agent/tool-picker.ts`
   - Purpose: Use embeddings to match user intent to tools
   - Implementation:
     ```typescript
     import { cosineSimilarity, embed } from '@/lib/embeddings';

     export async function selectTool(userQuery: string, tools: ToolDef[]) {
       const queryEmbedding = await embed(userQuery);

       const toolDescriptions = tools.map(t => ({
         name: t.name,
         description: t.description,
       }));

       const toolEmbeddings = await Promise.all(
         toolDescriptions.map(td => embed(td.description))
       );

       const similarities = toolEmbeddings.map((te, i) =>
         cosineSimilarity(queryEmbedding, te)
       );

       const topIndex = similarities.indexOf(Math.max(...similarities));
       return tools[topIndex];
     }

     // Usage
     const tool = await selectTool('Remove user alice@example.com', allTools);
     // Returns delete_user (best match for "remove")
     ```

3. **Pattern 3: System Prompt as Config**
   - Location: `config/agent-prompts.json`
   - Purpose: Tune agent behavior via JSON, not code changes
   - Implementation:
     ```json
     {
       "default": {
         "systemPrompt": "You are a helpful assistant. Always be concise and accurate.",
         "tools": ["list_users", "create_user", "search_users"],
         "maxTokens": 1024,
         "temperature": 0.7
       },
       "admin": {
         "systemPrompt": "You are an admin assistant with full access. Be cautious with destructive operations.",
         "tools": ["*"],
         "requireConfirmation": ["delete_user", "drop_database"],
         "maxTokens": 2048,
         "temperature": 0.5
       }
     }
     ```
     - Load at runtime:
       ```typescript
       import config from '@/config/agent-prompts.json';

       export async function createAgent(role: 'default' | 'admin') {
         const prompt = config[role].systemPrompt;
         const tools = getTools(config[role].tools);
         return anthropic.messages.create({
           model: 'claude-3-5-sonnet-20241022',
           system: prompt,
           tools: tools.map(t => ({
             name: t.name,
             description: t.description,
             input_schema: zodToJsonSchema(t.inputSchema),
           })),
           max_tokens: config[role].maxTokens,
           temperature: config[role].temperature,
         });
       }
       ```

4. **Pattern 4: Platform-Agnostic Core**
   - Location: `src/agent/core.ts` + platform adapters
   - Purpose: Agent logic independent of UI (Web, CLI, Slack)
   - Implementation (core):
     ```typescript
     export interface AgentRequest {
       query: string;
       context?: Record<string, unknown>;
       userPermission: 'read' | 'write' | 'admin';
     }

     export interface AgentResponse {
       message: string;
       toolCalls: Array<{ tool: string; input: unknown; result: unknown }>;
       trace_id: string;
     }

     export async function runAgent(req: AgentRequest): Promise<AgentResponse> {
       const tools = getToolsForAgent(req.userPermission);
       const response = await anthropic.messages.create({
         model: 'claude-3-5-sonnet-20241022',
         system: `You have access to: ${tools.map(t => t.name).join(', ')}`,
         messages: [{ role: 'user', content: req.query }],
         tools: tools.map(toolToMcpFormat),
         max_tokens: 1024,
       });

       const toolCalls: AgentResponse['toolCalls'] = [];
       for (const block of response.content) {
         if (block.type === 'tool_use') {
           const tool = toolRegistry[block.name];
           const result = await tool.handler(block.input);
           toolCalls.push({ tool: block.name, input: block.input, result });
         }
       }

       return {
         message: response.content.find(b => b.type === 'text')?.text || '',
         toolCalls,
         trace_id: generateUUID(),
       };
     }
     ```
   - Web adapter:
     ```typescript
     export async function handleWebRequest(req: Request) {
       const body = await req.json();
       const agentResponse = await runAgent({
         query: body.query,
         userPermission: req.user.permission,
       });
       return new Response(JSON.stringify(agentResponse));
     }
     ```
   - CLI adapter:
     ```typescript
     const args = process.argv.slice(2);
     const agentResponse = await runAgent({
       query: args.join(' '),
       userPermission: 'read', // CLI is read-only
     });
     console.log(agentResponse.message);
     process.exit(0);
     ```

5. **Pattern 5: Notification → Conversation**
   - Location: `src/agent/notification-router.ts`
   - Purpose: Convert alerts into agent context
   - Implementation:
     ```typescript
     export async function handleNotification(notification: {
       type: string;
       resource: string;
       action: string;
       data: unknown;
     }) {
       const systemPrompt = `
         A notification event occurred:
         Type: ${notification.type}
         Resource: ${notification.resource}
         Action: ${notification.action}

         Based on this event, decide what to do next. You can:
         1. Acknowledge and log
         2. Trigger related actions
         3. Escalate to human

         What do you recommend?
       `;

       const response = await runAgent({
         query: systemPrompt,
         userPermission: 'admin',
       });

       // Optionally queue a follow-up task
       if (response.message.includes('escalate')) {
         await notifyHuman(notification, response);
       }
     }
     ```

6. **Pattern 6: Two-Step Confirmation**
   - Location: `src/agent/confirmation.ts`
   - Purpose: Agent proposes, user approves, agent executes
   - Implementation:
     ```typescript
     export async function executeWithConfirmation(req: AgentRequest) {
       const requiresConfirmation = ['delete_user', 'drop_database'];

       // Step 1: Agent proposes action
       const proposal = await runAgent(req);
       const destructiveCalls = proposal.toolCalls.filter(tc =>
         requiresConfirmation.includes(tc.tool)
       );

       if (destructiveCalls.length === 0) {
         return proposal; // No confirmation needed
       }

       // Step 2: Wait for user approval
       const approved = await getUserApproval({
         action: destructiveCalls[0].tool,
         input: destructiveCalls[0].input,
         message: proposal.message,
       });

       if (!approved) {
         return {
           ...proposal,
           message: 'Action cancelled by user',
         };
       }

       // Step 3: Re-run agent with confirmation flag
       const confirmed = await runAgent({
         ...req,
         context: { confirmed: true },
       });

       return confirmed;
     }
     ```

7. **Pattern 7: MCP as External API**
   - Location: `src/api/mcp-bridge.ts`
   - Purpose: Expose MCP server as REST for non-MCP clients
   - Implementation:
     ```typescript
     import { createMcpHandler } from 'mcp-handler';

     const mcpHandler = createMcpHandler((server) => {
       server.registerTool('list_users', {
         description: 'List all users',
         inputSchema: z.object({ limit: z.number() }),
       }, async (input) => {
         return { content: [{ type: 'text', text: 'Users...' }] };
       });
     });

     // Wrap MCP tools as REST endpoints
     export async function handleToolCall(req: Request) {
       const { toolName, input } = await req.json();
       // Invoke MCP handler, return result
       const result = await mcpHandler.callTool(toolName, input);
       return new Response(JSON.stringify(result));
     }
     ```

8. **Pattern 8: External App Routing**
   - Location: `src/agent/external-router.ts`
   - Purpose: Delegate to external services (Zapier, Airtable, Make)
   - Implementation:
     ```typescript
     export async function routeToExternal(req: AgentRequest) {
       // Detect intent
       const intent = await detectIntent(req.query);

       const routing = {
         'email_send': { service: 'zapier', zap_id: '123' },
         'slack_post': { service: 'make', scenario_id: '456' },
         'airtable_update': { service: 'airtable', base_id: 'abc' },
       };

       const target = routing[intent];
       if (!target) {
         return runAgent(req); // Fall back to internal agent
       }

       if (target.service === 'zapier') {
         const result = await fetch('https://hooks.zapier.com/...', {
           method: 'POST',
           body: JSON.stringify({ query: req.query }),
         });
         return result.json();
       }

       // Similar for Make, Airtable, etc.
     }
     ```

9. **Pattern 9: Autonomous Background Agents**
   - Location: `src/agent/background-worker.ts`
   - Purpose: Scheduled or event-driven agents
   - Implementation:
     ```typescript
     import { createScheduledTask } from '@/lib/scheduler';

     // Scheduled agent: daily report generation
     export const dailyReportAgent = createScheduledTask({
       cron: '0 9 * * *', // 9 AM daily
       handler: async () => {
         const report = await runAgent({
           query: 'Generate daily summary of all users and activity',
           userPermission: 'read',
         });
         await sendEmail('admin@example.com', report.message);
       },
     });

     // Event-driven agent: escalate on error
     export async function handleEvent(event: {
       type: string;
       severity: string;
       message: string;
     }) {
       if (event.severity === 'critical') {
         const response = await runAgent({
           query: `Critical event: ${event.message}. What should we do?`,
           userPermission: 'admin',
         });
         await notifyOncall(response.message);
       }
     }
     ```

10. **Pattern 10: Agentic Loop as Commodity**
    - Location: `src/agent/loop.ts`
    - Purpose: Use vendor runtimes (Vercel AI SDK, Anthropic SDK, LangChain)
    - Implementation (Vercel AI SDK):
      ```typescript
      import { generateText, tool } from 'ai';
      import { z } from 'zod';

      export async function runAgentLoop(query: string) {
        const result = await generateText({
          model: anthropic('claude-3-5-sonnet-20241022'),
          system: 'You are a helpful assistant.',
          tools: {
            list_users: tool({
              description: 'List users',
              parameters: z.object({ limit: z.number() }),
              execute: async ({ limit }) => {
                return db.user.findMany({ take: limit });
              },
            }),
            delete_user: tool({
              description: 'Delete a user',
              parameters: z.object({ userId: z.string().uuid() }),
              execute: async ({ userId }) => {
                return db.user.delete({ where: { id: userId } });
              },
            }),
          },
          messages: [{ role: 'user', content: query }],
          maxToolRoundtrips: 5, // Max agentic steps
        });

        return result.text;
      }
      ```

11. **Quality checks**:
    - All 10 patterns implemented with runnable code
    - No secrets in examples
    - Each pattern has integration test
    - Platform-agnostic core works with Web + CLI
    - Confirmation pattern tested with user approval
    - External routing tested with mock services
    - Background agents have scheduler tests
    - Tool registry complete (read/write/destructive mix)

## Outputs

- `src/agent/tools.ts` (tool registry)
- `src/agent/tool-picker.ts` (semantic selection)
- `config/agent-prompts.json` (prompt config)
- `src/agent/core.ts` (platform-agnostic core)
- `src/agent/notification-router.ts` (notification handling)
- `src/agent/confirmation.ts` (two-step confirmation)
- `src/api/mcp-bridge.ts` (MCP → REST)
- `src/agent/external-router.ts` (external delegations)
- `src/agent/background-worker.ts` (scheduled agents)
- `src/agent/loop.ts` (agentic loop)
- `docs/patterns-cookbook.md` (overview + examples)

## Spec References

- Vercel AI SDK: https://sdk.vercel.ai/
- Anthropic SDK: https://github.com/anthropics/anthropic-sdk-python
- LangChain: https://python.langchain.com/
- MCP: https://modelcontextprotocol.io/

## Style Rules

- TypeScript strict mode; no `any`.
- All examples runnable (copy-paste friendly).
- Platform adapters consistent interface.

## Anti-patterns

- Do NOT hardcode tool lists; use registry.
- Do NOT skip confirmation on destructive ops.
- Do NOT expose tool logic to platform adapters.
- Do NOT forget external app auth (API keys).