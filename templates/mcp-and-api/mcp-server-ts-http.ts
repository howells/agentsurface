/**
 * MCP Server (Streamable HTTP) - Remote, stateless, horizontally scalable
 *
 * Canonical spec: https://modelcontextprotocol.io/specification/2026-07-28
 * Transport: Streamable HTTP only - HTTP+SSE is Deprecated as of this revision
 * Framework: Fastify (minimal HTTP server)
 * Authentication: OAuth 2.1 Bearer token; the JWT is verified against the
 *   authorization server's JWKS with issuer, audience and scope checks. Prefer
 *   Client ID Metadata Documents over Dynamic Client Registration for new clients.
 * SDK: `@modelcontextprotocol/server` (v2, implements the 2026-07-28 spec).
 *   v2 replaced the monolithic `@modelcontextprotocol/sdk` package with the
 *   separate `@modelcontextprotocol/server` and `@modelcontextprotocol/client` packages.
 *   `createMcpHandler` is the web-standard serving entry; `toNodeHandler` from
 *   `@modelcontextprotocol/node` adapts it to Fastify's Node request/response.
 *
 * Install: pnpm add @modelcontextprotocol/server @modelcontextprotocol/node \
 *   fastify @fastify/cors jose zod
 *
 * 2026-07-28 removed protocol-level sessions entirely: no `Mcp-Session-Id`
 * header, no `initialize`/`notifications/initialized` handshake. Every
 * request carries its own protocol version and capabilities in `_meta`
 * (`io.modelcontextprotocol/protocolVersion`, `io.modelcontextprotocol/clientCapabilities`).
 * Servers must implement `server/discover` (the SDK answers it) so clients can
 * probe supported versions and capabilities; clients may skip it. Anything
 * that needs to persist across calls - the old use for a session id - must
 * be an explicit, server-minted handle passed as a normal tool argument, not
 * a transport-level concept. The identifier this handler generates per
 * request is a correlation id for logs and rate-limit buckets only; it never
 * appears in a response header or gets treated as session state.
 *
 * When to use:
 * - Multi-client scenarios (many agents calling simultaneously)
 * - Remote deployment (Cloudflare Workers, Vercel, AWS Lambda, Cloud Run)
 * - Horizontally scalable services
 * - Public APIs exposed to multiple agent consumers
 * - Rate limiting and per-client quota enforcement
 *
 * When NOT to use:
 * - Local development → use stdio instead
 * - Single-connection trusted environments → use stdio instead
 * - Serverless with hard timeout <30s → reconsider async design
 *
 * Customization checklist:
 * ✓ Update server name and version
 * ✓ Update OAuth issuer and audience URIs
 * ✓ Point OAUTH_JWKS_URL at your authorization server's JWKS
 * ✓ Add/remove tools
 * ✓ Configure rate limits (requests per minute per client)
 * ✓ Configure ALLOWED_ORIGINS (CORS and Origin check) and ALLOWED_HOSTNAMES (Host check)
 * ✓ Test with MCP client library
 */

import Fastify from "fastify";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyCors from "@fastify/cors";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { hostHeaderValidation, originValidation, toNodeHandler } from "@modelcontextprotocol/node";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { IncomingMessage } from "node:http";
import { z } from "zod";

// ===== Configuration =====

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
const API_URL = process.env.API_URL || "https://api.example.com";
const OAUTH_ISSUER = process.env.OAUTH_ISSUER || "https://auth.example.com";
// The audience is this MCP server's canonical resource URL (RFC 8707 / RFC 9728).
const OAUTH_AUDIENCE = process.env.OAUTH_AUDIENCE || `${API_URL}/mcp`;
const OAUTH_JWKS_URL = process.env.OAUTH_JWKS_URL || `${OAUTH_ISSUER}/.well-known/jwks.json`;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",");
const ALLOWED_HOSTNAMES = (process.env.ALLOWED_HOSTNAMES || "localhost,127.0.0.1").split(",");

const jwks = createRemoteJWKSet(new URL(OAUTH_JWKS_URL));
const validateHost = hostHeaderValidation(ALLOWED_HOSTNAMES);
const validateOrigin = originValidation(ALLOWED_ORIGINS.map((origin) => new URL(origin).hostname));

