# Authentication

Dimension 5: whether a client can get and use credentials that fit the acting
identity. Score the identity boundary the product actually has; don't demand
every grant. A product that is public and read-only by design has no boundary
to score: report the dimension as not applicable and say so.

## Contents

- Rubric
- Evidence to gather
- Facts models get wrong (OAuth 2.1, RFC 9728 metadata, client registration,
  JWT validation, claims, delegation, API keys, DPoP, auth.md, platforms,
  libraries)
- Build
- Templates

## Rubric

- **0**: No usable path for the intended client and identity: protected requests
  return login HTML, need browser state, or token acquisition can't complete.
- **1**: Programmatic access works, but credentials are broad or permanent,
  scopes are partly enforced, or refresh and revocation are unclear.
- **2**: A grant that fits the identity (authorization code with PKCE for a
  user; client credentials for a service), scoped and time-bounded, with issuer,
  audience, expiry and permissions validated server-side.
- **3**: Level 2 plus verified discovery (RFC 9728 metadata where applicable),
  tested renewal, revocation and wrong-user/wrong-resource rejection, and
  attributable actions. Token exchange and other extensions only where the use
  case needs them.

Interactive consent when connecting is fine; a login page or CAPTCHA on routine
requests isn't. Don't mark a consumer integration down for lacking client
credentials: MCP treats user consent as the core case and M2M as optional.

## Evidence to gather

- `code_challenge`, `client_credentials`, `Bearer`, `jwtVerify`, `aud`, `iss`
- Auth providers in use (Clerk, Auth0, WorkOS, Supabase Auth, better-auth)
- `/.well-known/oauth-protected-resource` (RFC 9728) and
  `/.well-known/oauth-authorization-server` (RFC 8414)
- `auth.md` at the service root and `agent_auth` in the authorization-server
  metadata
- Key issuance, rotation and revocation endpoints; key prefixes
- Credentials read from environment variables or a secret manager, never from
  code or prompts
- Logs that record subject, actor and client separately

## Facts models get wrong

**OAuth 2.1 is still an Internet-Draft** (draft-16, 2026-09-03; MCP 2026-07-28
cites draft-13). Never call it an RFC. It mandates PKCE on every authorization
code flow, removes implicit and password grants, requires exact redirect URIs,
bans tokens in query strings, and requires public-client refresh tokens to be
rotated or sender-constrained.

**Protected-resource metadata** (RFC 9728):

```json
{
  "resource": "https://api.example.com",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["users:read", "users:write"],
  "bearer_methods_supported": ["header"]
}
```

Token-verification keys come from the authorization server's RFC 8414 `jwks_uri`.
A `jwks_uri` in resource metadata means the resource's own keys. Declare DPoP
with `dpop_bound_access_tokens_required` and
`dpop_signing_alg_values_supported`.

**Client registration.** MCP 2026-07-28 deprecates Dynamic Client Registration
(RFC 7591) in favour of Client ID Metadata Documents: the `client_id` is an
HTTPS URL serving the client's metadata, so no registration round-trip. Keep
existing DCR working through the deprecation window. The same revision requires
`iss` in authorization responses, checked by the client (RFC 9207),
`application_type` where DCR remains, and credentials keyed by issuer.

**JWT validation.** Verify the signature against the issuer's JWKS with an
algorithm allowlist (`RS256`, `ES256`); reject `alg: none` and any
asymmetric-to-`HS256` downgrade. Check `iss`, `aud` (this service), `exp` and
`nbf`. `jose`'s `jwtVerify` checks `exp` only if present, so pass
`requiredClaims: ["exp"]`. RFC 9068 access tokens have `typ: at+jwt`; a
`dpop+jwt` is a proof, never an access token. Invalid or expired token: `401`
with `WWW-Authenticate`. Valid token without the scope: `403`.

**Claims.** `sub` is who the token is about (a user, or the service itself for
client credentials). `act.sub` is the party acting for `sub`; nested `act` is
delegation history, not authority. `client_id` names the OAuth client where the
profile includes it (RFC 9068). Don't assume `azp` names the agent. Log subject,
actor and client separately.

**Delegation** uses token exchange (RFC 8693): `subject_token` (the user),
`actor_token` (the agent), `audience` and a narrower `scope`, returning a token
bound to one resource.

**Scoped API keys** are acceptable for simple integrations: per-resource read or
write scopes (Stripe restricted keys), a prefix that identifies environment and
type (`sk_live_`, `sk_test_`) for secret scanning, and a rotate-and-revoke
endpoint. A prefix doesn't give you bulk rotation; that needs a key inventory.

