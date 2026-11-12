/**
 * MCP Server (Streamable HTTP) - Remote, stateless, horizontally scalable
 *
 * Canonical spec: https://modelcontextprotocol.io/specification/2026-07-28
 * Transport: Streamable HTTP only - HTTP+SSE is Deprecated as of this revision
 * Shape: a web-standard `fetch(request)` handler, so it runs unchanged on
 *   Cloudflare Workers, Deno, Bun and Hono (`c.req.raw`). On Express, Fastify or
 *   plain `node:http`, wrap the handler with the adapter from
 *   `@modelcontextprotocol/node`.
 * Authentication: OAuth 2.1 Bearer token; the JWT is verified against the
 *   authorization server's JWKS with issuer, audience, expiry and scope checks.
 *   Prefer Client ID Metadata Documents over Dynamic Client Registration for new clients.
 * SDK: `@modelcontextprotocol/server` (v2, implements the 2026-07-28 spec).
 *   v2 replaced the monolithic `@modelcontextprotocol/sdk` package with the
 *   separate `@modelcontextprotocol/server` and `@modelcontextprotocol/client` packages.
 *
 * Install: pnpm add @modelcontextprotocol/server jose zod
 *
 * 2026-07-28 removed protocol-level sessions entirely: no `Mcp-Session-Id`
 * header, no `initialize`/`notifications/initialized` handshake. Every
 * request carries its own protocol version and capabilities in `_meta`
 * (`io.modelcontextprotocol/protocolVersion`, `io.modelcontextprotocol/clientCapabilities`).
 * Servers must implement `server/discover` (the SDK answers it) so clients can
 * probe supported versions and capabilities; clients may skip it. Anything
 * that needs to persist across calls - the old use for a session id - must
 * be an explicit, server-minted handle passed as a normal tool argument, not
 * a transport-level concept.
 *
 * When to use:
 * - Multi-client scenarios (many agents calling simultaneously)
 * - Remote deployment (Cloudflare Workers, Vercel, AWS Lambda, Cloud Run)
 * - Horizontally scalable services
 * - Public APIs exposed to multiple agent consumers
 *
 * When NOT to use:
 * - Local development → use stdio instead
 * - Single-connection trusted environments → use stdio instead
 *
 * Customization checklist:
 * ✓ Update server name and version
 * ✓ Set MCP_SERVER_URL, OAUTH_ISSUER, OAUTH_JWKS_URL and ALLOWED_HOSTNAMES
 * ✓ Add/remove tools, and give each one the scopes it needs
 * ✓ Replace the in-memory rate limiter with a shared store before running more
 *   than one instance
 * ✓ Set ALLOWED_ORIGIN_HOSTNAMES if browser-based clients will connect; those
 *   origins get CORS headers and preflight answers, every other origin is refused
 * ✓ Test with the MCP client library
 */

import {
  McpServer,
  OAuthError,
  OAuthErrorCode,
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  hostHeaderValidationResponse,
  originValidationResponse,
  requireBearerAuth,
  requireScopes,
} from "@modelcontextprotocol/server";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

// ===== Configuration =====

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

// This server's public URL, e.g. https://api.example.com/mcp. It is the resource
// identifier (RFC 8707 / RFC 9728) and the audience every token must carry.
const SERVER_URL = new URL(requireEnv("MCP_SERVER_URL"));
const OAUTH_ISSUER = requireEnv("OAUTH_ISSUER");
const jwks = createRemoteJWKSet(new URL(requireEnv("OAUTH_JWKS_URL")));
// Hostnames this server answers to (no scheme, no port): DNS-rebinding protection.
const ALLOWED_HOSTNAMES = requireEnv("ALLOWED_HOSTNAMES").split(",");
// Hostnames of browser origins allowed to call the server; they also get CORS
// headers. Requests with no Origin header (every non-browser client) pass; with
// none listed here, every browser origin is refused.
const ALLOWED_ORIGIN_HOSTNAMES = (process.env.ALLOWED_ORIGIN_HOSTNAMES ?? "")
  .split(",")
  .filter(Boolean);

// RFC 9728 puts the metadata for a resource with a path at
// /.well-known/oauth-protected-resource/<path>.
const RESOURCE_METADATA_URL = getOAuthProtectedResourceMetadataUrl(SERVER_URL);
const RESOURCE_METADATA_PATH = new URL(RESOURCE_METADATA_URL).pathname;

// Same scope vocabulary as templates/errors-and-auth/well-known-oauth-protected-resource.ts
const SCOPE_READ = "agent:read";
const SCOPE_WRITE = "agent:write";

const RATE_LIMIT = 100; // requests per client per window
const RATE_WINDOW_SECONDS = 60;

// ===== Structured Logging =====

