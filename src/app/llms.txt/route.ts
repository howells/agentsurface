import { source } from "@/lib/source";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const SITE_ORIGIN = "https://agentsurface.dev";

// Hand-curated summary carried over from the previous static public/llms.txt.
const SUMMARY =
  "Agent Surface is a practical guide and implementation kit for making software readable by AI agents and for building production-grade agent systems. It covers agent-readable surfaces, discovery, APIs, tools, MCP, auth, errors, retrieval, multi-agent orchestration, evaluation, runtime boundaries, UI, and current agent protocols.";

// Static, hand-written entry points. These are surfaces, not docs pages, so they
// are not derivable from source.getPages() and must stay curated here.
const ENTRY_POINTS: string[] = [
  `- [OpenAPI specification](${SITE_ORIGIN}/openapi.json): Public documentation search and Markdown retrieval; no authentication required.`,
  `- [Access policy](${SITE_ORIGIN}/auth.md): Public, read-only access without credentials.`,
  `- [AGENTS.md](${SITE_ORIGIN}/AGENTS.md): Project context and working conventions for coding agents.`,
  `- [surface skill](${SITE_ORIGIN}/skills/surface/SKILL.md): The operational workflow for guide, audit, scaffold, transform, and generate tasks.`,
  `- [Full docs export](${SITE_ORIGIN}/llms-full.txt): Plain-text export of all documentation pages.`,
  `- [Markdown API](${SITE_ORIGIN}/api/md/index): Raw Markdown/MDX endpoint. Replace \`index\` with any docs slug, for example \`discovery/llms-txt\`.`,
  `- [MCP endpoint](${SITE_ORIGIN}/mcp): Agent Surface docs tools: \`search_docs\` and \`get_page\`.`,
  `- [MCP server card](${SITE_ORIGIN}/.well-known/mcp/server-card.json): Machine-readable description of the MCP endpoint and its tools.`,
  `- [Agent skills index](${SITE_ORIGIN}/.well-known/agent-skills/index.json): Discovery record for the surface skill.`,
];

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Derive top-level docs section order from the root meta.json so new sections
// appear automatically in their curated navigation order.
function readSectionOrder(): string[] {
  const metaPath = join(process.cwd(), "src", "content", "docs", "meta.json");
  try {
    const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as { pages?: string[] };
    return (meta.pages ?? []).filter((entry) => entry !== "---");
  } catch {
    return [];
  }
}

interface PageEntry {
  url: string;
  title: string;
  description?: string;
}

function renderEntry(entry: PageEntry): string {
  return entry.description
    ? `- [${entry.title}](${entry.url}): ${entry.description}`
    : `- [${entry.title}](${entry.url})`;
}

export function GET() {
  const pages = source.getPages();
  const sectionOrder = readSectionOrder();

  // Group pages by their top-level docs section. Root-level pages (index,
  // getting-started) group under a leading "Start here" bucket.
  const ROOT_BUCKET = "";
  const grouped = new Map<string, PageEntry[]>();
  const sectionTitles = new Map<string, string>();

  for (const page of pages) {
    const relativePath = page.url.replace(/^\/docs\/?/, "");
    const segments = relativePath.split("/").filter(Boolean);
    const section = segments.length <= 1 ? ROOT_BUCKET : segments[0];

    const entry: PageEntry = {
      url: `${SITE_ORIGIN}${page.url}`,
      title: page.data.title,
      description: page.data.description,
    };

    // A section's index page (e.g. /docs/agents) names the section header.
    if (segments.length === 1) {
      sectionTitles.set(segments[0], page.data.title);
    }

    const bucket = grouped.get(section);
    if (bucket) {
      bucket.push(entry);
    } else {
      grouped.set(section, [entry]);
    }
  }

  // Order sections: root pages first, then meta.json order, then any leftover
  // sections alphabetically so nothing is silently dropped.
  const orderedSections: string[] = [ROOT_BUCKET];
  for (const slug of sectionOrder) {
    if (slug === "index" || slug === "getting-started") {
      continue;
    }
    if (grouped.has(slug) && !orderedSections.includes(slug)) {
      orderedSections.push(slug);
    }
  }
  for (const slug of [...grouped.keys()].toSorted()) {
    if (!orderedSections.includes(slug)) {
      orderedSections.push(slug);
    }
  }

  const blocks: string[] = [];

  for (const section of orderedSections) {
    const entries = grouped.get(section);
    if (!entries || entries.length === 0) {
      continue;
    }

    // Keep index pages first, then the rest in their loader order.
    const sorted = entries.toSorted((a, b) => {
      const aIsIndex = a.url === `${SITE_ORIGIN}/docs/${section}`;
      const bIsIndex = b.url === `${SITE_ORIGIN}/docs/${section}`;
      if (aIsIndex && !bIsIndex) {
        return -1;
      }
      if (bIsIndex && !aIsIndex) {
        return 1;
      }
      return 0;
    });

    const heading =
      section === ROOT_BUCKET ? "## Start here" : `## ${sectionTitles.get(section) ?? section}`;

    blocks.push(`${heading}\n\n${sorted.map(renderEntry).join("\n")}`);
  }

  const content = [
    "# Agent Surface",
    "",
    `> ${SUMMARY}`,
    "",
    "## Agent-readable entry points",
    "",
    ENTRY_POINTS.join("\n"),
    "",
    blocks.join("\n\n"),
    "",
  ].join("\n");

  return new NextResponse(content, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Signal": "search=yes, ai-input=yes, ai-train=no",
      "Content-Type": "text/plain; charset=utf-8",
      "x-markdown-tokens": String(estimateTokens(content)),
    },
  });
}
