import { apiError } from "@/lib/api-error";
import { markdownHeaders } from "@/lib/markdown";
import { docsLlms, source } from "@/lib/source";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const revalidate = false;

/** `index` (and the empty path) address the docs root; everything else maps to its slug segments. */
function resolveSlug(segments: string[]): string[] {
  if (segments.length === 0 || (segments.length === 1 && segments[0] === "index")) {
    return [];
  }
  return segments;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const page = source.getPage(resolveSlug(slug));

  if (!page) {
    return apiError(
      404,
      "PAGE_NOT_FOUND",
      "Documentation page not found",
      "Search /api/docs/search?query=discovery or use a slug from /llms.txt.",
    );
  }

  const content = await docsLlms.page(page);
  return new NextResponse(content, { headers: markdownHeaders(content) });
}
