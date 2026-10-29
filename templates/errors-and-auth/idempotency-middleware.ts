/**
 * Idempotency for Next.js route handlers via the Idempotency-Key header + Redis
 * Draft: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ (-08, active, not an RFC)
 * Reference implementation: https://stripe.com/docs/api/idempotent_requests
 * Use: Deduplicate POST/PATCH/PUT/DELETE requests so agents can safely retry
 *
 * What makes this safe, not just cached:
 * - The key is reserved atomically (SET NX) before the handler runs, so two
 *   concurrent requests with the same key cannot both execute
 * - Keys are namespaced by authenticated principal and route, so one client
 *   can never replay another client's cached response
 * - The request body is fingerprinted; a reused key with a different body is
 *   rejected with 422, and a duplicate that arrives mid-flight gets 409
 * - The in-flight reservation is a lease owned by one request and renewed while
 *   the handler runs, so a slow handler cannot be overlapped by a retry. Only the
 *   owner can record the outcome (a fenced compare-and-set)
 * - Every outcome is recorded, failures included, so a retry never turns a
 *   permanent error into a different result. A thrown error is recorded as an
 *   unknown outcome, because effects may already have happened. A handler that
 *   knows nothing happened can release the key with releaseIdempotencyKey()
 * - Replays return the original status, headers and body bytes, JSON or not
 *
 * <CUSTOMISE>
 * - Set IDEMPOTENCY_TTL_SECONDS to your published retention window (24h is common)
 * - Implement getPrincipalId() from your auth layer (run auth before this wrapper)
 * - Configure the Redis client connection
 * </CUSTOMISE>
 */

import { createHash, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Redis } from "ioredis";

const IDEMPOTENCY_TTL_SECONDS = 86_400; // published retention window
const LEASE_TTL_MS = 30_000; // how long a crashed request blocks its key
const LEASE_RENEW_MS = 10_000; // renew well before the lease expires
const IDEMPOTENCY_KEY_HEADER = "idempotency-key";
const IDEMPOTENCY_REPLAY_HEADER = "x-idempotency-replayed";
const RELEASE_HEADER = "x-idempotency-release"; // internal; stripped before responding

/**
 * Initialize Redis client (or use your preferred cache)
 * <CUSTOMISE> Update connection config
 */
let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      password: process.env.REDIS_PASSWORD,
      port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }
  return redis;
}

/**
 * <CUSTOMISE> Return the authenticated caller (user, client or tenant id).
 * Authorization must run before the idempotency lookup.
 */
function getPrincipalId(req: NextRequest): string {
  const principal = req.headers.get("x-principal-id");
  if (!principal) {
    throw new Error("idempotency requires an authenticated principal");
  }
  return principal;
}

type IdempotencyEntry =
  | { state: "in_flight"; fingerprint: string; owner: string }
  | {
      state: "done";
      fingerprint: string;
      status: number;
      headers: Record<string, string>;
      bodyBase64: string;
    };

/**
 * Fenced writes: each script acts only while the stored entry is still the
 * in-flight lease owned by ARGV[1]. A request whose lease expired (and was
 * taken over) can no longer renew it or overwrite the new owner's result.
 */
const OWNED_BY = `
  local raw = redis.call("GET", KEYS[1])
  if not raw then return 0 end
  local entry = cjson.decode(raw)
  if entry.state ~= "in_flight" or entry.owner ~= ARGV[1] then return 0 end
`;
const RENEW_SCRIPT = `${OWNED_BY} return redis.call("PEXPIRE", KEYS[1], ARGV[2])`;
const COMPLETE_SCRIPT = `${OWNED_BY} redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3]) return 1`;
const RELEASE_SCRIPT = `${OWNED_BY} return redis.call("DEL", KEYS[1])`;

/**
 * Call from a handler when the request certainly had no effect (for example,
 * validation failed before any write, or an upstream refused the call). The
 * wrapper then releases the key so a retry with the same key runs again,
 * instead of replaying this response.
 */
export function releaseIdempotencyKey(response: NextResponse): NextResponse {
  response.headers.set(RELEASE_HEADER, "1");
  return response;
}

/**
 * The draft defines the header as a Structured Fields string ("..."); many
 * providers also accept unquoted values, so accept both.
 */
function parseIdempotencyKey(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  const unquoted =
    trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed;
  return unquoted.length > 0 ? unquoted : null;
}

function problem(status: number, type: string, title: string, detail: string, retriable: boolean) {
  return NextResponse.json(
    { detail, is_retriable: retriable, status, title, type },
    { headers: { "Content-Type": "application/problem+json" }, status },
  );
}

async function serializeResponse(response: NextResponse) {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    if (key !== "content-encoding" && key !== "content-length" && key !== RELEASE_HEADER) {
      headers[key] = value;
    }
  });

  // Store raw bytes so non-JSON bodies (text, CSV, binary) replay exactly
  const bodyBase64 = Buffer.from(await response.clone().arrayBuffer()).toString("base64");

  return { bodyBase64, headers, status: response.status };
}

