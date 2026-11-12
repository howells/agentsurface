import { SITE_ORIGIN } from "./site.ts";

/** Every problem type the site emits. Each is documented at /errors/<kind>. */
export const PROBLEMS = {
  "validation-error": {
    status: 400,
    title: "Request parameters are invalid",
    about:
      "A query or path parameter is missing, malformed or out of range. Retrying unchanged fails again: correct the parameter named in `detail`, using the bounds in /openapi.json.",
  },
  "not-found": {
    status: 404,
    title: "Resource not found",
    about:
      "No page or endpoint exists at this path. Find valid documentation paths in /llms.txt or with /api/docs/search, and valid endpoints in /openapi.json.",
  },
  "method-not-allowed": {
    status: 405,
    title: "Method not allowed",
    about:
      "The endpoint exists but does not accept this HTTP method. The `Allow` response header lists the methods it does accept. The documentation API is read-only.",
  },
  "internal-error": {
    status: 500,
    title: "Internal error",
    about:
      "The server failed to answer a valid request. Read endpoints are safe to retry after a short wait when `is_retriable` is true; /llms.txt stays available as a static index.",
  },
} as const;

export type ProblemKind = keyof typeof PROBLEMS;

export function problemType(kind: ProblemKind) {
  return `${SITE_ORIGIN}/errors/${kind}`;
}

/** Public RFC 9457 profile. is_retriable means safe to retry unchanged, not merely a transient status. */
export function apiError(
  kind: ProblemKind,
  detail: string,
  suggestion: string,
  instance = "/",
  isRetriable = false,
  headers: Record<string, string> = {},
) {
  const { status, title } = PROBLEMS[kind];
  const traceId = crypto.randomUUID();
  return Response.json(
    {
      type: problemType(kind),
      title,
      status,
      detail,
      instance,
      is_retriable: isRetriable,
      suggestions: [suggestion],
      trace_id: traceId,
    },
    {
      status,
      headers: {
        "Content-Type": "application/problem+json",
        "Cache-Control": "no-store",
        "X-Request-Id": traceId,
        Vary: "Accept",
        ...headers,
      },
    },
  );
}

/** Handler for the write methods of a read-only route, so a wrong method gets a problem document and an Allow header. */
export function methodNotAllowed(request: Request) {
  const url = new URL(request.url);
  return apiError(
    "method-not-allowed",
    `${request.method} is not supported on ${url.pathname}`,
    "Send a GET request. /openapi.json lists every endpoint and its method.",
    url.pathname + url.search,
    false,
    { Allow: "GET, HEAD, OPTIONS" },
  );
}
