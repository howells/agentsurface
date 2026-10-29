# MCP Servers

## Summary

Dimension 3 scores MCP server implementation quality. MCP is the cross-vendor standard for agent-tool transport. Baseline is presence of tools with agent-oriented descriptions and structured error handling (isError: true). Production includes annotations (readOnlyHint, destructiveHint, idempotentHint), outputSchema with structuredContent, resources, OAuth protected-resource metadata for protected HTTP servers, pagination (cursor-based), and testing via InMemoryTransport. Advanced includes multiple transports (stdio + Streamable HTTP), prompts and negotiated Tasks, elicitation (via MRTR) with explicit gates, consent policies, and dynamic tool loading. Roots, sampling and logging are deprecated in 2026-07-28 and are not upgrade targets.

- **0**: No MCP server, no .mcp.json (blocker)
- **1**: Server exists but <5 tools, terse descriptions, no annotations, errors thrown
- **2**: Proper annotations, agent-oriented descriptions, structured errors, outputSchema/structuredContent, resources
- **3**: Production-ready (OAuth, pagination, multiple transports, InMemoryTransport tests, consent gates, <20 tools)
- **Evidence**: @modelcontextprotocol/server or @modelcontextprotocol/sdk imports, .mcp.json, annotations, outputSchema/structuredContent, error handling patterns

---

Model Context Protocol (MCP) is the cross-vendor standard for agent tooling transport. Adopted by Anthropic (Claude Desktop, Claude Code, claude-agent-sdk), OpenAI (Responses API, Agents SDK, ChatGPT Desktop), and Google (Gemini, managed remote MCP), MCP is the lingua franca of AI agent integrations. This reference covers building production-grade MCP servers that agents can discover, consume, and audit.

## Scoring rubric

| Score | Criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Detection                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | No MCP server. No .mcp.json or .mcp/mcp.json. No SDK imports (@modelcontextprotocol/server, @modelcontextprotocol/sdk, mcp-handler, @mastra/mcp).                                                                                                                                                                                                                                                                                                                                                                                                  | grep -r "@modelcontextprotocol/" and grep -r "mcp-handler" both return nothing. No .mcp.json.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 1     | Basic MCP server exists but minimal. Fewer than 5 tools; descriptions are terse (<20 words); no annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint); no resources or prompts; errors thrown rather than structured with `isError: true`.                                                                                                                                                                                                                                                                                    | MCP server file imports sdk but: <5 tools defined; descriptions lack "when to use / when not to use"; no annotations object; no resources; errors not wrapped in `{ isError: true, content: [...] }`.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2     | Well-structured MCP. Tools have proper annotations (readOnlyHint, destructiveHint, idempotentHint). Agent-oriented descriptions explaining when/why to use. Structured error handling with `isError: true`. outputSchema declared on tools returning structured data and results include structuredContent where supported. Resources exposed for static data. Implements the current 2026-07-28 revision (2025-11-25 only as an explicitly required compatibility mode).                                                                          | Tools decorated with `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` as appropriate. Descriptions include "Use when..." and "Do not use for...". Tools return `{ isError: true, content: [...] }` on recoverable errors. outputSchema and structuredContent present on structured tools. Resources with MIME types declared. Server uses the current TypeScript SDK v2 packages (`@modelcontextprotocol/server`, 2.4.0 as of 2026-10-23) or a maintained `@modelcontextprotocol/sdk` 1.x release (1.32.2); Python 2.3.0, Go 1.8.0, C# 2.3.0, Rust rmcp 3.8.0, and Ruby 1.8.2 are the other current Tier 1 SDKs. |
| 3     | Production MCP. OAuth authorization via RFC 9728 `.well-known/oauth-protected-resource` metadata for protected HTTP servers. Pagination on list operations (cursor-based). Progress notifications for long-running operations. Multiple transports (stdio + Streamable HTTP). Tested with InMemoryTransport.createLinkedPair(). Tool count optimized (<20). Prompts or negotiated Tasks for workflow templates. Consent gates for destructive/authenticated/production tools. Deprecated roots, sampling, and logging are absent from new designs. | Auth: `.well-known/oauth-protected-resource` present for protected HTTP servers; bearer token validation and issuer/audience/resource/scope checks; authorization server discovery documented. Pagination: list operations return cursor via the MCP pagination pattern. HTTP transport via Streamable HTTP. Test coverage with InMemoryTransport. Tool count ≤20. Prompts or Tasks registered. Tasks use current extension negotiation with `tasks/get` and `tasks/update`. Consent policy exists for high-risk calls.                                                                                                              |

