import { sitePageMarkdown } from "@/lib/site-markdown";
import { markdownHeaders, notFoundMarkdownResponse } from "@/lib/markdown";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const body = sitePageMarkdown(slug);
    return body
      ? new Response(body, { headers: markdownHeaders(body) })
      : notFoundMarkdownResponse(`/${slug}.md`);
  });
}
