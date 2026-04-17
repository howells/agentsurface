/**
 * RFC 8693 Token Exchange for agent delegation
 * Canonical spec: https://datatracker.ietf.org/doc/html/rfc8693
 * Use: Exchange user token + agent token for narrowly-scoped delegated token
 *
 * <CUSTOMISE>
 * - Set TOKEN_EXCHANGE_ENDPOINT to your IdP's token endpoint
 * - Configure expected audiences and issuer
 * - Adjust scope restrictions per your security policy
 * </CUSTOMISE>
 */

import { jwtVerify, createRemoteJWKSet, SignJWT } from 'jose';

/**
 * Token Exchange Request per RFC 8693 section 2.1
 */
interface TokenExchangeRequest {
  grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange';
  subject_token: string; // JWT of the user authorizing the delegation
  subject_token_type: 'urn:ietf:params:oauth:token-type:jwt';
  actor_token: string; // JWT of the agent acting on behalf of the user
  actor_token_type: 'urn:ietf:params:oauth:token-type:jwt';
  requested_token_use: 'access_token' | 'refresh_token';
  audience: string; // Service that will accept the token
  scope?: string; // Space-separated scopes (narrower than either input token)
  resource?: string; // Optional: specific resource URI
}

/**
 * Token Exchange Response per RFC 8693 section 2.2
 */
interface TokenExchangeResponse {
  access_token: string;
  issued_token_type: 'urn:ietf:params:oauth:token-type:access_token';
  token_type: 'Bearer';
  expires_in: number;
  scope?: string;
  refresh_token?: string;
}

/**
 * Agent token exchange client
 */
export class TokenExchangeClient {
  private tokenExchangeEndpoint: string;
  private jwksUri: string;
  private expectedIssuer: string;
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(opts: {
    tokenExchangeEndpoint: string;
    jwksUri: string;
    expectedIssuer: string;
  }) {
    this.tokenExchangeEndpoint = opts.tokenExchangeEndpoint;
    this.jwksUri = opts.jwksUri;
    this.expectedIssuer = opts.expectedIssuer;
  }

  /**
   * Validate a JWT before sending to token exchange endpoint
   */
  private async validateJWT(
    token: string,
    expectedAudience?: string
  ): Promise<Record<string, unknown>> {
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(this.jwksUri));
    }

    try {
      const verified = await jwtVerify(token, this.jwks, {
        issuer: this.expectedIssuer,
        ...(expectedAudience && { audience: expectedAudience }),
      });

      return verified.payload as Record<string, unknown>;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`JWT validation failed: ${message}`);
    }
  }

  /**
   * Exchange user token + agent token for a delegated access token
   *
   * @param subjectToken JWT of the user authorizing the delegation
   * @param actorToken JWT of the agent acting on behalf of the user
   * @param audience Service that will consume the exchanged token
   * @param scope Optional: narrower scope than the input tokens (e.g., 'users:read')
   * @returns Delegated access token valid for the given audience
   */
  async exchangeToken(
    subjectToken: string,
    actorToken: string,
    audience: string,
    scope?: string
  ): Promise<TokenExchangeResponse> {
    // Validate input tokens
    const subjectPayload = await this.validateJWT(subjectToken);
    const actorPayload = await this.validateJWT(actorToken);

    const userId = subjectPayload.sub as string;
    const agentId = actorPayload.sub as string;

    console.log(
      `[TokenExchange] Exchanging token: user=${userId}, agent=${agentId}, audience=${audience}`
    );

    // Prepare token exchange request
    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: subjectToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      actor_token: actorToken,
      actor_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      requested_token_use: 'access_token',
      audience,
    });

    if (scope) {
      body.append('scope', scope);
    }

    // Send to token exchange endpoint
    const response = await fetch(this.tokenExchangeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Token exchange failed (${response.status}): ${errorBody.slice(0, 200)}`);
    }

    const exchanged = (await response.json()) as TokenExchangeResponse;

    console.log(
      `[TokenExchange] Token exchanged successfully, expires in ${exchanged.expires_in}s`
    );

    return exchanged;
  }
}

/**
 * RFC 8693: Actor claim for delegation chains
 *
 * If an agent delegates to another service on behalf of a user,
 * the delegated token includes an 'act' claim showing the chain:
 *
 * {
 *   "iss": "https://auth.example.com",
 *   "sub": "user-123",
 *   "aud": "https://downstream-api.com",
 *   "azp": "agent-1",
 *   "act": {
 *     "sub": "agent-1"
 *   },
 *   "exp": 1681234567
 * }
 *
 * Then, if agent-1 calls agent-2, the chain becomes:
 *
 * {
 *   "iss": "https://auth.example.com",
 *   "sub": "user-123",
 *   "aud": "https://downstream-api.com",
 *   "azp": "agent-2",
 *   "act": {
 *     "sub": "agent-2",
 *     "act": {
 *       "sub": "agent-1"
 *     }
 *   }
 * }
 */

/**
 * Example: Agent service requesting a delegated token
 *
 * ```typescript
 * const tokenExchangeClient = new TokenExchangeClient({
 *   tokenExchangeEndpoint: 'https://auth.example.com/token',
 *   jwksUri: 'https://auth.example.com/.well-known/jwks.json',
 *   expectedIssuer: 'https://auth.example.com',
 * });
 *
 * // User has authorized this agent to act on their behalf
 * const userToken = 'eyJ...' // JWT issued to user-123
 * const agentToken = 'eyJ...' // JWT issued to agent-service
 *
 * const delegatedToken = await tokenExchangeClient.exchangeToken(
 *   userToken,
 *   agentToken,
 *   'https://downstream-api.com', // Audience: the service the agent wants to call
 *   'users:read' // Scope: narrower permissions
 * );
 *
 * // Now use the delegated token to call downstream API
 * const response = await fetch('https://downstream-api.com/users', {
 *   headers: {
 *     'Authorization': `Bearer ${delegatedToken.access_token}`,
 *   },
 * });
 * ```
 */

/**
 * Why Token Exchange matters for agents:
 *
 * Scenario: A user authorizes Agent A to fetch their data from Service B.
 *
 * Without Token Exchange:
 * - Store the user's password (insecure, centralized vulnerability)
 * - Embed the user's API key in the agent (exposed if agent is compromised)
 * - Issue a token to the agent with full user permissions (over-privileged)
 *
 * With Token Exchange (RFC 8693):
 * 1. User issues a short-lived token authorizing Agent A
 * 2. Agent A requests a narrowly-scoped token for Service B
 * 3. Service B receives a token with:
 *    - Subject: the original user (audit trail)
 *    - Actor: Agent A (authorization chain)
 *    - Scope: only 'users:read' (least privilege)
 *    - Audience: Service B only (can't be replayed elsewhere)
 * 4. If Agent A is compromised, the token has limited scope and a time window
 *
 * This is the foundation for secure multi-agent systems.
 */