function replayResponse(entry: Extract<IdempotencyEntry, { state: "done" }>): NextResponse {
  const response = new NextResponse(Buffer.from(entry.bodyBase64, "base64"), {
    headers: entry.headers,
    status: entry.status,
  });
  response.headers.set(IDEMPOTENCY_REPLAY_HEADER, "true");
  return response;
}

function unknownOutcome(): NextResponse {
  return problem(
    500,
    "https://api.example.com/errors/outcome-unknown",
    "Outcome unknown",
    "The request failed part-way and may have taken effect. Check the resource's state before sending a new request with a new Idempotency-Key.",
    false,
  );
}

/**
 * HOF wrapper for route handlers with built-in idempotency
 *
 * Usage:
 * ```typescript
 * export const POST = withIdempotency(async (req: NextRequest) => {
 *   const body = await req.json();
 *   const result = await createResource(body);
 *   return NextResponse.json(result, { status: 201 });
 * });
 * ```
 */
export function withIdempotency(
  handler: (req: NextRequest) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
      return await handler(req);
    }

    const idempotencyKey = parseIdempotencyKey(req.headers.get(IDEMPOTENCY_KEY_HEADER));
    if (!idempotencyKey) {
      return problem(
        400,
        "https://api.example.com/errors/missing-idempotency-key",
        "Missing Idempotency Key",
        `${IDEMPOTENCY_KEY_HEADER} header is required for ${req.method} requests`,
        false,
      );
    }

    const route = `${req.method} ${req.nextUrl.pathname}`;
    const cacheKey = `idempotency:${getPrincipalId(req)}:${route}:${idempotencyKey}`;
    const rawBody = await req.clone().text();
    const fingerprint = createHash("sha256").update(rawBody).digest("hex");
    const client = getRedisClient();
    const owner = randomUUID();

    // Atomically reserve the key as a lease; only one request can win
    const reserved = await client.set(
      cacheKey,
      JSON.stringify({ fingerprint, owner, state: "in_flight" } satisfies IdempotencyEntry),
      "PX",
      LEASE_TTL_MS,
      "NX",
    );

    if (reserved !== "OK") {
      const existing = await client.get(cacheKey);
      const entry = existing ? (JSON.parse(existing) as IdempotencyEntry) : null;

      if (entry && entry.fingerprint !== fingerprint) {
        return problem(
          422,
          "https://api.example.com/errors/idempotency-key-reused",
          "Idempotency key reused",
          "This Idempotency-Key was already used with a different request body",
          false,
        );
      }
      if (!entry || entry.state === "in_flight") {
        return problem(
          409,
          "https://api.example.com/errors/request-in-progress",
          "Request in progress",
          "A request with this Idempotency-Key is still being processed",
          true,
        );
      }
      return replayResponse(entry);
    }

    // Keep the lease alive while the handler runs
    const renewal = setInterval(() => {
      void client.eval(RENEW_SCRIPT, 1, cacheKey, owner, String(LEASE_TTL_MS));
    }, LEASE_RENEW_MS);

    let response: NextResponse;
    try {
      response = await handler(req);
    } catch {
      // Effects may already have happened, so do not release the key: record an
      // unknown outcome that retries with this key replay.
      response = unknownOutcome();
    } finally {
      clearInterval(renewal);
    }

    if (response.headers.get(RELEASE_HEADER)) {
      await client.eval(RELEASE_SCRIPT, 1, cacheKey, owner);
      response.headers.delete(RELEASE_HEADER);
      return response;
    }

    // Record every outcome, failures included, so a retry gets the same answer
    const entry: IdempotencyEntry = {
      fingerprint,
      state: "done",
      ...(await serializeResponse(response)),
    };
    const recorded = await client.eval(
      COMPLETE_SCRIPT,
      1,
      cacheKey,
      owner,
      JSON.stringify(entry),
      String(IDEMPOTENCY_TTL_SECONDS),
    );
    if (recorded !== 1) {
      // The lease was lost (for example, Redis evicted it). Another request may
      // have run; surface that rather than claiming a clean result.
      console.warn(`idempotency lease lost for ${cacheKey}`);
    }

    return response;
  };
}

/**
 * Why idempotency matters for agents:
 *
 * Agents may retry requests due to:
 * - Network timeouts
 * - Rate limiting (429)
 * - Transient server errors (5xx)
 *
 * Without idempotency, a single user request could result in:
 * - Duplicate charge on a payment API
 * - Duplicate user account
 * - Duplicate task or message
 *
 * Idempotency-Key ensures: same key + same body → same response, for as long
 * as the published retention window. Once a key expires, it may execute again.
 *
 * Agent usage:
 * 1. Agent generates a random key once per logical operation: `crypto.randomUUID()`
 * 2. Includes it on every attempt: `headers: { 'Idempotency-Key': `"${key}"` }`
 * 3. On 409, waits and retries with the same key
 * 4. On 422 (key reused with a different body), generates a new key
 * 5. On an outcome-unknown 500, checks the resource's state before deciding
 *    whether to send the operation again under a new key
 */
