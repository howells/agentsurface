/**
 * RateLimit + Retry-After header parsing and emission
 * Canonical: https://www.ietf.org/archive/id/draft-ietf-httpapi-ratelimit-headers-11.html
 *            https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after
 * Use: Parse rate-limit signals from a response so an agent knows whether and when to
 *      retry, and emit consistent RateLimit headers from your own server.
 *
 * <CUSTOMISE>
 * - Set DEFAULT_RETRY_MS for 429/503 responses that omit both RateLimit and Retry-After
 * - Adjust MAX_WAIT_MS to cap how long an agent should ever wait before giving up
 * - If your gateway emits `X-RateLimit-*` instead of `RateLimit-*`, both are read below
 * - Treat `reset` as delta-seconds (IETF draft). If your server sends epoch seconds,
 *   flip RESET_IS_EPOCH to true.
 * </CUSTOMISE>
 */

const DEFAULT_RETRY_MS = 1_000;
const MAX_WAIT_MS = 300_000; // never advise waiting longer than 5 minutes
const RESET_IS_EPOCH = false;

/**
 * A framework-neutral view of request/response headers.
 * Accepts a WHATWG `Headers`, a plain object, or a lookup function.
 */
export type HeaderSource =
  | Headers
  | Record<string, string | string[] | undefined>
  | ((name: string) => string | null | undefined);

/**
 * Parsed RateLimit window. Fields are optional because servers vary in what they send.
 */
export interface RateLimitSnapshot {
  /** Maximum requests permitted in the current window. */
  limit?: number;
  /** Requests remaining in the current window. */
  remaining?: number;
  /** Absolute epoch-ms at which the window resets. */
  resetAtMs?: number;
}

/**
 * Structured, agent-actionable retry advice derived from a response.
 */
export interface RetryGuidance {
  /** True if the agent should retry the request. */
  retryable: boolean;
  /** How long to wait before retrying, in milliseconds (0 when not retryable). */
  waitMs: number;
  /** Human/machine-readable explanation of the decision. */
  reason: string;
}

/**
 * Read a single header value from any supported source (case-insensitive).
 */
function readHeader(source: HeaderSource, name: string): string | null {
  if (typeof source === "function") {
    return source(name) ?? source(name.toLowerCase()) ?? null;
  }
  if (source instanceof Headers) {
    return source.get(name);
  }
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(source)) {
    if (key.toLowerCase() === lower && value !== undefined) {
      return Array.isArray(value) ? (value[0] ?? null) : value;
    }
  }
  return null;
}

/**
 * Parse the structured single-header form: `RateLimit: limit=100, remaining=50, reset=60`.
 * Returns a partial map of the recognised members.
 */
function parseStructuredRateLimit(value: string): Partial<Record<string, number>> {
  const out: Partial<Record<string, number>> = {};
  for (const part of value.split(",")) {
    const [rawKey, rawVal] = part.split("=");
    if (!rawKey || rawVal === undefined) {
      continue;
    }
    const key = rawKey.trim().toLowerCase();
    const num = Number.parseInt(rawVal.trim(), 10);
    if (!Number.isNaN(num)) {
      out[key] = num;
    }
  }
  return out;
}

/**
 * Convert a raw `reset` value into an absolute epoch-ms timestamp.
 */
function resetToEpochMs(reset: number, nowMs: number): number {
  return RESET_IS_EPOCH ? reset * 1_000 : nowMs + reset * 1_000;
}

/**
 * Parse RateLimit signals from a response's headers.
 *
 * Recognises, in order of preference:
 * 1. The structured `RateLimit` field (`limit=…, remaining=…, reset=…`)
 * 2. Discrete `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset`
 * 3. Legacy `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset`
 */
export function parseRateLimit(source: HeaderSource, nowMs = Date.now()): RateLimitSnapshot {
  const snapshot: RateLimitSnapshot = {};

  const structured = readHeader(source, "RateLimit");
  if (structured) {
    const parsed = parseStructuredRateLimit(structured);
    if (parsed.limit !== undefined) {
      snapshot.limit = parsed.limit;
    }
    if (parsed.remaining !== undefined) {
      snapshot.remaining = parsed.remaining;
    }
    if (parsed.reset !== undefined) {
      snapshot.resetAtMs = resetToEpochMs(parsed.reset, nowMs);
    }
  }

  const limit = readHeader(source, "RateLimit-Limit") ?? readHeader(source, "X-RateLimit-Limit");
  const remaining =
    readHeader(source, "RateLimit-Remaining") ?? readHeader(source, "X-RateLimit-Remaining");
  const reset = readHeader(source, "RateLimit-Reset") ?? readHeader(source, "X-RateLimit-Reset");

  if (snapshot.limit === undefined && limit !== null) {
    const n = Number.parseInt(limit, 10);
    if (!Number.isNaN(n)) {
      snapshot.limit = n;
    }
  }
  if (snapshot.remaining === undefined && remaining !== null) {
    const n = Number.parseInt(remaining, 10);
    if (!Number.isNaN(n)) {
      snapshot.remaining = n;
    }
  }
  if (snapshot.resetAtMs === undefined && reset !== null) {
    const n = Number.parseInt(reset, 10);
    if (!Number.isNaN(n)) {
      snapshot.resetAtMs = resetToEpochMs(n, nowMs);
    }
  }

  return snapshot;
}