**DPoP** (RFC 9449) binds a token to the client's key. It's a general OAuth
mechanism; MCP neither mandates nor mentions it, so claim it only when
implemented.

- Proof JWT header: `typ: dpop+jwt`, `alg`, the public `jwk`. Claims: `jti`,
  `htm`, `htu` (no query or fragment), `iat`, plus `ath` (base64url SHA-256 of
  the access token) on resource requests.
- Send `Authorization: DPoP <token>`, not `Bearer`, plus the `DPoP` header.
- To get a bound token, send a proof without `ath` on the token request itself.
  The server binds the token (`cnf.jkt`) and returns `token_type: "DPoP"`. A
  client that signs only resource requests never gets a bound token.
- Nonces: the authorization server answers `400 use_dpop_nonce` and the
  resource server `401` with `WWW-Authenticate: DPoP error="use_dpop_nonce"`,
  both with a `DPoP-Nonce` header. Retry once with that nonce, and keep using
  the latest nonce from each server.
- With idempotency: each retry gets a fresh proof (`jti`) but the same
  `Idempotency-Key`. Validate the proof and authorise before the idempotency
  lookup. The `jti` store lives minutes; the idempotency store lives for the
  published window (often 24 hours). Keep them separate.

**auth.md** is an emerging agent-registration profile published beside RFC 9728
and RFC 8414 metadata. The optional `agent_auth` metadata advertises
`identity_endpoint`, `claim_endpoint`, `events_endpoint` and a `skill` link.
Identity methods are `anonymous`, `identity_assertion` and `service_auth`; the
ID-JAG URN goes inside `identity_assertion.assertion_types_supported`, never as
a top-level method. The provider sends an audience-bound ID-JAG to the identity
endpoint; the service returns its own assertion to exchange at the token
endpoint. For a user claim, the agent shows the person a verification URL and
code to enter on the service's own page; never have the person relay an email
OTP to the agent. Pre-claim credentials are low-scope, expiring, revocable and
audited. Pin the WorkOS reference implementation version used; canonical guide
at https://agentsurface.dev/docs/authentication/auth-md.

**Platforms.** OpenAI Responses API forwards remote MCP credentials via
`authorization` in the tool config. Google uses short-lived tokens through
Application Default Credentials; in production that's an attached service
account or workload identity federation, not a key file.

**Libraries.** `jose` for JWTs and JWKS, `openid-client` for discovery and token
exchange. `lucia` was deprecated in March 2025; don't add it.

## Build

1. **Classify each protected capability** as user-delegated or service-owned
   before choosing a grant. An agent caller doesn't make access
   service-owned, and a service identity never stands in for user consent.
   Done when every capability has an acting identity and a grant.
2. **User-delegated:** authorization code with PKCE S256 (`code_verifier` from
   32 random bytes, base64url). PKCE belongs to this flow only.
3. **Service-owned:** client credentials at the `token_endpoint` from RFC 8414
   metadata, with access tokens that live hours (a deployment policy, not an
   OAuth rule) and no login page, CAPTCHA or human approval on the path.
4. **Publish discovery** for what exists: RFC 8414 metadata on the
   authorization server (endpoints, grants, client authentication methods,
   scopes) and RFC 9728 metadata on each protected resource.
5. **Validate every request** server-side: issuer, audience, expiry and the
   scope for that operation.
6. **Downstream calls** exchange the token (RFC 8693) for one bound to the
   downstream audience; the inbound token stays at this service.
7. **API keys**, where the product uses them: store only a hash, give each key
   scopes and an expiry, and revoke on compromise.
8. **DPoP**, where the product uses it: the server checks the proof's
   signature, `typ`, `iat` window, `htm`, `htu`, `ath`, `jti` replay and the
   token's `cnf.jkt` thumbprint; the `jti` store covers the whole `iat` window.
9. **Audit log** per token request and validation: client, subject, actor,
   scope, outcome and trace ID. Tokens and secrets stay out of logs.

Done when: verify each flow selected for the acting identity; mark grants and
extensions the product does not need as not applicable. Each selected flow has
a test for a valid token, an expired token, the wrong audience and a missing
scope.

## Templates

- `templates/errors-and-auth/oauth-client-credentials.ts`
- `templates/errors-and-auth/jwt-validate.ts`
- `templates/errors-and-auth/well-known-oauth-protected-resource.ts`
- `templates/errors-and-auth/token-exchange.ts`
- `templates/errors-and-auth/dpop-header.ts`
