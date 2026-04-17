/**
 * JWT validation using jose v6 + JWKS caching
 * Canonical spec: https://datatracker.ietf.org/doc/html/rfc7519
 * Use: Validate access tokens from OAuth 2.0 or OIDC providers
 *
 * <CUSTOMISE>
 * - Update JWKS_URI, EXPECTED_ISSUER, EXPECTED_AUDIENCE to your IdP
 * - Configure algorithm whitelist per your security posture
 * - Adjust cache TTL
 * </CUSTOMISE>
 */

import { jwtVerify, createRemoteJWKSet, importSPKI } from 'jose';
import type { JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

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
 * JWT validator with JWKS caching
 */
export class JWTValidator {
  private jwksUri: string;
  private expectedIssuer: string;
  private expectedAudience: string | string[];
  private allowedAlgorithms: string[];
  private jwksCacheTtlMs: number;
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private jwksCacheExpiry: number = 0;

  constructor(opts: {
    jwksUri: string;
    expectedIssuer: string;
    expectedAudience: string | string[];
    allowedAlgorithms?: string[];
    jwksCacheTtlMs?: number;
  }) {
    this.jwksUri = opts.jwksUri;
    this.expectedIssuer = opts.expectedIssuer;
    this.expectedAudience = opts.expectedAudience;
    this.allowedAlgorithms = opts.allowedAlgorithms || ['RS256', 'ES256'];
    this.jwksCacheTtlMs = opts.jwksCacheTtlMs || 3600000; // 1 hour
  }

  /**
   * Get or refresh JWKS (with caching)
   */
  private getJWKS(): ReturnType<typeof createRemoteJWKSet> {
    if (this.jwks && this.jwksCacheExpiry > Date.now()) {
      return this.jwks;
    }

    this.jwks = createRemoteJWKSet(new URL(this.jwksUri));
    this.jwksCacheExpiry = Date.now() + this.jwksCacheTtlMs;
    console.log(`[JWT] Refreshed JWKS cache from ${this.jwksUri}`);

    return this.jwks;
  }

  /**
   * Validate a JWT token
   */
  async validateToken(token: string): Promise<AgentJWTPayload> {
    try {
      const jwks = this.getJWKS();

      const verified = await jwtVerify(token, jwks, {
        issuer: this.expectedIssuer,
        audience: this.expectedAudience,
        algorithms: this.allowedAlgorithms,
      });

      const payload = verified.payload as AgentJWTPayload;

      // Additional checks
      if (!payload.sub) {
        throw new Error('JWT missing "sub" (subject) claim');
      }

      if (!payload.exp) {
        throw new Error('JWT missing "exp" (expiry) claim');
      }

      if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('JWT is expired');
      }

      if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) {
        throw new Error('JWT "nbf" (not before) claim is in the future');
      }

      return payload;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`JWT validation failed: ${message}`);
    }
  }
}

/**
 * Singleton validator instance
 */
let globalValidator: JWTValidator | null = null;

export function getJWTValidator(opts?: {
  jwksUri?: string;
  expectedIssuer?: string;
  expectedAudience?: string | string[];
}): JWTValidator {
  if (!globalValidator) {
    globalValidator = new JWTValidator({
      jwksUri: opts?.jwksUri || process.env.JWKS_URI || 'https://auth.example.com/.well-known/jwks.json',
      expectedIssuer: opts?.expectedIssuer || process.env.EXPECTED_ISSUER || 'https://auth.example.com',
      expectedAudience: opts?.expectedAudience || process.env.EXPECTED_AUDIENCE || 'https://api.example.com',
    });
  }
  return globalValidator;
}

/**
 * Next.js middleware to validate JWT from Authorization header
 *
 * Usage in middleware.ts:
 * ```typescript
 * import { jwtMiddleware } from '@/lib/jwt-validate';
 *
 * export const middleware = jwtMiddleware;
 * export const config = {
 *   matcher: ['/api/:path*'],
 * };
 * ```
 */
export async function jwtMiddleware(
  req: NextRequest,
  next: any
): Promise<NextResponse> {
  // Skip validation for public endpoints
  if (req.nextUrl.pathname === '/api/health') {
    return next(req);
  }

  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        type: 'https://api.example.com/errors/ERR_UNAUTHORIZED',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authorization header with Bearer token required',
      },
      { status: 401, headers: { 'Content-Type': 'application/problem+json' } }
    );
  }

  const token = authHeader.slice(7);
  const validator = getJWTValidator();

  try {
    const claims = await validator.validateToken(token);

    // Attach validated claims to request headers for downstream routes
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-claims', JSON.stringify(claims));
    requestHeaders.set('x-user-id', claims.sub);
    if (claims.azp) {
      requestHeaders.set('x-agent-id', claims.azp);
    }

    return next(req, { request: { headers: requestHeaders } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[JWT] Validation error: ${message}`);

    return NextResponse.json(
      {
        type: 'https://api.example.com/errors/ERR_UNAUTHORIZED',
        title: 'Invalid Token',
        status: 401,
        detail: message,
      },
      { status: 401, headers: { 'Content-Type': 'application/problem+json' } }
    );
  }
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
  handler: (req: NextRequest, claims: AgentJWTPayload) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          type: 'https://api.example.com/errors/ERR_UNAUTHORIZED',
          title: 'Unauthorized',
          status: 401,
          detail: 'Authorization header required',
        },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const validator = getJWTValidator();

    try {
      const claims = await validator.validateToken(token);
      return handler(req, claims);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      return NextResponse.json(
        {
          type: 'https://api.example.com/errors/ERR_UNAUTHORIZED',
          title: 'Invalid Token',
          status: 401,
          detail: message,
        },
        { status: 401 }
      );
    }
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
 * ✓ Whitelist algorithms (RS256, ES256) — reject 'none' and symmetric downgrades
 * ✓ Reject if algorithm in header (alg) doesn't match whitelisted set
 *
 * Anti-patterns:
 * ✗ Trusting the 'alg' header without validation (critical vulnerability)
 * ✗ Accepting HS256 if you expect RS256 (allows HMAC forgery)
 * ✗ Skipping signature validation
 * ✗ Accepting 'alg: none'
 */
