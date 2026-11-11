/*
 * content-negotiation.ts - Next.js 16 proxy (formerly middleware) for agent content negotiation.
 *
 * What: Serves the Markdown twin of a documentation page when the request's Accept header
 * prefers text/markdown, and the normal HTML page otherwise. The decision uses the Accept
 * header only, never the User-Agent, so any client that asks for Markdown gets it and
 * `Vary: Accept` describes the response correctly.
 *
 * When to use: On documentation routes (/docs/*, /guides/*) that have a Markdown version.
 * Do not match API routes or anything per-user: this proxy is for public documents.
 *
 * What to customize:
 * 1. NEGOTIATED_PATHS and `config.matcher` to match your doc routes (keep the two in step)
 * 2. MARKDOWN_ROUTE_PREFIX, and write the route handler that serves the Markdown (example below)
 *
 * Caching: this proxy sets no Cache-Control on pages it passes through. Set cache headers
 * where each response is produced, where you know whether it is public.
 *
 * Spec:
 * - Content negotiation (HTTP Accept header): https://www.rfc-editor.org/rfc/rfc9110.html#name-accept (RFC 9110, which obsoletes RFC 7231)
 * - MIME type text/markdown: https://www.iana.org/assignments/media-types/media-types.xhtml
 *
 * Usage in Next.js 16:
 * 1. Save this file as proxy.ts in the project root (or src/ if you use it). Next.js 16
 *    renamed the middleware.ts convention to proxy.ts and the exported function to `proxy`.
 * 2. Add the Markdown route handler shown at the bottom of this file
 * 3. Test: curl -H "Accept: text/markdown" http://localhost:3000/docs/api
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Paths that have a Markdown twin. Must cover the same routes as `config.matcher`.
 */
const NEGOTIATED_PATHS = /^\/(docs|guides)\/.+/;

/**
 * Where the Markdown route handler lives: /docs/setup is served from /md/docs/setup.
 */
const MARKDOWN_ROUTE_PREFIX = "/md";

/**
 * Quality of the most specific Accept range that matches `type`
 * (exact, then type/*, then *\/*). A range with q=0 means "not acceptable".
 */
function qualityFor(accept: string, type: string): number {
  const [main] = type.split("/");
  let best = { specificity: -1, q: 0 };

  for (const part of accept.toLowerCase().split(",")) {
    const [range, ...params] = part.split(";").map((piece) => piece.trim());
    const specificity = range === type ? 2 : range === `${main}/*` ? 1 : range === "*/*" ? 0 : -1;
    if (specificity <= best.specificity) {
      continue;
    }

    const qParam = params.find((param) => param.startsWith("q="));
    const q = qParam === undefined ? 1 : Number.parseFloat(qParam.slice(2));
    best = { specificity, q: Number.isNaN(q) ? 0 : q };
  }

  return best.q;
}

/**
 * Detect if request prefers markdown: acceptable (q > 0) and ranked above HTML.
 * Do not use accept.includes("text/markdown") - it ignores q=0 and relative weights.
 * A bare "*\/*" ranks both equally, so those clients still get HTML.
 */
export function prefersMarkdown(request: NextRequest): boolean {
  const accept = request.headers.get("accept") || "";
  const markdown = qualityFor(accept, "text/markdown");
  return markdown > 0 && markdown > qualityFor(accept, "text/html");
}

/**
 * Main proxy function (Next.js 16; was `middleware` before the rename).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (NEGOTIATED_PATHS.test(pathname) && prefersMarkdown(request)) {
    const rewritten = NextResponse.rewrite(
      new URL(`${MARKDOWN_ROUTE_PREFIX}${pathname}`, request.url),
    );
    rewritten.headers.set("Vary", "Accept");
    return rewritten;
  }

  // HTML: pass through untouched apart from Vary, so caches keep the two apart.
  const response = NextResponse.next();
  response.headers.set("Vary", "Accept");
  return response;
}

/**
 * Configure which routes this proxy applies to.
 */
export const config = {
  matcher: ["/docs/:path*", "/guides/:path*"],
};

/**
 * The Markdown route handler the proxy rewrites to (app/md/[...slug]/route.ts).
 * In Next.js 16 route handler `params` is a promise. A page with no Markdown is a 404,
 * not a silent fall back to HTML.
 *
 * ```typescript
 * import { readFile } from 'node:fs/promises';
 * import path from 'node:path';
 *
 * const CONTENT_ROOT = path.join(process.cwd(), 'content');
 *
 * export async function GET(
 *   _request: Request,
 *   { params }: { params: Promise<{ slug: string[] }> }
 * ) {
 *   const { slug } = await params;
 *   // Keep the resolved path inside the content directory
 *   const file = path.join(CONTENT_ROOT, `${slug.join('/')}.md`);
 *   if (!file.startsWith(`${CONTENT_ROOT}${path.sep}`)) {
 *     return new Response('# Not found\n', { status: 404, headers: MARKDOWN_HEADERS });
 *   }
 *
 *   let markdown: string;
 *   try {
 *     markdown = await readFile(file, 'utf-8');
 *   } catch (error) {
 *     if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
 *     return new Response('# Not found\n', { status: 404, headers: MARKDOWN_HEADERS });
 *   }
 *
 *   return new Response(markdown, {
 *     headers: {
 *       ...MARKDOWN_HEADERS,
 *       // Public documentation only; ~4 characters per token is a rough estimate
 *       'Cache-Control': 'public, max-age=3600',
 *       'x-markdown-tokens': String(Math.ceil(markdown.length / 4)),
 *     },
 *   });
 * }
 *
 * const MARKDOWN_HEADERS = { 'Content-Type': 'text/markdown; charset=utf-8', Vary: 'Accept' };
 * ```
 */

/**
 * Testing: curl commands
 *
 * Test HTML (default):
 *   curl -I -H "Accept: text/html" http://localhost:3000/docs/api
 *
 * Test markdown (no special User-Agent needed):
 *   curl -I -H "Accept: text/markdown" http://localhost:3000/docs/api
 *   # Should include: Vary: Accept, Content-Type: text/markdown, x-markdown-tokens: ...
 */