function log(level: "INFO" | "ERROR", message: string, data?: Record<string, unknown>): void {
  console[level === "ERROR" ? "error" : "log"](
    JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...data }),
  );
}

// ===== Token Verification =====

const verifier: OAuthTokenVerifier = {
  async verifyAccessToken(token) {
    let payload;
    try {
      // Checks the signature against the authorization server's JWKS, the
      // algorithm allowlist, the trusted issuer, this server as audience, and expiry.
      ({ payload } = await jwtVerify(token, jwks, {
        algorithms: ["RS256", "ES256"],
        audience: SERVER_URL.href,
        issuer: OAUTH_ISSUER,
        requiredClaims: ["exp"],
      }));
    } catch (error) {
      // The reason stays in the log; the client only learns the token was refused.
      log("ERROR", "mcp_jwt_verify_failed", { error: String(error) });
      throw new OAuthError(OAuthErrorCode.InvalidToken, "The access token is invalid or expired");
    }

    // RFC 9068 access tokens name the client in `client_id`; `sub` is the user
    // for delegated tokens, so it must not stand in for the client.
    const clientId = payload.client_id ?? payload.azp;
    if (typeof clientId !== "string") {
      throw new OAuthError(OAuthErrorCode.InvalidToken, "The access token names no client");
    }

    return {
      clientId,
      expiresAt: payload.exp,
      resource: SERVER_URL,
      scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
      token,
    };
  },
};

// Answers 401 (missing or invalid token) and 403 (missing scope) itself, each
// with a WWW-Authenticate challenge that carries resource_metadata, so a
// client's first unauthenticated request discovers the authorization server.
const authenticate = requireBearerAuth({
  expectedResource: SERVER_URL,
  requiredScopes: [SCOPE_READ],
  resourceMetadataUrl: RESOURCE_METADATA_URL,
  verifier,
});

// ===== Rate Limiting =====

/**
 * Fixed-window counter held in this process. It is not shared between
 * instances: behind a load balancer each instance allows the full quota, so
 * move the counters to a shared store (Redis) before scaling out.
 */
class RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  /** Count one request; returns what is left and when the window resets. */
  take(clientId: string, now = Date.now()): { remaining: number; resetSeconds: number } {
    let bucket = this.buckets.get(clientId);
    if (!bucket || now >= bucket.resetAt) {
      this.evictExpired(now);
      bucket = { count: 0, resetAt: now + RATE_WINDOW_SECONDS * 1000 };
      this.buckets.set(clientId, bucket);
    }
    bucket.count++;
    return {
      remaining: RATE_LIMIT - bucket.count,
      resetSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  /** Runs once per new window per client, so the map cannot grow without bound. */
  private evictExpired(now: number): void {
    for (const [clientId, bucket] of this.buckets) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(clientId);
      }
    }
  }
}

const limiter = new RateLimiter();

// ===== Input Schemas (Zod) =====

const searchDocsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  query: z.string().min(1),
});

