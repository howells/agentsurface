/**
 * JWT validation using jose v6 + JWKS caching
 * Canonical spec: https://datatracker.ietf.org/doc/html/rfc7519
 * Use: Validate access tokens from OAuth 2.0 or OIDC providers
 *
 * <CUSTOMISE>
 * - Set JWKS_URI, EXPECTED_ISSUER and EXPECTED_AUDIENCE to your IdP
 * - Configure the algorithm allowlist per your security posture
 * - If your IdP issues RFC 9068 access tokens, also pass `typ: "at+jwt"` to jwtVerify
 * </CUSTOMISE>
 */

import { jwtVerify, createRemoteJWKSet } from "jose";
import type { JWTPayload } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * JWT claims with agent-specific fields
 */
interface AgentJWTPayload extends JWTPayload {
  iss: string; // issuer
  aud: string | string[]; // audience
  exp: number; // expiry (UNIX timestamp)
  nbf?: number; // not before
  iat?: number; // issued at
  sub: string; // subject (user ID)
  azp?: string; // authorized party (agent ID)
  act?: {
    sub: string; // subject in delegation chain
  };
  scope?: string; // space-separated scopes
}

/**
 * JWT validator. createRemoteJWKSet fetches, caches and refreshes the key set
 * itself, so one instance is kept for the life of the validator.
 */
export class JWTValidator {
  private readonly expectedIssuer: string;
  private readonly expectedAudience: string | string[];
  private readonly allowedAlgorithms: string[];
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(opts: {
    jwksUri: string;
    expectedIssuer: string;
    expectedAudience: string | string[];
    allowedAlgorithms?: string[];
  }) {
    this.expectedIssuer = opts.expectedIssuer;
    this.expectedAudience = opts.expectedAudience;
    this.allowedAlgorithms = opts.allowedAlgorithms ?? ["RS256", "ES256"];
    this.jwks = createRemoteJWKSet(new URL(opts.jwksUri));
  }

  /**
   * Validate a JWT. jwtVerify checks the signature, the algorithm allowlist,
   * `iss`, `aud`, `exp` and `nbf`, and throws on any failure.
   */
  async validateToken(token: string): Promise<AgentJWTPayload> {
    const { payload } = await jwtVerify(token, this.jwks, {
      algorithms: this.allowedAlgorithms,
      audience: this.expectedAudience,
      issuer: this.expectedIssuer,
      requiredClaims: ["sub", "exp"],
    });
    return payload as AgentJWTPayload;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

/**
 * Singleton validator instance, configured from JWKS_URI, EXPECTED_ISSUER and
 * EXPECTED_AUDIENCE. A missing variable throws: a validator that silently
 * trusted a placeholder issuer would be worse than one that does not start.
 */
let globalValidator: JWTValidator | null = null;

export function getJWTValidator(): JWTValidator {
  globalValidator ??= new JWTValidator({
    expectedAudience: requireEnv("EXPECTED_AUDIENCE"),
    expectedIssuer: requireEnv("EXPECTED_ISSUER"),
    jwksUri: requireEnv("JWKS_URI"),
  });
  return globalValidator;
}

/** RFC 6750 challenge for a missing or rejected bearer token. */
function unauthorized(detail: string, error?: "invalid_token"): NextResponse {
  return NextResponse.json(
    {
      code: "ERR_UNAUTHORIZED",
      detail,
      is_retriable: false,
      status: 401,
      title: "Unauthorized",
      type: "https://api.example.com/errors/unauthorized",
    },
    {
      headers: {
        "Content-Type": "application/problem+json",
        "WWW-Authenticate": error ? `Bearer error="${error}"` : "Bearer",
      },
      status: 401,
    },
  );
}

/** The token from an `Authorization: Bearer <token>` header; the scheme is case-insensitive. */
function bearerToken(req: NextRequest): string | null {
  const match = /^Bearer +(\S+)$/i.exec(req.headers.get("Authorization") ?? "");
  return match?.[1] ?? null;
}

/** Validate the request's token, or return the 401 to send. The reason is logged, not returned. */
async function authenticate(req: NextRequest): Promise<AgentJWTPayload | NextResponse> {
  const token = bearerToken(req);
  if (!token) {
    return unauthorized("Authorization header with a Bearer token is required");
  }
  try {
    return await getJWTValidator().validateToken(token);
  } catch (error) {
    console.warn("[JWT] token rejected", error);
    return unauthorized("The access token is invalid or expired", "invalid_token");
  }
}

/**
 * Next.js 16 proxy to validate JWT from Authorization header.
 * Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`; the function receives only
 * the request and returns a response (there is no `next` callback to chain to).
 *
 * Usage in proxy.ts (project root, or src/ next to app/):
 * ```typescript
 * import { jwtProxy } from '@/lib/jwt-validate';
 *
 * export const proxy = jwtProxy;
 * export const config = {
 *   matcher: ['/api/:path*'],
 * };
 * ```
 */
export async function jwtProxy(req: NextRequest): Promise<NextResponse> {
  // Skip validation for public endpoints
  if (req.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  const claims = await authenticate(req);
  if (claims instanceof NextResponse) {
    return claims;
  }

  // Attach validated claims to request headers for downstream routes. Every
  // identity header is set or deleted here, so a value the client sent never
  // reaches a route handler.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-claims", JSON.stringify(claims));
  requestHeaders.set("x-user-id", claims.sub);
  if (claims.azp) {
    requestHeaders.set("x-agent-id", claims.azp);
  } else {
    requestHeaders.delete("x-agent-id");
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Route handler with JWT validation
 *
 * Usage:
 * ```typescript
 * export const GET = withJWTValidation(async (req: NextRequest, claims) => {
 *   const userId = claims.sub;
 *   const agentId = claims.azp;
 *   console.log(`Agent ${agentId} acting on behalf of ${userId}`);
 *
 *   return NextResponse.json({ data: '...' });
 * });
 * ```
 */
export function withJWTValidation(
  handler: (req: NextRequest, claims: AgentJWTPayload) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const claims = await authenticate(req);
    return claims instanceof NextResponse ? claims : handler(req, claims);
  };
}

/**
 * Critical JWT validation checklist:
 *
 * ✓ Verify signature against IdP's public keys (JWKS)
 * ✓ Validate issuer (iss) matches expected IdP
 * ✓ Validate audience (aud) includes your service
 * ✓ Check expiry (exp) is in the future
 * ✓ Check not-before (nbf) is in the past (token not yet valid)
 * ✓ Whitelist algorithms (RS256, ES256) - reject 'none' and symmetric downgrades
 * ✓ Reject if algorithm in header (alg) doesn't match whitelisted set
 *
 * Anti-patterns:
 * ✗ Trusting the 'alg' header without validation (critical vulnerability)
 * ✗ Accepting HS256 if you expect RS256 (allows HMAC forgery)
 * ✗ Skipping signature validation
 * ✗ Accepting 'alg: none'
 */
