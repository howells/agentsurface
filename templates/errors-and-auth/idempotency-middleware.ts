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
 *
 * <CUSTOMISE>
 * - Set IDEMPOTENCY_TTL_SECONDS to your published retention window (24h is common)
 * - Implement getPrincipalId() from your auth layer (run auth before this wrapper)
 * - Configure the Redis client connection
 * </CUSTOMISE>
 */

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Redis } from "ioredis";

const IDEMPOTENCY_TTL_SECONDS = 86_400; // published retention window
const IN_FLIGHT_TTL_SECONDS = 60; // how long a crashed request blocks its key
const IDEMPOTENCY_KEY_HEADER = "idempotency-key";
const IDEMPOTENCY_REPLAY_HEADER = "x-idempotency-replayed";

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
  | { state: "in_flight"; fingerprint: string }
  | {
      state: "done";
      fingerprint: string;
      status: number;
      headers: Record<string, string>;
      body: unknown;
    };

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
    if (!key.startsWith("content-encoding")) {
      headers[key] = value;
    }
  });

  const body = await response
    .clone()
    .json()
    .catch(() => null);

  return { body, headers, status: response.status };
}

function replayResponse(entry: Extract<IdempotencyEntry, { state: "done" }>): NextResponse {
  const response = NextResponse.json(entry.body, { status: entry.status });
  Object.entries(entry.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set(IDEMPOTENCY_REPLAY_HEADER, "true");
  return response;
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

    // Atomically reserve the key; only one request can win
    const reserved = await client.set(
      cacheKey,
      JSON.stringify({ fingerprint, state: "in_flight" } satisfies IdempotencyEntry),
      "EX",
      IN_FLIGHT_TTL_SECONDS,
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

    let response: NextResponse;
    try {
      response = await handler(req);
    } catch (error) {
      // Release the key so a retry can run; nothing was recorded as done
      await client.del(cacheKey);
      throw error;
    }

    // Record the outcome, success or failure, so a retry gets the same answer.
    // 5xx are released instead: the operation may not have happened.
    if (response.status >= 500) {
      await client.del(cacheKey);
    } else {
      const entry: IdempotencyEntry = {
        fingerprint,
        state: "done",
        ...(await serializeResponse(response)),
      };
      await client.set(cacheKey, JSON.stringify(entry), "EX", IDEMPOTENCY_TTL_SECONDS);
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
 */
