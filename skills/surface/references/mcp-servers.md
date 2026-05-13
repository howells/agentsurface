# MCP Servers

## Summary

Dimension 3 scores MCP server implementation quality. MCP is the cross-vendor standard for agent-tool transport. Baseline is presence of tools with agent-oriented descriptions and structured error handling (isError: true). Production includes annotations (readOnlyHint, destructiveHint, idempotentHint), outputSchema with structuredContent, resources, OAuth protected-resource metadata for protected HTTP servers, pagination (cursor-based), and testing via InMemoryTransport. Advanced includes multiple transports (stdio + Streamable HTTP), prompts/tasks, roots, sampling/elicitation gates, consent policies, and dynamic tool loading.

- **0**: No MCP server, no .mcp.json (blocker)
- **1**: Server exists but <5 tools, terse descriptions, no annotations, errors thrown
- **2**: Proper annotations, agent-oriented descriptions, structured errors, outputSchema/structuredContent, resources
- **3**: Production-ready (OAuth, pagination, multiple transports, InMemoryTransport tests, consent gates, <20 tools)
- **Evidence**: @modelcontextprotocol/sdk imports, .mcp.json, annotations, outputSchema/structuredContent, error handling patterns

---

Model Context Protocol (MCP) is the cross-vendor standard for agent tooling transport. Adopted by Anthropic (Claude Desktop, Claude Code, claude-agent-sdk), OpenAI (Responses API, Agents SDK, ChatGPT Desktop), and Google (Gemini, managed remote MCP), MCP is the lingua franca of AI agent integrations. This reference covers building production-grade MCP servers that agents can discover, consume, and audit.

## Scoring rubric

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No MCP server. No .mcp.json or .mcp/mcp.json. No SDK imports (@modelcontextprotocol/sdk, mcp-handler, @mastra/mcp). | grep -r "@modelcontextprotocol/sdk" and grep -r "mcp-handler" both return nothing. No .mcp.json. |
| 1 | Basic MCP server exists but minimal. Fewer than 5 tools; descriptions are terse (<20 words); no annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint); no resources or prompts; errors thrown rather than structured with `isError: true`. | MCP server file imports sdk but: <5 tools defined; descriptions lack "when to use / when not to use"; no annotations object; no resources; errors not wrapped in `{ isError: true, content: [...] }`. |
| 2 | Well-structured MCP. Tools have proper annotations (readOnlyHint, destructiveHint, idempotentHint). Agent-oriented descriptions explaining when/why to use. Structured error handling with `isError: true`. outputSchema declared on tools returning structured data and results include structuredContent where supported. Resources exposed for static data. Spec compliance 2025-11-25. | Tools decorated with `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` as appropriate. Descriptions include "Use when..." and "Do not use for...". Tools return `{ isError: true, content: [...] }` on recoverable errors. outputSchema and structuredContent present on structured tools. Resources with MIME types declared. Server uses @modelcontextprotocol/sdk v2.x. |
| 3 | Production MCP. OAuth authorization via RFC 9728 `.well-known/oauth-protected-resource` metadata for protected HTTP servers. Pagination on list operations (cursor-based). Progress notifications for long-running operations. Multiple transports (stdio + Streamable HTTP). Tested with InMemoryTransport.createLinkedPair(). Tool count optimized (<20). Prompts or Tasks for workflow templates. Consent gates for destructive/authenticated/production tools. Roots, sampling, and elicitation are explicitly gated where implemented. | Auth: `.well-known/oauth-protected-resource` present for protected HTTP servers; bearer token validation and issuer/audience/resource/scope checks; authorization server discovery documented. Pagination: list operations return cursor via the MCP pagination pattern. HTTP transport via Streamable HTTP. Test coverage with InMemoryTransport. Tool count ≤20. Prompts or Tasks registered. Tasks use `tasks/get` polling and `tasks/result` retrieval where supported. Consent policy exists for high-risk calls. |

