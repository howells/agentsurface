/**
 * RFC 9449 DPoP (Demonstration of Proof-of-Possession) header generation
 * Canonical spec: https://www.rfc-editor.org/rfc/rfc9449.html
 * Use: Bind access tokens to the agent's public key; prevent token replay attacks
 *
 * <CUSTOMISE>
 * - Store keypair in secure storage (e.g., 1Password, AWS Secrets Manager)
 * - Rotate keypair annually
 * - Configure DPoP claim TTL per your security policy
 * </CUSTOMISE>
 */

import { SignJWT, generateKeyPair, exportSPKI, exportPKCS8, importPKCS8 } from 'jose';
import * as crypto from 'crypto';

/**
 * DPoP keypair manager
 */
export class DPoP {
  private publicKeyPEM: string;
  private privateKeyPEM: string;
  private publicKeyJWK: { kty: string; crv: string; x: string; y: string } | null = null;
  private claimTtlSeconds: number;

  constructor(opts: {
    publicKeyPEM: string;
    privateKeyPEM: string;
    claimTtlSeconds?: number;
  }) {
    this.publicKeyPEM = opts.publicKeyPEM;
    this.privateKeyPEM = opts.privateKeyPEM;
    this.claimTtlSeconds = opts.claimTtlSeconds || 60; // 1 minute default
  }

  /**
   * Generate a new ES256 keypair (NIST P-256)
   * Run once and store securely
   */
  static async generateKeyPair(): Promise<{ publicKeyPEM: string; privateKeyPEM: string }> {
    const { publicKey, privateKey } = await generateKeyPair('ES256');

    const publicKeyPEM = await exportSPKI(publicKey);
    const privateKeyPEM = await exportPKCS8(privateKey);

    return { publicKeyPEM, privateKeyPEM };
  }

  /**
   * Compute JWK Thumbprint (SHA-256) for DPoP header
   * Used to bind the token to this keypair
   */
  private async getPublicKeyThumbprint(): Promise<string> {
    // For ES256 (P-256), extract x and y coordinates from PEM
    // This is a simplified version; production should use jose's built-in methods
    const publicKey = await crypto.webcrypto.subtle.importKey(
      'spki',
      new TextEncoder().encode(this.publicKeyPEM),
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify']
    );

    const exported = await crypto.webcrypto.subtle.exportKey('jwk', publicKey);
    const jwkJson = JSON.stringify({
      crv: exported.crv,
      kty: exported.kty,
      x: exported.x,
      y: exported.y,
    });

    // SHA-256 of the JWK
    const hash = crypto.createHash('sha256').update(jwkJson).digest();
    return Buffer.from(hash).toString('base64url');
  }

  /**
   * Generate a DPoP proof JWT per RFC 9449 section 4.2
   *
   * DPoP format:
   * {
   *   "typ": "dpop+jwt",
   *   "alg": "ES256",
   *   "jwk": <public key>
   * }
   * {
   *   "jti": <random UUID>,
   *   "htm": "GET|POST|PATCH|DELETE",
   *   "htu": "https://api.example.com/users",
   *   "iat": <seconds>,
   *   "exp": <seconds>,
   * }
   */
  async generateProof(method: string, uri: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    // Import private key for signing
    const privateKey = await importPKCS8(this.privateKeyPEM, 'ES256');

    // Create DPoP proof JWT
    const proof = await new SignJWT({
      jti,
      htm: method.toUpperCase(),
      htu: uri,
      iat: now,
      exp: now + this.claimTtlSeconds,
    })
      .setProtectedHeader({
        alg: 'ES256',
        typ: 'dpop+jwt',
        jwk: await this.getPublicKeyJWK(),
      })
      .sign(privateKey);

    return proof;
  }

  /**
   * Get public key in JWK format (cached)
   */
  private async getPublicKeyJWK(): Promise<Record<string, unknown>> {
    if (this.publicKeyJWK) {
      return this.publicKeyJWK;
    }

    const publicKey = await crypto.webcrypto.subtle.importKey(
      'spki',
      new TextEncoder().encode(this.publicKeyPEM),
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify']
    );

    const exported = await crypto.webcrypto.subtle.exportKey('jwk', publicKey);
    this.publicKeyJWK = exported as any;
    return exported;
  }