// ===== Structured Logging =====

class Logger {
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: Record<string, unknown>): void {
    console.log(
      JSON.stringify({
        context: this.context,
        level: "INFO",
        message,
        timestamp: new Date().toISOString(),
        ...(data && { data }),
      }),
    );
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    console.error(
      JSON.stringify({
        context: this.context,
        error: error?.message,
        level: "ERROR",
        message,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        ...(data && { data }),
      }),
    );
  }
}

const logger = new Logger("mcp-http-server");

// ===== Rate Limiting =====

class RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  private readonly requestsPerMinute: number;

  constructor(requestsPerMinute: number = 60) {
    this.requestsPerMinute = requestsPerMinute;
  }

  check(clientId: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(clientId);

    if (!bucket || now > bucket.resetAt) {
      this.buckets.set(clientId, {
        count: 1,
        resetAt: now + 60_000, // 1 minute window
      });
      return true;
    }

    if (bucket.count >= this.requestsPerMinute) {
      return false;
    }

    bucket.count++;
    return true;
  }

  reset(clientId: string): void {
    this.buckets.delete(clientId);
  }
}

const limiter = new RateLimiter(100); // 100 requests per minute per client

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
    },
    async (input) => {
      logger.info("tool:search_docs", { query: input.query });
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
      // Each call creates a new issue, so the tool is not idempotent. Only
      // advertise idempotentHint: true if the handler deduplicates repeat calls.
      annotations: { destructiveHint: true, idempotentHint: false },
    },
    async (input) => {
      logger.info("tool:create_issue", { title: input.title });
      const issueId = `ISSUE-${Math.floor(Math.random() * 10_000)}`;
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
    { description: "API Documentation", mimeType: "text/markdown" },
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

// ===== Fastify Setup =====

async function setupFastify(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false }); // Use custom logger

  // ===== CORS =====
  await fastify.register(fastifyCors, {
    credentials: true,
    origin: ALLOWED_ORIGINS,
  });

  // ===== Health Check =====
  fastify.get("/health", async (_request, reply) =>
    reply.send({ status: "ok", timestamp: new Date().toISOString() }),
  );

  // ===== OAuth Protected Resource Metadata (RFC 9728) =====
  // `resource` (not `issuer`/`token_endpoint`) is the required field - this
  // document only points at the authorization server(s); it does not carry
  // that server's own metadata. See templates/errors-and-auth/
  // well-known-oauth-protected-resource.ts for the full metadata shape.
  fastify.get("/.well-known/oauth-protected-resource", async (_request, reply) =>
    reply.send({
      resource: OAUTH_AUDIENCE,
      authorization_servers: [OAUTH_ISSUER],
      scopes_supported: ["mcp:tools:read", "mcp:resources:read"],
      bearer_methods_supported: ["header"],
    }),
  );

  // ===== MCP Endpoint =====
  // Stateless per 2026-07-28: no Mcp-Session-Id, no initialize handshake.
  // `x-mcp-request-id` below is a per-request correlation id for logs and
  // rate-limit buckets only - the server never reads it back as state, and a
  // client generating a fresh one on every call is correct, not a bug.
  // `createMcpHandler` builds a fresh McpServer for each request, so nothing
  // is shared between calls; `toNodeHandler` adapts it to Node's req/res.
  const mcpHandler = toNodeHandler(createMcpHandler(setupMcpServer), {
    onerror: (error) => {
      logger.error("mcp_handler_error", error);
    },
  });

  fastify.post<{ Body: Record<string, unknown> }>(
    "/mcp",
    {
      schema: {
        headers: {
          properties: {
            authorization: { type: "string" },
            "x-mcp-request-id": { type: "string" },
          },
          required: ["authorization"],
          type: "object",
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      const correlationId =
        (request.headers["x-mcp-request-id"] as string) || `req-${crypto.randomUUID()}`;
      const challenge = `Bearer resource_metadata="${API_URL}/.well-known/oauth-protected-resource"`;

      // ===== Token Validation =====
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.error("mcp_auth_missing", undefined, { correlationId });
        return reply.status(401).header("WWW-Authenticate", challenge).send({
          detail: "Authorization header missing or malformed",
          instance: correlationId,
          status: 401,
          title: "Missing Authorization",
          type: "https://api.example.com/errors/missing-auth",
        });
      }

      const token = authHeader.replace(/^Bearer /, "");
      let auth: AuthInfo;
      try {
        // Verifies the signature against the authorization server's JWKS and
        // checks the trusted issuer, this server as audience, and expiry.
        const { payload } = await jwtVerify(token, jwks, {
          audience: OAUTH_AUDIENCE,
          issuer: OAUTH_ISSUER,
        });
        const scopes = typeof payload.scope === "string" ? payload.scope.split(" ") : [];
        auth = {
          clientId: typeof payload.sub === "string" ? payload.sub : "unknown",
          expiresAt: payload.exp,
          scopes,
          token,
        };
      } catch (error) {
        logger.error("mcp_jwt_verify_failed", error as Error, { correlationId });
        return reply
          .status(401)
          .header("WWW-Authenticate", `${challenge}, error="invalid_token"`)
          .send({
            detail: "Token validation failed",
            instance: correlationId,
            status: 401,
            title: "Invalid Token",
            type: "https://api.example.com/errors/invalid-token",
          });
      }

      const clientId = auth.clientId;
      if (!auth.scopes.includes("mcp:tools:read")) {
        logger.error("mcp_insufficient_scope", undefined, { clientId, correlationId });
        return reply
          .status(403)
          .header(
            "WWW-Authenticate",
            `${challenge}, error="insufficient_scope", scope="mcp:tools:read"`,
          )
          .send({
            detail: "Token missing 'mcp:tools:read' scope",
            instance: correlationId,
            status: 403,
            title: "Insufficient Scope",
            type: "https://api.example.com/errors/insufficient-scope",
          });
      }

      // ===== Rate Limiting =====
      // Keyed by clientId (the authenticated caller), never by a session -
      // there is no session to key on.
      if (!limiter.check(clientId)) {
        logger.error("mcp_rate_limit_exceeded", undefined, {
          clientId,
          correlationId,
        });
        return reply.status(429).send({
          detail: "Rate limit exceeded (100 requests/minute)",
          instance: correlationId,
          status: 429,
          title: "Too Many Requests",
          type: "https://api.example.com/errors/rate-limit",
          "x-ratelimit-reset": new Date(Date.now() + 60000).toISOString(),
        });
      }

      logger.info("mcp_request_start", {
        clientId,
        correlationId,
        userAgent: request.headers["user-agent"],
      });

      // The handler does no Host or Origin validation of its own (DNS rebinding
      // protection). The guards answer rejected requests with 403 themselves.
      reply.hijack();
      if (!validateHost(request.raw, reply.raw) || !validateOrigin(request.raw, reply.raw)) {
        return;
      }

      try {
        // Hand the verified token info to the SDK, which attaches it to each request.
        (request.raw as IncomingMessage & { auth?: AuthInfo }).auth = auth;
        await mcpHandler(request.raw, reply.raw, request.body);
        logger.info("mcp_request_complete", { clientId, correlationId });
      } catch (error) {
        logger.error("mcp_request_error", error as Error, { clientId, correlationId });
        if (!reply.raw.headersSent) {
          reply.raw.writeHead(500, { "Content-Type": "application/problem+json" });
          reply.raw.end(
            JSON.stringify({
              detail: (error as Error).message,
              instance: correlationId,
              status: 500,
              title: "MCP Error",
              type: "https://api.example.com/errors/mcp-error",
            }),
          );
        }
      }
    },
  );

  return fastify;
}

// ===== Startup =====

async function main(): Promise<void> {
  try {
    const fastify = await setupFastify();
    await fastify.listen({ host: "0.0.0.0", port: PORT });
    logger.info("server_listening", { pid: process.pid, port: PORT });
  } catch (error) {
    logger.error("startup_failed", error as Error);
    process.exit(1);
  }
}

main();
