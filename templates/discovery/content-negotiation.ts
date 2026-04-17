/*
 * content-negotiation.ts — Next.js App Router middleware for agent content negotiation.
 *
 * What: Route handler that detects Accept headers and User-Agent, returning either HTML or
 * markdown-formatted responses. Allows agents to get optimized content for their context windows.
 *
 * When to use: On documentation routes (/docs/*, /api/*, /guides/*) where agents may want
 * markdown-formatted versions instead of HTML.
 *
 * What to customize:
 * 1. DOCUMENTATION_PATHS regex to match your doc routes
 * 2. Add handlers for your markdown sources (generateMarkdownFromHtml, fetchMarkdownFile, etc.)
 * 3. Update AGENT_PATTERNS to recognize additional crawlers
 * 4. Customize token budgets and headers
 *
 * Spec:
 * - Content negotiation (HTTP Accept header): https://tools.ietf.org/html/rfc7231#section-5.3
 * - MIME type text/markdown: https://www.iana.org/assignments/media-types/media-types.xhtml
 * - Agent discovery: https://agents.md
 *
 * Usage in Next.js:
 * 1. Place this file at app/middleware.ts (Next.js standard location)
 * 2. Add matcher config to specify which routes this applies to
 * 3. Test: curl -H "Accept: text/markdown" https://localhost:3000/docs/api
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Documentation paths that support content negotiation.
 * Customize to match your route structure.
 */
const DOCUMENTATION_PATHS = /^\/docs\/.+/;
const API_PATHS = /^\/api\/(reference|endpoints)\/.+/;

/**
 * User-Agent patterns to identify AI agents.
 */
const AGENT_PATTERNS = {
  training: /GPTBot|ClaudeBot|Google-Extended|Meta-ExternalAgent|CCBot|Bytespider/i,
  search: /OAI-SearchBot|Claude-SearchBot|PerplexityBot/i,
  user: /ChatGPT-User|Claude-User/i,
};

/**
 * Token budget hints for different content types.
 * Helps agents decide how much content to ingest.
 */
const TOKEN_BUDGETS = {
  overview: 500,
  guide: 1500,
  'api-reference': 3000,
  'full-docs': 10000,
} as const;

/**
 * Detect if request prefers markdown.
 */
function prefersMarkdown(request: NextRequest): boolean {
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/markdown');
}

/**
 * Detect if request is from an AI agent.
 */
function isAgent(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  return (
    AGENT_PATTERNS.training.test(userAgent) ||
    AGENT_PATTERNS.search.test(userAgent) ||
    AGENT_PATTERNS.user.test(userAgent)
  );
}

/**
 * Classify agent type.
 */
function classifyAgent(request: NextRequest): 'training' | 'search' | 'user' | null {
  const userAgent = request.headers.get('user-agent') || '';
  if (AGENT_PATTERNS.training.test(userAgent)) return 'training';
  if (AGENT_PATTERNS.search.test(userAgent)) return 'search';
  if (AGENT_PATTERNS.user.test(userAgent)) return 'user';
  return null;
}

/**
 * Convert HTML content to markdown (placeholder).
 * In production, use a library like turndown or marked-ts.
 */
function htmlToMarkdown(html: string): string {
  // Placeholder: in real implementation, use turndown or similar
  // For now, return a note + HTML
  return `> This page is optimized for markdown output. For HTML formatting, visit the web browser version.\n\n${html}`;
}

/**
 * Fetch markdown version of a page from filesystem or dynamic generation.
 *
 * Pattern:
 * - If docs/[slug].md exists, serve it
 * - Otherwise, generate from page content
 */
async function getMarkdownContent(pathname: string): Promise<string | null> {
  // <CUSTOMISE>: Implement your content source
  // Example: read from file system
  // const fs = await import('fs').then(m => m.promises);
  // const markdownPath = path.join(process.cwd(), 'docs', `${slug}.md`);
  // try {
  //   return await fs.readFile(markdownPath, 'utf-8');
  // } catch {
  //   return null;
  // }

  // For now, return null to fall back to HTML conversion
  return null;
}