## Evidence to gather

**Dependency patterns:**
- `@modelcontextprotocol/sdk` (TypeScript/Node.js canonical)
- `mcp-handler` (Cloudflare Workers, Vercel, HTTP servers)
- `@mastra/mcp` (Mastra ecosystem)
- `fastmcp` (Python-first, but has JS)
- `mcp` (Python)

**File patterns:**
- `.mcp.json` or `.mcp/mcp.json` — MCP configuration / server discovery manifest
- Server entry point: `src/server.ts`, `src/mcp-server.ts`, or similar
- Tool definitions: `src/tools/`, `src/handlers/`, or inline
- Resources: `src/resources/` or inline resource handlers
- Tests: `**/*.test.ts` or `**/*.spec.ts` using `InMemoryTransport`
- OAuth: `.well-known/oauth-protected-resource` (HTTP servers only)

**Transport detection:**
- **stdio:** Server instantiated with `StdioServerTransport()` (local, single connection)
- **Streamable HTTP:** Server instantiated with `HttpServerTransport` (stateless, horizontally scalable; Cloudflare Workers, Lambda, Vercel)
- Legacy SSE (deprecated): `SSEServerTransport`

**Tool annotations presence:**
- `readOnlyHint: true` on read-only tools
- `destructiveHint: true` on operations that modify/delete
- `idempotentHint: true` on idempotent operations
- `openWorldHint: true` on tools that accept arbitrary strings (not enums)

**Structured result patterns:**
- `outputSchema` on tools that return machine-consumable data
- `structuredContent` matching the output schema
- concise `content` text for human-readable summaries
- resource links via returned resource content where useful

**Security and consent patterns:**
- protocol version declared and validated
- roots honored for filesystem/resource scope
- sampling and elicitation require explicit client/server policy
- destructive, authenticated, production, browser, sandbox, and network tools require approval or a documented allowlist
- bearer token validation checks issuer, audience/resource, expiry, and scopes

**Test patterns:**
- `InMemoryTransport.createLinkedPair()` — canonical MCP server testing pattern
- `client.callTool()` — invoking tools from test harness
- Assertion on `isError` and `content` fields

---

## Deep dive: Building a production-grade MCP server

### Spec fundamentals (2025-11-25)

[Source: https://modelcontextprotocol.io/specification/2025-11-25]

**Primitives:**
- **Tools:** Functions exposed to clients with input schemas and descriptions
- **Resources:** Static data, configuration, or live subscriptions exposed via stable URIs
- **Prompts:** Re-usable workflow templates (parameterized)
- **Roots:** Logical sandboxes or capabilities declarations
- **Sampling:** (Experimental) Server samples from client's model
- **Elicitation:** Server can request missing arguments from client before tool execution

**New in 2025-11-25:**
- **Tasks:** Experimental durable requests with polling and deferred result retrieval. Use for multi-step operations where the client needs progress updates.
- **OAuth Client ID Metadata Documents:** Recommended OAuth client registration mechanism when clients and authorization servers do not have a prior relationship.
- **Authorization server discovery improvements:** Protected HTTP MCP servers use OAuth protected-resource metadata to point clients to authorization servers, and clients support OAuth or OpenID Connect discovery.
- **URL Mode Elicitation:** Servers can direct users to external URLs for sensitive out-of-band interactions.
- **tool-calling in sampling:** Servers can request tool execution from the client during sampling.
- **Icon support:** Tools and resources can declare icon URIs for client UI rendering.

**Transports:**
- **stdio:** Local server. Single client connection. No authentication needed (trust is delegated to OS). Lowest latency.
- **Streamable HTTP:** Remote server over HTTPS. Protected HTTP servers should follow the MCP authorization specification and publish OAuth protected-resource metadata.
- **Legacy SSE (deprecated):** Do not use for new servers.

### Tool design for MCP

**Annotations:**
All tools should include a `tool.annotations` object with hints for agent reasoning:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({
  name: "my-api",
  version: "1.0.0",
});

// Example: read-only tool
server.tool(
  "get_user",
  "Retrieve user details by ID. Use when you need to look up a user's name, email, or profile info. Do not use for authentication.",
  {
    schema: z.object({
      user_id: z.string().describe("The unique user identifier (UUID format)"),
    }),
  },
  async (input) => {
    const user = await db.users.get(input.user_id);
    if (!user) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `User not found: ${input.user_id}`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(user),
        },
      ],
    };
  },
  {
    annotations: {
      readOnlyHint: true, // This tool does not modify state
    },
  }
);

