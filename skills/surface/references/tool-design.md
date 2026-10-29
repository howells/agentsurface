# Tool Design

## Summary

Dimension 7 scores tool definition quality. Agent tool quality is the single highest-leverage investment in an agent application. Baseline is verb_noun naming, agent-oriented descriptions ("when to use, when not to use"), flat typed schemas with field descriptions. Production includes toModelOutput for token reduction, annotations (readOnly, destructive, idempotent), dynamic selection support, and cross-framework portability (single definition works in MCP + AI SDK + LangChain + OpenAI). Scores 0–3 based on naming clarity, description quality, schema completeness, and framework support.

- **0**: No formal tool definitions (blocker)
- **1**: Basic schemas, terse descriptions (<20 words), no examples
- **2**: verb_noun naming, "Use when..." clarity, field descriptions, <10 tools
- **3**: toModelOutput optimization, annotations, activeTools patterns, cross-framework
- **Evidence**: tool definition patterns, description word count, schema annotations, pagination support

---

Agent tool quality is the single highest-leverage investment in an agent application. Anthropic, OpenAI, and Gemini publish broadly similar guidance: name clearly, describe as if onboarding a teammate, keep schemas flat and typed, return semantic content, and fail informatively. Tools that are well-designed for AI consumption reduce agent hallucination, lower token spend, and enable reliable multi-step reasoning.

## Scoring rubric

| Score | Criteria                                                                                                                                                                                                                                                   | Detection                                                                                                                                                         |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | No formal tool definitions. Functions exist but no schema, no description.                                                                                                                                                                                 | No `tool()` calls, no `@tool` decorators, no `createTool()`, no MCP tool registrations.                                                                           |
| 1     | Basic tool schemas exist but descriptions are terse or missing. No examples.                                                                                                                                                                               | Tool definitions present but descriptions <20 words. No `.describe()` on Zod fields. No inputExamples.                                                            |
| 2     | Good tool design. `verb_noun` naming. Agent-oriented descriptions with "when to use" and disambiguation. Typed schemas with field descriptions.                                                                                                            | Descriptions include "Use when..." and "Do not use for...". All schema fields have descriptions. enum values on constrained strings. <10 tools per agent/context. |
| 3     | Excellent tool design. `toModelOutput` reducing token usage. Tool annotations (`readOnly`, `destructive`, `idempotent`). Dynamic tool selection support (`activeTools`, `defer_loading`). Cross-framework definitions (works in MCP + AI SDK + LangChain). | `toModelOutput` defined. annotations object present. `activeTools` or `defer_loading` patterns. Tool definitions portable across frameworks.                      |

## Evidence to gather

- **Tool definition locations:** MCP `server.registerTool(...)` (legacy v1 `server.tool(...)`), Vercel AI SDK `tools: {...}`, OpenAI Agents SDK `tool()`, Mastra `createTool()`, LangChain `Tool.from()`, Gemini `FunctionDeclaration`.
- **Description quality:** Grep for descriptions <20 words (red flag). Scan for "Use when..." and "Do not use for..." patterns.
- **Schema annotations:** `.describe()` or `description` field on every parameter; `additionalProperties: false` on objects.
- **Tool count:** >20 tools on a single agent is a red flag; agent struggles to reason over large tool sets.
- **Response shape:** Check for opaque IDs in responses. Look for `next_cursor`, `has_more`, pagination support.
- **Annotations:** MCP tools should carry `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`.
- **Cross-framework portability:** Single schema definition exported as MCP tool, Vercel AI SDK tool, OpenAI tool, and LangChain tool.

## Deep dive

### Naming conventions

Default to lowercase `snake_case` with a verb and an ordinary task noun: `read_paint`, `find_palette_ideas`, `add_samples_to_cart`. This is Agent Surface's convention, not an MCP requirement. The [MCP tool-name rules](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#tool-names) also permit other case styles and separators; target model adapters may be stricter.

Keep provider abbreviations, cache choices and connectivity checks inside application code unless the agent's job is to manage them. Namespaces are useful when the agent must distinguish real services or destinations; do not add one merely to expose a backend. Assess routing with representative tasks rather than claiming one casing or namespace order is universally best.

Match public registration keys and tool IDs. Update executable references together when renaming, and preserve historical records. Keep filenames and language-native variable names in the repository's normal style.

The canonical explanation and current primary sources are in [Naming and Descriptions](../../../src/content/docs/tool-design/naming-and-descriptions.mdx), verified 2026-10-29.

### Descriptions: the single biggest lever

