/**
 * RFC 8693 Token Exchange for agent delegation
 * Canonical spec: https://datatracker.ietf.org/doc/html/rfc8693
 * Use: Exchange user token + agent token for narrowly-scoped delegated token
 *
 * <CUSTOMISE>
 * - Set the token endpoint, JWKS URI and issuer of your IdP
 * - Pass this service's OAuth client credentials; the exchange is an authenticated request
 * - Adjust scope restrictions per your security policy
 * </CUSTOMISE>
 */

import { jwtVerify, createRemoteJWKSet } from "jose";

/** RFC 8693 section 3 token-type identifier for access tokens. */
const TOKEN_TYPE_ACCESS_TOKEN = "urn:ietf:params:oauth:token-type:access_token";

/**
 * Token Exchange Request per RFC 8693 section 2.1
 */
interface TokenExchangeRequest {
  grant_type: "urn:ietf:params:oauth:grant-type:token-exchange";
  subject_token: string; // JWT of the user authorizing the delegation
  subject_token_type: "urn:ietf:params:oauth:token-type:jwt";
  actor_token: string; // JWT of the agent acting on behalf of the user
  actor_token_type: "urn:ietf:params:oauth:token-type:jwt";
  requested_token_type: string; // token-type URN, e.g. TOKEN_TYPE_ACCESS_TOKEN
  audience: string; // Service that will accept the token
  scope?: string; // Space-separated scopes (narrower than either input token)
  resource?: string; // Optional: specific resource URI
}

/**
 * Token Exchange Response per RFC 8693 section 2.2
 */
interface TokenExchangeResponse {
  access_token: string;
  issued_token_type: "urn:ietf:params:oauth:token-type:access_token";
  token_type: "Bearer";
  expires_in: number;
  scope?: string;
  refresh_token?: string;
}

/**
 * Agent token exchange client
 */
export class TokenExchangeClient {
  private readonly tokenExchangeEndpoint: string;
  private readonly expectedIssuer: string;
  private readonly allowedAlgorithms: string[];
  private readonly authorization: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(opts: {
    tokenExchangeEndpoint: string;
    jwksUri: string;
    expectedIssuer: string;
    /** This service's OAuth client. RFC 8693 section 2.1 uses normal client authentication. */
    clientId: string;
    clientSecret: string;
    allowedAlgorithms?: string[];
  }) {
    this.tokenExchangeEndpoint = opts.tokenExchangeEndpoint;
    this.expectedIssuer = opts.expectedIssuer;
    this.allowedAlgorithms = opts.allowedAlgorithms ?? ["RS256", "ES256"];
    this.jwks = createRemoteJWKSet(new URL(opts.jwksUri));
    // RFC 6749 section 2.3.1: form-encode each credential, then base64 the pair
    this.authorization = `Basic ${Buffer.from(
      `${encodeURIComponent(opts.clientId)}:${encodeURIComponent(opts.clientSecret)}`,
    ).toString("base64")}`;
  }

  /**
   * Validate a JWT before sending it to the token exchange endpoint. This is an
   * early local check; the authorization server validates both tokens again.
   */
  private async validateJWT(token: string): Promise<string> {
    const { payload } = await jwtVerify(token, this.jwks, {
      algorithms: this.allowedAlgorithms,
      issuer: this.expectedIssuer,
      requiredClaims: ["sub"],
    });
    return payload.sub as string;
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
    scope?: string,
  ): Promise<TokenExchangeResponse> {
    // Validate input tokens
    const userId = await this.validateJWT(subjectToken);
    const agentId = await this.validateJWT(actorToken);

    console.log(
      `[TokenExchange] Exchanging token: user=${userId}, agent=${agentId}, audience=${audience}`,
    );

    // Prepare token exchange request
    const body = new URLSearchParams({
      actor_token: actorToken,
      actor_token_type: "urn:ietf:params:oauth:token-type:jwt",
      audience,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      requested_token_type: TOKEN_TYPE_ACCESS_TOKEN,
      subject_token: subjectToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    });

    if (scope) {
      body.append("scope", scope);
    }

    // Send to token exchange endpoint
    const response = await fetch(this.tokenExchangeEndpoint, {
      body: body.toString(),
      headers: {
        Authorization: this.authorization,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Token exchange failed (${response.status}): ${errorBody.slice(0, 200)}`);
    }

    const exchanged = (await response.json()) as TokenExchangeResponse;

    console.log(
      `[TokenExchange] Token exchanged successfully, expires in ${exchanged.expires_in}s`,
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
 *   clientId: process.env.OAUTH_CLIENT_ID,
 *   clientSecret: process.env.OAUTH_CLIENT_SECRET,
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
