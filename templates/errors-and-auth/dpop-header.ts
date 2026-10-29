/**
 * RFC 9449 DPoP (Demonstrating Proof of Possession) client
 * Canonical spec: https://www.rfc-editor.org/rfc/rfc9449.html
 * Use: Bind access tokens to the agent's public key; prevent token replay attacks
 *
 * <CUSTOMISE>
 * - Store the keypair in secure storage (e.g., 1Password, AWS Secrets Manager)
 * - Rotate the keypair on your key-management schedule
 * </CUSTOMISE>
 */

import { createHash, randomUUID } from "node:crypto";
import {
  SignJWT,
  calculateJwkThumbprint,
  exportJWK,
  exportPKCS8,
  exportSPKI,
  generateKeyPair,
  importPKCS8,
  importSPKI,
} from "jose";
import type { CryptoKey } from "jose";

/**
 * DPoP keypair manager
 */
export class DPoP {
  private readonly publicKeyPEM: string;
  private readonly privateKeyPEM: string;
  private publicJwk: { kty: string; crv: string; x: string; y: string } | null = null;
  private privateKey: CryptoKey | null = null;
  // Last DPoP-Nonce the server sent, if it requires nonces (RFC 9449 §8)
  private nonce: string | undefined;

  constructor(opts: { publicKeyPEM: string; privateKeyPEM: string }) {
    this.publicKeyPEM = opts.publicKeyPEM;
    this.privateKeyPEM = opts.privateKeyPEM;
  }

  /**
   * Generate a new ES256 keypair (NIST P-256)
   * Run once and store securely
   */
  static async generateKeyPair(): Promise<{ publicKeyPEM: string; privateKeyPEM: string }> {
    const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
    return {
      privateKeyPEM: await exportPKCS8(privateKey),
      publicKeyPEM: await exportSPKI(publicKey),
    };
  }

  /**
   * Public key as a JWK with public members only (cached)
   */
  private async getPublicJwk() {
    if (!this.publicJwk) {
      const publicKey = await importSPKI(this.publicKeyPEM, "ES256", { extractable: true });
      const { kty, crv, x, y } = await exportJWK(publicKey);
      this.publicJwk = { crv: crv!, kty: kty!, x: x!, y: y! };
    }
    return this.publicJwk;
  }

  /**
   * RFC 7638 JWK thumbprint. Send it as `dpop_jkt` in the authorization
   * request to bind the authorization code; the issued token carries it in cnf.jkt.
   */
  async thumbprint(): Promise<string> {
    return calculateJwkThumbprint(await this.getPublicJwk(), "sha256");
  }

  /**
   * Generate a DPoP proof JWT per RFC 9449 §4.2
   *
   * Header: { typ: "dpop+jwt", alg: "ES256", jwk: <public key> }
   * Claims: { jti, htm, htu (no query or fragment), iat, ath?, nonce? }
   *
   * Pass the access token when calling a protected resource; omit it for
   * proofs sent to the token endpoint.
   */
  async generateProof(method: string, uri: string, accessToken?: string): Promise<string> {
    if (!this.privateKey) {
      this.privateKey = await importPKCS8(this.privateKeyPEM, "ES256");
    }

    const url = new URL(uri);
    return new SignJWT({
      htm: method.toUpperCase(),
      htu: `${url.origin}${url.pathname}`,
      iat: Math.floor(Date.now() / 1000),
      jti: randomUUID(),
      ...(accessToken && {
        ath: createHash("sha256").update(accessToken).digest("base64url"),
      }),
      ...(this.nonce && { nonce: this.nonce }),
    })
      .setProtectedHeader({ alg: "ES256", jwk: await this.getPublicJwk(), typ: "dpop+jwt" })
      .sign(this.privateKey);
  }

