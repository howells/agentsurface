import { source } from "@/lib/source";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function buildMarkdownUrl(slug: string): string {
  return `https://agentsurface.dev/api/md/${slug || "index"}`;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const limit = Math.min(Number.parseInt(request.nextUrl.searchParams.get("limit") || "10"), 50);

  if (!q || q.length < 2) {
    return Response.json({ query: q, results: [] });
  }

  const query = q.toLowerCase();
  const pages = source.getPages();

  const results = pages
    .filter((page) => {
      const title = (page.data.title || "").toLowerCase();
      const description = (page.data.description || "").toLowerCase();
      return title.includes(query) || description.includes(query);
    })
    .slice(0, limit)
    .map((page) => ({
      description: page.data.description || "",
      markdownUrl: buildMarkdownUrl(page.slugs.join("/")),
      slug: page.slugs.join("/"),
      title: page.data.title,
      url: `https://agentsurface.dev${page.url}`,
    }));

  return Response.json(
    { query: q, results, total: results.length },
    { headers: { "Content-Signal": "search=yes, ai-input=yes, ai-train=no" } },
  );
}
