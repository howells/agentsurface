import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function GET() {
  const content = readFileSync(join(process.cwd(), "skills", "surface", "SKILL.md"), "utf-8");

  return new NextResponse(content, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Signal": "search=yes, ai-input=yes, ai-train=no",
      "Content-Type": "text/markdown; charset=utf-8",
      "x-markdown-tokens": String(estimateTokens(content)),
    },
  });
}