  /**
   * Make a request with DPoP proof
   *
   * Adds both:
   * - Authorization: Bearer <access_token>
   * - DPoP: <proof_jwt>
   */
  async request<T = unknown>(
    url: string,
    accessToken: string,
    options?: RequestInit & { method?: string }
  ): Promise<T> {
    const method = options?.method ?? 'GET';
    const proof = await this.generateProof(method, url);

    const headers = new Headers(options?.headers || {});
    headers.set('Authorization', `DPoP ${accessToken}`);
    headers.set('DPoP', proof);

    const response = await fetch(url, {
      ...options,
      method,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    return response.json() as Promise<T>;
  }
}

/**
 * Global DPoP instance
 */
let globalDPoP: DPoP | null = null;

/**
 * Initialize DPoP with a stored keypair
 */
export function initializeDPoP(opts: {
  publicKeyPEM?: string;
  privateKeyPEM?: string;
  claimTtlSeconds?: number;
}): DPoP {
  if (!globalDPoP) {
    const publicKeyPEM = opts.publicKeyPEM || process.env.DPOP_PUBLIC_KEY || '';
    const privateKeyPEM = opts.privateKeyPEM || process.env.DPOP_PRIVATE_KEY || '';

    if (!publicKeyPEM || !privateKeyPEM) {
      throw new Error('DPOP_PUBLIC_KEY and DPOP_PRIVATE_KEY environment variables required');
    }

    globalDPoP = new DPoP({
      publicKeyPEM,
      privateKeyPEM,
      claimTtlSeconds: opts.claimTtlSeconds,
    });
  }

  return globalDPoP;
}

/**
 * Example: Generate and store a keypair
 *
 * ```typescript
 * const { publicKeyPEM, privateKeyPEM } = await DPoP.generateKeyPair();
 * console.log('Public:', publicKeyPEM);
 * console.log('Private:', privateKeyPEM);
 *
 * // Store securely:
 * // 1. Copy private key to 1Password / AWS Secrets Manager
 * // 2. Set DPOP_PRIVATE_KEY environment variable
 * // 3. Set DPOP_PUBLIC_KEY for verification
 * ```
 */

/**
 * Example: Use DPoP with token exchange
 *
 * ```typescript
 * const dpop = initializeDPoP();
 *
 * // Get access token via Client Credentials flow
 * const oauthClient = new ClientCredentialsClient({...});
 * const token = await oauthClient.getAccessToken();
 *
 * // Make request with DPoP binding
 * const data = await dpop.request<{ users: any[] }>(
 *   'https://api.example.com/users',
 *   token
 * );
 * console.log(data.users);
 * ```
 */

/**
 * Why DPoP matters:
 *
 * Scenario: An agent's access token is leaked (e.g., log file, network sniffer).
 *
 * Without DPoP:
 * - Attacker can use the token immediately
 * - Token is valid for 1+ hours (ample time to cause damage)
 * - Server has no way to detect it's a different client
 *
 * With DPoP:
 * - Token is bound to the agent's public key (via JWK Thumbprint)
 * - Attacker must also have the private key to forge a DPoP proof
 * - Server validates the DPoP proof on every request
 * - If the private key is in secure storage (e.g., encrypted in 1Password),
 *   the attacker can't use the leaked token
 *
 * DPoP is growing adoption in 2025–2026:
 * - ZITADEL supports DPoP
 * - Connect2id supports DPoP
 * - MCP spec encourages DPoP for sensitive remote servers
 *
 * Implementation checklist:
 * ✓ Generate ES256 keypair once; store securely
 * ✓ For every request: generate a fresh DPoP proof JWT
 * ✓ Include: htm (method), htu (URI), iat, exp, jti (random UUID)
 * ✓ Set typ=dpop+jwt in header
 * ✓ Rotate keypair annually
 * ✓ Server validates: DPoP signature, htm/htu match, iat/exp within bounds
 */
