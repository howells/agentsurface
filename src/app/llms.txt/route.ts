import { estimateTokens } from "@/lib/markdown";
import { guideSource } from "@/lib/guide-source";
import { source } from "@/lib/source";
import { NextResponse } from "next/server";

export const revalidate = false;

const SITE_ORIGIN = "https://agentsurface.dev";

// Hand-curated summary carried over from the previous static public/llms.txt.
const SUMMARY =
  "Agent Surface is a practical guide and implementation kit for making software readable by AI agents and for building production-grade agent systems. It covers agent-readable surfaces, discovery, APIs, tools, MCP, auth, errors, retrieval, multi-agent orchestration, evaluation, runtime boundaries, UI, and current agent protocols.";

const WHEN_TO_USE = [
  "## When to use this site",
  "",
  "Reach for Agent Surface when you need to:",
  "",
  "- Look up how to make a website, app, or API legible to AI agents: discovery files, content negotiation, structured data, auth and error contracts.",
  "- Get the `surface` skill installed in a coding agent to audit, score, or scaffold an agent-readable surface directly in a repository.",
  "- Search or read this documentation over MCP instead of fetching pages one at a time.",
  "",
  `Fetch [/llms.txt](${SITE_ORIGIN}/llms.txt) for this index or [/llms-full.txt](${SITE_ORIGIN}/llms-full.txt) for every page in one file, request any docs page with \`Accept: text/markdown\` or its \`.md\` URL, or follow the [MCP connection guide](${SITE_ORIGIN}/docs/mcp-servers/transports.md) to connect to POST /mcp and call \`search\`, \`list_pages\`, or \`get_page\`.`,
].join("\n");

// Static, hand-written entry points. These are surfaces, not docs pages, so they
// are not derivable from source.getPages() and must stay curated here.
const ENTRY_POINTS: string[] = [
  `- [OpenAPI specification](${SITE_ORIGIN}/openapi.json): Public documentation search and Markdown retrieval; no authentication required.`,
  `- [Access policy](${SITE_ORIGIN}/auth.md): Public, read-only access without credentials.`,
  `- [AGENTS.md](${SITE_ORIGIN}/AGENTS.md): Project context and working conventions for coding agents.`,
  `- [surface skill](${SITE_ORIGIN}/skills/surface/SKILL.md): The operational workflow for guide, audit, scaffold, transform, and generate tasks.`,
  `- [Docs index](${SITE_ORIGIN}/docs/llms.txt): The docs page tree on its own, without these entry points.`,
  `- [API index](${SITE_ORIGIN}/api/llms.txt): The documentation API's two operations, with examples.`,
  `- [Build agents index](${SITE_ORIGIN}/docs/agents/llms.txt): Only the pages for teams building agents of their own.`,
  `- [Full docs export](${SITE_ORIGIN}/llms-full.txt): Opt-in bulk export for offline indexing, roughly 1.9 MB and 470,000 estimated tokens (characters / 4). Prefer search or individual pages for normal reading.`,
  `- [Homepage as Markdown](${SITE_ORIGIN}/index.md): The homepage guide (also served for \`Accept: text/markdown\` or \`/?mode=agent\`).`,
  `- [Any docs page as Markdown](${SITE_ORIGIN}/docs.md): Append \`.md\` to a docs URL, e.g. \`/docs/discovery/llms-txt.md\`, or send \`Accept: text/markdown\`.`,
  `- [Markdown API](${SITE_ORIGIN}/api/md/index): Raw Markdown endpoint. Replace \`index\` with any docs slug, for example \`discovery/llms-txt\`.`,
  `- [MCP connection guide](${SITE_ORIGIN}/docs/mcp-servers/transports.md): Connect to POST /mcp to search and read documentation.`,
  `- [MCP Registry entry](https://registry.modelcontextprotocol.io/v0/servers/dev.agentsurface%2Fdocs/versions/latest): The MCP server's listing in the official registry, as \`dev.agentsurface/docs\`.`,
  `- [MCP server card](${SITE_ORIGIN}/mcp/server-card): Identity and transport of the MCP endpoint; the tools come from the live server.`,
  `- [Agent skills index](${SITE_ORIGIN}/.well-known/agent-skills/index.json): Discovery record for the surface skill.`,
  `- [API catalog](${SITE_ORIGIN}/.well-known/api-catalog): RFC 9727 linkset for the OpenAPI spec and docs.`,
  `- [ARD catalog](${SITE_ORIGIN}/.well-known/ard.json): Agentic Resource Discovery manifest listing the MCP server, API, and skill.`,
];

export async function GET() {
  // Strip the auto-generated "# Agent Surface" title; we render our own
  // title, summary, and entry points above the page tree.
  const pages = source
    .getPages()
    .filter((page) => page.slugs.length <= 1)
    .map(
      (page) =>
        `- [${page.data.title}](${SITE_ORIGIN}${page.url}.md): ${page.data.description ?? ""}`,
    )
    .join("\n");

  // Only essays that have actually been written land here; the other writer
  // finishes them one at a time, so this list can be a subset of the eight areas.
  const guidePages = guideSource
    .getPages()
    .map((page) => `- [${page.data.title}](${SITE_ORIGIN}${page.url}.md): ${page.data.description}`)
    .join("\n");
  const guideSection = guidePages ? ["## Guide", "", guidePages].join("\n") : "";

  const content = [
    "# Agent Surface",
    "",
    `> ${SUMMARY}`,
    "",
    WHEN_TO_USE,
    "",
    "## Agent-readable entry points",
    "",
    ENTRY_POINTS.join("\n"),
    "",
    guideSection,
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