// Example: destructive tool with idempotency
server.tool(
  "delete_user",
  "Permanently delete a user account and all associated data. Use only when the user explicitly requests deletion. Do not use for temporary deactivation.",
  {
    schema: z.object({
      user_id: z.string().describe("User ID to delete"),
      confirm: z.enum(["yes", "no"]).describe("Confirmation: must be 'yes'"),
    }),
  },
  async (input) => {
    if (input.confirm !== "yes") {
      return {
        isError: true,
        content: [{ type: "text", text: "Deletion not confirmed" }],
      };
    }
    await db.users.delete(input.user_id);
    return {
      content: [
        {
          type: "text",
          text: `User ${input.user_id} deleted successfully`,
        },
      ],
    };
  },
  {
    annotations: {
      destructiveHint: true, // This operation deletes data
      idempotentHint: true,  // Safe to call multiple times (second call is no-op)
    },
  }
);

// Example: open-world tool with structured output
server.tool(
  "search_docs",
  "Search documentation by keyword. Use when you need to find relevant docs. Accepts any search term.",
  {
    schema: z.object({
      query: z.string().describe("Search term (any string)"),
      limit: z.number().int().min(1).max(50).default(10).describe("Max results"),
    }),
  },
  async (input) => {
    const results = await search(input.query, input.limit);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results),
        },
      ],
      // Structured output reduces token usage
      toModelOutput: JSON.stringify(results.map(r => ({ title: r.title, url: r.url }))),
    };
  },
  {
    annotations: {
      openWorldHint: true, // Accepts arbitrary strings, not enum
    },
  }
);
```

**Principles:**
- Use **tool annotations** on every tool. Agents reason better with hints, but annotations are not authorization policy.
- Write **agent-oriented descriptions**. Not "Gets the user" but "Retrieve user details by ID. Use when you need to look up a user's name, email, or profile info. Do not use for authentication."
- Input schemas with **Zod**. Describe every field. Provide `example` on constrained types.
- Include **outputSchema** for tools returning structured data and return **structuredContent** where the SDK supports it.
- Keep model-facing text concise. Return semantic fields only, not raw JSON blobs, unless raw JSON is explicitly the requested artifact.
- Keep tool count **≤20 per server**. Use namespacing (`user_get`, `user_create`, `user_delete`).
- **Paginate list operations** with cursor-based pagination, not offset.
- Return **structured errors** via `{ isError: true, content: [...] }` instead of throwing. Agents recover better from recoverable errors.

### Security and consent

MCP metadata improves routing, but it does not replace policy.

- Treat tool descriptions, annotations, resource contents, prompt contents, and server-provided metadata as untrusted unless the server is trusted and pinned.
- Never rely on `readOnlyHint`, `destructiveHint`, or descriptions for authorization. Enforce auth, tenant identity, scopes, and approval gates in trusted server or workflow code.
- Require confirmation for destructive, authenticated, production, browser, sandbox, package-install, payment, email-send, file-write, and network-expanding tools unless a narrow allowlist explicitly permits them.
- Honor roots as capability boundaries. Filesystem/resource tools must reject access outside declared roots.
- Gate sampling and elicitation. Servers should not silently ask the client model or user for secrets, credentials, or sensitive data.
- Validate remote bearer tokens on every protected request: signature, issuer, audience/resource, expiry, not-before, scopes, and token binding where DPoP is required.
- Log tool name, inputs after redaction, user/tenant context, approval decision, trace ID, and result status.

### Resources

Expose static data, configuration, or live subscriptions:

```typescript
// Example: static resource
server.resource(
  "config://api-docs",
  "text/markdown",
  "API Documentation - Overview",
  async () => {
    const docs = await fs.readFile("docs/api.md", "utf-8");
    return {
      contents: [
        {
          uri: "config://api-docs",
          mimeType: "text/markdown",
          text: docs,
        },
      ],
    };
  }
);

