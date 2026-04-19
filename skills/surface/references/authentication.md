# Authentication

## Summary

Dimension 5 scores machine-to-machine (M2M) authentication capability. Agents cannot solve CAPTCHAs, complete OAuth redirects, or interactively enter credentials. Baseline is OAuth 2.1 Client Credentials with scoped short-lived tokens injected via environment variables. Frontier includes token exchange (RFC 8693) for narrowly-scoped ephemeral tokens and agent identity as first-class principal. Scores based on auth mechanism, token scope/lifetime, and agent-consumability.

- **0**: Browser-only auth or CAPTCHA (blocker)
- **1**: API keys without M2M OAuth or overly broad scopes
- **2**: OAuth 2.1 Client Credentials, scoped, short-lived tokens
- **3**: Token Exchange (RFC 8693), agent identity tracking, .well-known endpoints
- **Evidence**: client_credentials grants, Bearer token validation, scope definitions, env-var injection

---

Agents cannot solve CAPTCHAs, complete OAuth authorization-code redirects, or interactively enter credentials. Machine-to-machine (M2M) authentication via OAuth 2.0 Client Credentials is the baseline; token exchange and agent-delegated identities represent the frontier. Effective agent auth ensures credentials live in environment variables, tokens expire in hours, and every resource access is scoped to a minimal set of operations. The difference between a fully agent-consumable system and one requiring manual intervention often turns on whether secrets are injectable via `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET`, not hardcoded in code or stored in a browser's local storage.

## Scoring rubric

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | Browser-only auth. OAuth authorization code flow as only option. CAPTCHAs. Session cookies required. | Auth requires redirect to browser. No client_credentials grant. CAPTCHA in auth flow. Cookie-based sessions only. |
| 1 | API keys exist but no M2M OAuth. Keys may be long-lived or overly broad. | API key auth available. No OAuth client_credentials. Keys may be permanent. No scope limitation. |
| 2 | OAuth 2.1 Client Credentials grant. Scoped, short-lived tokens. Env var injection. JWT validation (iss, aud, exp). | OAuth config with client_credentials grant_type. Token scopes defined. JWT validation checking signature + claims. Tokens expire in hours. |
| 3 | Token Exchange (RFC 8693) for narrowly-scoped ephemeral tokens. Agent identity as first-class principal. Delegation patterns. MCP OAuth 2.1 compliance. | Token exchange endpoint. Audience-restricted tokens. Agent identity tracking. .well-known/oauth-protected-resource present. |

## Evidence to gather

- Grep for `client_credentials`, `Bearer`, `JWT`, `iss`, `aud`, `exp` tokens
- Auth config files: Clerk, Auth0, WorkOS, Supabase Auth, NextAuth, better-auth
- `.well-known/oauth-authorization-server` and `.well-known/oauth-protected-resource` (RFC 8414)
- API key generation endpoints and rotation mechanisms
- Token exchange implementation and audience restrictions
- CAPTCHAs in auth flow (anti-pattern)
- Long-lived API keys without scope (anti-pattern)
- Env-var injection for `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `API_KEY`

## Deep dive

### The M2M baseline: OAuth 2.0 Client Credentials

([RFC 6749 section 4.4](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4)) defines the machine-to-machine flow. The client POSTs to the token endpoint with:

```
grant_type=client_credentials
&client_id=<id>
&client_secret=<secret>
&scope=<scopes>
```

This returns a short-lived access token (typically 15 min–1 hour). The agent includes this token in the `Authorization: Bearer <token>` header on every request. Tokens are opaque (the server validates them), or JWT (the client can inspect but must validate the signature).

Key practices:
- Scope narrowly per resource or operation. `scope=users:read:id` is better than `scope=*`.
- Tokens expire; agents must handle 401 by re-requesting.
- Client credentials should not be embedded in code. Read from env vars (`process.env.OAUTH_CLIENT_ID`) or secret managers.
- Rotate secrets regularly (ideally on each deployment).

### Scoped API keys (acceptable, not ideal)

Some services (Stripe, Anthropic, OpenAI) issue API keys instead of OAuth. Best practices:

- **Scope per resource or operation.** Stripe's Restricted API Keys let you specify `allowed_apis: ["charges", "refunds"]`.
- **Prefix-taggable for revocation.** If a key starts with `sk_live_` or `sk_test_`, you can rotate all test keys at once.
- **Rotation API.** Offer a tool or endpoint to generate a new key and retire the old one.
- **Not a replacement for OAuth**—but pragmatic for simple agent integrations.

### Protected resource metadata

([RFC 8414 extension](https://datatracker.ietf.org/doc/html/rfc8414)) defines `.well-known/oauth-protected-resource`. A public resource server exposes:

```json
{
  "resource_url": "https://api.example.com",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["users:read", "users:write", "billing:read"],
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "response_types_supported": ["token"]
}
```

This is consumed by MCP 2025-11-25 remote servers to validate and route requests. Always publish this metadata if your API is exposed to remote agents.

### Agent identity and delegation

([RFC 8693 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693)) enables "user A authorises agent B to act on their behalf with scope C for audience D". The flow:

```
POST /token
subject_token=<user_jwt>
&subject_token_type=urn:ietf:params:oauth:token-type:jwt
&actor_token=<agent_jwt>
&actor_token_type=urn:ietf:params:oauth:token-type:jwt
&requested_token_use=access_token
&audience=https://api.example.com
&scope=users:read
```

The IdP returns a new access token with narrower scope and audience. JWT claims to track:

- `iss` (issuer): which IdP issued the token.
- `sub` (subject): the end user.
- `aud` (audience): which service can use this token.
- `azp` (authorized party): the agent acting on behalf of `sub`.
- `act` (actor chain): for nested delegation (agent → agent → service).
- `scope`: which operations are allowed.
- `exp` (expiry): UNIX timestamp; token expires at this time.

Always separate agent identity from user identity in logs and audits.

### DPoP (RFC 9449): sender-constrained tokens

([RFC 9449 Demonstration of Proof-of-Possession](https://www.rfc-editor.org/rfc/rfc9449.html)) binds an access token to the client's public key. If a token is exfiltrated, it cannot be replayed because the attacker lacks the private key.

The client:
1. Generates a keypair.
2. Signs a `DPoP` JWT per request (includes method, URI, timestamp, public key hash).
3. Sends both the `Authorization` and `DPoP` headers.

The server validates the DPoP signature and ensures the public key matches. Growing adoption in 2025–2026: Connect2id, ZITADEL, and MCP spec encourages it for sensitive remote servers.

TypeScript example using `jose`:

```typescript
import { SignJWT, jwtVerify, exportSPKI, generateKeyPair } from 'jose';

