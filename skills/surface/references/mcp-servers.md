# MCP Servers

Dimension 3: whether the product exposes an MCP server, and how well.

## Score

- **0**: No MCP server: no `.mcp.json`, no imports of `@modelcontextprotocol/*`,
  `mcp-handler`, `@mastra/mcp`, `fastmcp` or Python `mcp`.
- **1**: A server with a few tools, terse descriptions (<20 words), no
  annotations, no resources, and thrown errors instead of `isError` results.
- **2**: Annotations on every tool; descriptions that say when and when not to
  use each; recoverable errors returned with `isError: true`; `outputSchema`
  with `structuredContent` on structured results; resources with MIME types for
  static data; built against revision 2026-07-28.
- **3**: Level 2 plus, for a protected HTTP server, RFC 9728 metadata and full
  token validation; cursor pagination on lists; progress on long operations;
  stdio and Streamable HTTP where both make sense; `InMemoryTransport` tests;
  about 20 tools or fewer per server; prompts or negotiated Tasks for
  workflows; consent gates on high-risk tools; no roots, sampling or logging in
  new designs.

## Evidence to gather

- `.mcp.json`, server entry points, tool, resource and prompt registrations
- Transport: `StdioServerTransport`; `createMcpHandler` (v2) or
  `StreamableHTTPServerTransport` (v1); `SSEServerTransport` is legacy
- Annotations, `outputSchema`/`structuredContent`, `isError` returns
- `/.well-known/oauth-protected-resource` and the token-validation code
- Tests using `InMemoryTransport`, and any run against a deployed URL
- Session IDs, `initialize` handling, roots, sampling or logging: migration
  findings against 2026-07-28

## Revision 2026-07-28 (current)

Every Tier 1 SDK supports it. Audit against it; add 2025-11-25 compatibility
only when a client in scope needs it. Current SDKs as of 2026-10-23: TypeScript
v2 `@modelcontextprotocol/server` and `/client` 2.4.0 (the monolithic
`@modelcontextprotocol/sdk` 1.32.2 is maintained), Python 2.3.0, Go 1.8.0,
C# 2.3.0, Rust rmcp 3.8.0, Ruby 1.8.2.

What changed, and what models still get wrong:

- **No sessions.** `Mcp-Session-Id` is gone. Cross-call state is a
  server-minted handle passed as an ordinary tool argument.
- **No handshake.** `initialize` and `notifications/initialized` are removed.
  Each request carries `io.modelcontextprotocol/protocolVersion` and
  `io.modelcontextprotocol/clientCapabilities` in `_meta`; servers identify
  themselves with `io.modelcontextprotocol/serverInfo` in result `_meta`.
- **`server/discover` is mandatory for servers**, but clients may skip it, so
  no handler may depend on connection state.
- **`subscriptions/listen`** replaces the HTTP GET stream and
  `resources/subscribe`. Request-scoped notifications stay on the request's
  stream. `Last-Event-ID` resumability is gone; a broken stream is a new
  request.
- **Removed:** `ping`, `logging/setLevel`, `notifications/roots/list_changed`.
  Log level is per request via `io.modelcontextprotocol/logLevel`.
- **MRTR.** The server no longer sends `roots/list`, `sampling/createMessage` or
  `elicitation/create` requests. It returns an `InputRequiredResult` and the
  client retries the original request with `inputResponses`. Every result has
  `resultType` (`"complete"` or `"input_required"`); a missing one means
  complete.
- **Headers.** Streamable HTTP POSTs carry `Mcp-Method` and `Mcp-Name`; custom
  headers travel via `x-mcp-header`.
- **Caching.** List and read results carry `ttlMs` and `cacheScope`. Keep
  `tools/list` order deterministic so prompt caches hit.
- **Schemas.** `inputSchema`/`outputSchema` accept any JSON Schema 2020-12
  keyword including `$ref`; `structuredContent` can be any JSON value.
- **Deprecated** (12-month window; not upgrade targets): Roots (use tool
  parameters, resource URIs, server config), Sampling (call a model provider
  directly), Logging (stderr or OpenTelemetry), HTTP+SSE, and OAuth Dynamic
  Client Registration (use Client ID Metadata Documents). Elicitation is not
  deprecated.
- **Extensions:** Tasks (`io.modelcontextprotocol/tasks`: `tasks/get` polling
  and `tasks/update`; `tasks/result` and `tasks/list` are gone), MCP Apps,
  Skills (`io.modelcontextprotocol/skills`, final 2026-09-13) and Server Cards
  (final 2026-10-06; card format still draft). The next spec release targets
  30 March 2027.
- **Error codes.** Resource-not-found moved from `-32002` to `-32602`. Custom
  protocol errors live in `-32000`..`-32019`; `-32020`..`-32099` is reserved
  (HeaderMismatch `-32020`, MissingRequiredClientCapability `-32021`,
  UnsupportedProtocolVersion `-32022`).