// Example: JSON-LD structured resource
server.resource(
  "schema://user-types",
  "application/ld+json",
  "Schema.org User Type Definition",
  async () => {
    return {
      contents: [
        {
          uri: "schema://user-types",
          mimeType: "application/ld+json",
          text: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "DataType",
            "name": "User",
            "properties": [
              { "name": "id", "propertyType": "Text" },
              { "name": "email", "propertyType": "Text" },
            ],
          }),
        },
      ],
    };
  }
);
```

**Declare MIME types**. Serve `application/ld+json` for semantic data. Agents can then reason over structure.

### Prompts

Re-usable workflow templates:

```typescript
// Example: parameterized prompt
server.prompt(
  "analyze_code",
  "Analyze a code snippet for security issues. Use when you need to review untrusted or legacy code.",
  [
    {
      name: "code",
      description: "The code snippet to analyze",
      required: true,
    },
    {
      name: "language",
      description: "Programming language (e.g., javascript, python, rust)",
      required: true,
    },
  ],
  async (args) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Review this ${args.language} code for security issues:\n\n${args.code}`,
          },
        },
      ],
    };
  }
);
```

Prompts allow clients (Claude, ChatGPT, Gemini) to invoke pre-canned workflows without hard-coding the request structure.

### Authentication

**For local stdio servers:**
No explicit authentication. Trust is delegated to the host OS. Stdio servers run as the calling user's process.

**For remote Streamable HTTP servers:**
Implement OAuth 2.1 resource server pattern. Clients (agents) authenticate using `Bearer <access_token>` header.

```typescript
// Serve OAuth 2.1 metadata (HTTP servers only)
app.get("/.well-known/oauth-protected-resource", (req, res) => {
  res.json({
    issuer: "https://auth.example.com",
    token_endpoint: "https://auth.example.com/oauth/token",
    authorization_endpoint: "https://auth.example.com/oauth/authorize",
    token_endpoint_auth_methods_supported: ["client_secret_basic"],
    grant_types_supported: ["client_credentials"],
    scopes_supported: ["mcp:tools:read", "mcp:resources:read"],
  });
});

// Validate JWT on every request
async function validateToken(authHeader: string): Promise<{ clientId: string; scopes: string[] }> {
  const token = authHeader.replace(/^Bearer /, "");
  const decoded = jwt.verify(token, PUBLIC_KEY, {
    issuer: "https://auth.example.com",
    audience: "mcp-server",
    algorithms: ["RS256"],
  });
  return {
    clientId: decoded.sub,
    scopes: decoded.scope?.split(" ") || [],
  };
}

// Apply to HTTP stream handler
app.post("/mcp", express.json(), async (req, res) => {
  const auth = await validateToken(req.headers.authorization || "");
  const transport = new HttpServerTransport(req, res);
  // ... attach to server with auth context
});
```

**Client Credentials (M2M):**
Agents authenticate with `grant_type=client_credentials` to request access tokens:

```bash
curl -X POST https://auth.example.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=AGENT_ID&client_secret=SECRET&scope=mcp:tools:read"
```

**Token Exchange (RFC 8693):**
For delegation ("act on behalf of user X with scope Y"):

```bash
curl -X POST https://auth.example.com/oauth/token \
  -d "grant_type=urn:ietf:params:oauth:grant-type:token-exchange" \
  -d "subject_token=USER_TOKEN&subject_token_type=urn:ietf:params:oauth:token-type:jwt" \
  -d "actor_token=AGENT_TOKEN&actor_token_type=urn:ietf:params:oauth:token-type:jwt" \
  -d "resource=mcp-server&audience=my-api"
```

Allows fine-grained delegation without exposing user credentials to the agent.

### Testing

**InMemoryTransport (canonical pattern):**

```typescript
import { test } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

test("get_user tool returns user data", async () => {
  const server = new McpServer({ name: "test-server", version: "1.0" });
  
  // Register tool
  server.tool("get_user", "Get user", { schema: z.object({ user_id: z.string() }) }, async (input) => {
    if (input.user_id === "123") {
      return { content: [{ type: "text", text: JSON.stringify({ id: "123", name: "Alice" }) }] };
    }
    return { isError: true, content: [{ type: "text", text: "Not found" }] };
  });

  // Create linked transport pair
  const { client, server: clientTransport } = InMemoryTransport.createLinkedPair();
  
  // Connect server to transport
  const connection = server.connect(clientTransport);
  
  // Call tool via client
  const result = await client.callTool("get_user", { user_id: "123" });
  
  expect(result.content[0].type).toBe("text");
  expect(result.content[0].text).toContain("Alice");
});

test("delete_user returns error without confirmation", async () => {
  // ... similar setup
  const result = await client.callTool("delete_user", {
    user_id: "123",
    confirm: "no",
  });
  expect(result.isError).toBe(true);
});
```

### Observability

**Trace IDs:**
Attach a trace ID to every request for distributed tracing:

```typescript
const traceId = crypto.randomUUID();
server.setRequestContext({ traceId, clientId: auth.clientId, timestamp: Date.now() });
```

**Rate limiting per client:**
Track and enforce per-client rate limits:

```typescript
const clientQuota = new Map<string, { calls: number; resetAt: number }>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const quota = clientQuota.get(clientId) || { calls: 0, resetAt: now + 60000 };
  
  if (now > quota.resetAt) {
    quota.calls = 0;
    quota.resetAt = now + 60000;
  }
  
  if (quota.calls >= 100) return false; // Reject
  quota.calls++;
  clientQuota.set(clientId, quota);
  return true;
}
```

**OpenTelemetry (optional):**
Instrument with OTEL if available in sdk:

```typescript
import { trace } from "@opentelemetry/api";
const tracer = trace.getTracer("mcp-server");

server.setToolHandler("get_user", async (input) => {
  const span = tracer.startSpan("get_user");
  span.setAttributes({ "tool.name": "get_user", "user_id": input.user_id });
  try {
    const result = await db.users.get(input.user_id);
    span.addEvent("user_retrieved");
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (err) {
    span.recordException(err);
    throw;
  } finally {
    span.end();
  }
});
```

### Deployment patterns

**Local stdio binary (npx / uvx):**
- Distribute as npm package or Python package
- Client invokes as subprocess: `npx my-mcp-server` or `uvx my-mcp-server`
- Server reads stdin, writes stdout
- Example: Anthropic's official MCP server library ships this way

**Remote Streamable HTTP (stateless, scalable):**
- Deploy on Cloudflare Workers, Vercel, Fly, AWS Lambda, GCP Cloud Run
- Expose `POST /mcp` endpoint (or route pattern)
- Use `mcp-handler` library for Workers / Vercel
- Example (Cloudflare Workers):

```typescript
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/mcp") {
      return new Response("Not Found", { status: 404 });
    }
    
    const server = new McpServer({ name: "my-api", version: "1.0" });
    // ... register tools, resources, prompts
    
    const transport = new HttpServerTransport(request);
    await server.connect(transport);
    return transport.response;
  },
};
```

**Discovery:**
- Publish `/.well-known/mcp/server-card.json` for server capabilities and endpoints; keep `.well-known/mcp.json` only as a compatibility pointer when needed
- Publish `/.well-known/agent.json` (if multi-agent; A2A v1.0 RC compatible)
- Register in OpenAI Apps SDK directory, Anthropic MCP Registry, Google Gemini connectors

---

## Cross-vendor integration

**Anthropic:**
- Claude Desktop: reads `.mcp.json` from `~/.claude/` or project root
- Claude Code: native MCP support; servers specified via `.claude/mcpServers` or agent definition
- claude-agent-sdk: `mcpServers` option in `Agent` config

**OpenAI:**
- Responses API: `remote_mcp_tool` resource type (HTTP servers only)
- Agents SDK: `tools.MCP { server: { type: "http", url: "..." } }`
- ChatGPT Desktop: custom connectors directory

**Google:**
- Gemini: managed remote MCP (Google-hosted token exchange)
- Gemini CLI: auto-discovers stdio servers in `PATH` or via `--mcp-server` flag
- Vertex AI Agent Engine: deploy MCP as managed service

---

## Anti-patterns

- **Unstructured blobs:** Returning `{ content: "..." }` with 5KB of prose wastes tokens. Use `toModelOutput` and structured schemas instead.
- **No annotations:** Tools without `readOnlyHint`, `destructiveHint`, etc. force agents to guess at safety. Always annotate.
- **Throwing on error:** Exceptions are noisy and interrupt agent flow. Return `{ isError: true, content: [...] }` so agents can reason about recovery.
- **No pagination:** List tools that return 1000s of items break agent context. Implement cursor-based pagination and default limits.
- **Tool bloat (≥30 tools):** Agents cannot reason over large tool sets. Split into multiple focused servers or use lazy loading.
- **Missing OAuth metadata on HTTP servers:** Public remote MCP servers without `.well-known/oauth-protected-resource` cannot verify client credentials. Always publish auth metadata.
- **No InMemoryTransport tests:** Untested MCP servers fail silently in production. Test every tool with linked transports.

---

## Templates and tooling

**Reference implementations:**
- `/templates/mcp-server-ts-stdio.ts` — stdio server scaffold (local)
- `/templates/mcp-server-ts-http.ts` — Streamable HTTP scaffold (Cloudflare Workers, Vercel)
- `/templates/mcp-client-test.ts` — InMemoryTransport test harness

**Libraries:**
- `@modelcontextprotocol/sdk` — canonical TypeScript/Node.js SDK
- `mcp-handler` — HTTP server utilities for Workers, Vercel, Lambda
- `fastmcp` — Python-first (also JS) with decorator syntax
- `@mastra/mcp` — Mastra ecosystem; agents + MCP together

**Discovery:**
- https://modelcontextprotocol.io/servers (Anthropic MCP registry)
- OpenAI Apps SDK directory (https://openai.com/apps)
- Google Gemini custom connectors (https://ai.google.dev/gemini-api/docs/custom-connectors)

---

## Citations

- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [Anthropic Tool Design Guide](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [OpenAI Agents SDK (JS)](https://openai.github.io/openai-agents-js/)
- [OpenAI Apps SDK MCP](https://developers.openai.com/apps-sdk/concepts/mcp-server)
- [Google Gemini Custom Connectors](https://ai.google.dev/gemini-api/docs/custom-connectors)
- [RFC 8693: Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693)
- [RFC 9449: DPoP](https://www.rfc-editor.org/rfc/rfc9449.html)
- [OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)

---

## See also

- `docs/mcp-servers` — Fumadocs guide to MCP architecture
- `references/tool-design.md` — Tool description + Zod schema guide
- `references/authentication.md` — OAuth 2.1 resource server patterns for remote MCP
- `references/testing.md` — InMemoryTransport patterns and eval strategies
- `templates/mcp-server-ts-stdio.ts` — Local stdio server scaffold
- `templates/mcp-server-ts-http.ts` — Remote HTTP server scaffold