async function generateDPopProof(method: string, uri: string, publicKeyPEM: string) {
  const secret = await crypto.subtle.importKey(
    'pkcs8',
    new TextEncoder().encode(privateKeyPEM),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return new SignJWT({
    jti: crypto.randomUUID(),
    htm: method,
    htu: uri,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'dpop+jwt' })
    .sign(secret);
}
```

### OAuth 2.1 (draft as of April 2026)

([OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)) consolidates best practices:

- **PKCE mandatory** on all authorization-code flows (even confidential clients).
- **Implicit and Resource Owner Password Credential (ROPC) grants removed.** Authorization code only.
- **Refresh token rotation.** Issue a new refresh token on each use; retire the old one.
- **Exact-match redirect URIs.** No wildcard paths.
- **Bearer tokens restricted to authenticated channels.** No query strings (tokens leak in logs).

For agents, the takeaway: if you offer OAuth, use Client Credentials + Token Exchange. Avoid interactive flows.

### JWT validation

Use `jose` (TypeScript, platform-agnostic) or legacy `jsonwebtoken` (Node only). Always validate:

1. **Signature:** Verify the JWT signature against the IdP's JWKS (public key set) at `jwks_uri`. Reject if the signature is invalid.
2. **Issuer (`iss`):** Ensure it matches the expected IdP URL.
3. **Audience (`aud`):** Ensure it includes your service.
4. **Expiry (`exp`):** Ensure the token has not expired.
5. **Not-before (`nbf`):** Ensure the token is not used before its valid-from time.
6. **Type (`typ`):** For DPoP, ensure `typ: 'at+jwt'` (not `'dpop+jwt'`).

Rejection checklist:
- Asymmetric key (`RS256`, `ES256`) converted to symmetric (`HS256`). This is a critical vulnerability; always reject.
- Missing `iss`, `aud`, or `exp` claims.
- Algorithm header (`alg`) is `none`.

TypeScript with `jose`:

```typescript
import { jwtVerify } from 'jose';
import { createRemoteJWKSet } from 'jose/jwks.remote';

async function validateToken(token: string, jwksUri: string) {
  const jwks = createRemoteJWKSet(new URL(jwksUri));
  const verified = await jwtVerify(token, jwks, {
    issuer: 'https://auth.example.com',
    audience: 'https://api.example.com',
    algorithms: ['RS256', 'ES256'], // whitelist safe algorithms
  });
  return verified.payload;
}
```

### Env-var injection for agents

Agents read credentials from the environment; never from prompts. Document the env-var surface explicitly:

```
OAUTH_CLIENT_ID=          # Machine-readable app identifier
OAUTH_CLIENT_SECRET=      # Long random string; rotate regularly
OAUTH_TOKEN_URL=          # https://auth.example.com/token
OAUTH_SCOPE=              # Space-separated: users:read billing:read
API_KEY=                  # If not using OAuth; includes prefix (sk_live_abc...)
```

Support `.env` files (locally) and external secret managers:

```typescript
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Local dev: .env file
dotenv.config({ path: '.env.local' });

// Production: 1Password / Vault CLI
const secret = process.env.OAUTH_CLIENT_SECRET ||
  execSync('op read op://vault/item/field').toString().trim();
```

### TypeScript patterns (Next.js / Node)

**Protected Next.js App Router route handler with client-credentials JWT validation:**

```typescript
import { jwtVerify } from 'jose';
import { createRemoteJWKSet } from 'jose/jwks.remote';

const jwks = createRemoteJWKSet(new URL('https://auth.example.com/.well-known/jwks.json'));

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  try {
    const verified = await jwtVerify(token, jwks, {
      issuer: 'https://auth.example.com',
      audience: 'https://api.example.com',
    });

    const agentId = verified.payload.azp;
    const scope = (verified.payload.scope as string)?.split(' ') || [];
    const userId = verified.payload.sub;

    // Log both agent and user for audit
    console.log(`Agent ${agentId} acting on behalf of ${userId} with scopes [${scope.join(', ')}]`);

    // Handle the request
    return Response.json({ data: 'authorized' });
  } catch (err) {
    return Response.json({ error: 'Invalid token' }, { status: 403 });
  }
}
```

**Token Exchange request to a trusted IdP:**

```typescript
async function requestDelegatedToken(userJwt: string, agentJwt: string, audience: string) {
  const form = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: userJwt,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    actor_token: agentJwt,
    actor_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    requested_token_use: 'access_token',
    audience: audience,
    scope: 'users:read',
  });

  const res = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}
