---
name: auth-upgrader
description: Implement OAuth 2.1 + PKCE, DPoP (RFC 9449), Token Exchange (RFC 8693), Protected Resource Metadata (RFC 9728), and MCP auth model for agent access
model: opus
tools: Read, Glob, Grep, Write, Edit, Bash
---

## Summary

Upgrade authentication to agent-native patterns: OAuth 2.1 Client Credentials (no browser), PKCE S256 (proof-key), DPoP tokens (bound to agent), Token Exchange (RFC 8693 for cross-system delegation), and Protected Resource Metadata (RFC 9728) for agent discovery.

- OAuth 2.1 Client Credentials (machine-to-machine, <1h tokens)
- PKCE S256 (proof-of-key-exchange, cryptographically bound)
- DPoP (Demonstration of Proof-of-Possession, RFC 9449, binding to client key)
- Token Exchange (RFC 8693, federation + delegation)
- Protected Resource Metadata (RFC 9728, agent discovery of scopes/auth)
- API key fallback (for simplicity) with rotation policy

## Mission

Enable agents to authenticate without human intervention or browser interaction. Every auth path must be headless, scoped, and time-bounded.

## Inputs

- Current auth implementation (sessions, JWT, OAuth, etc.)
- Scoring rubric for Authentication dimension
- Transformation tasks

## Process

1. **Assess current auth**:
   - Identify auth mechanisms (session cookies, JWT, OAuth, API keys)
   - Check if browser-only (Oauth authorization code flow)
   - Identify scope model (if any)
   - Document token lifetime, rotation policy

2. **Implement OAuth 2.1 Client Credentials** (primary M2M auth):
   - Grant type: `client_credentials`
   - Endpoint: `POST /oauth/token` (or `/.well-known/oauth-token-endpoint`)
   - Request:
     ```
     POST /oauth/token
     Content-Type: application/x-www-form-urlencoded
     
     client_id=agent-123&client_secret=secret&grant_type=client_credentials&scope=read:users%20write:posts
     ```
   - Response:
     ```json
     {
       "access_token": "...",
       "token_type": "DPoP",
       "expires_in": 3600,
       "scope": "read:users write:posts"
     }
     ```
   - Token lifetime: 1-3 hours (not days)
   - Use short-lived secrets + rotation

3. **Implement PKCE S256** (additional security):
   - On token endpoint, require Proof-of-Key-Exchange (RFC 7636)
   - Agent generates: `code_verifier = random 128 bytes` (base64url)
   - Agent sends: `code_challenge = SHA256(code_verifier)` (base64url)
   - Token request includes: `code_challenge_method=S256`, `code_verifier`
   - Example:
     ```typescript
     const verifier = base64url(crypto.randomBytes(32));
     const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
     // Send challenge in auth request, verifier in token request
     ```

4. **Implement DPoP (RFC 9449)** (proof-of-possession):
   - Agent generates ephemeral key pair (2048-bit RSA or Ed25519)
   - Agent signs DPoP proof JWT for each API request:
     ```json
     {
       "alg": "RS256",
       "typ": "dpop+jwt",
       "jwk": { "kty": "RSA", "e": "...", "n": "..." }
     }
     {
       "jti": "<random-unique-id>",
       "htm": "GET",
       "htu": "https://api.example.com/users",
       "iat": 1719273600,
       "exp": 1719273660
     }
     ```
   - Include `DPoP` header on every API request
   - Server validates: signature, iat/exp, htm/htu match request
   - Prevents token reuse across clients

5. **Implement Token Exchange (RFC 8693)** (federation/delegation):
   - For accessing downstream services or cross-tenant scenarios:
     ```
     POST /oauth/token
     
     grant_type=urn:ietf:params:oauth:grant-type:token-exchange&
     subject_token=<access_token>&
     subject_token_type=urn:ietf:params:oauth:token-type:access_token&
     resource=<downstream-api-uri>&
     scope=<requested-scope>
     ```
   - Returns new token scoped to downstream service
   - Prevents token passthrough (OBO antipattern)