## Evidence to gather

**Dependency patterns:**

- `@modelcontextprotocol/server` and `@modelcontextprotocol/client` (TypeScript v2, current)
- `@modelcontextprotocol/sdk` (TypeScript v1, maintained monolithic package)
- `mcp-handler` (Cloudflare Workers, Vercel, HTTP servers)
- `@mastra/mcp` (Mastra ecosystem)
- `fastmcp` (Python-first, but has JS)
- `mcp` (Python)

**File patterns:**

- `.mcp.json` or `.mcp/mcp.json` - MCP configuration / server discovery manifest
- Server entry point: `src/server.ts`, `src/mcp-server.ts`, or similar
- Tool definitions: `src/tools/`, `src/handlers/`, or inline
- Resources: `src/resources/` or inline resource handlers
- Tests: `**/*.test.ts` or `**/*.spec.ts` using `InMemoryTransport`
- OAuth: `.well-known/oauth-protected-resource` (HTTP servers only)

**Transport detection:**

- **stdio:** Server instantiated with `StdioServerTransport()` from `@modelcontextprotocol/server/stdio` (v2) or `@modelcontextprotocol/sdk/server/stdio.js` (v1) (local, single connection)
- **Streamable HTTP:** `createMcpHandler` from `@modelcontextprotocol/server` (v2; a per-request factory, stateless, horizontally scalable; Cloudflare Workers, Lambda, Vercel) or `mcp-handler` 2.x. In SDK v1 look for `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`; web-standard runtimes use the `server/webStandardStreamableHttp.js` variant.
- Legacy SSE (deprecated): `SSEServerTransport`

**Tool annotations presence:**

- `readOnlyHint: true` on read-only tools
- `readOnlyHint: false` on every tool that changes state, with `destructiveHint: true` only where the change can destroy or overwrite data (additive writes use `destructiveHint: false`)
- `idempotentHint: true` on idempotent operations
- `openWorldHint: true` on tools that interact with an open external environment (the web, third-party systems), `false` for a closed domain such as the server's own database

**Structured result patterns:**

- `outputSchema` on tools that return machine-consumable data
- `structuredContent` matching the output schema
- concise `content` text for human-readable summaries
- resource links via returned resource content where useful

**Security and consent patterns:**

- protocol version declared and validated
- filesystem and resource scope set by explicit tool parameters, resource URIs and server configuration (roots are deprecated; honour them only for a legacy 2025-11-25 client that sends them)
- sampling and elicitation require explicit client/server policy
- destructive, authenticated, production, browser, sandbox, and network tools require approval or a documented allowlist
- bearer token validation checks issuer, audience/resource, expiry, and scopes

**Test patterns:**

- `InMemoryTransport.createLinkedPair()` - canonical MCP server testing pattern
- `client.callTool()` - invoking tools from test harness
- Assertion on `isError` and `content` fields

---

## Deep dive: Building a production-grade MCP server

### Which revision to build against

Use the current revision by default.

- **2026-07-28** is current and supported by all Tier 1 SDKs. Build and audit against it.
- **2025-11-25** is the predecessor. Add compatibility only when a client in scope still requires it.

Treat session state, the initialization handshake, old server-initiated requests, and experimental core Tasks as legacy behavior to migrate, not current best practice.

