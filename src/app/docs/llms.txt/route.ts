import { estimateTokens } from "@/lib/markdown";
import { docsLlms } from "@/lib/source";
import { NextResponse } from "next/server";

export const revalidate = false;

const SITE_ORIGIN = "https://agentsurface.dev";

/** Section-level index: the docs page tree alone, without the site-wide entry points in /llms.txt. */
export async function GET() {
  const pages = (await docsLlms.index()).replace(/^#[^\n]*\n+/, "");

  const content = [
    "# Agent Surface docs",
    "",
    "> Every page of the Agent Surface guide, grouped by section. Append `.md` to any page URL for its Markdown, or send `Accept: text/markdown`.",
    "",
    `The site-wide index, with the MCP server, API and skill, is at [/llms.txt](${SITE_ORIGIN}/llms.txt). Every page in one file is at [/llms-full.txt](${SITE_ORIGIN}/llms-full.txt).`,
    "",
    pages,
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
