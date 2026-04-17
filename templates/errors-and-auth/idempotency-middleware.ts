/**
 * Idempotency middleware via Idempotency-Key header + Redis cache
 * Canonical: https://stripe.com/docs/api/idempotent_requests
 * Use: Deduplicate POST/PATCH/DELETE requests so agents can safely retry
 *
 * <CUSTOMISE>
 * - Set IDEMPOTENCY_TTL_SECONDS to your desired deduplication window (24h typical)
 * - Configure Redis client connection
 * - Customize error responses per your domain
 * </CUSTOMISE>
 */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';

const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours
const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
const IDEMPOTENCY_REPLAY_HEADER = 'x-idempotency-replayed';

/**
 * Initialize Redis client (or use your preferred cache)
 * <CUSTOMISE> Update connection config
 */
let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }
  return redis;
}

/**
 * Cache entry for idempotent responses
 */
interface IdempotencyEntry {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  timestamp: number;
}

/**
 * Serialize a response for caching
 */
async function serializeResponse(response: NextResponse): Promise<IdempotencyEntry> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    if (!key.startsWith('content-encoding')) {
      headers[key] = value;
    }
  });

  const body = await response.clone().json().catch(() => null);

  return {
    status: response.status,
    headers,
    body,
    timestamp: Date.now(),
  };
}

/**
 * Replay a cached response
 */
function replayResponse(entry: IdempotencyEntry): NextResponse {
  const response = NextResponse.json(entry.body, {
    status: entry.status,
  });

  Object.entries(entry.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set(IDEMPOTENCY_REPLAY_HEADER, 'true');
  return response;
}

/**
 * Middleware to handle idempotent requests
 *
 * Mount in middleware.ts:
 * ```typescript
 * import { idempotencyMiddleware } from '@/lib/idempotency-middleware';
 *
 * export const middleware = idempotencyMiddleware;
 * export const config = {
 *   matcher: ['/api/:path*'],
 * };
 * ```
 */
export async function idempotencyMiddleware(
  req: NextRequest,
  next: any
): Promise<NextResponse> {
  // Only apply to mutation methods
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    return next(req);
  }

  const idempotencyKey = req.headers.get(IDEMPOTENCY_KEY_HEADER);

  // Idempotency-Key is required for mutations
  if (!idempotencyKey) {
    return NextResponse.json(
      {
        type: 'https://api.example.com/errors/missing-idempotency-key',
        title: 'Missing Idempotency Key',
        status: 400,
        detail: `${IDEMPOTENCY_KEY_HEADER} header is required for ${req.method} requests`,
        code: 'ERR_VALIDATION',
      },
      {
        status: 400,
        headers: { 'Content-Type': 'application/problem+json' },
      }
    );
  }

  const cacheKey = `idempotency:${idempotencyKey}`;
  const redis = getRedisClient();

  try {
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      const entry: IdempotencyEntry = JSON.parse(cached);
      console.log(`[Idempotency] Cache hit for key ${idempotencyKey}`);
      return replayResponse(entry);
    }
  } catch (err) {
    console.warn(`[Idempotency] Cache lookup error: ${err}`, { idempotencyKey });
    // Fall through; don't fail the request on cache miss
  }

  // Call the next middleware/handler
  let response = await next(req);

  // Only cache successful responses (2xx)
  if (response.status >= 200 && response.status < 300) {
    try {
      const entry = await serializeResponse(response);
      await redis.setex(cacheKey, IDEMPOTENCY_TTL_SECONDS, JSON.stringify(entry));
      console.log(`[Idempotency] Cached response for key ${idempotencyKey}`);
    } catch (err) {
      console.warn(`[Idempotency] Cache write error: ${err}`, { idempotencyKey });
      // Proceed anyway; caching failure shouldn't block the response
    }
  }

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
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      return handler(req);
    }

    const idempotencyKey = req.headers.get(IDEMPOTENCY_KEY_HEADER);

    if (!idempotencyKey) {
      return NextResponse.json(
        {
          type: 'https://api.example.com/errors/missing-idempotency-key',
          title: 'Missing Idempotency Key',
          status: 400,
          detail: `${IDEMPOTENCY_KEY_HEADER} header is required`,
          code: 'ERR_VALIDATION',
        },
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }

    const cacheKey = `idempotency:${idempotencyKey}`;
    const redis = getRedisClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const entry: IdempotencyEntry = JSON.parse(cached);
        console.log(`[Idempotency] Replaying cached response for ${idempotencyKey}`);
        const response = replayResponse(entry);
        return response;
      }
    } catch (err) {
      console.warn(`[Idempotency] Cache error, proceeding: ${err}`);
    }

    const response = await handler(req);

    if (response.status >= 200 && response.status < 300) {
      try {
        const entry = await serializeResponse(response);
        await redis.setex(cacheKey, IDEMPOTENCY_TTL_SECONDS, JSON.stringify(entry));
      } catch (err) {
        console.warn(`[Idempotency] Failed to cache: ${err}`);
      }
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
 * Idempotency-Key ensures: same key → same response, even if called 100 times.
 * Typical TTL: 24 hours. Critical for financial, identity, or mutation-heavy APIs.
 *
 * Agent usage:
 * 1. Agent generates a UUID: `const key = crypto.randomUUID()`
 * 2. Includes in request: `headers: { 'Idempotency-Key': key }`
 * 3. Server stores response hash keyed by the UUID
 * 4. If agent retries with same key, server replays cached response
 * 5. If TTL expires, server treats it as a new request
 */
