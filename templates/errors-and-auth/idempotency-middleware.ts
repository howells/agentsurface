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
 *   can never replay another client's cached response. The principal comes from
 *   a resolver you pass in, backed by verified auth, never from a request header
 *   the client controls
 * - The query string and body are fingerprinted; a reused key with a different
 *   request is rejected with 422, and a duplicate that arrives mid-flight gets 409
 * - The in-flight reservation is a lease owned by one request and renewed while
 *   the handler runs, so a slow handler cannot be overlapped by a retry. Only the
 *   owner can record the outcome (a fenced compare-and-set)
 * - Outcomes are recorded, failures included, so a retry never turns a
 *   permanent error into a different result. A thrown error is logged and
 *   recorded as an unknown outcome, because effects may already have happened.
 *   A handler that knows nothing happened can release the key with
 *   releaseIdempotencyKey(). 429 and 503 are released automatically: they tell
 *   the client to retry the same request, so the retry has to run
 * - Replays return the original status, headers and body bytes, JSON or not
 *
 * <CUSTOMISE>
 * - Set IDEMPOTENCY_TTL_SECONDS to your published retention window (24h is common)
 * - Pass getPrincipalId, resolving the caller from your verified auth (a validated
 *   JWT's `sub`, a session). Run auth before this wrapper
 * - Set REDIS_URL
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
const RETRY_STATUSES = new Set([429, 503]); // never recorded: the retry must run

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL is not set; idempotency needs a Redis connection string");
    }
    redis = new Redis(url, { retryStrategy: (times) => Math.min(times * 50, 2000) });
  }
  return redis;
}

/**
 * Returns the authenticated caller (user, client or tenant id) from verified
 * credentials. Reading it from a header the client sends lets any caller claim
 * another principal and replay their responses.
 */
export type PrincipalResolver = (req: NextRequest) => string | Promise<string>;

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

/** Statuses whose responses must not carry a body; `new Response(body, { status })` throws for them. */
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

function replayResponse(entry: Extract<IdempotencyEntry, { state: "done" }>): NextResponse {
  const body = NULL_BODY_STATUSES.has(entry.status)
    ? null
    : Buffer.from(entry.bodyBase64, "base64");
  const response = new NextResponse(body, {
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
 * export const POST = withIdempotency(
 *   async (req: NextRequest) => {
 *     const body = await req.json();
 *     const result = await createResource(body);
 *     return NextResponse.json(result, { status: 201 });
 *   },
 *   { getPrincipalId: async (req) => (await verifyAccessToken(req)).sub },
 * );
 * ```
 */
export function withIdempotency(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: { getPrincipalId: PrincipalResolver },
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
        `The Idempotency-Key header is required for ${req.method} requests`,
        false,
      );
    }

    const route = `${req.method} ${req.nextUrl.pathname}`;
    const principal = await options.getPrincipalId(req);
    const cacheKey = `idempotency:${principal}:${route}:${idempotencyKey}`;
    const rawBody = await req.clone().text();
    // The query string is part of the request: ?dry_run=true is not the same operation
    const fingerprint = createHash("sha256")
      .update(req.nextUrl.search)
      .update("\n")
      .update(rawBody)
      .digest("hex");
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
          "This Idempotency-Key was already used with a different query string or request body",
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
      client
        .eval(RENEW_SCRIPT, 1, cacheKey, owner, String(LEASE_TTL_MS))
        .catch((error: unknown) => {
          // A failed renewal must not crash the process; the fenced write below
          // reports a lost lease if the key expired meanwhile.
          console.error(`idempotency lease renewal failed for ${cacheKey}`, error);
        });
    }, LEASE_RENEW_MS);

    let response: NextResponse;
    try {
      response = await handler(req);
    } catch (error) {
      // Effects may already have happened, so do not release the key: record an
      // unknown outcome that retries with this key replay.
      console.error(`handler threw under idempotency key ${cacheKey}`, error);
      response = unknownOutcome();
    } finally {
      clearInterval(renewal);
    }

    // 429 and 503 ask the client to retry the same request, so replaying them
    // would make the documented retry-with-the-same-key flow impossible.
    if (response.headers.get(RELEASE_HEADER) || RETRY_STATUSES.has(response.status)) {
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
      console.error(`idempotency lease lost for ${cacheKey}`);
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
 * Idempotency-Key ensures: same key + same request → same response, for as long
 * as the published retention window. Once a key expires, it may execute again.
 *
 * Agent usage:
 * 1. Agent generates a random key once per logical operation: `crypto.randomUUID()`
 * 2. Includes it on every attempt: `headers: { 'Idempotency-Key': `"${key}"` }`
 * 3. On 409, 429 or 503, waits and retries with the same key
 * 4. On 422 (key reused with a different request), generates a new key
 * 5. On an outcome-unknown 500, checks the resource's state before deciding
 *    whether to send the operation again under a new key
 */
