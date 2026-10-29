import { apiError } from "@/lib/api-error";
import { searchInput } from "@/lib/retrieval-contract";
import { retrieveDocs } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const rawLimit = params.get("limit") ?? "5";
  const input = searchInput.safeParse({
    query: params.get("query") ?? "",
    limit: /^\d+$/.test(rawLimit) ? Number(rawLimit) : Number.NaN,
    section: params.get("section") ?? undefined,
  });
  const instance = url.pathname + url.search;
  if (!input.success) {
    return apiError(
      400,
      "INVALID_SEARCH",
      "Invalid search parameters",
      "Use query with 2 to 500 characters, an integer limit from 1 to 20 and an optional section such as discovery.",
      instance,
    );
  }
  try {
    return Response.json(await retrieveDocs(input.data));
  } catch {
    return apiError(
      500,
      "SEARCH_FAILED",
      "Search is temporarily unavailable",
      "Retry later or read https://agentsurface.dev/llms.txt to find documentation pages.",
      instance,
      true,
    );
  }
}
