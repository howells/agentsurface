/**
 * MCP Server (Streamable HTTP) — Remote, stateless, horizontally scalable
 *
 * Canonical spec: https://modelcontextprotocol.io/specification/2025-11-25
 * Transport: Streamable HTTP (stateless, long-lived POST, SSE-like streaming)
 * Framework: Fastify (minimal HTTP server)
 * Authentication: OAuth 2.1 Bearer token + JWT validation
 * SDK: @modelcontextprotocol/sdk (v2.x)
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
 * ✓ Set session timeout
 * ✓ Configure CORS origin whitelist
 * ✓ Test with MCP client library
 */

import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TextContent, ErrorContent } from "@modelcontextprotocol/sdk/types.js";

// ===== Configuration =====

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const OAUTH_ISSUER = process.env.OAUTH_ISSUER || "https://auth.example.com";
const OAUTH_AUDIENCE = process.env.OAUTH_AUDIENCE || "mcp-server";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:*").split(",");

// ===== Structured Logging =====

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: Record<string, unknown>): void {
    console.log(
      JSON.stringify({
        level: "INFO",
        context: this.context,
        message,
        timestamp: new Date().toISOString(),
        ...(data && { data }),
      })
    );
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    console.error(
      JSON.stringify({
        level: "ERROR",
        context: this.context,
        message,
        error: error?.message,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        ...(data && { data }),
      })
    );
  }
}

const logger = new Logger("mcp-http-server");

// ===== Rate Limiting =====

class RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();
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
        resetAt: now + 60000, // 1 minute window
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
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(10),
});

const createIssueSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  assignee: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

// ===== MCP Server Setup =====

function setupMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "example-agent-api",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // search_docs tool
  server.tool(
    "search_docs",
    "Search documentation by keyword. Use when you need to find relevant docs or API references.",
    { schema: searchDocsSchema },
    async (input) => {
      logger.info("tool:search_docs", { query: input.query });
      const results = [
        { title: "Getting Started", url: "https://example.com/docs/start" },
      ].slice(0, input.limit);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(results) }],
      };
    },
    { annotations: { readOnlyHint: true, openWorldHint: true } }
  );

  // create_issue tool
  server.tool(
    "create_issue",
    "Create a new issue in the project tracker. Use when reporting bugs or requesting features.",
    { schema: createIssueSchema },
    async (input) => {
      logger.info("tool:create_issue", { title: input.title });
      const issueId = `ISSUE-${Math.floor(Math.random() * 10000)}`;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              id: issueId,
              title: input.title,
              priority: input.priority,
              created_at: new Date().toISOString(),
            }),
          },
        ],
      };
    },
    { annotations: { destructiveHint: true, idempotentHint: true } }
  );

  // config resource
  server.resource(
    "config://api-docs",
    "text/markdown",
    "API Documentation",
    async () => ({
      contents: [
        {
          uri: "config://api-docs",
          mimeType: "text/markdown",
          text: "# API Documentation\n\nRemote MCP server. See https://modelcontextprotocol.io/specification/2025-11-25",
        },
      ],
    })
  );

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
    origin: ALLOWED_ORIGINS,
    credentials: true,
  });

  // ===== Health Check =====
  fastify.get("/health", async (_request, reply) => {
    return reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ===== OAuth Metadata (RFC 8414 + ext) =====
  fastify.get("/.well-known/oauth-protected-resource", async (_request, reply) => {
    return reply.send({
      issuer: OAUTH_ISSUER,
      token_endpoint: `${OAUTH_ISSUER}/oauth/token`,
      authorization_endpoint: `${OAUTH_ISSUER}/oauth/authorize`,
      token_endpoint_auth_methods_supported: ["client_secret_basic"],
      grant_types_supported: ["client_credentials"],
      scopes_supported: ["mcp:tools:read", "mcp:resources:read"],
      dpop_signing_alg_values_supported: ["RS256"],
    });
  });

  // ===== MCP Endpoint =====
  fastify.post<{ Body: Record<string, unknown> }>(
    "/mcp",
    {
      schema: {
        description: "MCP Streamable HTTP endpoint",
        headers: {
          type: "object",
          properties: {
            authorization: { type: "string" },
            "mcp-session-id": { type: "string" },
          },
          required: ["authorization"],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      const sessionId = request.headers["mcp-session-id"] as string || `session-${Date.now()}`;

      // ===== JWT Validation =====
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.error("mcp_auth_missing", undefined, { sessionId });
        return reply.status(401).send({
          type: "https://api.example.com/errors/missing-auth",
          title: "Missing Authorization",
          status: 401,
          detail: "Authorization header missing or malformed",
          instance: sessionId,
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
            sessionId,
          });
          return reply.status(403).send({
            type: "https://api.example.com/errors/insufficient-scope",
            title: "Insufficient Scope",
            status: 403,
            detail: "Token missing 'mcp:tools:read' scope",
            instance: sessionId,
          });
        }
      } catch (err) {
        logger.error("mcp_jwt_verify_failed", err as Error, { sessionId });
        return reply.status(401).send({
          type: "https://api.example.com/errors/invalid-token",
          title: "Invalid Token",
          status: 401,
          detail: "JWT validation failed",
          instance: sessionId,
        });
      }

      // ===== Rate Limiting =====
      if (!limiter.check(clientId)) {
        logger.error("mcp_rate_limit_exceeded", undefined, {
          clientId,
          sessionId,
        });
        return reply.status(429).send({
          type: "https://api.example.com/errors/rate-limit",
          title: "Too Many Requests",
          status: 429,
          detail: "Rate limit exceeded (100 requests/minute)",
          instance: sessionId,
          "x-ratelimit-reset": new Date(Date.now() + 60000).toISOString(),
        });
      }

      logger.info("mcp_session_start", {
        clientId,
        sessionId,
        userAgent: request.headers["user-agent"],
      });

      try {
        // ===== Create MCP Server & Transport =====
        const mcpServer = setupMcpServer();
        const transport = new HttpServerTransport(request.raw, reply.raw);

        // Attach context for logging
        (request as any).mcp = { clientId, sessionId };

        await mcpServer.connect(transport);
        logger.info("mcp_session_complete", {
          clientId,
          sessionId,
        });
      } catch (err) {
        logger.error("mcp_session_error", err as Error, {
          clientId,
          sessionId,
        });
        reply.status(500).send({
          type: "https://api.example.com/errors/mcp-error",
          title: "MCP Error",
          status: 500,
          detail: (err as Error).message,
          instance: sessionId,
        });
      }
    }
  );

  return fastify;
}

// ===== Startup =====

async function main(): Promise<void> {
  try {
    const fastify = await setupFastify();
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    logger.info("server_listening", { port: PORT, pid: process.pid });
  } catch (err) {
    logger.error("startup_failed", err as Error);
    process.exit(1);
  }
}

main();