### Legacy spec fundamentals (2025-11-25)

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

**Current 2026-07-28 behavior:**

[Source: https://modelcontextprotocol.io/specification/2026-07-28/]

The 2026-07-28 revision is a structural rewrite, not an increment. The headline changes:

- **Sessions removed.** The `Mcp-Session-Id` header is gone from Streamable HTTP and list endpoints no longer vary per connection. Cross-call state moves to explicit server-minted handles passed as ordinary tool arguments.
- **Stateless core.** The `initialize` / `notifications/initialized` handshake is removed. Every request carries the protocol version and client capabilities in `_meta` (`io.modelcontextprotocol/protocolVersion`, `io.modelcontextprotocol/clientCapabilities`); servers identify themselves via `io.modelcontextprotocol/serverInfo` in result `_meta`.
- **`server/discover` is required of servers.** Servers MUST implement it to advertise versions, capabilities, and identity; clients MAY skip calling it, so handlers must still work without connection-scoped initialization state.
- **`subscriptions/listen` replaces the HTTP GET endpoint** and `resources/subscribe`/`unsubscribe`: one long-lived POST-response stream, opt-in per notification type. Request-scoped notifications (progress, message) stay on the originating request's stream. SSE resumability (`Last-Event-ID`) is removed - a broken stream is re-issued as a new request.
- **Removed:** `ping`, `logging/setLevel`, `notifications/roots/list_changed`. Log level is per-request via `io.modelcontextprotocol/logLevel` in `_meta`.
- **Tasks became an official extension** (`io.modelcontextprotocol/tasks`): `tasks/get` polling plus `tasks/update` replace the blocking `tasks/result`; `tasks/list` is removed.
- **MRTR (Multi Round-Trip Requests)** replaces server-initiated dispatch of `roots/list`, `sampling/createMessage`, and `elicitation/create` (elicitation itself is not deprecated; Roots, Sampling, and Logging are). The server returns an `InputRequiredResult` and the client retries the original request with `inputResponses`. Every result now carries a required `resultType` (`"complete"` or `"input_required"`); results from older servers without it are treated as `"complete"`.
- **New required headers** on Streamable HTTP POST: `Mcp-Method` and `Mcp-Name`. Custom headers travel via `x-mcp-header`.
- **Cacheability is explicit:** list and read results carry `ttlMs` and `cacheScope` (`"public"` / `"private"`). `tools/list` ordering SHOULD be deterministic so prompt caches hit.
- **Schemas loosened:** tool `inputSchema` / `outputSchema` accept any JSON Schema 2020-12 keywords including `$ref`, and `structuredContent` can be any JSON value.
- **Deprecated (minimum 12-month window; do not adopt in new servers):** Roots, Sampling, and Logging - migrate to tool parameters / resource URIs / server config, a direct LLM provider API, and stderr or OpenTelemetry respectively. HTTP+SSE transport is formally Deprecated under the new lifecycle policy (it has been deprecated in practice since 2025-03-26). OAuth Dynamic Client Registration (RFC 7591) is deprecated in favour of Client ID Metadata Documents.
- **Official extensions** now include Tasks, MCP Apps, Skills over MCP (`io.modelcontextprotocol/skills`, SEP-2640, Final 2026-09-13) and Server Cards (`io.modelcontextprotocol/server-card`, SEP-2127, Final 2026-10-06; card details still draft). The next spec release moved from December 2026 to a 30 March 2027 target (SEP-3398).

Practical reading: annotations, `outputSchema`/`structuredContent`, cursor pagination, and structured `isError` results all survive intact, so a well-built 2025-11-25 server carries forward. The migration cost sits in session state, the handshake, and anything built on roots, sampling, or logging.

**Transports:**

- **stdio:** Local server. Single client connection. No authentication needed (trust is delegated to OS). Lowest latency.
- **Streamable HTTP:** Remote server over HTTPS. Protected HTTP servers should follow the MCP authorization specification and publish OAuth protected-resource metadata.
- **Legacy SSE (deprecated):** Do not use for new servers.

### Tool design for MCP

**Annotations:**
All tools should include a `tool.annotations` object with hints for agent reasoning:

```typescript
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod"; // Zod 4

const server = new McpServer({ name: "my-api", version: "1.0.0" });

// Example: read-only tool
server.registerTool(
  "get_user",
  {
    description:
      "Retrieve user details by ID. Use when you need to look up a user's name, email, or profile info. Do not use for authentication.",
    inputSchema: z.object({
      user_id: z.string().describe("The unique user identifier (UUID format)"),
    }),
    annotations: {
      readOnlyHint: true, // This tool does not modify state
    },
  },
  async (input) => {
    const user = await db.users.get(input.user_id);
    if (!user) {
      return {
        isError: true,
        content: [{ type: "text", text: `User not found: ${input.user_id}` }],
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(user) }] };
  },
);

// Example: destructive tool with idempotency
server.registerTool(
  "delete_user",
  {
    description:
      "Permanently delete a user account and all associated data. Use only when the user explicitly requests deletion. Do not use for temporary deactivation.",
    inputSchema: z.object({
      user_id: z.string().describe("User ID to delete"),
      confirm: z.enum(["yes", "no"]).describe("Confirmation: must be 'yes'"),
    }),
    annotations: {
      readOnlyHint: false, // destructiveHint and idempotentHint only apply to non-read-only tools
      destructiveHint: true, // This operation makes destructive updates
      idempotentHint: true, // Safe to call multiple times (second call is no-op)
    },
  },
  async (input) => {
    if (input.confirm !== "yes") {
      return { isError: true, content: [{ type: "text", text: "Deletion not confirmed" }] };
    }
    await db.users.delete(input.user_id);
    return { content: [{ type: "text", text: `User ${input.user_id} deleted successfully` }] };
  },
);

// Example: open-world tool with structured output
server.registerTool(
  "search_docs",
  {
    description:
      "Search documentation by keyword. Use when you need to find relevant docs. Accepts any search term.",
    inputSchema: z.object({
      query: z.string().describe("Search term (any string)"),
      limit: z.number().int().min(1).max(50).default(10).describe("Max results"),
    }),
    outputSchema: z.object({
      results: z.array(z.object({ title: z.string(), url: z.string() })),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true, // Interacts with systems outside this server
    },
  },
  async (input) => {
    const results = (await search(input.query, input.limit)).map((r) => ({
      title: r.title,
      url: r.url,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(results) }],
      // Required alongside outputSchema on successful results
      structuredContent: { results },
    };
  },
);
```

In SDK v1 the positional `server.tool(name, description, rawShape, annotations, callback)` form took these arguments; it is deprecated there and removed in v2.

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
- Where a client still supplies roots (Roots is Deprecated in `2026-07-28`), honor them as capability boundaries and reject filesystem/resource access outside them; prefer explicit tool parameters, resource URIs, or server configuration for new designs.
- Gate elicitation (and sampling, which is Deprecated). Servers should not silently ask the client model or user for secrets, credentials, or sensitive data.
- Validate remote bearer tokens on every protected request: signature, issuer, audience/resource, expiry, not-before, scopes, and token binding where DPoP is required.
- Log tool name, inputs after redaction, user/tenant context, approval decision, trace ID, and result status.

### Resources

Expose static data, configuration, or live subscriptions:

```typescript
// Example: static resource
server.registerResource(
  "api-docs",
  "config://api-docs",
  { title: "API Documentation - Overview", mimeType: "text/markdown" },
  async (uri) => {
    const docs = await fs.readFile("docs/api.md", "utf-8");
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: docs }] };
  },
);

// Example: JSON-LD structured resource
server.registerResource(
  "user-types",
  "schema://user-types",
  { title: "Schema.org User Type Definition", mimeType: "application/ld+json" },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/ld+json",
        text: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "DataType",
          name: "User",
          properties: [
            { name: "id", propertyType: "Text" },
            { name: "email", propertyType: "Text" },
          ],
        }),
      },
    ],
  }),
);
```

A server can also publish Agent Skills as resources through the Skills extension (`io.modelcontextprotocol/skills`: `skills/list` and `skills/get`, files via `resources/read`). Reading `SKILL.md` does not activate a skill; the host decides.

**Declare MIME types**. Serve `application/ld+json` for semantic data. Agents can then reason over structure.

### Prompts

Re-usable workflow templates:

```typescript
// Example: parameterized prompt
server.registerPrompt(
  "analyze_code",
  {
    description:
      "Analyze a code snippet for security issues. Use when you need to review untrusted or legacy code.",
    argsSchema: z.object({
      code: z.string().describe("The code snippet to analyze"),
      language: z.string().describe("Programming language (e.g., javascript, python, rust)"),
    }),
  },
  async (args) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Review this ${args.language} code for security issues:\n\n${args.code}`,
        },
      },
    ],
  }),
);
```

Prompts allow clients (Claude, ChatGPT, Gemini) to invoke pre-canned workflows without hard-coding the request structure.

### Authentication

**For local stdio servers:**
No explicit authentication. Trust is delegated to the host OS. Stdio servers run as the calling user's process.

**For remote Streamable HTTP servers:**
Implement OAuth 2.1 resource server pattern. Clients (agents) authenticate using `Bearer <access_token>` header.

```typescript
// Serve protected-resource metadata (HTTP servers only)
app.get("/.well-known/oauth-protected-resource", (req, res) => {
  // RFC 9728 protected-resource metadata; the authorization server publishes its own
  // RFC 8414 / OIDC metadata (often on another host).
  res.json({
    resource: "https://mcp.example.com",
    authorization_servers: ["https://auth.example.com"],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:tools:read", "mcp:resources:read"],
  });
});