/**
 * Parse a `Retry-After` header (RFC 9110). Supports both forms:
 * - delta-seconds: `Retry-After: 120`
 * - HTTP-date:     `Retry-After: Wed, 21 Oct 2025 07:28:00 GMT`
 *
 * Returns the wait time in milliseconds, or null if absent/unparseable.
 */
export function parseRetryAfter(value: string | null, nowMs = Date.now()): number | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();

  // delta-seconds form
  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10) * 1_000;
  }

  // HTTP-date form
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - nowMs);
  }

  return null;
}

/**
 * Derive structured retry guidance an agent can act on directly.
 *
 * Precedence for the wait time:
 * 1. `Retry-After` (explicit server instruction)
 * 2. RateLimit `reset` (window boundary)
 * 3. DEFAULT_RETRY_MS (fallback for retryable statuses)
 *
 * <CUSTOMISE> Extend `retryableStatuses` for domain-specific transient codes.
 */
export function computeRetryGuidance(
  source: HeaderSource,
  options: {
    status: number;
    nowMs?: number;
    retryableStatuses?: number[];
  },
): RetryGuidance {
  const nowMs = options.nowMs ?? Date.now();
  const retryableStatuses = options.retryableStatuses ?? [408, 425, 429, 500, 502, 503, 504];
  const clamp = (ms: number) => Math.min(MAX_WAIT_MS, Math.max(0, ms));

  if (!retryableStatuses.includes(options.status)) {
    return {
      reason: `Status ${options.status} is not retryable.`,
      retryable: false,
      waitMs: 0,
    };
  }

  const retryAfterMs = parseRetryAfter(readHeader(source, "Retry-After"), nowMs);
  if (retryAfterMs !== null) {
    return {
      reason: `Server sent Retry-After; wait ${Math.round(retryAfterMs / 1_000)}s before retrying.`,
      retryable: true,
      waitMs: clamp(retryAfterMs),
    };
  }

  const { remaining, resetAtMs } = parseRateLimit(source, nowMs);
  if (remaining === 0 && resetAtMs !== undefined) {
    const waitMs = clamp(resetAtMs - nowMs);
    return {
      reason: `Rate limit exhausted; window resets in ${Math.round(waitMs / 1_000)}s.`,
      retryable: true,
      waitMs,
    };
  }

  return {
    reason: `Retryable status ${options.status} with no explicit hint; backing off.`,
    retryable: true,
    waitMs: clamp(DEFAULT_RETRY_MS),
  };
}

/**
 * Build RateLimit response headers to emit from your server.
 *
 * Emits the discrete `RateLimit-*` fields (widely supported) and, when the window is
 * exhausted, a `Retry-After` in delta-seconds so simple clients can act without parsing.
 *
 * <CUSTOMISE> Add the structured `RateLimit` field too if your clients prefer it.
 */
export function emitRateLimitHeaders(
  snapshot: RateLimitSnapshot,
  nowMs = Date.now(),
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (snapshot.limit !== undefined) {
    headers["RateLimit-Limit"] = String(snapshot.limit);
  }
  if (snapshot.remaining !== undefined) {
    headers["RateLimit-Remaining"] = String(Math.max(0, snapshot.remaining));
  }
  if (snapshot.resetAtMs !== undefined) {
    const resetSeconds = Math.max(0, Math.ceil((snapshot.resetAtMs - nowMs) / 1_000));
    headers["RateLimit-Reset"] = String(resetSeconds);
    if (snapshot.remaining === 0) {
      headers["Retry-After"] = String(resetSeconds);
    }
  }

  return headers;
}

/**
 * Why rate-limit headers matter for agents:
 *
 * An agent that ignores rate-limit signals will hammer a 429ing endpoint, burn its
 * budget, and often get itself throttled harder. With this helper an agent can:
 *
 * 1. Read the response headers after any request.
 * 2. Call `computeRetryGuidance(headers, { status })` to get `{ retryable, waitMs, reason }`.
 * 3. If `retryable`, sleep `waitMs` (respecting the server's Retry-After / reset), then retry.
 * 4. If not retryable, surface `reason` instead of blindly looping.
 *
 * Server-side, emit consistent `RateLimit-*` headers with `emitRateLimitHeaders(...)` so
 * well-behaved agents can pace themselves before they ever hit a 429.
 */
