import { apiError } from "@/lib/api-error";
import { searchServer } from "@/lib/search";

export const dynamic = "force-dynamic";

const { GET: searchGET } = searchServer;

/**
 * Canonical Fumadocs search endpoint. Returns `SortedResult[]` — the exact
 * contract the default RootProvider search dialog fetches from `/api/search`.
 * Wrapped only to attach the site-wide Content-Signal header.
 */
export async function GET(request: Request): Promise<Response> {
  let response: Response;
  try {
    response = await searchGET(request);
  } catch {
    return apiError(
      500,
      "SEARCH_FAILED",
      "Search is temporarily unavailable",
      "Retry later or read /llms.txt.",
    );
  }
  if (!response.ok) {
    return apiError(
      response.status,
      "SEARCH_REQUEST_FAILED",
      "Search request failed",
      "Use /api/docs/search?query=discovery for the documented search API.",
    );
  }
  const headers = new Headers(response.headers);
  headers.set("Content-Signal", "search=yes, ai-input=yes, ai-train=no");
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
