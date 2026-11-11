/**
 * OAuth 2.0 Client Credentials flow for M2M (machine-to-machine) agents
 * Canonical spec: https://datatracker.ietf.org/doc/html/rfc6749#section-4.4
 * Use: Exchange client_id + client_secret for short-lived access token
 *
 * <CUSTOMISE>
 * - Set OAUTH_TOKEN_URL, OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET
 * - Adjust EXPIRY_MARGIN_MS and the retry parameters
 * - If your IdP only accepts client_secret_post, move the credentials into the body
 * </CUSTOMISE>
 */

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

interface CachedToken {
  token: string;
  /** Epoch milliseconds after which the token is no longer handed out. */
  expiresAt: number;
}

/** A response that is not worth retrying: the request itself is wrong. */
class TokenRequestRejected extends Error {}

/** Stop using a token this long before the server says it expires. */
const EXPIRY_MARGIN_MS = 30_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 200;

/**
 * OAuth 2.0 Client Credentials client
 */
export class ClientCredentialsClient {
  private readonly tokenEndpoint: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly scopes: string[];
  private cached: CachedToken | null = null;
  private pending: Promise<string> | null = null;

  constructor(opts: {
    tokenEndpoint: string;
    clientId: string;
    clientSecret: string;
    scopes?: string[];
  }) {
    this.tokenEndpoint = opts.tokenEndpoint;
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.scopes = opts.scopes ?? [];
  }

  /**
   * Get a valid access token, using the cache if available. Concurrent callers
   * share one token request.
   */
  async getAccessToken(): Promise<string> {
    if (this.cached && this.cached.expiresAt > Date.now()) {
      return this.cached.token;
    }
    this.pending ??= this.refresh().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async refresh(): Promise<string> {
    const token = await this.fetchTokenWithRetry();
    // RFC 6749 makes expires_in optional. Without it the lifetime is unknown, so
    // the token is used once and not cached.
    this.cached =
      token.expires_in === undefined
        ? null
        : {
            expiresAt: Date.now() + token.expires_in * 1000 - EXPIRY_MARGIN_MS,
            token: token.access_token,
          };
    return token.access_token;
  }

  /**
   * Fetch a token, retrying network failures, 429 and 5xx with exponential
   * backoff and jitter. A 4xx such as invalid_client fails at once.
   */
  private async fetchTokenWithRetry(): Promise<TokenResponse> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.fetchToken();
      } catch (error) {
        if (error instanceof TokenRequestRejected || attempt === MAX_ATTEMPTS) {
          throw error;
        }
        const backoff = RETRY_BASE_MS * 2 ** (attempt - 1);
        const waitMs = backoff + Math.random() * backoff;
        console.warn(
          `[OAuth] Token fetch attempt ${attempt} failed, retrying in ${Math.round(waitMs)}ms`,
          error,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  /**
   * POST to the token endpoint. The client authenticates with HTTP Basic, the
   * method RFC 6749 section 2.3.1 requires servers to support; sending the
   * secret in the body is NOT RECOMMENDED there.
   */
  private async fetchToken(): Promise<TokenResponse> {
    const body = new URLSearchParams({ grant_type: "client_credentials" });
    if (this.scopes.length > 0) {
      body.append("scope", this.scopes.join(" "));
    }

    // RFC 6749 section 2.3.1: form-encode each credential, then base64 the pair
    const credentials = Buffer.from(
      `${encodeURIComponent(this.clientId)}:${encodeURIComponent(this.clientSecret)}`,
    ).toString("base64");

    const response = await fetch(this.tokenEndpoint, {
      body: body.toString(),
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!response.ok) {
      const message = `Token endpoint returned ${response.status}: ${(await response.text()).slice(0, 200)}`;
      throw response.status === 429 || response.status >= 500
        ? new Error(message)
        : new TokenRequestRejected(message);
    }

    return (await response.json()) as TokenResponse;
  }

  /**
   * Make an authenticated HTTP request with Authorization header
   */
  async request<T = unknown>(url: string, options?: RequestInit): Promise<T> {
    const send = async () => {
      const headers = new Headers(options?.headers);
      headers.set("Authorization", `Bearer ${await this.getAccessToken()}`);
      return fetch(url, { ...options, headers });
    };

    let response = await send();
    if (response.status === 401) {
      // The token may have been revoked or expired server-side: drop it and retry
      // once. A 403 is a permission answer, which a new token does not change.
      this.cached = null;
      response = await send();
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }

    return (await response.json()) as T;
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
 * Singleton instance for module-level use, configured from OAUTH_TOKEN_URL,
 * OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET and (optionally) OAUTH_SCOPE.
 * A missing variable throws.
 */
let globalClient: ClientCredentialsClient | null = null;

export function getOAuthClient(): ClientCredentialsClient {
  globalClient ??= new ClientCredentialsClient({
    clientId: requireEnv("OAUTH_CLIENT_ID"),
    clientSecret: requireEnv("OAUTH_CLIENT_SECRET"),
    scopes: process.env.OAUTH_SCOPE?.split(" ").filter(Boolean),
    tokenEndpoint: requireEnv("OAUTH_TOKEN_URL"),
  });
  return globalClient;
}

/**
 * Example usage:
 *
 * ```typescript
 * const client = new ClientCredentialsClient({
 *   tokenEndpoint: 'https://auth.example.com/token',
 *   clientId: 'my-agent-client-id',
 *   clientSecret: 'my-secret-key',
 *   scopes: ['users:read', 'posts:write'],
 * });
 *
 * // Get token (cached if valid)
 * const token = await client.getAccessToken();
 *
 * // Make authenticated request
 * const data = await client.request<{ users: any[] }>('https://api.example.com/users');
 * console.log(data.users);
 *
 * // Or use the singleton, configured from the environment
 * const globalClient = getOAuthClient();
 * const result = await globalClient.request('https://api.example.com/data');
 * ```
 */

/**
 * Why Client Credentials for agents:
 *
 * - No user interaction required (agent can't click OAuth consent buttons)
 * - Token issued directly to the agent's identity
 * - Scoped to specific resources/operations (least privilege)
 * - Short-lived (typically 1 hour), auto-renewed on demand
 * - Audit trail: log shows agent identity (e.g., 'my-agent-service')
 *
 * Env vars (from .env or secret manager):
 * OAUTH_CLIENT_ID=agent-service-prod
 * OAUTH_CLIENT_SECRET=sk_live_<128-char-random-string>
 * OAUTH_TOKEN_URL=https://auth.example.com/token
 * OAUTH_SCOPE=users:read posts:write
 */
