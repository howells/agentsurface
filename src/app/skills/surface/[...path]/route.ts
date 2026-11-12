import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { estimateTokens } from "@/lib/markdown";
import { NextResponse } from "next/server";

const SKILL_ROOT = join(process.cwd(), "skills", "surface");

const CONTENT_TYPES: Record<string, string> = {
  md: "text/markdown; charset=utf-8",
  yaml: "application/yaml; charset=utf-8",
};

// Every file of the skill is prerendered, so SKILL.md's relative references
// resolve from its published URL. Any other path is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return readdirSync(SKILL_ROOT, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => ({
      path: join(entry.parentPath, entry.name)
        .slice(SKILL_ROOT.length + 1)
        .split("/"),
    }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const contentType = CONTENT_TYPES[path.at(-1)!.split(".").at(-1)!];
  if (!contentType) {
    throw new Error(`No content type for skill file ${path.join("/")}`);
  }
  const content = readFileSync(join(SKILL_ROOT, ...path), "utf-8");

  return new NextResponse(content, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Signal": "search=yes, ai-input=yes, ai-train=yes",
      "Content-Type": contentType,
      "x-markdown-tokens": String(estimateTokens(content)),
    },
  });
}
