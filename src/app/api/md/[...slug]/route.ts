import { normalizeSlug, readDocsFile } from "@/lib/docs-fs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const normalized = normalizeSlug(slug.join("/"));

  if (!normalized) {
    return new NextResponse("Not found", { status: 404 });
  }

  const content = readDocsFile(normalized);

  if (content === null) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(content, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Signal": "search=yes, ai-input=yes, ai-train=no",
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
      "x-markdown-tokens": String(estimateTokens(content)),
    },
  });
}
