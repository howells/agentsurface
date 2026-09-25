import { estimateTokens } from "@/lib/markdown";
import { docsLlms, source } from "@/lib/source";
import { NextResponse } from "next/server";

export const revalidate = false;

export async function GET() {
  const pageCount = source.getPages().length;
  const header = `# Agent Surface: full documentation\n\nEvery Agent Surface documentation page (${pageCount} pages), concatenated as Markdown. See https://agentsurface.dev/llms.txt for the curated index.\n\n`;
  const content = header + (await docsLlms.full());

  return new NextResponse(content, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Signal": "search=yes, ai-input=yes, ai-train=yes",
      "Content-Type": "text/plain; charset=utf-8",
      "x-markdown-tokens": String(estimateTokens(content)),
    },
  });
}
