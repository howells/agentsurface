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

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No formal tool definitions. Functions exist but no schema, no description. | No `tool()` calls, no `@tool` decorators, no `createTool()`, no MCP tool registrations. |
| 1 | Basic tool schemas exist but descriptions are terse or missing. No examples. | Tool definitions present but descriptions <20 words. No `.describe()` on Zod fields. No inputExamples. |
| 2 | Good tool design. `verb_noun` naming. Agent-oriented descriptions with "when to use" and disambiguation. Typed schemas with field descriptions. | Descriptions include "Use when..." and "Do not use for...". All schema fields have descriptions. enum values on constrained strings. <10 tools per agent/context. |
| 3 | Excellent tool design. `toModelOutput` reducing token usage. Tool annotations (`readOnly`, `destructive`, `idempotent`). Dynamic tool selection support (`activeTools`, `defer_loading`). Cross-framework definitions (works in MCP + AI SDK + LangChain). | `toModelOutput` defined. annotations object present. `activeTools` or `defer_loading` patterns. Tool definitions portable across frameworks. |

## Evidence to gather

- **Tool definition locations:** MCP `server.tool(...)`, Vercel AI SDK `tools: {...}`, OpenAI Agents SDK `tool()`, Mastra `createTool()`, LangChain `Tool.from()`, Gemini `FunctionDeclaration`.
- **Description quality:** Grep for descriptions <20 words (red flag). Scan for "Use when..." and "Do not use for..." patterns.
- **Schema annotations:** `.describe()` or `description` field on every parameter; `additionalProperties: false` on objects.
- **Tool count:** >20 tools on a single agent is a red flag; agent struggles to reason over large tool sets.
- **Response shape:** Check for opaque IDs in responses. Look for `next_cursor`, `has_more`, pagination support.
- **Annotations:** MCP tools should carry `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`.
- **Cross-framework portability:** Single schema definition exported as MCP tool, Vercel AI SDK tool, OpenAI tool, and LangChain tool.

## Deep dive

### Naming conventions

Tool names should follow **`verb_noun`** or **`resource_action`** patterns:
- `create_issue`, `search_docs`, `github_pull_request_create`, `asana_search`
- Namespacing with a prefix groups related tools: `asana_search`, `asana_list_projects`, `asana_add_assignee`
- Avoid ambiguity between query and action tools. Use `search_` for queries, `create_`/`update_`/`delete_` for mutations.
- Consistent tense: all imperative present (`create`, not `creating` or `creation`).

### Descriptions: the single biggest lever

