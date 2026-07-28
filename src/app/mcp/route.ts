import { normalizeSlug, readDocsFile } from "@/lib/docs-fs";
import { searchDocs } from "@/lib/search";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface DocsPage extends Record<string, unknown> {
  content: string;
  markdownUrl: string;
  slug: string;
  url: string;
}

function buildDocsUrl(slug: string): string {
  return `https://agentsurface.dev/docs${slug === "index" ? "" : `/${slug}`}`;
}

function buildMarkdownUrl(slug: string): string {
  return `https://agentsurface.dev/api/md/${slug}`;
}

function readDocsPage(slug: string): DocsPage | null {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    return null;
  }

  const content = readDocsFile(normalized);
  if (content === null) {
    return null;
  }

  return {
    content,
    markdownUrl: buildMarkdownUrl(normalized),
    slug: normalized,
    url: buildDocsUrl(normalized),
  };
}

function buildServer(): McpServer {
  const server = new McpServer({
    name: "agentsurface-docs",
    version: "2.1.0",
  });

  server.registerTool(
    "search_docs",
    {
      annotations: { openWorldHint: true, readOnlyHint: true },
      description:
        "Search Agent Surface documentation by keyword. Use when you need to find documentation pages about a specific topic (e.g. 'llms.txt', 'OAuth', 'MCP server', 'tool design'). Returns matching page titles, descriptions, and URLs. Do not use for retrieving full page content — use get_page for that.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(5)
          .optional()
          .describe("Maximum number of results (default 5, max 20)"),
        query: z.string().min(2).describe("Search term — any keyword or phrase"),
      },
      outputSchema: {
        query: z.string(),
        results: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
            url: z.string().url(),
            markdownUrl: z.string().url(),
            slug: z.string(),
          }),
        ),
        total: z.number().int(),
      },
    },
    async ({ query, limit = 5 }: { query: string; limit?: number }) => {
      const found = await searchDocs(query, limit);

      const results = found.map((result) => ({
        description: result.description,
        markdownUrl: buildMarkdownUrl(result.slug),
        slug: result.slug,
        title: result.title,
        url: result.url,
      }));

      const structuredContent = { query, results, total: results.length };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(structuredContent),
          },
        ],
        structuredContent,
      };
    },
  );

  server.registerTool(
    "get_page",
    {
      annotations: { readOnlyHint: true },
      description:
        "Retrieve the full Markdown content of an Agent Surface documentation page by its slug. Use when you need the complete text of a specific page. Example slugs: 'discovery/llms-txt', 'mcp-servers/tool-best-practices', 'scoring/rubric'. Get slugs from search_docs results first.",
      inputSchema: {
        slug: z
          .string()
          .describe("Page slug as returned by search_docs (e.g. 'discovery/llms-txt')"),
      },
      outputSchema: {
        content: z.string(),
        markdownUrl: z.string().url(),
        slug: z.string(),
        url: z.string().url(),
      },
    },
    ({ slug }: { slug: string }) => {
      const page = readDocsPage(slug);
      if (!page) {
        return {
          content: [
            {
              text: `Page not found or invalid slug: ${slug}. Use search_docs to find valid slugs.`,
              type: "text" as const,
            },
          ],
          isError: true,
        };
      }

      const structuredContent = page;

      return {
        content: [
          {
            type: "text" as const,
            text: page.content,
          },
        ],
        structuredContent,
      };
    },
  );

  return server;
}

export async function POST(request: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });

  const server = buildServer();
  await server.connect(transport);

  const response = await transport.handleRequest(request);
  await server.close();
  return response;
}

export async function GET(): Promise<Response> {
  return new Response("Method Not Allowed", { status: 405 });
}

export async function DELETE(): Promise<Response> {
  return new Response("Method Not Allowed", { status: 405 });
}
