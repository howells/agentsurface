import { apiError } from "@/lib/api-error";
import { searchDocs } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("query")?.trim() ?? "";
  const rawLimit = params.get("limit") ?? "5";
  const limit = Number(rawLimit);
  if (
    query.length < 2 ||
    query.length > 500 ||
    !/^\d+$/.test(rawLimit) ||
    limit < 1 ||
    limit > 20
  ) {
    return apiError(
      400,
      "INVALID_SEARCH",
      "Invalid search parameters",
      "Use query with 2–500 characters and an integer limit from 1 to 20.",
    );
  }
  try {
    return Response.json({ results: await searchDocs(query, limit) });
  } catch {
    return apiError(
      500,
      "SEARCH_FAILED",
      "Search is temporarily unavailable",
      "Retry later or read /llms.txt to find documentation pages.",
    );
  }
}
