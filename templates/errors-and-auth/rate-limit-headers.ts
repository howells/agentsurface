/**
 * RateLimit + Retry-After header parsing and emission
 * Canonical: https://www.ietf.org/archive/id/draft-ietf-httpapi-ratelimit-headers-11.html
 *            (an Internet-Draft, not yet an RFC; pin the revision you implement)
 *            https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after
 * Use: Parse rate-limit signals from a response so an agent knows whether and when to
 *      retry, and emit consistent RateLimit headers from your own server.
 *
 * <CUSTOMISE>
 * - Set DEFAULT_RETRY_MS for 429/503 responses that omit both RateLimit and Retry-After
 * - Adjust MAX_WAIT_MS to cap how long an agent should ever wait before giving up
 * - Draft-11 sends `RateLimit: "default";r=50;t=30` (remaining, seconds until reset) and
 *   `RateLimit-Policy: "default";q=100;w=60` (quota, window seconds). Older drafts and many
 *   gateways send discrete `RateLimit-Limit/Remaining/Reset` or `X-RateLimit-*`; those are
 *   read below as compatibility paths.
 * - `t` and `RateLimit-Reset` are delta-seconds by definition. The vendor
 *   `X-RateLimit-Reset` is delta-seconds on some APIs and epoch seconds on others
 *   (GitHub, for one); a value past 1e9 is read as epoch seconds.
 * </CUSTOMISE>
 */

const DEFAULT_RETRY_MS = 1_000;
const MAX_WAIT_MS = 300_000; // a longer wait than this is reported as not retryable
const POLICY_NAME = "default"; // quota policy name used in the draft-11 structured fields

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
  /** True if the agent should wait `waitMs` and retry the request. */
  retryable: boolean;
  /**
   * How long the server asks the caller to wait, in milliseconds. When that is
   * longer than MAX_WAIT_MS, `retryable` is false and this still carries the
   * server's wait, so the caller can schedule the work for later. 0 for a status
   * that is never retried.
   */
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
 * Parse a draft-11 structured field list such as `"default";r=50;t=30` or
 * `"burst";q=100;w=60, "daily";q=1000;w=86400`. Returns the parameters of the
 * first (most specific) item as numbers.
 */
function parseStructuredRateLimit(value: string): Partial<Record<string, number>> {
  const out: Partial<Record<string, number>> = {};
  const firstItem = value.split(",")[0] ?? "";
  // The first segment is the quoted item name; the rest are `key=value` parameters.
  for (const part of firstItem.split(";").slice(1)) {
    const [rawKey, rawVal] = part.split("=");
    if (!rawKey || rawVal === undefined) {
      continue;
    }
    const num = Number.parseInt(rawVal.trim(), 10);
    if (!Number.isNaN(num)) {
      out[rawKey.trim().toLowerCase()] = num;
    }
  }
  return out;
}

/** Delta-seconds can never be this large (over 31 years), so a bigger value is epoch seconds. */
const EPOCH_SECONDS_THRESHOLD = 1_000_000_000;

/**
 * Convert the vendor `X-RateLimit-Reset` value, which is delta-seconds on some
 * APIs and epoch seconds on others, into an absolute epoch-ms timestamp.
 */
function vendorResetToEpochMs(reset: number, nowMs: number): number {
  return reset > EPOCH_SECONDS_THRESHOLD ? reset * 1_000 : nowMs + reset * 1_000;
}

/**
 * Parse RateLimit signals from a response's headers.
 *
 * Recognises, in order of preference:
 * 1. Draft-11 `RateLimit: "name";r=<remaining>;t=<seconds>` and
 *    `RateLimit-Policy: "name";q=<quota>;w=<window seconds>`
 * 2. Discrete `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` (older drafts)
 * 3. Legacy `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset`
 */
