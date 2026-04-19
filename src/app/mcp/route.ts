import { source } from '@/lib/source';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ results, total: results.length, query }),
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
      annotations: { readOnlyHint: true },
    },
    ({ slug }: { slug: string }) => {
      const safeSlugs = slug.replace(/\.\./g, '').replace(/^\//, '');
      const filePath = join(
        process.cwd(),
        'src',
        'content',
        'docs',
        `${safeSlugs}.mdx`
      );

      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Page not found: ${slug}. Use search_docs to find valid slugs.`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: content,
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