  /**
   * Make a request with a DPoP-bound access token
   *
   * Sends:
   * - Authorization: DPoP <access_token>   (the DPoP scheme, not Bearer)
   * - DPoP: <proof_jwt>
   *
   * Retries once if the server demands a fresh nonce.
   */
  async request<T = unknown>(
    url: string,
    accessToken: string,
    options?: RequestInit & { method?: string },
  ): Promise<T> {
    const method = options?.method ?? "GET";

    const send = async () => {
      const headers = new Headers(options?.headers || {});
      headers.set("Authorization", `DPoP ${accessToken}`);
      headers.set("DPoP", await this.generateProof(method, url, accessToken));
      return fetch(url, { ...options, headers, method });
    };

    let response = await send();
    const serverNonce = response.headers.get("DPoP-Nonce");
    if (serverNonce) {
      this.nonce = serverNonce;
      if (
        response.status === 401 &&
        response.headers.get("WWW-Authenticate")?.includes("use_dpop_nonce")
      ) {
        response = await send();
      }
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    return (await response.json()) as T;
  }
}

/**
 * Global DPoP instance
 */
let globalDPoP: DPoP | null = null;

/**
 * Initialize DPoP with a stored keypair
 */
export function initializeDPoP(opts: { publicKeyPEM?: string; privateKeyPEM?: string } = {}): DPoP {
  if (!globalDPoP) {
    const publicKeyPEM = opts.publicKeyPEM || process.env.DPOP_PUBLIC_KEY || "";
    const privateKeyPEM = opts.privateKeyPEM || process.env.DPOP_PRIVATE_KEY || "";

    if (!publicKeyPEM || !privateKeyPEM) {
      throw new Error("DPOP_PUBLIC_KEY and DPOP_PRIVATE_KEY environment variables required");
    }

    globalDPoP = new DPoP({ privateKeyPEM, publicKeyPEM });
  }

  return globalDPoP;
}

/**
 * Example: Generate and store a keypair
 *
 * ```typescript
 * const { publicKeyPEM, privateKeyPEM } = await DPoP.generateKeyPair();
 *
 * // Store securely:
 * // 1. Copy the private key to 1Password / AWS Secrets Manager
 * // 2. Set DPOP_PRIVATE_KEY and DPOP_PUBLIC_KEY environment variables
 * ```
 */

/**
 * Example: Call a DPoP-protected API
 *
 * ```typescript
 * const dpop = initializeDPoP();
 *
 * // The token request itself must carry a DPoP proof (no ath) so the
 * // authorization server binds the token to this key (cnf.jkt)
 * const token = await getDpopBoundToken(dpop);
 *
 * const data = await dpop.request<{ users: unknown[] }>(
 *   "https://api.example.com/users?active=true",
 *   token,
 * );
 * ```
 */

/**
 * Why DPoP matters:
 *
 * Scenario: An agent's access token is leaked (e.g., log file, network sniffer).
 *
 * Without DPoP:
 * - Attacker can use the token immediately, until it expires
 * - Server has no way to detect it's a different client
 *
 * With DPoP:
 * - Token is bound to the agent's public key (cnf.jkt = JWK thumbprint)
 * - Attacker must also have the private key to produce a valid proof
 * - Each proof is tied to one method, URL and access token (htm, htu, ath)
 *
 * MCP status: DPoP is not part of the ratified MCP specification. A DPoP
 * profile exists only as an open proposal (SEP-1932). Resource servers can
 * still require it at the OAuth layer and advertise that with RFC 9728's
 * dpop_bound_access_tokens_required.
 *
 * Implementation checklist:
 * ✓ Generate an ES256 or EdDSA keypair once; store securely
 * ✓ For every request: a fresh proof with jti, htm, htu (no query), iat, ath
 * ✓ Set typ=dpop+jwt and embed the public JWK in the header
 * ✓ Send Authorization: DPoP <token>, not Bearer
 * ✓ Honour DPoP-Nonce when the server sends one
 * ✓ Server validates: signature, typ, htm/htu, iat window, ath, jti replay, cnf.jkt
 */
