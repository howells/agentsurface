import { searchInput, searchOutput, pageSummary } from "./retrieval-contract.ts";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

const annotations = {
  readOnlyHint: true,
  idempotentHint: true,
  destructiveHint: false,
  openWorldHint: false,
};
function structured<T extends Record<string, unknown>>(value: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

export interface DocumentationPage {
  url: string;
  slugs: string[];
  data: {
    title: string;
    description?: string;
    lastModified?: Date | string;
    lastVerified?: string;
  };
}

export interface DocumentationBackend {
  pages: () => DocumentationPage[];
  markdown: (page: DocumentationPage) => Promise<string>;
  search: (input: z.infer<typeof searchInput>) => Promise<z.infer<typeof searchOutput>>;
}

export function createDocsMcpServer(backend: DocumentationBackend, version: string) {
  const mcp = new McpServer(
    { name: "agentsurface-docs", version },
    {
      instructions:
        "Search first to find relevant documentation, or list_pages to browse. Then get_page with a canonical URL to read the full Markdown. All tools are public and read-only. Search returns at most 20 pages; narrow query or section when has_more is true.",
    },
  );
  mcp.registerTool(
    "search",
    {
      title: "Search documentation",
      description:
        "Use when you know the topic but need authoritative pages. Searches titles, descriptions, headings and body; deduplicates chunks into pages in Fumadocs full-text relevance order (ZBSearch). Rank is a position, not confidence. Read a result with get_page; narrow query or section if has_more is true.",
      annotations,
      inputSchema: searchInput,
      outputSchema: searchOutput,
    },
    async (input) => structured(await backend.search(input)),
  );
  mcp.registerTool(
    "list_pages",
    {
      title: "Browse documentation",
      description:
        "Use when you do not know the topic keywords. Browse page identities and URLs, optionally within a section; then get_page to read one. Pages are sorted by URL. Use offset plus limit for the next slice of this static index.",
      annotations,
      inputSchema: z.object({
        section: searchInput.shape.section,
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(30)
          .describe("Maximum pages, default 30, maximum 100."),
        offset: z
          .number()
          .int()
          .min(0)
          .default(0)
          .describe(
            "Zero-based index offset; add the previous limit for the next slice. Restart after a deployment.",
          ),
      }),
      outputSchema: z.object({
        pages: z.array(pageSummary),
        has_more: z.boolean(),
        next_offset: z.number().nullable(),
      }),
    },
    async ({ section, limit, offset }) => {
      const pages = backend
        .pages()
        .filter((page) => !section || page.slugs[0] === section)
        .toSorted((a, b) => a.url.localeCompare(b.url));
      const hasMore = offset + limit < pages.length;
      return structured({
        pages: pages.slice(offset, offset + limit).map((page) => ({
          id: page.url,
          title: page.data.title,
          description: page.data.description ?? "",
          url: `https://agentsurface.dev${page.url}`,
          slug: page.slugs.join("/") || "index",
          ...(page.data.lastModified || page.data.lastVerified
            ? {
                updated_at: page.data.lastModified
                  ? new Date(page.data.lastModified).toISOString()
                  : page.data.lastVerified,
              }
            : {}),
        })),
        has_more: hasMore,
        next_offset: hasMore ? offset + limit : null,
      });
    },
  );
  mcp.registerTool(
    "get_page",
    {
      title: "Read a documentation page",
      description:
        "Use after search or list_pages to read the authoritative full Markdown of one page, including canonical URL and freshness metadata. This does not fetch external websites. On PAGE_NOT_FOUND, search again or browse the public index.",
      annotations,
      inputSchema: z.object({
        url: z
          .string()
          .describe(
            "Canonical Agent Surface docs URL or path returned by search or list_pages, for example /docs/discovery/llms-txt.",
          ),
      }),
      outputSchema: z.object({
        id: z.string(),
        url: z.string(),
        markdown: z.string(),
        updated_at: z.string().optional(),
      }),
    },
    async ({ url }) => {
      const parsed = URL.parse(url, "https://agentsurface.dev");
      const page =
        parsed?.origin === "https://agentsurface.dev"
          ? backend
              .pages()
              .find((candidate) => candidate.url === parsed.pathname.replace(/\.md$/, ""))
          : undefined;
      if (!page) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({
                code: "PAGE_NOT_FOUND",
                detail: `No documentation page matches ${url}`,
                is_retriable: false,
                suggestions: [
                  "Call search with topic keywords or list_pages for valid URLs.",
                  "Browse https://agentsurface.dev/llms.txt",
                ],
              }),
            },
          ],
        };
      }
      return structured({
        id: page.url,
        url: `https://agentsurface.dev${page.url}`,
        markdown: await backend.markdown(page),
        ...(page.data.lastModified || page.data.lastVerified
          ? {
              updated_at: page.data.lastModified
                ? new Date(page.data.lastModified).toISOString()
                : page.data.lastVerified,
            }
          : {}),
      });
    },
  );
  return mcp;
}