([Anthropic writing-tools-for-agents](https://www.anthropic.com/engineering/writing-tools-for-agents))

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

**Flat structure preferred.** Avoid deep nesting; one or two levels maximum. Deeply nested objects are harder for agents to reason about and may be rejected by OpenAI's strict mode.

**Every field must have a description.** Use `.describe()` in Zod:

```typescript
const searchIssuesSchema = z.object({
  query: z.string().describe('Free text search (supports "status:Open" syntax)'),
  assignee: z.string().optional().describe('Filter by assignee name or email'),
  status: z.enum(['Open', 'In Progress', 'Done']).describe('Issue workflow state'),
  limit: z.number().int().min(1).max(100).default(50)
    .describe('Max results to return (default 50, capped at 100)'),
}).strict();
```

**Enums over free text.** Constrain values wherever the server enforces them:

```typescript
priority: z.enum(['low', 'medium', 'high', 'critical'])
  .describe('Severity: low=cosmetic, medium=feature, high=blocker, critical=outage')
```

**Examples on every field.** Include concrete values:

```typescript
query: z.string()
  .describe('Search query. Examples: "status:Open", "assignee:alice@company.com", "label:bug"'),
```

**`additionalProperties: false` for strict OpenAI mode.** Required when compiling to OpenAI Agents SDK:

```typescript
.strict() // Zod
// or
{ additionalProperties: false } // JSON Schema
```

### Response shape: semantic content and pagination

**Return semantic names, not opaque IDs alone.** If a tool returns a list of users, include names, not just user IDs:

```typescript
// Bad:
{ user_ids: ['usr_123', 'usr_456'] }

// Good:
{
  users: [
    { id: 'usr_123', name: 'Alice', email: 'alice@company.com' },
    { id: 'usr_456', name: 'Bob', email: 'bob@company.com' }
  ]
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

**Anthropic `toModelOutput` for large payloads:** Compress responses by returning a summary string + structured refs. For example, a large search result list becomes:

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

### Annotations (MCP 2025-11-25)

([MCP spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25))

Every tool should declare its access level and side effects:

```typescript
server.tool(
  'create_issue',
  'Create a new issue in the tracker',
  schema,
  handler,
  {
    destructiveHint: true,  // Mutates external state
    idempotentHint: true,   // Safe to retry (upsert semantics)
    openWorldHint: false    // No side effects outside this API
  }
);
```

- `readOnlyHint: true` — Query-only, no side effects.
- `destructiveHint: true` — Mutates or deletes data; requires careful use.
- `idempotentHint: true` — Safe to call multiple times with same args; upsert preferred over create+update.
- `openWorldHint: false` — All effects are local to this API; no side effects on external systems.

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

Errors must be returned in the tool output, not thrown. Include recovery hints:

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
  name: 'jira_search_issues',
  description: 'Search Jira for issues...',
  schema: searchIssuesSchema,
  handler: searchIssuesHandler
};

// Export framework-specific adapters:
export const toMCP = (tool) => 
  server.tool(tool.name, tool.description, tool.schema, tool.handler, { readOnlyHint: true });

export const toVercelAI = (tool) => 
  tool({ name: tool.name, description: tool.description, parameters: toJSON(tool.schema), execute: tool.handler });

export const toOpenAIAgents = (tool) =>
  ({ name: tool.name, description: tool.description, parameters: toJSON(tool.schema), execute: tool.handler });
```

This pattern keeps tool logic centralized and ensures consistency across frameworks.

### Token efficiency

Tool descriptions count toward every agent request. Trim aggressively:

- Use references (`doc_uri`) for longer docs rather than inlining.
- MCP SDK supports **lazy loading**: define tool names and schemas once, load full metadata on demand.
- Anthropic supports **tool-search**: with many tools, agent can search for matching tools rather than loading all.
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
import { z } from 'zod';

const searchDocsSchema = z.object({
  query: z.string()
    .describe('Free text search query. Examples: "authentication", "API rate limits", "error 429"'),
  limit: z.number().int().min(1).max(100).default(10)
    .describe('Max results to return (default 10, max 100)'),
  offset: z.number().int().min(0).default(0)
    .describe('Pagination offset for large result sets'),
  format: z.enum(['concise', 'detailed']).default('concise')
    .describe('concise: title + URL only. detailed: include full snippet (slower, more tokens)')
}).strict();

type SearchDocsInput = z.infer<typeof searchDocsSchema>;

export async function searchDocsHandler(input: SearchDocsInput) {
  // Call internal search API
  const { query, limit, offset, format } = input;
  const results = await internal.search(query, { limit, offset });
  
  return {
    results: results.map(doc => ({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      ...(format === 'detailed' && { snippet: doc.snippet })
    })),
    has_more: results.length === limit,
    next_offset: offset + limit
  };
}

export const searchDocsTool = {
  name: 'search_docs',
  description: `Search internal documentation by keyword. Use this to find setup guides, API references, and troubleshooting steps. 
Do not use this for general knowledge (use web search instead) or to create new docs (use create_doc). Returns snippets ranked by relevance.`,
  schema: searchDocsSchema,
  handler: searchDocsHandler
};
```

**MCP adapter (tools/mcp.ts):**

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { searchDocsTool } from './registry';

const server = new Server({
  name: 'docs-mcp',
  version: '1.0.0'
});

server.tool(
  searchDocsTool.name,
  searchDocsTool.description,
  searchDocsTool.schema,
  searchDocsTool.handler,
  {
    readOnlyHint: true,
    openWorldHint: true
  }
);

export default server;
```

**Vercel AI SDK adapter (tools/vercel-ai.ts):**

```typescript
import { tool } from 'ai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { searchDocsTool } from './registry';

export const searchDocsVercel = tool({
  description: searchDocsTool.description,
  parameters: zodToJsonSchema(searchDocsTool.schema),
  execute: searchDocsTool.handler
});
```

**OpenAI Agents SDK adapter (tools/openai-agents.ts):**

```typescript
import { Tool } from '@openai/agents';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { searchDocsTool } from './registry';

export const searchDocsOpenAI = new Tool({
  name: searchDocsTool.name,
  description: searchDocsTool.description,
  parameters: zodToJsonSchema(searchDocsTool.schema),
  execute: searchDocsTool.handler
});
```

All three adapters wrap the same handler and schema; only the frame changes.

## Cross-vendor capability table

| Capability | Anthropic tool | MCP | OpenAI strict tool | Gemini FunctionDeclaration | Vercel AI SDK |
|-----------|----------------|-----|--------------------|---------------------------|---------------|
| Naming | `verb_noun` preferred | Yes | `verb_noun` + `strict:true` | Yes | Yes |
| Descriptions | Full prose; first paragraph critical | Yes | Full prose; <500 tokens per tool | Yes | Yes |
| Schema validation | Zod `.parse()` on input | Zod or JSON Schema | JSON Schema; `additionalProperties:false` required | JSON Schema | Zod native |
| Field descriptions | `.describe()` on every field | Required | `description` on every property | Required | `.describe()` on every field |
| Examples | Input examples in description or param | Supported | Via `examples` array in schema | Via `example` in property | Via `.describe()` |
| Enums | Enforced at parse | Enforced | Tokens masked at decode time (CFG) | Yes | Enforced at parse |
| Pagination | Explicit `next_cursor`, `has_more` | Supported | Supported | Supported | Supported |
| toModelOutput / response compression | Yes (collapses large payloads) | Not native | Not native | Not native | Not native |
| Annotations | None (Claude-specific) | `readOnly`, `destructive`, `idempotent`, `openWorld` | None | None | None |
| Thought signature preservation | N/A | N/A | N/A | Required (pass back in history) | N/A |
| Lazy loading | Tool search pattern | SDK-native `defer_loading` | Not native | Not native | Not native |
| Error output | Structured; returned not thrown | Structured; isError pattern | Structured in tool_result | Structured | Structured; returned not thrown |

## Anti-patterns to avoid

- **Terse descriptions** ("Creates a thing"). Takes no effort to write, compounds agent confusion.
- **30+ tools on one agent.** Agent cannot reason over large tool sets; accuracy drops sharply.
- **Opaque IDs in response without lookup tool.** If a tool returns `user_id: 123`, agent must have a `lookup_user` tool to resolve it.
- **Nested union types** (e.g., `result: { type: 'success'; data: X } | { type: 'error'; message: string }`). OpenAI strict mode rejects these. Use flat discriminated unions or separate fields.
- **Nullable parameters** (e.g., `assignee?: string | null`). OpenAI requires explicit omission; Anthropic handles both. Prefer optional fields without null.
- **Inconsistent naming across tools.** Use `user_id` everywhere, not `user_id` in one tool and `userId` in another.
- **Side-effectful tools that throw errors instead of returning.** Always return errors in the response body so the agent can reason about recovery.
- **Destructive tools without annotations.** Any tool that mutates state must carry `destructiveHint: true` (MCP) or be called out in the description.
- **No disambiguation in descriptions.** If two tools are similar, explicitly state when to use each.

## Templates and tooling

- `/templates/tool-definition.ts` — Shared schema + cross-framework adapters (MCP, Vercel AI SDK, OpenAI Agents SDK)
- `/templates/tool-registry.ts` — Registry pattern for managing >10 tools
- **Libraries:**
  - `zod` — Type-safe schema definition
  - `zod-to-json-schema` — Compile Zod to JSON Schema for OpenAI
  - `@modelcontextprotocol/sdk` — MCP server + client
  - `@openai/agents` — OpenAI Agents SDK (TS)
  - `ai` (Vercel) — Vercel AI SDK

## Citations

- ([Anthropic writing-tools-for-agents](https://www.anthropic.com/engineering/writing-tools-for-agents))
- ([MCP 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25))
- ([OpenAI function calling](https://platform.openai.com/docs/guides/function-calling))
- ([OpenAI Agents SDK](https://openai.github.io/openai-agents-js/))
- ([Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling))
- ([Vercel AI SDK tools](https://ai-sdk.dev/docs/reference/ai-sdk-core/))
- ([12-factor agents Factor 4 & 7](https://github.com/humanlayer/12-factor-agents))

## See also

- `/docs/tool-design` — Detailed patterns and case studies
- `/references/mcp-servers.md` — MCP server implementation
- `/references/error-handling.md` — RFC 9457 error patterns
- `/references/testing.md` — Tool routing, parameter correctness evals
- `/templates/tool-definition.ts` — Starter template with adapters
