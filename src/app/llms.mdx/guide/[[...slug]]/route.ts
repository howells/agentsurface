import { renderGuidePage, guideSource } from "@/lib/guide-source";
import { markdownHeaders, notFoundMarkdownResponse } from "@/lib/markdown";
import type { NextRequest } from "next/server";

export const revalidate = false;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  // Drop the appended "content.md" segment; the rewrite in next.config.mjs adds it.
  const [area] = slug?.slice(0, -1) ?? [];

  const page = area ? guideSource.getPage([area]) : undefined;
  if (!page) {
    return notFoundMarkdownResponse(`/guide/${area ?? ""}`);
  }

  const content = await renderGuidePage(page);
  return new Response(content, { headers: markdownHeaders(content) });
}

export function generateStaticParams() {
  return guideSource.getPages().map((page) => ({ slug: [...page.slugs, "content.md"] }));
}
