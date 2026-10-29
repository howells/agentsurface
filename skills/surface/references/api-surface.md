# API Surface

## Summary

Dimension 1 scores OpenAPI quality and agent-readiness of HTTP APIs. Baseline is OpenAPI/Swagger presence with agent-oriented descriptions (when to use, vs. alternatives) and consistent operationIds. Production includes Arazzo workflows for multi-step operations, semantic extensions (x-action, x-agent-\*), and auto-generated MCP servers. Agent-first APIs enable tool generation without reverse-engineering, reduce hallucination, and lower token spend on refinement loops.

- **0**: No OpenAPI spec (blocker)
- **1**: OpenAPI exists but human-oriented descriptions, missing operationIds
- **2**: Disambiguation in descriptions, operationIds on all operations, enum values
- **3**: Arazzo workflows, x-speakeasy-mcp extensions, auto-generated MCP, token-efficient descriptions
- **Evidence**: OpenAPI/Swagger files, operationId coverage, description patterns, Arazzo presence

---

> This dimension measures how well the HTTP API is described for machine consumption by AI agents. An agent-first API spec enables agents to discover endpoints, understand parameters and error conditions, and invoke operations without reverse-engineering code or documentation. APIs described for humans - with terse summaries and implicit context - force agents to guess intent, misuse endpoints, and fail silently. Dimension 1 directly enables agent autonomy: the better the API surface, the fewer token-expensive refinement loops agents need.

## Scoring rubric

| Score | Criteria                                                                                                                                                                         | Detection                                                                                                                                                                                           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | No machine-readable API spec. Endpoints exist but no OpenAPI, no formal schema.                                                                                                  | No openapi.json/yaml, no swagger.json, no API schema files                                                                                                                                          |
| 1     | OpenAPI exists but descriptions are human-oriented. Missing operationIds, vague summaries, no examples, nested params.                                                           | OpenAPI present but: descriptions say "Gets the data" not when/why; missing operationId on >30% of operations; no example values                                                                    |
| 2     | Agent-oriented descriptions (when to use, vs alternatives, prerequisites). Proper operationIds (verb_noun). Enums exhaustive. Examples on all params. Flat parameter structures. | Descriptions include disambiguation ("Use this when... For X instead, use..."). operationId on all operations. enum values on constrained strings. example on schema properties.                    |
| 3     | Full agent optimization. Arazzo workflows for multi-step operations. Semantic extensions (x-action, x-agent-\*). LAPIS-style token efficiency. Auto-generated MCP from spec.     | Arazzo file present. x-speakeasy-mcp or x-action extensions. MCP server generated from spec. Description token efficiency under roughly 200 tokens per operation (house heuristic, not a standard). |

**Key files:** openapi.json, openapi.yaml, swagger.json, api/ routes, Arazzo files

---

## Evidence to gather

Use these exact patterns and file paths when auditing Dimension 1:

### File discovery

- **OpenAPI/Swagger specs:** `rg -l --glob "*.{yaml,yml,json}" -e '^\s*"?(openapi|swagger)"?\s*:'` across the repo (covers YAML and JSON, OpenAPI 3 and Swagger 2), then parse each match to confirm it is a spec
- **Framework route files:**
  - Next.js: `app/**/route.ts`, `app/**/route.js`, `pages/api/**`
  - Express/Fastify: `src/routes/**`, `server.ts`, `index.ts` for `router.get()`, `router.post()`, etc.
  - FastAPI: `src/main.py`, `app/routes.py` for `@app.get()`, `@app.post()`
  - NestJS: `src/**/*.controller.ts` for `@Controller()`, `@Get()`, `@Post()`
  - Go: `main.go`, `cmd/**/main.go`, `pkg/handlers/` for `http.HandleFunc()`, `gin.GET()`, `chi.Post()`
- **Arazzo files:** `*.arazzo.yaml`, `*.arazzo.json`, `arazzo/` directory
- **Vendor extensions:** Search for `x-speakeasy-mcp`, `x-openai-isConsequential`, `x-agent-hint`, `x-rate-limit` in spec files

