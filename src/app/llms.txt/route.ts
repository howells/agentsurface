import { estimateTokens } from "@/lib/markdown";
import { docsLlms } from "@/lib/source";
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
  `Fetch [/llms.txt](${SITE_ORIGIN}/llms.txt) for this index or [/llms-full.txt](${SITE_ORIGIN}/llms-full.txt) for every page in one file, request any docs page with \`Accept: text/markdown\` or its \`.md\` URL, or connect an MCP client to [${SITE_ORIGIN}/mcp](${SITE_ORIGIN}/mcp) and call \`search\`, \`list_pages\`, or \`get_page\`.`,
].join("\n");

// Static, hand-written entry points. These are surfaces, not docs pages, so they
// are not derivable from source.getPages() and must stay curated here.
const ENTRY_POINTS: string[] = [
  `- [OpenAPI specification](${SITE_ORIGIN}/openapi.json): Public documentation search and Markdown retrieval; no authentication required.`,
  `- [Access policy](${SITE_ORIGIN}/auth.md): Public, read-only access without credentials.`,
  `- [AGENTS.md](${SITE_ORIGIN}/AGENTS.md): Project context and working conventions for coding agents.`,
  `- [surface skill](${SITE_ORIGIN}/skills/surface/SKILL.md): The operational workflow for guide, audit, scaffold, transform, and generate tasks.`,
  `- [Docs index](${SITE_ORIGIN}/docs/llms.txt): The docs page tree on its own, without these entry points.`,
  `- [Build agents index](${SITE_ORIGIN}/docs/agents/llms.txt): Only the pages for teams building agents of their own.`,
  `- [Full docs export](${SITE_ORIGIN}/llms-full.txt): Every documentation page as Markdown, in one file.`,
  `- [Homepage as Markdown](${SITE_ORIGIN}/index.md): The homepage guide (also served for \`Accept: text/markdown\` or \`/?mode=agent\`).`,
  `- [Any docs page as Markdown](${SITE_ORIGIN}/docs.md): Append \`.md\` to a docs URL, e.g. \`/docs/discovery/llms-txt.md\`, or send \`Accept: text/markdown\`.`,
  `- [Markdown API](${SITE_ORIGIN}/api/md/index): Raw Markdown endpoint. Replace \`index\` with any docs slug, for example \`discovery/llms-txt\`.`,
  `- [MCP endpoint](${SITE_ORIGIN}/mcp): Agent Surface docs tools: \`search\`, \`list_pages\`, and \`get_page\`.`,
  `- [MCP Registry entry](https://registry.modelcontextprotocol.io/v0/servers/dev.agentsurface%2Fdocs/versions/latest): The MCP server's listing in the official registry, as \`dev.agentsurface/docs\`.`,
  `- [MCP server card](${SITE_ORIGIN}/.well-known/mcp/server-card.json): Machine-readable description of the MCP endpoint and its tools.`,
  `- [Agent skills index](${SITE_ORIGIN}/.well-known/agent-skills/index.json): Discovery record for the surface skill.`,
  `- [API catalog](${SITE_ORIGIN}/.well-known/api-catalog): RFC 9727 linkset for the OpenAPI spec and docs.`,
  `- [ARD catalog](${SITE_ORIGIN}/.well-known/ard.json): Agentic Resource Discovery manifest listing the MCP server, API, and skill.`,
];

export async function GET() {
  // Strip the auto-generated "# Agent Surface" title; we render our own
  // title, summary, and entry points above the page tree.
  const pages = (await docsLlms.index()).replace(/^#[^\n]*\n+/, "");

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
