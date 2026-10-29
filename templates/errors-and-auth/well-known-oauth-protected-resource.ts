/**
 * RFC 9728 OAuth 2.0 Protected Resource Metadata endpoint
 * Canonical spec: https://datatracker.ietf.org/doc/html/rfc9728
 * Use: Advertise auth config to remote MCP servers and agents
 *
 * RFC 9728 defines this resource's own metadata document - not the
 * authorization server's. The required field is `resource` (the resource's
 * own identifier), not `resource_url`; the authorization server's issuer,
 * token endpoint, grant types and token-signing keys live on that server's
 * own metadata document at its own `/.well-known/oauth-authorization-server`
 * (RFC 8414), reachable via one of the URLs listed in `authorization_servers`
 * below.
 *
 * <CUSTOMISE>
 * - Update resource to your service domain
 * - Add your authorization_server URL
 * - Define scopes relevant to your API
 * - Set DPOP_REQUIRED=true if every access token must be DPoP-bound
 * </CUSTOMISE>
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * RFC 9728 Protected Resource Metadata (§2)
 * Used by remote MCP servers to discover auth config
 */
interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  bearer_methods_supported?: string[];
  resource_name?: string;
  resource_documentation?: string;
  // The resource's OWN keys (e.g. for signed responses), not the keys that
  // verify access tokens; those come from the authorization server metadata.
  jwks_uri?: string;
  resource_signing_alg_values_supported?: string[];
  // Standard DPoP fields (RFC 9728 §2)
  dpop_bound_access_tokens_required?: boolean;
  dpop_signing_alg_values_supported?: string[];
}

/**
 * Next.js App Router route handler for /.well-known/oauth-protected-resource
 *
 * Save to app/.well-known/oauth-protected-resource/route.ts. If your resource
 * identifier has a path (https://api.example.com/mcp), RFC 9728 places the
 * document at /.well-known/oauth-protected-resource/mcp instead.
 */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const metadata: ProtectedResourceMetadata = {
    // <CUSTOMISE> Update to your domain - this resource's own identifier
    resource: process.env.API_URL || "https://api.example.com",

    // <CUSTOMISE> Auth server(s) that can issue tokens for this resource
    authorization_servers: [process.env.AUTH_SERVER || "https://auth.example.com"],

    // <CUSTOMISE> Define scopes your API supports
    scopes_supported: [
      "agent:read", // MCP: read-only agent operations
      "agent:write", // MCP: agent write operations
      "users:read", // Read user data
      "users:write", // Create/update users
      "posts:read", // Read posts
      "posts:write", // Create/update posts
      "billing:read", // Read billing information
    ],

    // How bearer tokens may be presented (RFC 9728 §2)
    bearer_methods_supported: ["header"],

    resource_name: "Example API",

    // <CUSTOMISE> Sender-constrained tokens (RFC 9449). Defaults to false when omitted.
    dpop_bound_access_tokens_required: process.env.DPOP_REQUIRED === "true",
    dpop_signing_alg_values_supported: ["ES256", "EdDSA"],
  };

  // Return with proper caching headers
  return NextResponse.json(metadata, {
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json",
    },
    status: 200,
  });
}

/**
 * Respond to CORS preflight requests
 */
export async function OPTIONS(_req: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Max-Age": "86400",
    },
    status: 204,
  });
}

/**
 * MCP 2026-07-28 Remote Server Discovery:
 *
 * MCP servers have had to publish this document since the 2025-06-18
 * revision. A client:
 *
 * 1. Receives 401 with WWW-Authenticate: Bearer resource_metadata="..."
 *    (or probes the well-known location)
 * 2. GETs /.well-known/oauth-protected-resource and checks `resource`
 *    matches the URL it is calling
 * 3. Uses authorization_servers[0] to fetch the authorization server's own
 *    metadata (RFC 8414): token endpoint, grant types, signing keys
 * 4. Requests a token for this resource (with the `resource` parameter)
 * 5. Sends a DPoP proof as well if dpop_bound_access_tokens_required is true
 *
 * Example:
 *
 * ```
 * GET https://api.example.com/.well-known/oauth-protected-resource
 *
 * {
 *   "resource": "https://api.example.com",
 *   "authorization_servers": ["https://auth.example.com"],
 *   "scopes_supported": ["agent:read", "agent:write", "users:read", "posts:write"],
 *   "bearer_methods_supported": ["header"],
 *   "dpop_bound_access_tokens_required": false
 * }
 * ```
 *
 * Then, for a service-owned (machine-to-machine) client:
 *
 * ```
 * POST https://auth.example.com/token
 * Content-Type: application/x-www-form-urlencoded
 *
 * grant_type=client_credentials
 * &client_id=example-agent
 * &client_secret=...
 * &scope=agent:read+agent:write
 * &resource=https://api.example.com
 *
 * → {
 *   "access_token": "eyJ...",
 *   "token_type": "Bearer",
 *   "expires_in": 3600,
 *   "scope": "agent:read agent:write"
 * }
 * ```
 *
 * Then, for every tool call:
 *
 * ```
 * GET https://api.example.com/api/data
 * Authorization: Bearer eyJ...
 * ```
 *
 * The resource server, not the client, validates each token: signature
 * against the authorization server's keys (or introspection for opaque
 * tokens), plus iss, aud and expiry.
 */

/**
 * Why this matters:
 *
 * - Without this endpoint, clients have no standard way to discover which
 *   authorization server protects you
 * - They might hard-code your token endpoint (fragile; breaks on migration)
 * - You can't add new scopes without client updates
 *
 * With this endpoint:
 * - Clients auto-discover auth config on every connection
 * - You can change authorization servers without breaking clients
 * - Scopes are published; agents can request only what they need
 */
