/** Recoverable errors for the public documentation API (RFC 9457). */
export function apiError(status: number, code: string, message: string, hint: string) {
  return Response.json(
    { type: "about:blank", title: message, status, code, message, hint },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );
}
