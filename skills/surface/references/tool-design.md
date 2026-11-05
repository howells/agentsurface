# Tool Design

Dimension 7: the quality of tool definitions an agent chooses between and
calls, in any framework.

## Score

- **0**: Functions with no tool schema or description (no `registerTool`,
  `tool()`, `createTool()`, `@tool`).
- **1**: Schemas exist but descriptions are terse (<20 words) or missing, fields
  are undescribed, no examples.
- **2**: Clear verb-noun names; descriptions that say when to use the tool and
  what to use instead; every field described; enums on closed sets; a small set
  per agent context (under about 10).
- **3**: Level 2 plus compressed model-facing output (`toModelOutput` or the
  equivalent), annotations, dynamic selection for large sets (tool search,
  `activeTools`), and one definition emitted to several frameworks.

## Evidence to gather

- Definitions: MCP `registerTool` (v1 `server.tool`), AI SDK `tools: {}`, OpenAI
  Agents `tool()`, Mastra `createTool()`, LangChain, Gemini
  `functionDeclarations`.
- Description word counts; "use when" and "do not use" content; sibling tools
  without a stated choosing rule.
- `.describe()` or `description` on every field; `additionalProperties: false`
  where strict mode is on.
- Responses: bare IDs with no lookup tool, unbounded lists, missing
  `next_cursor`/`has_more`.
- Tool count per agent context.

## The house way

**Names.** Lowercase snake_case: a verb and the noun a user would say
(`find_palette_ideas`, `add_samples_to_cart`). This is the house convention;
MCP allows other casings and some model adapters are stricter. Namespace only
when the agent must tell real services or destinations apart, not to mirror a
backend. Keep provider abbreviations, cache choices and connectivity checks out
of tool names unless managing them is the agent's job. Rename registration
keys and every executable reference together. Canonical:
https://agentsurface.dev/docs/tool-design/naming-and-descriptions.

**Descriptions** carry the most weight. Lead with what it does and when to use
it, then what to use instead, then preconditions and side effects (auth,
limits, mutations, pagination). 30 words suits a simple tool; add words only
where they carry guidance. For near-siblings, state the choosing rule in each.

**Schemas.** One or two levels of nesting at most (house advice; OpenAI strict
allows 10 levels and 5,000 properties). Every field described, with example
values. Enums wherever the server enforces a closed set, with meanings
(`low=cosmetic, critical=outage`). The same name for the same thing everywhere
(`user_id`, never `userId` in one tool).

**Output.** Names alongside IDs, so the agent needn't look each one up. Paginate
by default with `next_cursor`/`has_more`; offer `response_format: concise |
detailed` on heavy reads. Compress large results into a summary plus
structured refs (the AI SDK's `toModelOutput`; elsewhere do it in the tool
result). Errors are returned, not thrown, with `is_retriable` false for
validation failures (error-handling.md).

**Shape.** Prefer one idempotent `upsert` over create-plus-update, and add a
batch variant of a tool agents call five or more times per task.

**Annotations** (MCP): a create deduplicated by a client `request_id` is
`readOnlyHint: false, destructiveHint: false, idempotentHint: true`; without
the dedup key it isn't idempotent. Rules are in mcp-servers.md. Annotations are
hints, never authorization.

**One definition, many adapters.** Keep name, description, Zod schema, output
schema and handler in a neutral registry and emit adapters: MCP
`registerTool(name, { description, inputSchema, outputSchema, annotations })`
returning `structuredContent`; AI SDK `tool({ description, inputSchema,
execute })` in a record keyed by name; OpenAI Agents `tool({ name, description,
parameters, execute })`.

## Provider gotchas

- **OpenAI strict mode** is on by default in the Agents SDK. Every property must
  be in `required`, so `.default()` and `.optional()` fields need a strict
  variant with `.nullable()` (or `strict: false` and validation in `execute`).
  It rejects root-level `anyOf` and unbounded `any`; nested `anyOf` is fine. A
  new schema can add first-request latency, so reuse identical schemas. GPT-6
  tool calling needs the Responses API; the open-source Agents SDK is not the
  OpenAI Agents API (public beta since 2026-09-10).
- **Claude strict tool use** is per tool and allows genuinely optional
  properties, but a request caps at 20 strict tools, 24 optional parameters and
  16 union-typed parameters across strict schemas, with a 180 s compile timeout.
  Spend strictness where a malformed call is costly.
- **Claude forced tool choice:** Opus 5.5, Sonnet 5.5 and Fable 5.1 reject
  `tool_choice` `any` and `tool` with a 400; use `auto` with `strict: true` or
  structured outputs.
- **Claude API version `2026-10-21`** (the default in the new major SDKs)
  removes `temperature`, `top_p` and `top_k`; sending them is a 400.
- **Claude capabilities** come from the Models API, not model names:
  `capabilities.server_tools.code_execution` for the server tool, top-level
  `capabilities.code_execution` for programmatic calling of the request's other
  tools.
- **Tool search** (`defer_loading: true`; `deferLoading` and `toolSearchTool()`
  in OpenAI Agents JS) loads only matching definitions, and only loaded ones
  cost tokens. MCP itself has no lazy loading: `tools/list` returns everything.
  Claude inline tool definitions (beta `inline-tools-2026-09-15`) add a tool
  mid-conversation without breaking the cache.
- **Programmatic tool calling** (Claude `code_execution_20260120` or later with
  `allowed_callers`; OpenAI Agents JS `programmaticToolCallingTool()` with
  `allowedCallers`) keeps intermediate results out of context.
- **Gemini** takes an OpenAPI subset (`parameters`) or raw JSON Schema
  (`parametersJsonSchema`), never both; very large or deep schemas are
  rejected. Don't copy OpenAI's strict rules into a Gemini adapter. Return
  function-call parts with their thought signatures unchanged.
- **Zod to JSON Schema:** Zod 4's `z.toJSONSchema()`. `zod-to-json-schema` is
  unmaintained and Zod 3 only.

About 20 tools in one agent context is a house review threshold, not a limit;
beyond it, test routing on representative tasks and use dynamic selection.

## Templates

- `templates/tools/tool-definition.ts` (shared schema with MCP, AI SDK and
  OpenAI Agents adapters)
- `templates/tools/tool-registry.ts`
