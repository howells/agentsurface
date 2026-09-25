import { estimateTokens } from "@/lib/markdown";
import { source } from "@/lib/source";
import type { Node } from "fumadocs-core/page-tree";
import { NextResponse } from "next/server";

export const revalidate = false;

const SITE_ORIGIN = "https://agentsurface.dev";

const byUrl = new Map(source.getPages().map((page) => [page.url, page]));

/** Page URLs in sidebar order, so the section index reads like the navigation. */
function orderedUrls(nodes: Node[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type === "page") {
      return [node.url];
    }
    if (node.type === "folder") {
      return [...(node.index ? [node.index.url] : []), ...orderedUrls(node.children)];
    }
    return [];
  });
}

/** Section-level index for the "Build agents" part of the guide. */
export function GET() {
  const pages = orderedUrls(source.pageTree.children)
    .filter((url) => url === "/docs/agents" || url.startsWith("/docs/agents/"))
    .flatMap((url) => {
      const page = byUrl.get(url);
      return page
        ? [`- [${page.data.title}](${url}): ${page.data.description ?? ""}`.trimEnd()]
        : [];
    });

  const content = [
    "# Agent Surface: Build agents",
    "",
    "> The part of the guide for teams building agents of their own: frameworks, platforms, orchestration, memory, evaluation and the protocols between agents.",
    "",
    `The whole guide is indexed at [/docs/llms.txt](${SITE_ORIGIN}/docs/llms.txt). Append \`.md\` to any page URL for its Markdown.`,
    "",
    "## Pages",
    "",
    ...pages,
    "",
  ].join("\n");

  return new NextResponse(content, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Signal": "search=yes, ai-input=yes, ai-train=yes",
      "Content-Type": "text/plain; charset=utf-8",
      "x-markdown-tokens": String(estimateTokens(content)),
    },
  });
}
