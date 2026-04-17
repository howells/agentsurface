/**
 * OAuth 2.0 Client Credentials flow for M2M (machine-to-machine) agents
 * Canonical spec: https://datatracker.ietf.org/doc/html/rfc6749#section-4.4
 * Use: Exchange client_id + client_secret for short-lived access token
 *
 * <CUSTOMISE>
 * - Set TOKEN_ENDPOINT to your IdP's token URL
 * - Configure OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET env vars
 * - Adjust TOKEN_CACHE_TTL and retry parameters
 * </CUSTOMISE>
 */

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
  scope?: string;
}

/**
 * OAuth 2.0 Client Credentials client
 */
export class ClientCredentialsClient {
  private tokenEndpoint: string;
  private clientId: string;
  private clientSecret: string;
  private scopes: string[];
  private tokenCache: Map<string, CachedToken> = new Map();
  private maxRetries: number = 3;
  private retryBackoffMs: number = 100;

  constructor(opts: {
    tokenEndpoint: string;
    clientId?: string;
    clientSecret?: string;
    scopes?: string[];
  }) {
    this.tokenEndpoint = opts.tokenEndpoint;
    this.clientId = opts.clientId || process.env.OAUTH_CLIENT_ID || '';
    this.clientSecret = opts.clientSecret || process.env.OAUTH_CLIENT_SECRET || '';
    this.scopes = opts.scopes || (process.env.OAUTH_SCOPE?.split(' ') || []);

    if (!this.clientId || !this.clientSecret) {
      throw new Error('OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET required');
    }
  }

  /**
   * Get a valid access token, using cache if available
   */
  async getAccessToken(): Promise<string> {
    const cacheKey = this.scopes.join(' ') || 'default';

    // Check cache
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 30000) {
      // If >30s left, use cached token
      return cached.token;
    }

    // Fetch new token with exponential backoff retry
    const token = await this.fetchTokenWithRetry();
    const expiresAt = Date.now() + token.expires_in * 1000 - 30000; // Refresh 30s early

    this.tokenCache.set(cacheKey, {
      token: token.access_token,
      expiresAt,
      scope: token.scope,
    });

    return token.access_token;
  }

  /**
   * Fetch token with exponential backoff + jitter
   */
  private async fetchTokenWithRetry(): Promise<TokenResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.fetchToken();
      } catch (err) {
        lastError = err as Error;
        const waitMs = this.retryBackoffMs * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(
          `[OAuth] Token fetch attempt ${attempt + 1} failed, retrying in ${waitMs}ms: ${lastError.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    throw new Error(
      `Failed to fetch access token after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * POST to token endpoint
   */
  private async fetchToken(): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    if (this.scopes.length > 0) {
      body.append('scope', this.scopes.join(' '));
    }

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'oauth-client-credentials/1.0',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Token endpoint returned ${response.status}: ${errorBody.slice(0, 200)}`
      );
    }

    return response.json() as Promise<TokenResponse>;
  }

  /**
   * Make an authenticated HTTP request with Authorization header
   */
  async request<T = unknown>(
    url: string,
    options?: RequestInit & { method?: string }
  ): Promise<T> {
    const token = await this.getAccessToken();

    const headers = new Headers(options?.headers || {});
    headers.set('Authorization', `Bearer ${token}`);

    // Add X-Forwarded-For for tracing (if available)
    if (process.env.X_FORWARDED_FOR) {
      headers.set('X-Forwarded-For', process.env.X_FORWARDED_FOR);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      // Token may have expired server-side; invalidate cache and retry once
      const cacheKey = this.scopes.join(' ') || 'default';
      this.tokenCache.delete(cacheKey);

      const newToken = await this.getAccessToken();
      headers.set('Authorization', `Bearer ${newToken}`);

      return fetch(url, { ...options, headers }).then((r) => r.json());
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    return response.json() as Promise<T>;
  }
}

/**
 * Singleton instance for module-level use
 */
let globalClient: ClientCredentialsClient | null = null;

export function getOAuthClient(opts?: {
  tokenEndpoint?: string;
  clientId?: string;
  clientSecret?: string;
  scopes?: string[];
}): ClientCredentialsClient {
  if (!globalClient) {
    globalClient = new ClientCredentialsClient(
      opts || {
        tokenEndpoint: process.env.OAUTH_TOKEN_URL || 'https://auth.example.com/token',
      }
    );
  }
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
 * // Or use singleton
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
