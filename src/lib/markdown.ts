/** Rough approximation: 1 token ≈ 4 characters for English prose. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Standard response headers for an agent-facing Markdown document. */
export function markdownHeaders(content: string, extra?: Record<string, string>) {
  return {
    "Cache-Control": "public, max-age=3600",
    "Content-Signal": "search=yes, ai-input=yes, ai-train=yes",
    "Content-Type": "text/markdown; charset=utf-8",
    Vary: "Accept",
    "x-markdown-tokens": String(estimateTokens(content)),
    ...extra,
  };
}

const SITE_ORIGIN = "https://agentsurface.dev";

/** Markdown body for a missing page, served with a 404 status to Markdown-preferring clients. */
export function notFoundMarkdown(path: string): string {
  return [
    "# Page not found",
    "",
    `No page matches \`${path}\`. Try the documentation index at [/llms.txt](${SITE_ORIGIN}/llms.txt), browse [/docs](${SITE_ORIGIN}/docs), or check [/sitemap.xml](${SITE_ORIGIN}/sitemap.xml) for the full list of pages.`,
    "",
  ].join("\n");
}

/** A 404 `Response` carrying the Markdown not-found body. */
export function notFoundMarkdownResponse(path: string): Response {
  const body = notFoundMarkdown(path);
  return new Response(body, {
    status: 404,
    headers: markdownHeaders(body, { "Cache-Control": "no-store" }),
  });
}