([Anthropic writing-tools-for-agents](https://www.anthropic.com/research/writing-tools-for-agents))

Write descriptions as if onboarding a new engineer. Include four elements:

1. **What it does:** Concise single sentence.
2. **When to use it:** Clarify the triggering condition or use case.
3. **When NOT to use it:** Disambiguate from related tools. "Do not use this for X; use `other_tool` instead."
4. **Preconditions and side effects:** Mention required authentication, rate limits, or mutations (creation, deletion, side effects on external systems).

**Typical length:** 60–200 words. Shorter is fine if purpose is obvious; never be terse.

Example (good):

```
Search Jira for issues by text, assignee, status, or custom query. Use this when the user asks
to find open bugs, pull all "high-priority" tickets, or list all issues assigned to a person.
Do not use this for creating new issues (use `jira_create_issue` instead) or updating existing
ones (use `jira_update_issue`). Requires `JIRA_API_KEY` env var. Returns up to 50 results by default;
use `limit` and `offset` for pagination.
```

Example (weak):

```
Searches for Jira issues.
```

Anthropic's research shows that even tiny refinements to descriptions yield large accuracy gains. "The first paragraph of the description is the most important."

### Schemas: flat, typed, annotated

**Flat structure preferred.** Avoid deep nesting; one or two levels maximum (house advice). Deeply nested objects are harder for agents to reason about; OpenAI strict mode allows nesting up to 10 levels and 5,000 properties in total.

**Every field must have a description.** Use `.describe()` in Zod:

```typescript
const searchIssuesSchema = z
  .object({
    query: z.string().describe('Free text search (supports "status:Open" syntax)'),
    assignee: z.string().optional().describe("Filter by assignee name or email"),
    status: z.enum(["Open", "In Progress", "Done"]).describe("Issue workflow state"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(50)
      .describe("Max results to return (default 50, capped at 100)"),
  })
  .strict();
```

**Enums over free text.** Constrain values wherever the server enforces them:

```typescript
priority: z.enum(["low", "medium", "high", "critical"]).describe(
  "Severity: low=cosmetic, medium=feature, high=blocker, critical=outage",
);
```

**Examples on every field.** Include concrete values:

```typescript
query: z.string()
  .describe('Search query. Examples: "status:Open", "assignee:alice@company.com", "label:bug"'),
```

**`additionalProperties: false` for strict OpenAI mode.** Required when strict mode is on (the OpenAI Agents SDK enables it by default for schema-validated tools; the API also supports `strict: false`). In strict mode every property must also be listed in `required`, with optional values made nullable:

```typescript
.strict() // Zod
// or
{ additionalProperties: false } // JSON Schema
```

### Response shape: semantic content and pagination

**Return semantic names, not opaque IDs alone.** If a tool returns a list of users, include names, not just user IDs:

```typescript
// Bad:
{
  user_ids: ["usr_123", "usr_456"];
}

// Good:
{
  users: [
    { id: "usr_123", name: "Alice", email: "alice@company.com" },
    { id: "usr_456", name: "Bob", email: "bob@company.com" },
  ];
}
```

**Support `view` or `response_format` for concise vs detailed output:**

```typescript
response_format: z.enum(['concise', 'detailed'])
  .describe('concise: name + ID only. detailed: include all metadata (slower, higher tokens)'),
```

**Paginate by default; cap results.** Include `next_cursor`, `has_more`:

```typescript
{
  results: [...],
  next_cursor: 'ghi789',
  has_more: true,
  total_count: 1240
}
```

**Compressing large payloads (`toModelOutput` in the AI SDK):** The AI SDK's `tool()` accepts a `toModelOutput` function that maps the full tool result to a smaller value shown to the model; with other stacks, do the same compression in your own `tool_result`. Return a summary string + structured refs. For example, a large search result list becomes:

```typescript
// Instead of returning 50 full objects:
{
  summary: "Found 50 public repositories matching 'claude-agent'. Top 3: anthropic/anthropic-sdk-python (5.2k stars), anthropic-sdk-js (3.1k stars), anthropic-sdk-go (1.8k stars). Use repositories[].id to fetch details.",
  repositories: [
    { id: 'repo-123', name: 'anthropic-sdk-python', stars: 5200 },
    // ... top results only
  ],
  pagination: { next_cursor: 'xyz', total: 1240 }
}
```

### Annotations (MCP)

([MCP spec 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/)) - annotations remain part of the current revision.

Every tool should declare its access level and side effects:

```typescript
server.registerTool(
  "create_issue",
  {
    description: "Create a new issue in the tracker",
    inputSchema: schema,
    annotations: {
      destructiveHint: true, // Mutates external state
      idempotentHint: true, // Safe to retry (upsert semantics)
      openWorldHint: false, // No side effects outside this API
    },
  },
  handler,
);
```

`registerTool` is the TypeScript SDK v2 form (`@modelcontextprotocol/server`); the v1 positional `server.tool()` is removed in v2. Annotations are hints a client may use, not an authorization boundary.

- `readOnlyHint: true` - Query-only, no side effects.
- `destructiveHint: true` - Mutates or deletes data; requires careful use.
- `idempotentHint: true` - Safe to call multiple times with same args; upsert preferred over create+update.
- `openWorldHint: false` - All effects are local to this API; no side effects on external systems.

### Idempotency and batching

**Idempotent tools whenever possible.** Replace split create+update with single upsert:

```typescript
// Bad (two separate tools):
create_user(name, email)
update_user(id, name, email)

// Good (idempotent):
upsert_user(name, email, id?: string)  // Create if missing, update if exists
```

**Batch versions of hot tools** reduce loop iterations. If agents frequently call `search_doc` 5+ times per task, offer:

```typescript
search_docs(query: string)           // Single
search_docs_batch(queries: string[]) // Batch
```

### Error design

Errors must be returned in the tool output, not thrown (`isError: true` on MCP results; other SDKs have their own error handlers or exception-to-result conversion). `is_retriable` means the same call is safe to repeat unchanged, so validation errors are `false`. Include recovery hints:

```typescript
{
  success: false,
  error: {
    message: 'Jira API returned 401 Unauthorized',
    code: 'AUTH_FAILED',
    is_retriable: false,
    suggestions: [
      'Check that JIRA_API_KEY is set and not expired',
      'Regenerate the API key in Jira settings'
    ],
    doc_uri: 'https://docs.company.com/jira-auth'
  }
}
```

See `/references/error-handling.md` for full error patterns.

### Cross-framework portability

Define tool metadata once in a framework-neutral module; emit adapters for each framework:

```typescript
// tools/registry.ts — shared schema + metadata
export const issueSearchTool = {
  name: "jira_search_issues",
  description: "Search Jira for issues...",
  schema: searchIssuesSchema,
  handler: searchIssuesHandler,
};

// Export framework-specific adapters:
export const toMCP = (server, t) =>
  server.registerTool(
    t.name,
    { description: t.description, inputSchema: t.schema, annotations: { readOnlyHint: true } },
    async (input) => {
      const data = await t.handler(input);
      return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data };
    },
  );

// AI SDK 7: tools are a record keyed by name; the schema goes in `inputSchema`
export const toVercelAI = (t) => ({
  [t.name]: tool({ description: t.description, inputSchema: t.schema, execute: t.handler }),
});

// OpenAI Agents SDK (JS): `tool()` with the Zod schema as `parameters`
export const toOpenAIAgents = (t) =>
  tool({ name: t.name, description: t.description, parameters: t.schema, execute: t.handler });
```

This pattern keeps tool logic centralized and ensures consistency across frameworks.

### Token efficiency

Tool descriptions count toward every agent request. Trim aggressively:

- Use references (`doc_uri`) for longer docs rather than inlining.
- MCP has no built-in per-tool lazy loading: `tools/list` returns full definitions. Deferred loading is provider- or client-side.
- Anthropic and OpenAI both support **tool search** (`defer_loading: true` plus a search tool; `deferLoading` / `toolSearchTool()` in OpenAI Agents JS): with many tools, the model searches for matching tools rather than loading all. Only loaded definitions count as input tokens. Claude's inline tool definitions (beta, `inline-tools-2026-09-15`) add a tool mid-conversation without breaking the cached prefix.
- **Programmatic tool calling** (Claude `code_execution_20260120` or later with `allowed_callers`; OpenAI Agents JS `programmaticToolCallingTool()` with `allowedCallers`) keeps intermediate tool results out of the model's context.
- **Claude forced tool choice:** Opus 5.5, Sonnet 5.5 and Fable 5.1 reject `tool_choice` `any` and `tool` (400); use `auto` plus `strict: true` or structured outputs.
- **Gemini 3 thought signatures:** Preserve exact tool-call arguments across conversation turns; do not mutate them in logs.
- **OpenAI strict mode:** First request parses and caches schema; use single request for multiple calls to amortize.

### Tool discovery heuristics

Include "Use this for..." and "Do not use this for..." lines in descriptions (see Descriptions section above).

If two tools are near-siblings, explicitly note the choosing criterion:

```
search_issues: For querying existing tickets. Use for finding open bugs, filtering by status, listing assigned work.
create_issue: For submitting new work. Use when the user describes a new bug or feature request.
update_issue: For modifying existing tickets. Use to change status, assignee, or description of a ticket already tracked.
```

## Worked example: cross-framework tool

Below is a single `search_docs` tool defined for MCP, Vercel AI SDK, and OpenAI Agents SDK. All three frameworks share the same Zod schema.

**Shared schema and handler (tools/registry.ts):**

```typescript
import { z } from "zod";

const searchDocsSchema = z
  .object({
    query: z
      .string()
      .describe(
        'Free text search query. Examples: "authentication", "API rate limits", "error 429"',
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10)
      .describe("Max results to return (default 10, max 100)"),
    offset: z.number().int().min(0).default(0).describe("Pagination offset for large result sets"),
    format: z
      .enum(["concise", "detailed"])
      .default("concise")
      .describe("concise: title + URL only. detailed: include full snippet (slower, more tokens)"),
  })
  .strict();

type SearchDocsInput = z.infer<typeof searchDocsSchema>;

export async function searchDocsHandler(input: SearchDocsInput) {
  // Call internal search API
  const { query, limit, offset, format } = input;
  const results = await internal.search(query, { limit, offset });

  return {
    results: results.map((doc) => ({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      ...(format === "detailed" && { snippet: doc.snippet }),
    })),
    has_more: results.length === limit,
    next_offset: offset + limit,
  };
}

export const searchDocsTool = {
  name: "search_docs",
  description: `Search internal documentation by keyword. Use this to find setup guides, API references, and troubleshooting steps. 
Do not use this for general knowledge (use web search instead) or to create new docs (use create_doc). Returns snippets ranked by relevance.`,
  schema: searchDocsSchema,
  handler: searchDocsHandler,
};
```

**MCP adapter (tools/mcp.ts):**

```typescript
import { McpServer } from "@modelcontextprotocol/server";
import { searchDocsTool } from "./registry";

const server = new McpServer({
  name: "docs-mcp",
  version: "1.0.0",
});

// MCP needs a CallToolResult, so wrap the handler's plain data
server.registerTool(
  searchDocsTool.name,
  {
    description: searchDocsTool.description,
    inputSchema: searchDocsTool.schema,
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  async (input) => {
    const data = await searchDocsTool.handler(input);
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data };
  },
);

export default server;
```

**Vercel AI SDK adapter (tools/vercel-ai.ts):**

```typescript
import { tool } from "ai";
import { searchDocsTool } from "./registry";

// AI SDK 7: pass the Zod schema as `inputSchema`; use the result as a record entry,
// e.g. generateText({ model, tools: { search_docs: searchDocsVercel }, prompt })
export const searchDocsVercel = tool({
  description: searchDocsTool.description,
  inputSchema: searchDocsTool.schema,
  execute: searchDocsTool.handler,
});
```

**OpenAI Agents SDK adapter (tools/openai-agents.ts):**

```typescript
import { tool } from "@openai/agents";
import { searchDocsTool } from "./registry";

// `tool()` creates the function tool; run it with run(agent, input)
export const searchDocsOpenAI = tool({
  name: searchDocsTool.name,
  description: searchDocsTool.description,
  parameters: searchDocsTool.schema,
  execute: searchDocsTool.handler,
});
```

All three adapters wrap the same handler and schema; only the frame changes. Tool calling for GPT-6 models requires the OpenAI Responses API, and the open-source Agents SDK is a different product from the OpenAI Agents API (public beta since 2026-09-10).

## Cross-vendor capability table

| Capability                           | Anthropic tool                           | MCP                                                  | OpenAI strict tool                                 | Gemini FunctionDeclaration      | Vercel AI SDK                   |
| ------------------------------------ | ---------------------------------------- | ---------------------------------------------------- | -------------------------------------------------- | ------------------------------- | ------------------------------- |
| Naming                               | `verb_noun` preferred                    | Yes                                                  | `verb_noun` + `strict:true`                        | Yes                             | Yes                             |
| Descriptions                         | Full prose; first paragraph critical     | Yes                                                  | Full prose; <500 tokens per tool                   | Yes                             | Yes                             |
| Schema validation                    | Zod `.parse()` on input                  | Zod or JSON Schema                                   | JSON Schema; `additionalProperties:false` required | JSON Schema                     | Zod native                      |
| Field descriptions                   | `.describe()` on every field             | Required                                             | `description` on every property                    | Required                        | `.describe()` on every field    |
| Examples                             | Input examples in description or param   | Supported                                            | Via `examples` array in schema                     | Via `example` in property       | Via `.describe()`               |
| Enums                                | Enforced at parse                        | Enforced                                             | Tokens masked at decode time (CFG)                 | Yes                             | Enforced at parse               |
| Pagination                           | Explicit `next_cursor`, `has_more`       | Supported                                            | Supported                                          | Supported                       | Supported                       |
| toModelOutput / response compression | Not native (compress in the tool_result) | Not native                                           | Not native                                         | Not native                      | `toModelOutput` on `tool()`     |
| Annotations                          | None (Claude-specific)                   | `readOnly`, `destructive`, `idempotent`, `openWorld` | None                                               | None                            | None                            |
| Thought signature preservation       | N/A                                      | N/A                                                  | N/A                                                | Required (pass back in history) | N/A                             |
| Lazy loading                         | Tool search (`defer_loading`)            | Not native (`tools/list` returns everything)         | Tool search (`defer_loading`, Responses API)       | Not native                      | Not native                      |
| Error output                         | Structured; returned not thrown          | Structured; isError pattern                          | Structured in tool_result                          | Structured                      | Structured; returned not thrown |

## Anti-patterns to avoid

- **Terse descriptions** ("Creates a thing"). Takes no effort to write, compounds agent confusion.
- **More than 20 tools on one agent.** Under 10 tools in a single agent context is the target; past 20 is a red flag, and at 30 or more accuracy drops sharply.
- **Opaque IDs in response without lookup tool.** If a tool returns `user_id: 123`, agent must have a `lookup_user` tool to resolve it.
- **Unconstrained or root-level unions** (e.g., a `z.any()` branch inside `result`, or a root `anyOf`). OpenAI strict mode supports nested `anyOf` when every branch is in the supported subset, but rejects a root-level `anyOf` and unbounded `any`. Use constrained shapes, flat fields or separate tools.
- **Optional fields under OpenAI strict mode.** Strict mode requires every property in `required`, so express "optional" as nullable (`assignee: z.string().nullable()`) and have the caller pass `null`. Anthropic strict tool use supports genuinely optional properties.
- **Inconsistent naming across tools.** Use `user_id` everywhere, not `user_id` in one tool and `userId` in another.
- **Side-effectful tools that throw errors instead of returning.** Always return errors in the response body so the agent can reason about recovery.
- **Destructive tools without annotations.** Any tool that mutates state must carry `destructiveHint: true` (MCP) or be called out in the description.
- **No disambiguation in descriptions.** If two tools are similar, explicitly state when to use each.

## Templates and tooling

- `/templates/tools/tool-definition.ts` - Shared schema + cross-framework adapters (MCP, Vercel AI SDK, OpenAI Agents SDK)
- `/templates/tools/tool-registry.ts` - Registry pattern for managing >10 tools
- **Libraries:**
  - `zod` - Type-safe schema definition
  - `zod` 4 `z.toJSONSchema()` - Compile Zod to JSON Schema natively (the third-party `zod-to-json-schema` is no longer actively maintained and only supports Zod 3 schemas)
  - `@modelcontextprotocol/server` and `@modelcontextprotocol/client` - MCP SDK v2 (the monolithic `@modelcontextprotocol/sdk` 1.x is maintained for compatibility)
  - `@openai/agents` - OpenAI Agents SDK (TS)
  - `ai` (Vercel) - Vercel AI SDK

## Citations

- ([Anthropic writing-tools-for-agents](https://www.anthropic.com/research/writing-tools-for-agents))
- ([MCP specification, 2026-07-28 revision](https://modelcontextprotocol.io/specification/2026-07-28/)) - current revision
- ([OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling))
- ([OpenAI Agents SDK](https://openai.github.io/openai-agents-js/))
- ([Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling))
- ([Vercel AI SDK tools](https://ai-sdk.dev/docs/reference/ai-sdk-core/))
- ([12-factor agents Factor 4 & 7](https://github.com/humanlayer/12-factor-agents))

## See also

- `/docs/tool-design` - Detailed patterns and case studies
- `/references/mcp-servers.md` - MCP server implementation
- `/references/error-handling.md` - RFC 9457 error patterns
- `/references/testing.md` - Tool routing, parameter correctness evals
- `/templates/tools/tool-definition.ts` - Starter template with adapters
