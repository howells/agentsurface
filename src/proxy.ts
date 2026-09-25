import { markdownHeaders, notFoundMarkdown } from "@/lib/markdown";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes";

// `/docs`, `/docs/a`, `/docs/a/b` → `/llms.mdx/docs/content.md`, `/llms.mdx/docs/a/content.md`, …
// matching the `[[...slug]]/content.md` route both this rewrite and the `/docs/*.md`
// suffix (via next.config.mjs) resolve to.
const docsMarkdownRewriter = rewritePath("/docs{/*path}", "/llms.mdx/docs{/*path}/content.md");

// Real HTML pages outside `/docs` that don't (yet) have a negotiated Markdown twin.
// Requests here with Accept: text/markdown fall through to the ordinary HTML response.
const KNOWN_HTML_ROUTES = new Set([
  "/",
  "/glossary",
  "/patterns",
  "/about",
  "/contact",
  "/privacy",
]);

function hasFileExtension(pathname: string): boolean {
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  return lastSegment.includes(".");
}

/** Paths negotiation must never touch: real files, APIs, and other already-agent-facing routes. */
function isExcludedFromNegotiation(pathname: string): boolean {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/.well-known" ||
    pathname.startsWith("/.well-known/") ||
    pathname === "/mcp" ||
    pathname.startsWith("/mcp/") ||
    pathname === "/og" ||
    pathname.startsWith("/og/") ||
    pathname.startsWith("/_next") ||
    hasFileExtension(pathname)
  );
}

/**
 * RFC 8288 `Link` header for `/` and docs pages: the API catalog, the OpenAPI service
 * description, the llms.txt index, the sitemap, and this page's Markdown alternate.
 */
function discoveryLinkHeader(markdownPath: string): string {
  return [
    '</.well-known/api-catalog>; rel="api-catalog"',
    '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
    '</llms.txt>; rel="describedby"; type="text/plain"',
    '</sitemap.xml>; rel="sitemap"',
    `<${markdownPath}>; rel="alternate"; type="text/markdown"`,
  ].join(", ");
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const response = NextResponse.next();
  response.headers.set("Content-Signal", CONTENT_SIGNAL);

  if (isExcludedFromNegotiation(pathname)) {
    return response;
  }

  if (pathname === "/") {
    response.headers.set("Link", discoveryLinkHeader("/index.md"));
  } else if (pathname === "/docs" || pathname.startsWith("/docs/")) {
    response.headers.set("Link", discoveryLinkHeader(`${pathname}.md`));
  }

  const wantsMarkdown =
    isMarkdownPreferred(request) || (pathname === "/" && searchParams.get("mode") === "agent");
  if (!wantsMarkdown) {
    return response;
  }

  if (pathname === "/") {
    const rewritten = NextResponse.rewrite(new URL("/index.md", request.url));
    rewritten.headers.set("Content-Signal", CONTENT_SIGNAL);
    rewritten.headers.set("Vary", "Accept");
    return rewritten;
  }

  if (pathname === "/docs" || pathname.startsWith("/docs/")) {
    const target = docsMarkdownRewriter.rewrite(pathname);
    if (target) {
      const rewritten = NextResponse.rewrite(new URL(target, request.url));
      rewritten.headers.set("Content-Signal", CONTENT_SIGNAL);
      rewritten.headers.set("Vary", "Accept");
      return rewritten;
    }
  }

  if (KNOWN_HTML_ROUTES.has(pathname)) {
    return response;
  }

  // Everything else under this matcher is a path with no page: agents asking for
  // Markdown get a Markdown 404 instead of the HTML not-found page.
  const body = notFoundMarkdown(pathname);
  return new NextResponse(body, {
    status: 404,
    headers: markdownHeaders(body, { "Cache-Control": "no-store" }),
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