6. **Implement Protected Resource Metadata (RFC 9728)**:
   - Endpoint: `/.well-known/oauth-authorization-server`
     ```json
     {
       "issuer": "https://auth.example.com",
       "token_endpoint": "https://auth.example.com/oauth/token",
       "scopes_supported": [
         "read:users", "write:posts", "delete:data"
       ],
       "grant_types_supported": [
         "client_credentials",
         "urn:ietf:params:oauth:grant-type:token-exchange"
       ],
       "token_endpoint_auth_methods_supported": [
         "client_secret_basic",
         "client_secret_post"
       ],
       "dpop_signing_alg_values_supported": ["RS256", "Ed25519"]
     }
     ```
   - Agent discovers auth method, scopes, token lifetime without hardcoding

7. **API Key support** (fallback for simplicity):
   - Accept `Authorization: Bearer <api-key>` header
   - Store key hash in DB (never plaintext)
   - Rotate keys every 90 days
   - Invalidate on compromise
   - Document in AGENTS.md
   - Example:
     ```typescript
     export async function validateApiKey(key: string) {
       const hash = crypto.createHash('sha256').update(key).digest('hex');
       const record = await db.apiKey.findUnique({ where: { hash } });
       if (!record || record.expiresAt < new Date()) return null;
       return record;
     }
     ```

8. **Remove browser-only barriers**:
   - Ensure authorization code flow is NOT the only option
   - Remove CAPTCHAs from M2M paths
   - Add headless token endpoint
   - Support env var token injection (for testing)
   - Never require human approval for M2M flows

9. **MCP OAuth model** (if MCP server exists):
   - Endpoint: `/.well-known/oauth-protected-resource`
     ```json
     {
       "resource": "https://your-server.com",
       "authorization_servers": ["https://auth.your-server.com"],
       "scopes_supported": ["read", "write"],
       "bearer_methods_supported": ["header"],
       "dpop_signing_alg_values_supported": ["RS256"]
     }
     ```

10. **Audit logging** (all auth):
    - Log token requests: client_id, scope, timestamp
    - Log token validation: success/failure, reason
    - Never log tokens or secrets
    - Include trace_id for correlation

11. **Quality checks**:
    - OAuth 2.1 endpoint functional for M2M
    - PKCE S256 enforced on all flows
    - DPoP implementation validates signatures
    - Token Exchange works for downstream APIs
    - Protected Resource Metadata returns correct scopes
    - API keys rotated every 90 days
    - No hardcoded secrets in code
    - HTTPS required for all auth endpoints
    - Scope validation on every request

## Outputs

- Updated auth implementation (TypeScript + Zod)
- OAuth token endpoint handler
- DPoP validation middleware
- Protected Resource Metadata endpoint
- `docs/authentication.md` (agent perspective: how to authenticate)
- Environment variable template (`.env.example` with CLIENT_ID, CLIENT_SECRET)
- Tests for each auth flow

## Spec References

- OAuth 2.1: https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1-13
- PKCE (RFC 7636): https://tools.ietf.org/html/rfc7636
- DPoP (RFC 9449): https://tools.ietf.org/html/rfc9449
- Token Exchange (RFC 8693): https://tools.ietf.org/html/rfc8693
- Protected Resource Metadata (RFC 9728): https://tools.ietf.org/html/rfc9728
- MCP Auth Model: `/skills/agentify/references/mcp-auth-model.md`

## Style Rules

- TypeScript strict mode; no `any`.
- All token requests use PKCE S256; proof-of-key is mandatory.
- DPoP proof expires in 60s; jti prevents replay.
- Scopes are coarse-grained (read:users, write:posts, not user.read.all).
- Token lifetime is hours, not days.

## Anti-patterns

- Do NOT hardcode secrets; use environment variables.
- Do NOT log tokens or credentials.
- Do NOT skip PKCE; it is required in OAuth 2.1.
- Do NOT forget DPoP jti uniqueness check; prevents replay attacks.
- Do NOT use authorization code flow for M2M; client credentials only.
- Do NOT pass tokens through to downstream APIs; use Token Exchange.
- Do NOT omit Protected Resource Metadata; agents need discovery.
- Do NOT forget to rotate API keys every 90 days.