const createIssueSchema = z.object({
  assignee: z.string().optional(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  title: z.string().min(1),
});

// ===== MCP Server Setup =====

function setupMcpServer(): McpServer {
  const server = new McpServer({
    name: "example-agent-api",
    version: "1.0.0",
  });

  // search_docs tool
  server.registerTool(
    "search_docs",
    {
      description:
        "Search documentation by keyword. Use when you need to find relevant docs or API references.",
      inputSchema: searchDocsSchema,
      annotations: { openWorldHint: true, readOnlyHint: true },
      scopeChallenge: requireScopes(SCOPE_READ),
    },
    async (input) => {
      log("INFO", "tool:search_docs", { query: input.query });
      const results = [{ title: "Getting Started", url: "https://example.com/docs/start" }].slice(
        0,
        input.limit,
      );
      return {
        content: [{ text: JSON.stringify(results), type: "text" as const }],
      };
    },
  );

  // create_issue tool
  server.registerTool(
    "create_issue",
    {
      description:
        "Create a new issue in the project tracker. Use when reporting bugs or requesting features.",
      inputSchema: createIssueSchema,
      // A write that only adds: it deletes and overwrites nothing, so it is not
      // destructive. Each call creates a new issue, so it is not idempotent
      // either; only advertise idempotentHint: true if the handler deduplicates.
      annotations: { destructiveHint: false, idempotentHint: false, readOnlyHint: false },
      // A token that can only read must not be able to write.
      scopeChallenge: requireScopes(SCOPE_READ, SCOPE_WRITE),
    },
    async (input) => {
      log("INFO", "tool:create_issue", { title: input.title });
      const issueId = `ISSUE-${crypto.randomUUID()}`;
      return {
        content: [
          {
            text: JSON.stringify({
              id: issueId,
              title: input.title,
              priority: input.priority,
              created_at: new Date().toISOString(),
            }),
            type: "text" as const,
          },
        ],
      };
    },
  );

  // config resource
  server.registerResource(
    "api-docs",
    "config://api-docs",
    {
      description: "API Documentation",
      mimeType: "text/markdown",
      scopeChallenge: requireScopes(SCOPE_READ),
    },
    async () => ({
      contents: [
        {
          mimeType: "text/markdown",
          text: "# API Documentation\n\nRemote MCP server. See https://modelcontextprotocol.io/specification/2026-07-28",
          uri: "config://api-docs",
        },
      ],
    }),
  );

  return server;
}

// `createMcpHandler` builds a fresh McpServer for each request, so nothing is
// shared between calls. It does no token verification and no Host or Origin
// validation of its own; `handleRequest` below does both in front of it.
const mcp = createMcpHandler(setupMcpServer, {
  onerror: (error) => {
    log("ERROR", "mcp_handler_error", { error: error.message, stack: error.stack });
  },
});

// ===== HTTP Handler =====

// <CUSTOMISE>: base of the problem `type` URIs, the same one your HTTP API uses
const ERROR_TYPE_BASE = "https://api.example.com/errors";

function problem(
  status: number,
  // Slug of the stable `type` URI clients branch on
  kind: string,
  title: string,
  detail: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Response {
  return Response.json(
    { detail, status, title, type: `${ERROR_TYPE_BASE}/${kind}`, ...extra },
    { headers: { "Content-Type": "application/problem+json", ...headers }, status },
  );
}

export async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (pathname === "/health") {
    return Response.json({ status: "ok" });
  }

  // OAuth Protected Resource Metadata (RFC 9728). `resource` is the required
  // field: this document only points at the authorization server(s); it does
  // not carry that server's own metadata.
  if (pathname === RESOURCE_METADATA_PATH) {
    return Response.json(
      {
        resource: SERVER_URL.href,
        authorization_servers: [OAUTH_ISSUER],
        scopes_supported: [SCOPE_READ, SCOPE_WRITE],
        bearer_methods_supported: ["header"],
      },
      { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } },
    );
  }

  if (pathname !== SERVER_URL.pathname) {
    return problem(404, "not-found", "Resource not found", `Nothing is served at ${pathname}.`, {
      is_retriable: false,
    });
  }

  const rejected =
    hostHeaderValidationResponse(request, ALLOWED_HOSTNAMES) ??
    originValidationResponse(request, ALLOWED_ORIGIN_HOSTNAMES);
  if (rejected) {
    return rejected;
  }

  const origin = request.headers.get("Origin");
  if (!origin) {
    return handleMcpRequest(request);
  }

  // A browser on an allowed origin. The preflight carries no token, so it is
  // answered before authentication; every other response, the 401 challenge
  // included, must be readable by the page.
  const response =
    request.method === "OPTIONS"
      ? new Response(null, {
          headers: {
            "Access-Control-Allow-Headers":
              request.headers.get("Access-Control-Request-Headers") ?? "",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Max-Age": "600",
          },
          status: 204,
        })
      : await handleMcpRequest(request);
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Expose-Headers",
    "WWW-Authenticate, RateLimit, RateLimit-Policy, Retry-After",
  );
  response.headers.append("Vary", "Origin");
  return response;
}

async function handleMcpRequest(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) {
    return auth;
  }

  // Keyed by the authenticated client, never by a session - there is no session.
  const { remaining, resetSeconds } = limiter.take(auth.clientId);
  const rateLimitHeaders = {
    RateLimit: `"default";r=${Math.max(0, remaining)};t=${resetSeconds}`,
    "RateLimit-Policy": `"default";q=${RATE_LIMIT};w=${RATE_WINDOW_SECONDS}`,
  };
  if (remaining < 0) {
    log("ERROR", "mcp_rate_limit_exceeded", { clientId: auth.clientId });
    return problem(
      429,
      "rate-limit-exceeded",
      "Rate limit exceeded",
      `Rate limit of ${RATE_LIMIT} requests per ${RATE_WINDOW_SECONDS} seconds exceeded.`,
      {
        is_retriable: true,
        retry_after_ms: resetSeconds * 1000,
        suggestions: [`Wait ${resetSeconds} seconds, then retry the same request.`],
      },
      { ...rateLimitHeaders, "Retry-After": String(resetSeconds) },
    );
  }

  // The verified token info reaches tool handlers as `ctx.http.authInfo`, and
  // each tool's `scopeChallenge` is checked against it.
  const response = await mcp.fetch(request, { authInfo: auth });
  for (const [name, value] of Object.entries(rateLimitHeaders)) {
    response.headers.set(name, value);
  }
  return response;
}

// Workers, Bun and Deno serve this default export directly.
export default { fetch: handleRequest };