// Validate the access token on every request (a sketch: wire the error to a 401 with
// WWW-Authenticate pointing at the metadata above, and enforce scopes per tool).
import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(new URL("https://auth.example.com/.well-known/jwks.json"));

async function validateToken(authHeader: string | undefined) {
  const match = /^Bearer (\S+)$/i.exec(authHeader ?? "");
  if (!match) throw new UnauthorizedError("missing or non-Bearer credentials");
  const { payload } = await jwtVerify(match[1], jwks, {
    issuer: "https://auth.example.com",
    audience: "https://mcp.example.com", // the resource advertised in the metadata above
    algorithms: ["RS256"],
    requiredClaims: ["exp"],
  });
  return {
    subject: payload.sub, // who the token is about (a user or a service), not necessarily the client
    clientId: typeof payload.client_id === "string" ? payload.client_id : undefined, // RFC 9068 profile
    scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
  };
}

// Apply to HTTP stream handler
app.post("/mcp", express.json(), async (req, res) => {
  const auth = await validateToken(req.headers.authorization);
  // Each tool handler checks auth.scopes for the operation it performs.
  // SDK v2: pass the verified identity through with
  // createMcpHandler(factory).fetch(request, { authInfo }); the handler does not verify tokens itself.
  // (SDK v1 equivalent: a per-request StreamableHTTPServerTransport with sessionIdGenerator: undefined.)
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
  -d "resource=https://mcp.example.com"
```

Allows fine-grained delegation without exposing user credentials to the agent.

### Testing

**InMemoryTransport (canonical pattern):**

```typescript
import { test, expect } from "vitest";
import { McpServer, InMemoryTransport } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/client";
import { z } from "zod";

async function connect(server: McpServer) {
  // Take both halves from the same package's import
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

test("get_user tool returns user data", async () => {
  const server = new McpServer({ name: "test-server", version: "1.0.0" });

  server.registerTool(
    "get_user",
    { description: "Get user", inputSchema: z.object({ user_id: z.string() }) },
    async (input) => {
      if (input.user_id === "123") {
        return { content: [{ type: "text", text: JSON.stringify({ id: "123", name: "Alice" }) }] };
      }
      return { isError: true, content: [{ type: "text", text: "Not found" }] };
    },
  );

  const client = await connect(server);
  const result = await client.callTool({ name: "get_user", arguments: { user_id: "123" } });

  const [first] = result.content as Array<{ type: string; text: string }>;
  expect(first.type).toBe("text");
  expect(first.text).toContain("Alice");
});

test("delete_user returns error without confirmation", async () => {
  // ... similar setup
  const result = await client.callTool({
    name: "delete_user",
    arguments: { user_id: "123", confirm: "no" },
  });
  expect(result.isError).toBe(true);
});
```

Also add a conformance test that the server answers `server/discover`: servers must implement it even though clients may skip it.

### Observability

**Trace IDs:**
Attach a trace ID to every request for distributed tracing:

```typescript
// Illustrative: generate (or read from W3C Trace Context in the request `_meta`) a trace ID
// and put it on your own logger or span for each tool call.
const traceId = crypto.randomUUID();
logger.info({ traceId, clientId: auth.clientId, tool: "get_user" });
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
Instrument with OpenTelemetry (the `2026-07-28` revision carries W3C Trace Context in `_meta`):

```typescript
import { trace } from "@opentelemetry/api";
const tracer = trace.getTracer("mcp-server");

// Wrap the handler you pass to registerTool
async function getUserHandler(input: { user_id: string }) {
  const span = tracer.startSpan("get_user");
  span.setAttributes({ "tool.name": "get_user", user_id: input.user_id });
  try {
    const result = await db.users.get(input.user_id);
    span.addEvent("user_retrieved");
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  } catch (err) {
    span.recordException(err as Error);
    throw err;
  } finally {
    span.end();
  }
}
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
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";

// The factory runs for each request, so build the server inside it.
const handler = createMcpHandler(() => {
  const server = new McpServer({ name: "my-api", version: "1.0.0" });
  // ... register tools, resources, prompts
  return server;
});

export default {
  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname !== "/mcp") {
      return new Response("Not Found", { status: 404 });
    }
    // The handler does no Origin/Host validation and no token verification:
    // add both in front of it for any real deployment.
    return handler.fetch(request);
  },
};
```

**Discovery:**

- Server Cards (SEP-2127, Final 2026-10-06; card format still draft in the extension repository) are optional: the extension recommends hosting a card at `<streamable-http-url>/server-card` and listing it in `/.well-known/ai-catalog.json`, and advises against `/.well-known/mcp/server-card`. Keep `/.well-known/mcp/server-card.json` and `.well-known/mcp.json` only as compatibility copies or pointers when a client you target still reads them
- Publish `/.well-known/agent-card.json` (if multi-agent; A2A v1.0.1 compatible)
- Register in the ChatGPT app directory (OpenAI documents this under Plugins; the old Apps SDK URLs redirect), the official MCP Registry, and Google Gemini connectors

---

## Cross-vendor integration

**Anthropic:**

- Claude Desktop: servers configured in `claude_desktop_config.json` (or installed as extensions)
- Claude Code: project servers in `.mcp.json` at the repo root, user and local servers in `~/.claude.json`; add them with `claude mcp add`
- Claude Agent SDK: `query({ prompt, options: { mcpServers, allowedTools } })`

**OpenAI:**

- Responses API: a tool entry `{ type: "mcp", server_label, server_url }`, with optional `authorization` (remote HTTP servers only)
- Agents SDK (JS): `new MCPServerStreamableHttp({ url })` passed in the agent's `mcpServers`, or `hostedMcpTool(...)` for hosted invocation
- ChatGPT Desktop: custom connectors directory

**Google:**

- Gemini Enterprise: custom MCP server connectors, with the authorization modes that product documents
- Gemini CLI: servers configured under `mcpServers` in `settings.json`, or added with `gemini mcp add`
- Vertex AI Agent Engine: deploy MCP as managed service

---

## Anti-patterns

- **Unstructured blobs:** Returning `{ content: "..." }` with 5KB of prose wastes tokens. Return lean text plus `structuredContent` with an `outputSchema` instead.
- **No annotations:** Tools without `readOnlyHint`, `destructiveHint`, etc. force agents to guess at safety. Always annotate.
- **Throwing on error:** Exceptions are noisy and interrupt agent flow. Return `{ isError: true, content: [...] }` so agents can reason about recovery.
- **No pagination:** List tools that return 1000s of items break agent context. Implement cursor-based pagination and default limits.
- **Tool bloat (>20 tools):** Selection accuracy and context cost get worse as the active tool set grows. Treat about 20 tools in one agent context as a house review threshold (not a protocol limit), test representative tasks, and keep the set smaller where you can. Split into multiple focused servers or use lazy loading.
- **Missing OAuth metadata on protected HTTP servers:** Without `.well-known/oauth-protected-resource`, clients cannot discover which authorization server issues tokens for the server. Metadata enables discovery; the server still validates every access token itself. Public read-only servers may need no authorization at all.
- **No InMemoryTransport tests:** Untested MCP servers fail silently in production. Test every tool with linked transports.

---

## Templates and tooling

**Reference implementations:**

- `/templates/mcp-and-api/mcp-server-ts-stdio.ts` - stdio server scaffold (local)
- `/templates/mcp-and-api/mcp-server-ts-http.ts` - Streamable HTTP scaffold (Cloudflare Workers, Vercel)
- `/templates/mcp-and-api/mcp-client-test.ts` - InMemoryTransport test harness

**Libraries:**

- `@modelcontextprotocol/server` / `@modelcontextprotocol/client` - current TypeScript SDK (v2; the monolithic `@modelcontextprotocol/sdk` 1.x is maintained for compatibility)
- `mcp-handler` - Vercel/Next.js adapter (2.x needs the v2 server package and serves per-request handlers)
- `fastmcp` - Python-first (also JS) with decorator syntax; `FastMCP.from_openapi()` generates a server from a spec
- `@mastra/mcp` - Mastra ecosystem; agents + MCP together

**Discovery:**

- https://registry.modelcontextprotocol.io/ (official MCP Registry)
- ChatGPT app directory (https://openai.com/apps; OpenAI documents the SDK under Plugins)
- Google Gemini Enterprise custom MCP servers (https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server)

---

## Citations

- [MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/) - current revision
- [MCP 2026-07-28 release](https://blog.modelcontextprotocol.io/posts/2026-07-28/) - migration summary and Tier 1 SDK status
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) - predecessor compatibility reference
- [Anthropic Tool Design Guide](https://www.anthropic.com/research/writing-tools-for-agents)
- [OpenAI Agents SDK (JS)](https://openai.github.io/openai-agents-js/)
- [OpenAI Plugins: MCP server](https://developers.openai.com/plugins/concepts/mcp-server) (formerly the Apps SDK)
- [Google Gemini Enterprise custom MCP servers](https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server)
- [RFC 8693: Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693)
- [RFC 9449: DPoP](https://www.rfc-editor.org/rfc/rfc9449.html)
- [OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)

---

## See also

- `docs/mcp-servers` - Fumadocs guide to MCP architecture
- `references/tool-design.md` - Tool description + Zod schema guide
- `references/authentication.md` - OAuth 2.1 resource server patterns for remote MCP
- `references/testing.md` - InMemoryTransport patterns and eval strategies
- `templates/mcp-and-api/mcp-server-ts-stdio.ts` - Local stdio server scaffold
- `templates/mcp-and-api/mcp-server-ts-http.ts` - Remote HTTP server scaffold
