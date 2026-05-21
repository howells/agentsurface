import { source } from '@/lib/source';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type DocsPage = {
  content: string;
  slug: string;
  url: string;
};

function normalizeSlug(slug: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return null;
  }

  if (/[\u0000-\u001f\u007f]/.test(decoded) || decoded.includes('\\')) {
    return null;
  }

  const normalized = decoded.replace(/^\/+/, '').replace(/\/+$/, '');
  const segments = normalized.split('/').filter(Boolean);

  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return null;
  }

  return segments.join('/') || 'index';
}

function readDocsPage(slug: string): DocsPage | null {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    return null;
  }

  const docsRoot = join(process.cwd(), 'src', 'content', 'docs');
  const candidates =
    normalized === 'index'
      ? [join(docsRoot, 'index.mdx')]
      : [
          join(docsRoot, `${normalized}.mdx`),
          join(docsRoot, normalized, 'index.mdx'),
        ];

  for (const candidate of candidates) {
    try {
      return {
        content: readFileSync(candidate, 'utf-8'),
        slug: normalized,
        url: `https://agentsurface.dev/docs${
          normalized === 'index' ? '' : `/${normalized}`
        }`,
      };
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function buildServer(): McpServer {
  const server = new McpServer({
    name: 'agentsurface-docs',
    version: '1.0.0',
  });

  server.registerTool(
    'search_docs',
    {
      description:
        'Search Agent Surface documentation by keyword. Use when you need to find documentation pages about a specific topic (e.g. \'llms.txt\', \'OAuth\', \'MCP server\', \'tool design\'). Returns matching page titles, descriptions, and URLs. Do not use for retrieving full page content — use get_page for that.',
      inputSchema: {
        query: z.string().describe('Search term — any keyword or phrase'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(5)
          .optional()
          .describe('Maximum number of results (default 5, max 20)'),
      },
      outputSchema: {
        query: z.string(),
        total: z.number().int(),
        results: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
            url: z.string().url(),
            slug: z.string(),
          })
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ({ query, limit = 5 }: { query: string; limit?: number }) => {
      const q = query.toLowerCase();
      const pages = source.getPages();

      const results = pages
        .filter(page => {
          const title = (page.data.title || '').toLowerCase();
          const description = (page.data.description || '').toLowerCase();
          return title.includes(q) || description.includes(q);
        })
        .slice(0, limit)
        .map(page => ({
          title: page.data.title,
          description: page.data.description || '',
          url: `https://agentsurface.dev${page.url}`,
          slug: page.slugs.join('/'),
        }));

      const structuredContent = { results, total: results.length, query };

      return {
        structuredContent,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(structuredContent),
          },
        ],
      };
    }
  );

  server.registerTool(
    'get_page',
    {
      description:
        "Retrieve the full Markdown content of an Agent Surface documentation page by its slug. Use when you need the complete text of a specific page. Example slugs: 'discovery/llms-txt', 'mcp-servers/tool-best-practices', 'scoring/rubric'. Get slugs from search_docs results first.",
      inputSchema: {
        slug: z
          .string()
          .describe(
            "Page slug as returned by search_docs (e.g. 'discovery/llms-txt')"
          ),
      },
      outputSchema: {
        slug: z.string(),
        url: z.string().url(),
        content: z.string(),
      },
      annotations: { readOnlyHint: true },
    },
    ({ slug }: { slug: string }) => {
      const page = readDocsPage(slug);
      if (!page) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Page not found or invalid slug: ${slug}. Use search_docs to find valid slugs.`,
            },
          ],
          isError: true,
        };
      }

      const structuredContent = page;

      return {
        structuredContent,
        content: [
          {
            type: 'text' as const,
            text: page.content,
          },
        ],
      };
    }
  );

  return server;
}

export async function POST(request: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const server = buildServer();
  await server.connect(transport);

  const response = await transport.handleRequest(request);
  await server.close();
  return response;
}

export async function GET(): Promise<Response> {
  return new Response('Method Not Allowed', { status: 405 });
}

export async function DELETE(): Promise<Response> {
  return new Response('Method Not Allowed', { status: 405 });
}
