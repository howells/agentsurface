/**
 * RFC 8414 + MCP 2025-11-25 OAuth Protected Resource Metadata endpoint
 * Canonical spec: https://datatracker.ietf.org/doc/html/rfc8414
 * Use: Advertise auth config to remote MCP servers and agents
 *
 * <CUSTOMISE>
 * - Update resource_url to your service domain
 * - Add your authorization_server URL
 * - Define scopes relevant to your API
 * - Set jwks_uri to your JWKS endpoint
 * </CUSTOMISE>
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * RFC 8414 Protected Resource Metadata
 * Used by remote MCP servers to discover auth config
 */
interface ProtectedResourceMetadata {
  resource_url: string;
  authorization_servers: string[];
  scopes_supported: string[];
  jwks_uri: string;
  response_types_supported?: string[];
  grant_types_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  revocation_endpoint?: string;
  introspection_endpoint?: string;
}

/**
 * Next.js App Router route handler for /.well-known/oauth-protected-resource
 *
 * Save to app/.well-known/oauth-protected-resource/route.ts
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const metadata: ProtectedResourceMetadata = {
    // <CUSTOMISE> Update to your domain
    resource_url: process.env.API_URL || 'https://api.example.com',

    // <CUSTOMISE> Auth server(s) that can issue tokens for this resource
    authorization_servers: [process.env.AUTH_SERVER || 'https://auth.example.com'],

    // <CUSTOMISE> Define scopes your API supports
    scopes_supported: [
      'agent:read', // MCP: read-only agent operations
      'agent:write', // MCP: agent write operations
      'users:read', // Read user data
      'users:write', // Create/update users
      'posts:read', // Read posts
      'posts:write', // Create/update posts
      'billing:read', // Read billing information
      'offline_access', // Request refresh token
    ],

    // <CUSTOMISE> URI to JWKS (public keys for token validation)
    jwks_uri: process.env.JWKS_URI || 'https://auth.example.com/.well-known/jwks.json',

    // Standard OAuth response types
    response_types_supported: ['token'],

    // Supported grant types for this resource
    grant_types_supported: [
      'client_credentials', // M2M auth (agents)
      'urn:ietf:params:oauth:grant-type:token-exchange', // RFC 8693 delegation
    ],

    // Token endpoint auth methods (if you have a dedicated endpoint)
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],

    // Optional: Endpoints for token management
    ...(process.env.REVOCATION_ENDPOINT && {
      revocation_endpoint: process.env.REVOCATION_ENDPOINT,
    }),
    ...(process.env.INTROSPECTION_ENDPOINT && {
      introspection_endpoint: process.env.INTROSPECTION_ENDPOINT,
    }),
  };

  // Return with proper caching headers
  // (Remote servers may cache this for hours or days)
  return NextResponse.json(metadata, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

/**
 * Respond to CORS preflight requests
 */
export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * MCP 2025-11-25 Remote Server Discovery:
 *
 * When you expose your API to remote MCP servers (e.g., via OpenAI, Claude),
 * those servers fetch this metadata to:
 *
 * 1. Discover the auth server URL
 * 2. Understand which scopes are supported
 * 3. Fetch your JWKS to validate tokens
 * 4. Determine token endpoint auth method
 *
 * The MCP server will:
 * 1. GET /.well-known/oauth-protected-resource
 * 2. Cache the response for 1–24 hours
 * 3. Use authorization_servers[0] as the token endpoint
 * 4. Request tokens with grant_type=client_credentials
 * 5. Validate tokens using JWKS at jwks_uri
 *
 * Example:
 *
 * ```
 * GET https://api.example.com/.well-known/oauth-protected-resource
 *
 * {
 *   "resource_url": "https://api.example.com",
 *   "authorization_servers": ["https://auth.example.com"],
 *   "scopes_supported": ["agent:read", "agent:write", "users:read", "posts:write"],
 *   "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
 *   "grant_types_supported": ["client_credentials", "urn:ietf:params:oauth:grant-type:token-exchange"]
 * }
 * ```
 *
 * Then, an MCP server:
 *
 * ```
 * POST https://auth.example.com/token
 * Content-Type: application/x-www-form-urlencoded
 *
 * grant_type=client_credentials
 * &client_id=openai-org-xyz
 * &client_secret=sk_live_abc123
 * &scope=agent:read+agent:write
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
 */

/**
 * Why this matters:
 *
 * - Without this endpoint, MCP servers have no standard way to discover your auth config
 * - They might hard-code your token endpoint (fragile; breaks on migration)
 * - They can't validate tokens because they don't know your JWKS location
 * - You can't add new scopes without server updates
 *
 * With this endpoint:
 * - Servers auto-discover auth config on every connection
 * - Servers can validate tokens offline (faster)
 * - You can rotate JWKS or change authorization servers
 * - Scopes are published; agents can request only what they need
 */
