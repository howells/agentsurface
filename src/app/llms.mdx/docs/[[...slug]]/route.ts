import { docsLlms, source } from "@/lib/source";
import { markdownHeaders, notFoundMarkdownResponse } from "@/lib/markdown";
import type { NextRequest } from "next/server";

export const revalidate = false;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  // Drop the appended "content.md" segment; `/docs.md` rewrites to no slug at all.
  const slugs = slug?.slice(0, -1) ?? [];
  if (slugs.at(-1) === "index") {
    slugs.pop();
  }

  const page = source.getPage(slugs);
  if (!page) {
    return notFoundMarkdownResponse(`/docs/${slugs.join("/")}`);
  }

  const content = await docsLlms.page(page);
  return new Response(content, { headers: markdownHeaders(content) });
}

export function generateStaticParams() {
  return source.generateParams().map((item) => ({
    ...item,
    slug: [...item.slug, "content.md"],
  }));
}
