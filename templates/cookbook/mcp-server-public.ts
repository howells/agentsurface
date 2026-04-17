/**
 * Public MCP HTTP Server with OAuth 2.1 + DPoP
 *
 * Standalone HTTP server exposing your agent's tools as an MCP endpoint.
 * Clients (Claude Desktop, ChatGPT, other agents) connect via HTTP + WebSocket.
 * Secured with OAuth 2.1 + Demonstration of Proof-of-Possession (DPoP) token binding.
 *
 * Endpoints:
 * - `/.well-known/mcp-server` — MCP server capability discovery
 * - `/.well-known/oauth-protected-resource` — OAuth 2.1 resource metadata
 * - `/mcp` — MCP WebSocket transport (authenticated, per-tenant rate-limited)
 * - `/oauth/authorize` — OAuth code flow initiation
 * - `/oauth/token` — Token exchange (with DPoP)
 *
 * When to use:
 * - Publishing your agent's tools to Claude Desktop, ChatGPT plugins, other AI systems
 * - Multi-tenant SaaS where each workspace has its own MCP endpoint
 * - Rate limiting + audit logging per tenant/API key
 * - Zero-trust auth: every request must carry valid OAuth token + DPoP proof
 *
 * Canonical docs:
 * - MCP spec: https://spec.modelcontextprotocol.io/
 * - OAuth 2.1 draft: https://tools.ietf.org/html/draft-ietf-oauth-v2-1-09
 * - DPoP RFC: https://tools.ietf.org/html/rfc9449
 * - MCP SDK TypeScript: https://github.com/modelcontextprotocol/typescript-sdk
 *
 * // <CUSTOMISE>
 * - Replace mock OAuth token storage with real database (Postgres, DynamoDB)
 * - Update tool definitions to match your domain
 * - Implement real rate limiting (Redis, DynamoDB Streams)
 * - Add audit logging (CloudWatch, DataDog, Splunk)
 * - Configure CORS for your Claude/ChatGPT deployments
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolRequest, Tool } from "@modelcontextprotocol/sdk/shared/messages.js";
import { createHash, randomBytes } from "node:crypto";
import { TextEncoder } from "node:util";
import { z } from "zod";

/**
 * Tool definitions (your domain tools).
 */
const toolDefinitions: Tool[] = [
  {
    name: "create_order",
    description: "Create a new order",
    inputSchema: {
      type: "object" as const,
      properties: {
        customerId: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              productId: { type: "string" },
              quantity: { type: "number" },
            },
          },
        },
      },
      required: ["customerId", "items"],
    },
  },
  {
    name: "list_orders",
    description: "List orders by status",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["pending", "shipped", "delivered"],
        },
        limit: { type: "number", minimum: 1, maximum: 100 },
      },
      required: ["status"],
    },
  },
];

/**
 * In-memory OAuth token store (use Redis/Postgres in production).
 */
const tokenStore: Map<
  string,
  {
    clientId: string;
    tenantId: string;
    scope: string;
    expiresAt: number;
    dpopThumbprint?: string;
  }
> = new Map();

/**
 * Rate limit store (track requests per tenant).
 */
const rateLimitStore: Map<
  string,
  {
    requestCount: number;
    windowStart: number;
  }
> = new Map();

const RATE_LIMIT_PER_MINUTE = 60;

/**
 * Check rate limit for tenant.
 */
function checkRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const key = tenantId;
  const record = rateLimitStore.get(key);

  if (!record || now - record.windowStart > 60000) {
    // New window
    rateLimitStore.set(key, { requestCount: 1, windowStart: now });
    return true;
  }

  if (record.requestCount < RATE_LIMIT_PER_MINUTE) {
    record.requestCount++;
    return true;
  }

  return false;
}

/**
 * OAuth 2.1 + DPoP token validation.
 */
function validateToken(
  authHeader: string,
  dpopHeader?: string,
): {
  valid: boolean;
  tenantId?: string;
  error?: string;
} {
  if (!authHeader.startsWith("DPoP ")) {
    return { valid: false, error: "Missing DPoP token" };
  }

  const token = authHeader.slice(5);
  const tokenRecord = tokenStore.get(token);

  if (!tokenRecord) {
    return { valid: false, error: "Invalid token" };
  }

  if (tokenRecord.expiresAt < Date.now()) {
    tokenStore.delete(token);
    return { valid: false, error: "Token expired" };
  }

  // Validate DPoP proof (if token was bound)
  if (tokenRecord.dpopThumbprint && dpopHeader) {
    const proof = JSON.parse(dpopHeader);
    const thumbprint = proof.jti; // Simplified; real DPoP uses cryptographic binding

    if (thumbprint !== tokenRecord.dpopThumbprint) {
      return { valid: false, error: "DPoP proof mismatch" };
    }
  }

  return { valid: true, tenantId: tokenRecord.tenantId };
}

/**
 * MCP Server implementation.
 */
class PublicMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: "agent-server",
      version: "1.0.0",
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    // Tool discovery
    this.server.setRequestHandler("tools/list", async () => {
      return {
        tools: toolDefinitions,
      };
    });

    // Tool execution
    this.server.setRequestHandler(
      "tools/call",
      async (request: CallToolRequest) => {
        const { name, arguments: args } = request;

        if (name === "create_order") {
          return {
            content: [
              {
                type: "text" as const,
                text: `Created order with items: ${JSON.stringify(args)}`,
              },
            ],
          };
        }

        if (name === "list_orders") {
          return {
            content: [
              {
                type: "text" as const,
                text: `Listed orders with status: ${args.status}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: "Tool not found",
            },
          ],
          isError: true,
        };
      },
    );
  }

  async start(transport: StdioServerTransport) {
    await this.server.connect(transport);
    console.log("[mcp-server] Connected via stdio");
  }
}

/**
 * HTTP server for MCP endpoint.
 */
export async function setupPublicMCPServer() {
  // <CUSTOMISE> Use your HTTP framework (Express, Hono, Fastify, etc.)
  // This example uses simple Node.js http module

  const http = await import("node:http");
  const url = await import("node:url");

  const server = http.createServer(async (req, res) => {
    const parsedUrl = new url.URL(req.url || "", `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Content-Type", "application/json");

    // OAuth discovery endpoint
    if (pathname === "/.well-known/oauth-protected-resource") {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          issuer: "https://api.example.com",
          token_endpoint: "https://api.example.com/oauth/token",
          authorization_endpoint: "https://api.example.com/oauth/authorize",
          dpop_signing_alg_values_supported: ["ES256"],
          resource: "https://api.example.com/mcp",
        }),
      );
      return;
    }

    // MCP server discovery endpoint
    if (pathname === "/.well-known/mcp-server") {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: "agent-mcp-server",
            version: "1.0.0",
          },
        }),
      );
      return;
    }

    // OAuth token endpoint (simplified DPoP flow)
    if (pathname === "/oauth/token" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", () => {
        // <CUSTOMISE> Validate client credentials, authorization code, etc.
        const params = new url.URLSearchParams(body);
        const clientId = params.get("client_id");
        const tenantId = params.get("tenant_id") || "default";

        // Check DPoP header
        const dpopHeader = req.headers["dpop"];
        const dpopThumbprint = dpopHeader
          ? createHash("sha256").update(String(dpopHeader)).digest("hex").slice(0, 8)
          : undefined;

        // Generate token
        const token = randomBytes(32).toString("hex");
        tokenStore.set(token, {
          clientId: clientId || "unknown",
          tenantId,
          scope: "tools:read tools:write",
          expiresAt: Date.now() + 3600000, // 1 hour
          dpopThumbprint,
        });

        res.writeHead(200);
        res.end(
          JSON.stringify({
            access_token: token,
            token_type: "DPoP",
            expires_in: 3600,
            scope: "tools:read tools:write",
          }),
        );
      });
      return;
    }

    // MCP WebSocket upgrade (simplified for HTTP demo)
    if (pathname === "/mcp" && req.method === "OPTIONS") {
      const authHeader = req.headers.authorization;
      const dpopHeader = req.headers.dpop;

      if (!authHeader) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: "Missing authorization header" }));
        return;
      }

      const validation = validateToken(String(authHeader), String(dpopHeader));

      if (!validation.valid) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: validation.error }));
        return;
      }

      // Rate limit check
      if (!checkRateLimit(validation.tenantId!)) {
        res.writeHead(429);
        res.end(
          JSON.stringify({
            error: "Rate limit exceeded",
            retry_after: 60,
          }),
        );
        return;
      }

      res.writeHead(200);
      res.end(
        JSON.stringify({
          status: "ready",
          tenantId: validation.tenantId,
        }),
      );
      return;
    }

    // Default 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });

  const port = 3001;
  server.listen(port, () => {
    console.log(`[http-server] Listening on http://localhost:${port}`);
    console.log(`[http-server] MCP discovery: http://localhost:${port}/.well-known/mcp-server`);
    console.log(
      `[http-server] OAuth metadata: http://localhost:${port}/.well-known/oauth-protected-resource`,
    );
  });

  return server;
}

/**
 * Example: Client code (how Claude Desktop or ChatGPT would connect).
 */
export async function exampleClientConnection() {
  const clientId = "my-claude-desktop";
  const tenantId = "workspace-123";

  // Step 1: Request token with DPoP
  console.log("[client] Requesting OAuth token...");

  const dpopHeader = JSON.stringify({
    jti: createHash("sha256")
      .update(randomBytes(32))
      .digest("hex")
      .slice(0, 8),
  });

  const tokenResponse = await fetch("http://localhost:3001/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      dpop: dpopHeader,
    },
    body: new URLSearchParams({
      client_id: clientId,
      tenant_id: tenantId,
      grant_type: "client_credentials",
    }).toString(),
  });

  const { access_token } = await tokenResponse.json();
  console.log("[client] Got token:", access_token);

  // Step 2: Connect to MCP endpoint with token
  console.log("[client] Connecting to MCP server...");

  const mcpResponse = await fetch("http://localhost:3001/mcp", {
    method: "OPTIONS",
    headers: {
      authorization: `DPoP ${access_token}`,
      dpop: dpopHeader,
    },
  });

  const status = await mcpResponse.json();
  console.log("[client] MCP status:", status);

  // Step 3: Now client can call tools
  console.log("[client] Ready to invoke tools");
}