export function parseRateLimit(source: HeaderSource, nowMs = Date.now()): RateLimitSnapshot {
  const snapshot: RateLimitSnapshot = {};

  const policy = readHeader(source, "RateLimit-Policy");
  if (policy) {
    const parsed = parseStructuredRateLimit(policy);
    if (parsed.q !== undefined) {
      snapshot.limit = parsed.q;
    }
  }

  const structured = readHeader(source, "RateLimit");
  if (structured?.includes(";")) {
    const parsed = parseStructuredRateLimit(structured);
    if (parsed.r !== undefined) {
      snapshot.remaining = parsed.r;
    }
    if (parsed.t !== undefined) {
      snapshot.resetAtMs = nowMs + parsed.t * 1_000;
    }
  }

  const limit = readHeader(source, "RateLimit-Limit") ?? readHeader(source, "X-RateLimit-Limit");
  const remaining =
    readHeader(source, "RateLimit-Remaining") ?? readHeader(source, "X-RateLimit-Remaining");
  const draftReset = readHeader(source, "RateLimit-Reset");
  const vendorReset = readHeader(source, "X-RateLimit-Reset");

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
  if (snapshot.resetAtMs === undefined && draftReset !== null) {
    const n = Number.parseInt(draftReset, 10);
    if (!Number.isNaN(n)) {
      snapshot.resetAtMs = nowMs + n * 1_000;
    }
  }
  if (snapshot.resetAtMs === undefined && vendorReset !== null) {
    const n = Number.parseInt(vendorReset, 10);
    if (!Number.isNaN(n)) {
      snapshot.resetAtMs = vendorResetToEpochMs(n, nowMs);
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

  if (!retryableStatuses.includes(options.status)) {
    return {
      reason: `Status ${options.status} is not retryable.`,
      retryable: false,
      waitMs: 0,
    };
  }

  // Retrying sooner than the server allows only gets the caller throttled harder,
  // so a wait past the cap is reported as not retryable, never shortened.
  const advise = (waitMs: number, reason: string): RetryGuidance =>
    waitMs > MAX_WAIT_MS
      ? {
          reason: `${reason} That is longer than the ${MAX_WAIT_MS / 1_000}s cap; stop and reschedule.`,
          retryable: false,
          waitMs,
        }
      : { reason, retryable: true, waitMs };

  const retryAfterMs = parseRetryAfter(readHeader(source, "Retry-After"), nowMs);
  if (retryAfterMs !== null) {
    return advise(
      retryAfterMs,
      `Server sent Retry-After; wait ${Math.round(retryAfterMs / 1_000)}s before retrying.`,
    );
  }

  const { remaining, resetAtMs } = parseRateLimit(source, nowMs);
  if (remaining === 0 && resetAtMs !== undefined) {
    const waitMs = Math.max(0, resetAtMs - nowMs);
    return advise(waitMs, `Rate limit exhausted; window resets in ${Math.round(waitMs / 1_000)}s.`);
  }

  return {
    reason: `Retryable status ${options.status} with no explicit hint; backing off.`,
    retryable: true,
    waitMs: DEFAULT_RETRY_MS,
  };
}

/**
 * Build RateLimit response headers to emit from your server.
 *
 * Emits the draft-11 structured fields (`RateLimit` and `RateLimit-Policy`) and, when the
 * window is exhausted, a `Retry-After` in delta-seconds so simple clients can act without
 * parsing structured fields.
 *
 * <CUSTOMISE> Set POLICY_NAME.
 */
export function emitRateLimitHeaders(
  snapshot: RateLimitSnapshot,
  nowMs = Date.now(),
  windowSeconds?: number,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const resetSeconds =
    snapshot.resetAtMs === undefined
      ? undefined
      : Math.max(0, Math.ceil((snapshot.resetAtMs - nowMs) / 1_000));

  if (snapshot.limit !== undefined && windowSeconds !== undefined) {
    headers["RateLimit-Policy"] = `"${POLICY_NAME}";q=${snapshot.limit};w=${windowSeconds}`;
  }
  if (snapshot.remaining !== undefined) {
    const remaining = Math.max(0, snapshot.remaining);
    headers.RateLimit = `"${POLICY_NAME}";r=${remaining}${resetSeconds === undefined ? "" : `;t=${resetSeconds}`}`;
    if (remaining === 0 && resetSeconds !== undefined) {
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
 * Server-side, emit `RateLimit` and `RateLimit-Policy` with `emitRateLimitHeaders(...)` so
 * well-behaved agents can pace themselves before they ever hit a 429.
 */