### Framework-specific scanning

**Next.js App Router:**

```bash
find app -name "route.ts" -o -name "route.js" | head -20
# Each file exports GET/POST/PUT/PATCH/DELETE(request: Request, context?: { params: Promise<...> }) returning a Response
# Score operationId derivation: `{method}_{segment}` e.g., GET /app/users/[id]/route.ts → get_users_by_id
```

**Express/Fastify:**

```bash
grep -r "router\.\(get\|post\|put\|delete\)" src/ --include="*.ts" --include="*.js"
# Check: router.get('/users', handler) — missing operationId; check if description exists
```

**FastAPI:**

```bash
grep -r "@app\.\(get\|post\|put\|delete\)" src/ --include="*.py"
# Check: @app.get("/users/") def list_users() — description from docstring
```

**NestJS:**

```bash
grep -r "@\(Get\|Post\|Put\|Delete\)" src/ --include="*.ts" -A 2
# Check: @Get(':id') method name should follow verb_noun pattern
```

**Go:**

```bash
grep -r "HandleFunc\|GET\|POST\|PUT\|DELETE" --include="*.go"
# Check: http.HandleFunc("/users", getUsersHandler) — operationId must be derived from handler name
```

### Checks for score determination

- **operationId coverage:** parse the spec (resolving `$ref`s and split files) and count operations with an `operationId` against all operations; >30% missing = score 1 max. Line greps miss unquoted YAML keys.
- **Description depth:** Sample 5 operations; measure average word count and presence of "Use when", "Do not use"
- **Examples:** from the parsed spec, properties with `example`/`examples` / total properties; <50% = score 1 max
- **Enums:** find categorical strings with `enum` in the parsed spec and verify their values are documented
- **Flat structure:** Check for nested parameter objects (deeply nested $ref chains = score 1-2 max)
- **Arazzo presence:** `find . -name "*.arazzo.*"`; any matches = evidence for score 3

---

## Deep dive: what agent-first API design looks like

### OpenAPI 3.1 baseline

