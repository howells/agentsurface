/** Public RFC 9457 profile. is_retriable means safe to retry unchanged, not merely a transient status. */
export function apiError(
  status: number,
  code: string,
  message: string,
  hint: string,
  instance = "/",
  isRetriable = false,
) {
  const traceId = crypto.randomUUID();
  return Response.json(
    {
      type: "about:blank",
      title: message,
      status,
      detail: message,
      instance,
      code,
      message,
      hint,
      is_retriable: isRetriable,
      suggestions: [hint],
      trace_id: traceId,
    },
    {
      status,
      headers: {
        "Content-Type": "application/problem+json",
        "Cache-Control": "no-store",
        "X-Request-Id": traceId,
        Vary: "Accept",
      },
    },
  );
}