/**
 * Estimate token count (rough approximation: ~4 chars per token).
 */
function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

/**
 * Get appropriate token budget for content type.
 */
function getTokenBudget(pathname: string): number {
  if (pathname.includes('api') || pathname.includes('reference')) {
    return TOKEN_BUDGETS['api-reference'];
  }
  if (pathname.includes('guide')) {
    return TOKEN_BUDGETS.guide;
  }
  return TOKEN_BUDGETS.overview;
}

/**
 * Main middleware function.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDocPath =
    DOCUMENTATION_PATHS.test(pathname) || API_PATHS.test(pathname);

  // Only apply negotiation to documentation paths
  if (!isDocPath) {
    const response = NextResponse.next();
    response.headers.set('Vary', 'Accept');
    return response;
  }

  // If agent requests markdown, try to serve it
  if (prefersMarkdown(request) && isAgent(request)) {
    const agentType = classifyAgent(request);

    // Fetch markdown content (from file or generate)
    const markdown = await getMarkdownContent(pathname);

    if (markdown) {
      const tokens = estimateTokens(markdown);
      const budget = getTokenBudget(pathname);

      // Build markdown response
      const response = new NextResponse(markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept',
          'x-markdown-tokens': tokens.toString(),
          'x-token-budget': budget.toString(),
          'x-agent-type': agentType || 'unknown',
          // Cache for agents (not as aggressive as HTML)
          'Cache-Control': 'public, max-age=3600',
        },
      });

      return response;
    }
  }

  // Default: serve HTML with Vary header
  const response = NextResponse.next();
  response.headers.set('Vary', 'Accept');
  response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');

  return response;
}

/**
 * Configure which routes this middleware applies to.
 */
export const config = {
  matcher: [
    // Documentation routes
    '/docs/:path*',
    '/api/reference/:path*',
    '/api/endpoints/:path*',
    '/guides/:path*',
  ],
};

/**
 * Example: Next.js route handler (app/docs/[slug]/route.ts) that uses this logic.
 *
 * ```typescript
 * import { NextRequest, NextResponse } from 'next/server';
 *
 * export async function GET(
 *   request: NextRequest,
 *   { params }: { params: { slug: string } }
 * ) {
 *   const { slug } = params;
 *   const accept = request.headers.get('accept') || '';
 *
 *   if (accept.includes('text/markdown')) {
 *     // Fetch markdown content for this slug
 *     const markdown = await loadMarkdownDoc(slug);
 *     return new NextResponse(markdown, {
 *       headers: {
 *         'Content-Type': 'text/markdown; charset=utf-8',
 *         'Vary': 'Accept',
 *         'x-markdown-tokens': estimateTokens(markdown).toString(),
 *       },
 *     });
 *   }
 *
 *   // Otherwise, render HTML via page.tsx
 *   const html = await renderPage(slug);
 *   return new NextResponse(html, {
 *     headers: {
 *       'Content-Type': 'text/html; charset=utf-8',
 *       'Vary': 'Accept',
 *     },
 *   });
 * }
 * ```
 */

/**
 * Example: stripe-style agent notice on docs pages.
 *
 * Add to markdown response or HTML layout:
 *
 * ```markdown
 * > **For AI agents:** This page is optimized for machine reading.
 * > Use `Accept: text/markdown` header for markdown format.
 * > See [llms.txt](/llms.txt) for a full documentation index.
 * > For natural language queries, use POST `/api/ask`.
 * ```
 */

/**
 * Testing: curl commands
 *
 * Test HTML (default):
 *   curl -H "Accept: text/html" http://localhost:3000/docs/api
 *
 * Test markdown:
 *   curl -H "Accept: text/markdown" -H "User-Agent: ClaudeBot" http://localhost:3000/docs/api
 *
 * Check headers:
 *   curl -I -H "Accept: text/markdown" http://localhost:3000/docs/api
 *   # Should include: Vary: Accept, Content-Type: text/markdown, x-markdown-tokens: ...
 */
