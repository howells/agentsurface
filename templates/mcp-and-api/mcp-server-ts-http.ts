/**
 * MCP Server (Streamable HTTP) — Remote, stateless, horizontally scalable
 *
 * Canonical spec: https://modelcontextprotocol.io/specification/2026-07-28
 * Transport: Streamable HTTP only — HTTP+SSE is Deprecated as of this revision
 * Framework: Fastify (minimal HTTP server)
 * Authentication: OAuth 2.1 Bearer token + JWT validation; prefer Client ID
 *   Metadata Documents over Dynamic Client Registration for new clients
 * SDK: `@modelcontextprotocol/server` (v2, implements the 2026-07-28 spec).
 *   v2 replaced the monolithic `@modelcontextprotocol/sdk` package with the
 *   separate `@modelcontextprotocol/server` and `@modelcontextprotocol/client` packages.
 *
 * 2026-07-28 removed protocol-level sessions entirely: no `Mcp-Session-Id`
 * header, no `initialize`/`notifications/initialized` handshake. Every
 * request carries its own protocol version and capabilities in `_meta`
 * (`io.modelcontextprotocol/protocolVersion`, `io.modelcontextprotocol/clientCapabilities`),
 * and servers MUST implement `server/discover` so clients can probe supported
 * versions and capabilities before (or instead of) any other call. Anything
 * that needs to persist across calls — the old use for a session id — must
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
 * ✓ Implement JWT validation against your auth server
 * ✓ Add/remove tools
 * ✓ Configure rate limits (requests per minute per client)
 * ✓ Configure CORS origin whitelist
 * ✓ Test with MCP client library
 */

import Fastify from "fastify";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import { McpServer } from "@modelcontextprotocol/server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/server/streamable-http";
import { z } from "zod";

// ===== Configuration =====

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const OAUTH_ISSUER = process.env.OAUTH_ISSUER || "https://auth.example.com";
const OAUTH_AUDIENCE = process.env.OAUTH_AUDIENCE || "mcp-server";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:*").split(",");

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
      annotations: { destructiveHint: true, idempotentHint: true },
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
  server.resource("config://api-docs", "text/markdown", "API Documentation", async () => ({
    contents: [
      {
        mimeType: "text/markdown",
        text: "# API Documentation\n\nRemote MCP server. See https://modelcontextprotocol.io/specification/2026-07-28",
        uri: "config://api-docs",
      },
    ],
  }));

  return server;
}

// ===== FastAPI Setup =====

async function setupFastify(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false }); // Use custom logger

  // ===== JWT Authentication =====
  await fastify.register(fastifyJwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: "1h" },
  });

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
  // `resource` (not `issuer`/`token_endpoint`) is the required field — this
  // document only points at the authorization server(s); it does not carry
  // that server's own metadata. See templates/errors-and-auth/
  // well-known-oauth-protected-resource.ts for the full metadata shape.
  fastify.get("/.well-known/oauth-protected-resource", async (_request, reply) =>
    reply.send({
      resource: process.env.API_URL || "https://api.example.com",
      authorization_servers: [OAUTH_ISSUER],
      scopes_supported: ["mcp:tools:read", "mcp:resources:read"],
      bearer_methods_supported: ["header"],
      dpop_signing_alg_values_supported: ["RS256"],
    }),
  );

  // ===== MCP Endpoint =====
  // Stateless per 2026-07-28: no Mcp-Session-Id, no initialize handshake.
  // `x-mcp-request-id` below is a per-request correlation id for logs and
  // rate-limit buckets only — the server never reads it back as state, and a
  // client generating a fresh one on every call is correct, not a bug.
  fastify.post<{ Body: Record<string, unknown> }>(
    "/mcp",
    {
      schema: {
        description: "MCP Streamable HTTP endpoint (stateless, spec 2026-07-28)",
        headers: {
          properties: {
            authorization: { type: "string" },
            "mcp-method": { type: "string" },
            "mcp-name": { type: "string" },
            "x-mcp-request-id": { type: "string" },
          },
          required: ["authorization", "mcp-method", "mcp-name"],
          type: "object",
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      const correlationId =
        (request.headers["x-mcp-request-id"] as string) || `req-${crypto.randomUUID()}`;

      // ===== JWT Validation =====
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.error("mcp_auth_missing", undefined, { correlationId });
        return reply.status(401).send({
          detail: "Authorization header missing or malformed",
          instance: correlationId,
          status: 401,
          title: "Missing Authorization",
          type: "https://api.example.com/errors/missing-auth",
        });
      }

      let clientId: string;
      try {
        const token = authHeader.replace(/^Bearer /, "");
        const decoded = fastify.jwt.verify(token) as { sub: string; scope: string };
        clientId = decoded.sub;

        // Validate scopes
        const scopes = (decoded.scope || "").split(" ");
        if (!scopes.includes("mcp:tools:read")) {
          logger.error("mcp_insufficient_scope", undefined, {
            clientId,
            correlationId,
          });
          return reply.status(403).send({
            detail: "Token missing 'mcp:tools:read' scope",
            instance: correlationId,
            status: 403,
            title: "Insufficient Scope",
            type: "https://api.example.com/errors/insufficient-scope",
          });
        }
      } catch (error) {
        logger.error("mcp_jwt_verify_failed", error as Error, { correlationId });
        return reply.status(401).send({
          detail: "JWT validation failed",
          instance: correlationId,
          status: 401,
          title: "Invalid Token",
          type: "https://api.example.com/errors/invalid-token",
        });
      }

      // ===== Rate Limiting =====
      // Keyed by clientId (the authenticated caller), never by a session —
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

      try {
        // ===== Create MCP Server & Transport =====
        // A fresh server + transport per request keeps the handler stateless;
        // there is no sessionIdGenerator option to set because the 2026-07-28
        // Streamable HTTP transport has no session concept at all.
        const mcpServer = setupMcpServer();
        const transport = new StreamableHTTPServerTransport();

        // Attach context for logging
        (request as any).mcp = { clientId, correlationId };

        await mcpServer.connect(transport);
        await transport.handleRequest(request.raw, reply.raw, request.body);
        logger.info("mcp_request_complete", {
          clientId,
          correlationId,
        });
      } catch (error) {
        logger.error("mcp_request_error", error as Error, {
          clientId,
          correlationId,
        });
        reply.status(500).send({
          type: "https://api.example.com/errors/mcp-error",
          title: "MCP Error",
          status: 500,
          detail: (error as Error).message,
          instance: correlationId,
        });
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
