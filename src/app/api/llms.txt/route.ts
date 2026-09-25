import { estimateTokens } from "@/lib/markdown";
import { NextResponse } from "next/server";

export const revalidate = false;

const SITE_ORIGIN = "https://agentsurface.dev";

const CONTENT = [
  "# Agent Surface API",
  "",
  "> A public, read-only HTTP API for searching the Agent Surface docs and reading any page as Markdown. No account or key.",
  "",
  `The operations are described in [/openapi.json](${SITE_ORIGIN}/openapi.json) and listed in the [API catalog](${SITE_ORIGIN}/.well-known/api-catalog). The same search and page reads are available as MCP tools at [/mcp](${SITE_ORIGIN}/mcp).`,
  "",
  "## Operations",
  "",
  `- [Search the docs](${SITE_ORIGIN}/api/docs/search?query=llms.txt&limit=5): \`GET /api/docs/search?query=<text>&limit=<n>\` returns matching pages with titles, URLs and descriptions.`,
  `- [Read a page as Markdown](${SITE_ORIGIN}/api/md/discovery/llms-txt): \`GET /api/md/<slug>\` returns one docs page as Markdown. Use \`index\` for the docs home. An unknown slug returns 404 with a JSON error.`,
  "",
  "## Other ways in",
  "",
  `- [Site index](${SITE_ORIGIN}/llms.txt): Every entry point, including the MCP server and the Surface skill.`,
  `- [Docs index](${SITE_ORIGIN}/docs/llms.txt): Every docs page, grouped by section.`,
  `- [Access policy](${SITE_ORIGIN}/auth.md): Why no credentials are needed.`,
  "",
].join("\n");

/** Section-level index for the documentation API. */
export function GET() {
  return new NextResponse(CONTENT, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Signal": "search=yes, ai-input=yes, ai-train=yes",
      "Content-Type": "text/plain; charset=utf-8",
      "x-markdown-tokens": String(estimateTokens(CONTENT)),
    },
  });
}
