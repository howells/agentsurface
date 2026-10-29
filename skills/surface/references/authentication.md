# Authentication

## Summary

Whether clients can obtain and use credentials appropriate to the acting identity. User-delegated access uses Authorization Code with PKCE; service-owned M2M access can use Client Credentials. Interactive consent at connection time is valid. Routine protected requests need scoped tokens and structured authentication failures.

Public read-only capabilities may require no authentication. For protected access, score the implemented identity boundary rather than requiring every service to support every grant. The [MCP authorization overview](https://modelcontextprotocol.io/extensions/auth/overview) treats user consent as the core case and Client Credentials as an optional M2M extension.

## Scoring rubric

| Score | Criteria                                                                                          | Evidence                                                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | No usable authorization path for the intended client and identity.                                | Protected requests return login HTML or require unsupported browser state; required consent or token acquisition cannot complete.                                                                                           |
| 1     | Programmatic access works, but permissions, credential lifetime or validation are incomplete.     | Broad or permanent credentials, incomplete scope enforcement, or unclear refresh and revocation behaviour.                                                                                                                  |
| 2     | A supported grant fits the identity, with scoped, time-bounded access and server-side validation. | Authorization Code with PKCE for user delegation, or Client Credentials for service-owned M2M; validate token issuer, audience/resource, expiry and permissions using the token format's validation mechanism.              |
| 3     | Level 2 plus verified discovery, isolation and credential recovery for the supported flows.       | Remote MCP protected-resource metadata where applicable; tested renewal, revocation and wrong-user/wrong-resource rejection; attributable actions. Token exchange or other extensions only when the use case requires them. |

## Evidence to gather

- Grep for `authorization_code`, `code_challenge`, `code_verifier`, `client_credentials`, `Bearer`, `JWT`, `iss`, `aud`, `exp` tokens
- Auth config files: Clerk, Auth0, WorkOS, Supabase Auth, NextAuth, better-auth
- `.well-known/oauth-authorization-server` (RFC 8414) and `.well-known/oauth-protected-resource` (RFC 9728)
- `auth.md` at the service root, plus `agent_auth` metadata in authorization server metadata
- advertised identity and claim endpoints (the reference uses `/agent/identity`), plus OAuth token and revocation endpoints
- API key generation endpoints and rotation mechanisms
- Token exchange implementation and audience restrictions
- Login HTML or CAPTCHA on protected API/token requests; distinguish these from human consent during connection setup
- Long-lived API keys without scope (anti-pattern)
- Env-var injection for `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `API_KEY`

## Deep dive

### Service-owned M2M: OAuth 2.0 Client Credentials

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

- **Scope per resource or operation.** Stripe's restricted API keys, for example, grant read or write permission per resource type instead of full account access.
- **Prefix-tagged keys.** A prefix such as `sk_live_` or `sk_test_` identifies a key's environment and type, which helps secret scanning and triage; bulk rotation still needs a key inventory and revoke/issue operations.
- **Rotation API.** Offer a tool or endpoint to generate a new key and retire the old one.
- **Not a replacement for OAuth** - but pragmatic for simple agent integrations.

### Protected resource metadata

([RFC 9728](https://www.rfc-editor.org/rfc/rfc9728.html)) defines OAuth 2.0 Protected Resource Metadata at `.well-known/oauth-protected-resource`. A public resource server exposes:

```json
{
  "resource": "https://api.example.com",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["users:read", "users:write", "billing:read"],
  "bearer_methods_supported": ["header"],
  "dpop_bound_access_tokens_required": false
}
```

Token-verification keys are not part of this document: they come from the authorization server's own RFC 8414 metadata (its `jwks_uri`). A `jwks_uri` in protected-resource metadata means the resource's own keys, for example for signed responses. If the resource requires DPoP, say so with the standard `dpop_bound_access_tokens_required` and `dpop_signing_alg_values_supported` fields.

Authorization server metadata remains RFC 8414. MCP clients use protected-resource metadata to discover authorization servers and request the right resource and scopes. Always publish it for a protected remote API or MCP server.

### Client registration: prefer Client ID Metadata Documents

Dynamic Client Registration ([RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591)) is deprecated in the MCP 2026-07-28 revision in favour of **Client ID Metadata Documents**, where the client ID is itself an HTTPS URL that resolves to the client's metadata. It remains available for backwards compatibility, but new clients and authorization servers should not adopt it.

What this changes in practice:

- Agent clients publish their metadata at a stable HTTPS URL and use that URL as the `client_id`, so no registration round-trip is needed before the first authorization request.
- Authorization servers fetch and cache that document rather than minting per-client records.
- Servers that already support DCR should keep it working for existing clients through the deprecation window and add Client ID Metadata Document support alongside.

The 2026-07-28 revision also tightens related requirements: authorization servers return the `iss` parameter in authorization responses and clients validate it against the expected issuer per [RFC 9207](https://www.rfc-editor.org/rfc/rfc9207.html), `application_type` becomes required where DCR is still used, and credentials are bound to the issuing authorization server - keyed by issuer, and re-registered if the issuer changes.

### auth.md for agentic registration

`auth.md` is an emerging registration profile. Publish the walkthrough beside RFC 9728 resource metadata and RFC 8414 authorization-server metadata. The optional `agent_auth` extension advertises `identity_endpoint`, `claim_endpoint`, and provider-facing `events_endpoint`, with `skill` linking to the walkthrough.

Use the current identity-method enum: `anonymous`, `identity_assertion`, and `service_auth`. List the ID-JAG URN inside `identity_assertion.assertion_types_supported`, never as a top-level identity method. Advertise only implemented methods.

Keep registration and token exchange separate: the provider supplies an audience-bound ID-JAG to the identity endpoint; the service returns its own assertion for exchange at the OAuth token endpoint. For a user claim, the agent gives the person a verification URL and code to enter on the service's authenticated page. Do not ask the person to relay an email OTP to the agent. Respect polling intervals, expiry, account-linking confirmation, and revocation.

Verify issuer trust, signature, audience, expiry, authentication freshness, and replay defenses. Enforce scopes on the API independently of registration. Follow the current canonical [auth.md guide](https://agentsurface.dev/docs/authentication/auth-md) and pin the [WorkOS reference](https://github.com/workos/auth.md) used by the integration. Fetch and exercise the complete discovery-to-action chain; endpoint existence alone is not proof.

### Agent identity and delegation

([RFC 8693 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693)) enables "user A authorises agent B to act on their behalf with scope C for audience D". The flow:

```
POST /token
grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=<user_jwt>
&subject_token_type=urn:ietf:params:oauth:token-type:jwt
&actor_token=<agent_jwt>
&actor_token_type=urn:ietf:params:oauth:token-type:jwt
&requested_token_type=urn:ietf:params:oauth:token-type:access_token
&audience=https://api.example.com
&scope=users:read
```

The IdP returns a new access token with narrower scope and audience. JWT claims to track:

- `iss` (issuer): which IdP issued the token.
- `sub` (subject): who the token is about - the end user in delegation, or a service for a service-owned token.
- `aud` (audience): which service can use this token.
- `act` (actor): the party acting on behalf of `sub`, as `act.sub`; nested `act` claims record a delegation chain (agent → agent → service).
- `client_id`: the OAuth client the token was issued to, where the token profile includes it (RFC 9068). Do not assume `azp` names the agent; its meaning depends on the issuer.
- `scope`: which operations are allowed.
- `exp` (expiry): UNIX timestamp; token expires at this time.

Always separate agent identity from user identity in logs and audits.

### DPoP (RFC 9449): sender-constrained tokens

([RFC 9449 Demonstration of Proof-of-Possession](https://www.rfc-editor.org/rfc/rfc9449.html)) binds an access token to the client's public key. If a token is exfiltrated, it cannot be replayed because the attacker lacks the private key.

The client:

1. Generates a keypair.
2. Signs a `DPoP` proof JWT per request: `typ: dpop+jwt`, the public JWK in the header, and `jti`, `htm`, `htu` (without query or fragment), `iat`, and `ath` (the access-token hash) as claims.
3. Sends `Authorization: DPoP <token>` (the DPoP scheme, not `Bearer`) plus the `DPoP` proof header.

The server validates the proof's signature, claims and `ath`, rejects replayed `jti` values, and checks that the JWK thumbprint matches the token's `cnf.jkt`. DPoP is a general OAuth 2.0 mechanism, not part of the MCP authorization specification itself - MCP's auth model builds on OAuth 2.1 and RFC 9728 protected-resource metadata but does not mandate or reference DPoP. Adopt it as an independent hardening step for sensitive remote servers (growing adoption in identity providers such as Connect2id and ZITADEL), and only claim DPoP support when the server actually implements RFC 9449.

TypeScript example using `jose`:

```typescript
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { createHash, randomUUID } from "node:crypto";

const { publicKey, privateKey } = await generateKeyPair("ES256");
const { kty, crv, x, y } = await exportJWK(publicKey);

async function generateDPopProof(method: string, uri: string, accessToken: string) {
  const url = new URL(uri);
  return new SignJWT({
    jti: randomUUID(),
    htm: method,
    htu: `${url.origin}${url.pathname}`, // no query or fragment
    iat: Math.floor(Date.now() / 1000),
    ath: createHash("sha256").update(accessToken).digest("base64url"),
  })
    .setProtectedHeader({ alg: "ES256", typ: "dpop+jwt", jwk: { kty, crv, x, y } })
    .sign(privateKey);
}
```

### OAuth 2.1

([OAuth 2.1](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/)) consolidates best practices. It is still an Internet-Draft - draft-16 was published 2026-09-03 (MCP `2026-07-28` itself cites draft-13). Never call it a final RFC in generated docs or implementation notes, and check the datatracker for a newer revision before pinning the number.

- **PKCE mandatory** on all authorization-code flows (even confidential clients).
- **Implicit and Resource Owner Password Credential (ROPC) grants removed.** Authorization code (with PKCE), client credentials and refresh token remain.
- **Refresh tokens for public clients must be sender-constrained or rotated.** Rotation issues a new refresh token on each use and retires the old one; DPoP binding is the other option.
- **Exact-match redirect URIs.** No wildcard paths.
- **Bearer tokens restricted to authenticated channels.** No query strings (tokens leak in logs).

For agents, the takeaway: use Client Credentials for service-owned runtime credentials and Token Exchange for delegation. Keep any human consent or user-code claim flow in a bounded registration path such as `auth.md`, not in every API request.

### JWT validation

Use `jose` (TypeScript, platform-agnostic) or legacy `jsonwebtoken` (Node only). Always validate:

1. **Signature:** Verify the JWT signature against the IdP's JWKS (public key set) at `jwks_uri`. Reject if the signature is invalid.
2. **Issuer (`iss`):** Ensure it matches the expected IdP URL.
3. **Audience (`aud`):** Ensure it includes your service.
4. **Expiry (`exp`):** Ensure the token has not expired.
5. **Not-before (`nbf`):** Ensure the token is not used before its valid-from time.
6. **Type (`typ`):** For JWT access tokens in the RFC 9068 profile, expect `typ: 'at+jwt'`; a `dpop+jwt` is a proof, never an access token.

Rejection checklist:

- Asymmetric key (`RS256`, `ES256`) converted to symmetric (`HS256`). This is a critical vulnerability; always reject.
- Missing `iss`, `aud`, or `exp` claims.
- Algorithm header (`alg`) is `none`.

TypeScript with `jose`:

```typescript
import { jwtVerify } from "jose";
import { createRemoteJWKSet } from "jose";

async function validateToken(token: string, jwksUri: string) {
  const jwks = createRemoteJWKSet(new URL(jwksUri));
  const verified = await jwtVerify(token, jwks, {
    issuer: "https://auth.example.com",
    audience: "https://api.example.com",
    algorithms: ["RS256", "ES256"], // whitelist safe algorithms
    requiredClaims: ["exp"], // jwtVerify checks exp when present, but does not require it
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
import * as dotenv from "dotenv";
import { execSync } from "node:child_process";

// Local dev: .env file
dotenv.config({ path: ".env.local" });

// Production: 1Password / Vault CLI
const secret =
  process.env.OAUTH_CLIENT_SECRET || execSync("op read op://vault/item/field").toString().trim();
```

### TypeScript patterns (Next.js / Node)

**Protected Next.js App Router route handler with client-credentials JWT validation:**

```typescript
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const jwks = createRemoteJWKSet(new URL("https://auth.example.com/.well-known/jwks.json"));

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const challenge = { "WWW-Authenticate": 'Bearer realm="api", error="invalid_token"' };
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="api"' } },
    );
  }

  const token = authHeader.slice(7);
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, jwks, {
      issuer: "https://auth.example.com",
      audience: "https://api.example.com",
      algorithms: ["RS256", "ES256"],
      requiredClaims: ["exp"],
    }));
  } catch {
    // Invalid or expired credentials: 401 with a challenge, not 403
    return Response.json({ error: "Invalid token" }, { status: 401, headers: challenge });
  }

  // A client-credentials token is about the service itself: sub names the service,
  // and there may be no human user. With delegation, act.sub names the actor.
  const subject = payload.sub;
  const actor = (payload.act as { sub?: string } | undefined)?.sub;
  const scopes = typeof payload.scope === "string" ? payload.scope.split(" ") : [];

  // Valid credentials without the needed authority: 403
  if (!scopes.includes("reports:read")) {
    return Response.json({ error: "insufficient_scope" }, { status: 403 });
  }

  // Log subject and actor for audit
  console.log(`subject=${subject} actor=${actor ?? "none"} scopes=[${scopes.join(", ")}]`);

  return Response.json({ data: await getReports(subject) });
}
```

**Token Exchange request to a trusted IdP:**

```typescript
async function requestDelegatedToken(userJwt: string, agentJwt: string, audience: string) {
  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    subject_token: userJwt,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    actor_token: agentJwt,
    actor_token_type: "urn:ietf:params:oauth:token-type:jwt",
    requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
    audience: audience,
    scope: "users:read",
  });

  const res = await fetch("https://auth.example.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}
```

## Cross-vendor notes

**Anthropic Claude platform:** Claude Code SDK and Claude Managed Agents can call remote MCP tools. Protected remote MCP servers should expose RFC 9728 metadata at `.well-known/oauth-protected-resource`, and app code should forward only scoped, aud/resource-bound credentials.

**OpenAI Responses API:** Remote MCP tools require auth headers forwarded. Use `authorization` in the tool config. OAuth 2.0 Client Credentials is the recommended M2M pattern.

**Google Vertex AI:** Uses IAM short-lived access tokens via Application Default Credentials (ADC). `gcloud auth application-default login` for dev; in production, an attached service account or workload identity federation through ADC, not a long-lived service account key file. Agent Engine supports service accounts natively.

**MCP:** Remote protected servers publish `.well-known/oauth-protected-resource`. The client and server validate `iss`, `aud`, `exp`, resource, and scopes as appropriate. The current 2026-07-28 revision requires RFC 9207 `iss` validation, per-issuer credential binding, and deprecates RFC 7591 Dynamic Client Registration in favour of Client ID Metadata Documents.

## Anti-patterns

- **Long-lived API keys with full-account scope.** Rotate every 90 days. Always scope to a subset of operations.
- **Auth via browser redirect only.** Agents can't click links or enter credentials in the runtime path. Offer M2M for service-owned access or a bounded registration flow for user-bound credentials.
- **CAPTCHAs in the auth flow.** Agents fail silently. Use rate limiting instead.
- **JWT validation that trusts the `alg` header.** Whitelist algorithms (`RS256`, `ES256`). Reject `none` and downgrades to symmetric (`HS256`).
- **Storing access tokens in client-side storage (localStorage, sessionStorage).** Use HttpOnly cookies or in-memory storage.
- **Missing `.well-known` metadata on public resource servers.** Agents and external integrations depend on it.
- **Publishing `auth.md` without machine-readable metadata.** The Markdown file should point back to RFC 9728 protected-resource metadata and authorization server metadata.
- **Anonymous agent registration with full scopes.** Pre-claim credentials should be low-scope, expirable, revocable, and auditable.
- **No token rotation.** Require token refresh every 1–2 hours. Auto-rotate on key rotation.
- **Hardcoding secrets in code.** Always read from env vars or secret managers.
- **Omitting agent identity from logs.** Track the subject (`sub`), any actor (`act.sub`) and the client (`client_id` where the profile has it) for audit and debugging.

## Templates and tooling

- `/templates/errors-and-auth/oauth-client-credentials.ts` - complete M2M flow with short-lived tokens.
- `/templates/errors-and-auth/jwt-validate.ts` - jose-based token validation with JWKS caching.
- `/templates/errors-and-auth/well-known-oauth-protected-resource.ts` - Next.js endpoint serving RFC 9728 protected-resource metadata.
- `/templates/errors-and-auth/token-exchange.ts` - RFC 8693 token exchange implementation.
- `/templates/errors-and-auth/dpop-header.ts` - DPoP proof signing for sender-constrained tokens.

**Libraries:**

- `jose` - JWT signing + validation, JWKS fetching, all platforms.
- `openid-client` - OIDC discovery, token exchange.
- `better-auth` - drop-in auth framework for Next.js (supports OAuth + JWT).
- `lucia` - deprecated in March 2025; its site now teaches session handling from first principles. Do not add it to new projects.
- `@clerk/backend` - Clerk SDK for Node (auth + JWTs).
- `@workos-inc/node` - WorkOS SDK for OAuth + SSO.

## Citations

- ([RFC 6749: OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)) - Client Credentials, token endpoint.
- ([RFC 8414: OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414)) - `.well-known/oauth-authorization-server`.
- ([RFC 9728: OAuth 2.0 Protected Resource Metadata](https://www.rfc-editor.org/rfc/rfc9728.html)) - `.well-known/oauth-protected-resource`.
- ([RFC 8693: OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693)) - Delegated access, narrowly-scoped tokens.
- ([RFC 9449: OAuth 2.0 Demonstration of Proof-of-Possession Mechanisms](https://www.rfc-editor.org/rfc/rfc9449.html)) - DPoP, sender-constrained tokens.
- ([RFC 7591: OAuth 2.0 Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591)) - deprecated by MCP 2026-07-28 in favour of Client ID Metadata Documents.
- ([RFC 9207: OAuth 2.0 Authorization Server Issuer Identification](https://www.rfc-editor.org/rfc/rfc9207.html)) - `iss` validation required by MCP 2026-07-28.
- ([OAuth 2.1 draft-ietf-oauth-v2-1-16](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-16)) - PKCE, removed insecure flows, refresh token protection. Still an Internet-Draft; draft-16 published 2026-09-03.
- ([MCP specification, 2026-07-28 revision](https://modelcontextprotocol.io/specification/2026-07-28/)) - current authorization requirements.
- ([WorkOS auth.md](https://workos.com/auth-md)) - agentic registration discovery.
- ([workos/auth.md reference implementation](https://github.com/workos/auth.md)) - example service and provider implementations.
- ([ID-JAG Internet-Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-identity-assertion-authz-grant)) - provider-attested identity assertions.
- ([jose on npm](https://www.npmjs.com/package/jose)) - TypeScript JWT library.

## See also

- `docs/authentication` - Full guide to agent auth patterns.
- `docs/authentication/auth-md` - Agentic registration discovery and user-claim flows.
- `references/mcp-servers.md` - Remote MCP auth and metadata.
- `references/scoring-rubric.md#dimension-5-authentication` - Dimension 5 scoring.
- `templates/errors-and-auth/oauth-client-credentials.ts` - M2M token flow.
- `templates/errors-and-auth/jwt-validate.ts` - Token validation with JWKS.