Use OpenAPI 3.1.x or later, not 3.0. OpenAPI 3.1 aligns with JSON Schema 2020-12, replacing the 3.0 schema dialect with standard keywords and type unions ([OpenAPI 3.1.x](https://spec.openapis.org/oas/v3.1.0)). The current publication is 3.2.1 (2026-09-10); 3.1 stays the safe compatibility target because more generators and validators support it. `operationId` is optional in the spec but must be unique when present, so treat it as required for agent surfaces. `format` is an annotation, not a guaranteed validation. Overlay 1.2.0 (2026-09-22) lets you add agent-oriented descriptions without editing the source spec.

**Minimal valid OpenAPI 3.1 spec:**

```yaml
openapi: 3.1.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      operationId: list_users
      summary: List all users
      description: |
        Retrieve a paginated list of users.

        **Use when:** you need a searchable list of user accounts.
        **Do not use for:** retrieving a single user by ID (use `get_user_by_id` instead).
        **Prerequisites:** Bearer token with `users:read` scope.
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
          example: 20
          description: Number of results per page
        - name: offset
          in: query
          schema:
            type: integer
            minimum: 0
          example: 0
          description: Pagination offset in results
      responses:
        "200":
          description: Successfully retrieved users
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/User"
                  total:
                    type: integer
                    example: 42
                  offset:
                    type: integer
                    example: 0
                required: [data, total]
        "400":
          description: Invalid query parameters
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "401":
          description: Missing or invalid authentication
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
          example: "550e8400-e29b-41d4-a716-446655440000"
        email:
          type: string
          format: email
          example: "alice@example.com"
        name:
          type: string
          example: "Alice Smith"
        created_at:
          type: string
          format: date-time
          example: "2026-04-17T10:30:00Z"
      required: [id, email, name, created_at]
    ErrorResponse:
      type: object
      properties:
        type:
          type: string
          format: uri
          example: "https://api.example.com/errors/validation-failed"
          description: URI identifier for the error type
        title:
          type: string
          example: "Validation Failed"
        status:
          type: integer
          enum: [400, 401, 403, 404, 409, 429, 500]
        detail:
          type: string
          example: "The 'limit' parameter must be between 1 and 100"
        instance:
          type: string
          description: Specific occurrence identifier (e.g., request ID)
          example: "req-abc123"
      required: [type, title, status, detail]
```

### Descriptions for agents

Write descriptions as if onboarding a new engineer who will integrate your API into a system:

**Good (agent-friendly):**

> Retrieve a paginated list of users. Use when you need to find users matching criteria or display a directory. Do not use to get a single user by ID (use `get_user_by_id` instead). Requires `users:read` scope. Returns up to 100 results; use `offset` to fetch additional pages. Filters (not yet implemented) will be added in v2.

**Bad (human-only):**

> Gets the users.

**Pattern:** Each description should answer in order:

1. **What:** Concise action sentence.
2. **When to use:** One specific scenario where this operation is the right choice.
3. **When NOT to use:** One alternative operation and why you'd use that instead.
4. **Prerequisites:** Auth scopes, required parameters, rate limits.
5. **Pagination/limits:** Batch size, offset/cursor behavior, total size hints.
6. **Future gaps:** If functionality is incomplete, say so.

### operationId naming (verb_noun convention)

Use lowercase, snake_case `verb_noun` format. This naming carries semantic meaning that agents parse:

**Correct:**

- `list_users` - read, paginated, multiple items
- `get_user_by_id` - read, single item, keyed by ID
- `search_users` - read, filtered/full-text, potentially expensive
- `create_user` - write, new record
- `update_user` - write, existing record, partial update
- `replace_user` - write, full replacement (all fields required)
- `delete_user` - write, destructive, idempotent if ID doesn't exist
- `export_users_as_csv` - read, special format, potentially large

**Incorrect:**

- `GetUserByID` - CamelCase not snake_case
- `get_user_or_users` - ambiguous semantics
- `getUser` - mixes conventions
- `user` - no verb, unclear intent
- `RetrieveUserAccountInformation` - verb is implicit; too verbose

### Flat parameter structures

Agents handle flat parameter lists best. Avoid deeply nested objects in request bodies.

**Preferred (flat):**

```yaml
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          user_id:
            type: string
            example: "550e8400-e29b-41d4-a716-446655440000"
          email:
            type: string
            format: email
            example: "alice@example.com"
          first_name:
            type: string
            example: "Alice"
          last_name:
            type: string
            example: "Smith"
        required: [user_id, email]
```

**Avoid (nested, forces agent context switching):**

```yaml
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          user:
            type: object
            properties:
              profile:
                type: object
                properties:
                  personal:
                    type: object
                    properties:
                      first_name:
                        type: string
```

### Enums with documented values

Every categorical string (a closed set of values) must have `enum` and a description of each value. Length, pattern and format constraints do not make a string categorical:

```yaml
status:
  type: string
  enum: [pending, active, suspended, deleted]
  description: Account status
  x-enum-descriptions:
    pending: "User registered but not yet verified via email"
    active: "User can log in and use the system"
    suspended: "User temporarily blocked pending review"
    deleted: "Soft-deleted; can be recovered by support"
  example: "active"
```

Agents often fail when enum meanings are implicit. Explicit per-value docs prevent guessing.

### Examples on every field

Every scalar property should have an `example`:

```yaml
properties:
  id:
    type: string
    format: uuid
    example: "550e8400-e29b-41d4-a716-446655440000"
  created_at:
    type: string
    format: date-time
    example: "2026-04-17T10:30:00Z"
  retry_count:
    type: integer
    minimum: 0
    maximum: 5
    example: 2
  tags:
    type: array
    items:
      type: string
    example: ["vip", "early-adopter"]
```

Examples populate agent context slots that improve tool-calling accuracy. Omitted examples force agents to infer plausible values.

### Error schemas per operation

Define error response schemas per operation, not globally. Each operation should declare which errors it can return:

```yaml
responses:
  "400":
    description: Invalid input
    content:
      application/problem+json:
        schema:
          $ref: "#/components/schemas/ValidationError"
  "401":
    description: Missing or invalid authentication
    content:
      application/problem+json:
        schema:
          $ref: "#/components/schemas/AuthError"
  "409":
    description: Conflict (e.g., email already exists)
    content:
      application/problem+json:
        schema:
          $ref: "#/components/schemas/ConflictError"
  "429":
    description: Rate limited
    content:
      application/problem+json:
        schema:
          $ref: "#/components/schemas/RateLimitError"
```

Use `$ref` to reuse error schemas. Each error schema should follow RFC 9457 (see Error Handling dimension reference).

### Content negotiation for Markdown

At score 3, support `Accept: text/markdown` to return operation documentation in Markdown. This enables agents to fetch human-readable docs inline:

**Request:**

```
GET /users HTTP/1.1
Accept: text/markdown
```

**Response:**

```
HTTP/1.1 200 OK
Content-Type: text/markdown; charset=utf-8

# List Users

Retrieve a paginated list of users...
```

Implement in middleware:

```typescript
// Next.js
// prefersMarkdown parses q-values (see the content negotiation example in discovery-aeo.md);
// a substring test would serve Markdown to `text/markdown;q=0`.
export async function GET(req: Request) {
  const accept = req.headers.get("Accept") || "application/json";

  if (prefersMarkdown(accept)) {
    const markdown = `# List Users\n\nRetrieve a paginated list...`;
    return new Response(markdown, {
      headers: { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept" },
    });
  }

  return Response.json({ data: await listUsers() }, { headers: { Vary: "Accept" } });
}
```

### Arazzo 1.1.0 workflows

For multi-step operations, use Arazzo 1.1.0 to model agent workflows ([Arazzo 1.1.0](https://spec.openapis.org/arazzo/latest.html), released 17 May 2026).

**Example: Create user, send welcome email:**

```yaml
arazzo: 1.1.0
info:
  title: User Onboarding Workflow
  version: 1.0.0
sourceDescriptions:
  - name: usersApi
    url: https://api.example.com/openapi.json
    type: openapi
workflows:
  - workflowId: onboardUser
    summary: Create a new user account and trigger a welcome email
    inputs:
      type: object
      required: [email, name]
      properties:
        email: { type: string }
        name: { type: string }
    steps:
      - stepId: create_user
        operationId: $sourceDescriptions.usersApi.create_user
        requestBody:
          contentType: application/json
          payload:
            email: $inputs.email
            name: $inputs.name
        successCriteria:
          - condition: $statusCode == 201
        outputs:
          user_id: $response.body#/id
        onFailure:
          - name: email_exists
            type: end
            criteria:
              - condition: $statusCode == 409
      - stepId: send_welcome_email
        operationId: $sourceDescriptions.usersApi.send_email
        requestBody:
          contentType: application/json
          payload:
            to: $inputs.email
            template: welcome
            user_id: $steps.create_user.outputs.user_id
        successCriteria:
          - condition: $statusCode == 202
    outputs:
      user_id: $steps.create_user.outputs.user_id
```

Arazzo has no default success criterion for an HTTP step, so declare `successCriteria` on every step you rely on. It describes a sequence of calls; it is not transactional, so a failed later step does not roll back earlier ones.

Agents consume Arazzo workflows as multi-step orchestration blueprints, reducing the context needed to plan complex operations.

### Vendor extensions for agents

Supplement OpenAPI with agent-aware hints via vendor extensions:

**`x-speakeasy-mcp`:** Speakeasy-specific hints for MCP tool generation. The exact keys could not be confirmed against Speakeasy's current docs on 2026-10-29, so check them against the version you generate with

```yaml
operationId: create_issue
x-speakeasy-mcp: true
```

**`x-openai-isConsequential`:** Mark destructive operations. This comes from OpenAI's GPT Actions; current support in other OpenAI surfaces is unconfirmed, so do not rely on it as your only approval control

```yaml
operationId: delete_user
x-openai-isConsequential: true
```

**`x-agent-hint`:** Custom agent guidance (non-standard, but useful for edge cases)

```yaml
operationId: search_documents
x-agent-hint: |
  This is a full-text search endpoint. Results are ranked by relevance.
  Queries support boolean operators (AND, OR, NOT) and quoted phrases.
  Performance degrades with very broad queries (>100k results); add filters to narrow scope.
```

**`x-rate-limit`:** Document rate limits per operation

```yaml
operationId: list_users
x-rate-limit:
  requests: 100
  window: 60 # seconds
  headers: true # include X-RateLimit-* in response
```

### Auto-generating MCP from OpenAPI

Use open-source tools to generate MCP servers directly from OpenAPI specs:

- **Speakeasy** (https://speakeasyapi.dev): generates SDKs and MCP servers from OpenAPI
- **Stainless** (https://www.stainless.com): generates TypeScript SDKs and MCP servers from OpenAPI
- **OpenAPI Generator** (https://openapi-generator.tech): community-driven SDK generator; no first-party MCP output

Check each tool's current docs for exact commands and flags; they change between releases.

Generated MCP servers usually derive tool names, descriptions and examples from operationIds and the spec, but generators differ in naming overrides, collision handling, body merging and output schemas, so inspect the generated tools rather than assuming the mapping. Keep OpenAPI as the source of truth; regenerate MCP after spec changes, and curate the generated tool set rather than shipping it unreviewed (see the MCP auto-generation page).

---

## Cross-vendor notes

### Anthropic Claude tool definitions

For Claude Code SDK and Claude Managed Agents, prefer exposing API-derived tools through MCP when the tools should also work outside Anthropic. Keep the OpenAPI-derived registry as the source of truth, then emit MCP tool definitions with agent-first descriptions:

```typescript
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

server.registerTool(
  "list_users",
  {
    description:
      "Retrieve a paginated list of users. Use when you need to find users matching criteria or display a directory. Do not use to get a single user by ID (use get_user_by_id instead). Requires users:read scope.",
    inputSchema: z.object({
      limit: z.number().min(1).max(100).default(20).describe("Number of results per page"),
      cursor: z.string().optional().describe("Cursor returned from the previous page"),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ limit, cursor }) => {
    const page = await users.list({ limit, cursor });
    return {
      structuredContent: page,
      content: [{ type: "text", text: `Returned ${page.items.length} users.` }],
    };
  },
);
```

The description field is identical to OpenAPI - agents benefit from the same onboarding tone.

### OpenAI strict-mode function calling

OpenAI `strict: true` accepts only a subset of JSON Schema ([OpenAI function calling](https://platform.openai.com/docs/guides/function-calling)). Strict mode is a setting, not a universal requirement. This has implications for OpenAPI-to-OpenAI schema translation:

- `additionalProperties: false` must be on every object, at every nesting level
- Every property must be listed in `required`; express an optional field as nullable (`type: [string, "null"]`) and have the caller pass `null`
- Nested `anyOf` is supported; a root-level `anyOf` and unconstrained `any` branches are rejected
- Keep the schema within OpenAI's published limits on properties, nesting depth and enum size
- `format` is an annotation, so validate formats in your handler

When generating OpenAI schemas from OpenAPI 3.1, make the root an object, mark optional fields nullable, and keep unions inside properties:

```yaml
# OpenAPI 3.1 (valid, optional field omitted from required)
properties:
  email: { type: string, format: email }
  role: { type: string, enum: [admin, member] }
required: [email]

# OpenAI strict (every property required, optional ones nullable)
properties:
  email: { type: string }
  role: { type: [string, "null"], enum: [admin, member, null] }
required: [email, role]
additionalProperties: false
```

### Gemini FunctionDeclaration and thought signatures

Gemini 3 models return a thought signature with their function-call parts so reasoning carries across agent steps ([thought signatures](https://ai.google.dev/gemini-api/docs/thought-signatures)). This means:

1. **Send the model's content back unchanged.** Return each `functionCall` part (its `name` and `args`, for example `{"limit": 20, "offset": 0}`) in history exactly as the model produced it, with its signature. Do not invent a signature or rebuild the part from logs; not every part carries one.
2. **Pin schemas per session.** Keep tool declarations stable within an agent session (house advice) so earlier calls still match the declarations.
3. **Declare tools in Gemini's shape.** A Gemini tool holds `functionDeclarations`; each has a name, description and `parameters` (OpenAPI subset) or `parametersJsonSchema`:

```typescript
// @google/genai SDK
const tools = [
  {
    functionDeclarations: [
      {
        name: "list_users",
        description: "Retrieve a paginated list of users...",
        parametersJsonSchema: {
          type: "object",
          properties: {
            limit: { type: "integer", description: "Number of results per page" },
            offset: { type: "integer", description: "Pagination offset" },
          },
          required: ["limit"],
        },
      },
    ],
  },
];
```

Export OpenAPI-derived schemas to Gemini from a single source of truth (Zod 4's native `z.toJSONSchema()` or the OpenAPI schema itself) so the declarations stay aligned. The `zod-to-json-schema` package is no longer actively maintained and only handles Zod 3 schemas.

---

## Anti-patterns

- **Nested/polymorphic parameters.** Deeply nested object hierarchies and `oneOf`/`anyOf` unions are harder for agents to fill in and for some providers to accept. Flatten parameters; use separate endpoints for polymorphic cases (e.g., `/users/search` vs `/users/{id}`).
- **Missing operationIds.** Without operationIds, agents cannot name tool calls and cannot reference operations in workflows. Every path + method combination must have a unique operationId.
- **Inconsistent error envelopes.** Some endpoints return `{ "error": "..." }`, others `{ "message": "..." }`. Agents cannot reliably parse errors. Standardize on RFC 9457 everywhere.
- **OpenAPI 3.0 instead of 3.1+.** OpenAPI 3.0 uses its own modified subset of JSON Schema draft 4/5 keywords, which modern JSON Schema tooling does not read directly. 3.1 aligns with JSON Schema 2020-12. Upgrade during next major release.
- **Overloaded endpoints.** A single endpoint serving 10 different use cases (filtered by query params or request body shape) forces agents into combinatorial parameter exploration. Prefer separate endpoints: `/users/search`, `/users/by-email`, `/users/active`.
- **Enum-as-string without documented values.** Status fields with values like "PEND_ACTN", "APRV_RDY", "ACTV" are meaningless to agents without explicit enums and descriptions.
- **Descriptions that describe implementation, not behavior.** Bad: "Calls the getUserService and returns JSON". Good: "Retrieve a single user by email address. Use when you have the user's email but not their ID."
- **No examples on parameters.** Agents invent plausible values (often incorrect). Every field needs a concrete `example`.
- **Pagination without `total` or `has_more`.** Agents cannot determine if they've fetched all results. Include `total` (exact count) or `has_more` (boolean) in every paginated response.
- **Missing per-operation error definitions.** Declaring error responses globally (not per operation) hides which errors are actually possible for which endpoints. Agents over-handle or under-prepare.

---

## Templates and tooling

### Shipped templates in the plugin

The Agent Surface repository (https://github.com/howells/agentsurface) ships these templates:

- **`templates/mcp-and-api/openapi-skeleton.yaml`** - Minimal valid OpenAPI 3.1 spec with common patterns (pagination, errors, enums)
- **`templates/mcp-and-api/arazzo-workflow.yaml`** - Example multi-step workflow for a common pattern (create, validate, notify)
- **`templates/errors-and-auth/problem-details.ts`** - Zod schema and types for RFC 9457 error responses (reusable in route handlers)

### Recommended tooling ecosystem

**Specification and design:**

- **Stoplight Studio** - Visual OpenAPI editor; includes linting (free community edition at https://stoplight.io)
- **Scalar** - Beautiful OpenAPI documentation UI; embeddable (https://scalar.com)
- **Redocly** - OpenAPI linting and bundling; enforces agent-friendly patterns (https://redocly.com)

**Code generation:**

- **Speakeasy** (https://speakeasyapi.dev) - Generate SDKs + MCP servers from OpenAPI; agent-aware code
- **Stainless** (https://www.stainless.com) - TypeScript SDK + MCP generation; focuses on DX
- **OpenAPI Generator** (https://openapi-generator.tech) - Community-driven; broad language support

**Framework-specific:**

- **NestJS** - `@nestjs/swagger` decorators auto-generate OpenAPI from controller definitions
- **FastAPI** - Native OpenAPI generation from Pydantic models + docstrings (no separate spec needed)
- **Express/Fastify** - `swagger-jsdoc` (inline JSDoc comments) or `@fastify/swagger` (Fastify plugin; match its major version to Fastify)
- **Next.js** - `openapi-types` for type safety; generate types and clients from the spec with `@hey-api/openapi-ts` or `openapi-typescript`

**Validation and linting:**

- **Redocly CLI** - `redocly lint openapi.yaml` enforces agent-friendly rules
- **Spectral** (`@stoplight/spectral-cli`) - rule-based OpenAPI linter; its `operation-operationId` rule catches operationId gaps
- **IBM OpenAPI Validator** - Comprehensive spec compliance checks

---

## Citations

- [OpenAPI 3.1.x Specification](https://spec.openapis.org/oas/v3.1.0)
- [OpenAPI Specification 3.2.1](https://spec.openapis.org/oas/v3.2.1.html)
- [Overlay Specification 1.2.0](https://spec.openapis.org/overlay/v1.2.0.html)
- [Arazzo 1.1.0 Specification](https://spec.openapis.org/arazzo/latest.html)
- [Anthropic: Writing Tools for Agents](https://www.anthropic.com/research/writing-tools-for-agents)
- [RFC 9457 Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [OpenAI Strict Mode Documentation](https://platform.openai.com/docs/guides/structured-outputs)
- [Gemini 3 Thought Signatures](https://ai.google.dev/gemini-api/docs/thought-signatures)
- [JSON Schema 2020-12 Specification](https://json-schema.org/specification.html)
- [Speakeasy Code Generation](https://speakeasyapi.dev)
- [Stainless SDK Generation](https://www.stainless.com)
- [Scalar OpenAPI Documentation](https://scalar.com)
- [Redocly OpenAPI Tools](https://redocly.com)

---

## See also

- `/docs/api-surface` in the Agent Surface Fumadocs site
- `/templates/mcp-and-api/openapi-skeleton.yaml` - starting template for OpenAPI 3.1 specs
- `/templates/mcp-and-api/arazzo-workflow.yaml` - workflow example for multi-step operations
- `/references/tool-design.md` - shared concerns with tool naming and descriptions
- `/references/error-handling.md` - per-operation error schemas and recovery hints

## Versioning, events and onboarding checks

- **Versioning:** operationIds stable after release; breaking changes versioned (URL major or date header); deprecated operations marked `deprecated: true` and answered with `Deprecation` (RFC 9745) and `Sunset` (RFC 8594) headers. Canonical: `/docs/api-surface/api-versioning`.
- **Events:** webhooks declared in the OpenAPI `webhooks` field, discriminated by `event_type`, deduplicated by `event_id`, signed per Standard Webhooks with a replay window, versioned, and carrying state snapshots. Canonical: `/docs/api-surface/webhooks-events`.
- **Onboarding:** an official SDK traceable to the API (npm `repository`/`homepage`), linked from docs and `llms.txt`; self-serve keys and a sandbox that let an agent reach a first successful call with no human step. Canonical: `/docs/api-surface/openapi-for-agents` (Publishing SDKs and Removing Onboarding Friction).
- **Extensions:** `x-agent-*` and `x-category` are house conventions; credit them only where the generator or gateway actually maps them, and never as a substitute for server-side authorization. Canonical: `/docs/api-surface/openapi-extensions`.

## Retrieval and lifecycle checks

For collection, long-running, or bulk operations, gather evidence for ownership (who may read or cancel a job), continuation, limits, partial failure, and terminal state, and test two pages, an empty result, an invalid cursor and a changing dataset. Compare declared success and error schemas with real responses. Canonical REST/GraphQL guidance is at `/docs/api-surface/retrieval-and-job-contracts`; use `product-journeys.md` to evaluate the operation within a real task.