Annotations, `outputSchema`/`structuredContent`, cursor pagination and `isError`
carry over unchanged. Migration cost sits in session state, the handshake, and
anything built on roots, sampling or logging.

## Tools

- TypeScript v2 registers with `server.registerTool(name, { description,
inputSchema, outputSchema, annotations }, handler)`. The v1 positional
  `server.tool()` is removed.
- Annotations: `readOnlyHint: true` for reads. Every state change has
  `readOnlyHint: false`; `destructiveHint: true` only where it can destroy or
  overwrite (additive writes are `false`); `idempotentHint` only when a repeat is
  a no-op; `openWorldHint: true` for the web or third-party systems, `false` for
  the server's own data.
- Annotations and descriptions are hints, not authorization. Enforce scopes,
  tenancy and approvals in the handler. Treat descriptions, resources and
  prompts from servers you don't pin as untrusted.
- Return `structuredContent` alongside `outputSchema` on success, plus a short
  text summary.
- About 20 tools per server is a house review threshold, not a protocol limit;
  split servers or use client-side tool search past it.
- Approval or an allowlist for destructive, authenticated, production,
  payment, email-send, file-write, package-install and network-expanding tools.
  Never elicit secrets silently.

## Resources, Skills and Apps

- Resources declare MIME types; serve `application/ld+json` for structured
  semantic data.
- Skills over MCP: declare the extension before serving `skills/list` and
  `skills/get` (files via `resources/read`). Reading a `SKILL.md` doesn't
  activate it; the host decides. Host support is uneven, so keep the skills
  installable another way.
- Ship an MCP App only when removing the UI removes the point (a form, a
  filterable list, a diff to accept). The tool sets `_meta.ui.resourceUri` to a
  `ui://` resource that lists every origin in `_meta.ui.csp` (`connectDomains`,
  `resourceDomains`, `frameDomains`, `baseUriDomains`). Use the standard
  `_meta.ui.*` keys (vendor `openai/*` keys only as compatibility), and still
  return `structuredContent` and a text summary.

## Authentication

stdio servers inherit the OS user; no auth. A protected Streamable HTTP server
publishes RFC 9728 metadata and validates every request: signature, issuer,
audience equal to its own resource URL, expiry, scopes, and DPoP binding only if
it implements RFC 9449. An unauthenticated request gets `401` with
`WWW-Authenticate` naming `resource_metadata`. Check a scope per operation in
each handler, not one per server; a valid token missing the scope gets `403`
with a scope challenge. When a token carries `act`, check `act.sub` against the
actors allowed for that subject; nested `act` claims are history, not
authority. ChatGPT supports only authorization code with PKCE for user data, no
client credentials. See authentication.md for the rest.

In SDK v2, `createMcpHandler(factory)` builds a server per request and takes a
verified identity via `.fetch(request, { authInfo })`. It verifies no tokens and
validates no `Origin` or `Host`: put both in front of it.

## Testing

- `InMemoryTransport.createLinkedPair()` from `@modelcontextprotocol/server`,
  `Client` from `@modelcontextprotocol/client` (v1 imported both from
  `@modelcontextprotocol/sdk`). Take both halves from one import.
- Against the deployed URL, because in-memory tests skip transport, headers,
  CORS and auth: `server/discover` answers; every request works with no prior
  state and an unsupported version is rejected; `Mcp-Method`/`Mcp-Name` match
  the body any gateway routes on; `resultType` is present; an
  `InputRequiredResult` completes on retry; a mismatched `Origin` is rejected;
  local servers bind to `127.0.0.1`.
- The OAuth chain end to end: 401 → protected-resource metadata →
  authorization-server metadata → `resource` on the authorization and token
  requests (RFC 8707) → `iss` checked on the response (RFC 9207) → a token
  minted for another resource rejected. A client that only works with a pasted
  token hasn't tested discovery.
- Negative tests: another user's token, another tenant's ID, a missing scope, a
  disallowed actor.
- Connect at least one real target client (or the MCP Inspector).

## Discovery and registration

A Server Card describes identity, endpoints and auth, never tools, resources or
prompts (clients list those at runtime, and `server/discover` wins on
conflict). Host it at `<streamable-http-url>/server-card`, listed in
`/.well-known/ai-catalog.json` as `application/mcp-server-card+json`. The
extension advises against `/.well-known/mcp/server-card`; keep that and
`/.well-known/mcp.json` only as compatibility copies a target client reads.
Register in the official MCP Registry, the ChatGPT app directory (documented
under OpenAI Plugins) and Gemini Enterprise connectors as relevant.

Client config: Claude Code reads project servers from `.mcp.json` and user ones
from `~/.claude.json` (`claude mcp add`); Gemini CLI uses `mcpServers` in
`settings.json`; the OpenAI Responses API takes
`{ type: "mcp", server_label, server_url }`.

## Templates

- `templates/mcp-and-api/mcp-server-ts-stdio.ts`
- `templates/mcp-and-api/mcp-server-ts-http.ts`
- `templates/mcp-and-api/mcp-client-test.ts`