```

## Cross-vendor notes

**Anthropic Claude Agent SDK:** Auth is handled by the host environment. Remote MCP servers must expose OAuth metadata at `.well-known/oauth-protected-resource`. The SDK passes `Authorization` headers forwarded from the agent's context.

**OpenAI Responses API:** Remote MCP tools require auth headers forwarded. Use `authorization` in the tool config. OAuth 2.0 Client Credentials is the recommended M2M pattern.

**Google Vertex AI:** Uses IAM short-lived access tokens via Application Default Credentials (ADC). `gcloud auth application-default login` for dev; service account JSON for production. Agent Engine supports service accounts natively.

**MCP 2025-11-25:** Remote servers must advertise `.well-known/oauth-protected-resource`. The client validates JWTs with `iss`, `aud`, and `exp` claims. Async tasks support token refresh mid-flow.

## Anti-patterns

- **Long-lived API keys with full-account scope.** Rotate every 90 days. Always scope to a subset of operations.
- **Auth via browser redirect only.** Agents can't click links or enter credentials. Always offer M2M.
- **CAPTCHAs in the auth flow.** Agents fail silently. Use rate limiting instead.
- **JWT validation that trusts the `alg` header.** Whitelist algorithms (`RS256`, `ES256`). Reject `none` and downgrades to symmetric (`HS256`).
- **Storing access tokens in client-side storage (localStorage, sessionStorage).** Use HttpOnly cookies or in-memory storage.
- **Missing `.well-known` metadata on public resource servers.** Agents and external integrations depend on it.
- **No token rotation.** Require token refresh every 1–2 hours. Auto-rotate on key rotation.
- **Hardcoding secrets in code.** Always read from env vars or secret managers.
- **Omitting agent identity from logs.** Track both `azp` (agent) and `sub` (user) for audit and debugging.

## Templates and tooling

- `/templates/oauth-client-credentials.ts` — complete M2M flow with short-lived tokens.
- `/templates/jwt-validate.ts` — jose-based token validation with JWKS caching.
- `/templates/well-known-oauth-protected-resource.ts` — Next.js endpoint serving RFC 8414 metadata.
- `/templates/token-exchange.ts` — RFC 8693 token exchange implementation.
- `/templates/dpop-header.ts` — DPoP proof signing for sender-constrained tokens.

**Libraries:**
- `jose` — JWT signing + validation, JWKS fetching, all platforms.
- `openid-client` — OIDC discovery, token exchange.
- `better-auth` — drop-in auth framework for Next.js (supports OAuth + JWT).
- `lucia` — lightweight session + JWT library.
- `clerk/backend` — Clerk SDK for Node (auth + JWTs).
- `workos-node` — WorkOS SDK for OAuth + SSO.

## Citations

- ([RFC 6749: OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)) — Client Credentials, token endpoint.
- ([RFC 8414: OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)) — `.well-known/oauth-authorization-server` and `.well-known/oauth-protected-resource`.
- ([RFC 8693: OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693)) — Delegated access, narrowly-scoped tokens.
- ([RFC 9449: OAuth 2.0 Demonstration of Proof-of-Possession Mechanisms](https://www.rfc-editor.org/rfc/rfc9449.html)) — DPoP, sender-constrained tokens.
- ([OAuth 2.1 (draft)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)) — PKCE, removed insecure flows, refresh token rotation.
- ([MCP 2025-11-25 Specification](https://modelcontextprotocol.io/specification/2025-11-25)) — Remote MCP OAuth 2.0 compliance.
- ([jose on npm](https://www.npmjs.com/package/jose)) — TypeScript JWT library.

## See also

- `docs/authentication` — Full guide to agent auth patterns.
- `references/mcp-servers.md` — Remote MCP auth and metadata.
- `references/scoring-rubric.md#dimension-5-authentication` — Dimension 5 scoring.
- `templates/oauth-client-credentials.ts` — M2M token flow.
- `templates/jwt-validate.ts` — Token validation with JWKS.
