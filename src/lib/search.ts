import { ranking, searchInput } from "@/lib/retrieval-contract";
import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

const BASE_URL = "https://agentsurface.dev";

/**
 * Canonical search server built from the docs source. Indexes title,
 * description, headings, and body content via Fumadocs ZBSearch. Exposes both a `GET`
 * route handler (consumed by the Fumadocs RootProvider search dialog at
 * `/api/search`) and a programmatic `search()` method used by `searchDocs`.
 */
export const searchServer = createFromSource(source, {
  buildIndex: (page) => ({
    id: page.url,
    url: page.url,
    title: page.data.title,
    description: page.data.description,
    structuredData: page.data.structuredData,
    tag: page.slugs[0] ?? "root",
  }),
});

export interface DocSearchResult {
  id: string;
  rank: number;
  updated_at?: string;
  title: string;
  description: string;
  url: string;
  slug: string;
  snippet: string;
}

type SourcePage = ReturnType<typeof source.getPages>[number];

function pagesByUrl(): Map<string, SourcePage> {
  const map = new Map<string, SourcePage>();
  for (const page of source.getPages()) {
    map.set(page.url, page);
  }
  return map;
}

/**
 * Programmatic search over the docs, deduplicated to page-level results.
 * Retrieval covers title, description, and BODY content (headings + text),
 * so terms that only appear in a page body are matched. Results preserve the
 * relevance order returned by the underlying Orama index.
 */
export async function retrieveDocs(input: { query: string; limit?: number; section?: string }) {
  const { query, limit, section } = searchInput.parse(input);
  // Fumadocs emits one page record plus up to eight chunk hits per group.
  // Reserve room for limit + 1 complete page groups to determine has_more.
  const sorted = await searchServer.search(query, { limit: (limit + 1) * 9, tag: section });
  const pages = pagesByUrl();

  // Group hits by their base page URL (stripping heading hashes),
  // preserving first-appearance (relevance) order.
  const order: string[] = [];
  const grouped = new Map<string, typeof sorted>();
  for (const hit of sorted) {
    const baseUrl = hit.url.split("#")[0] ?? hit.url;
    const existing = grouped.get(baseUrl);
    if (existing) {
      existing.push(hit);
    } else {
      grouped.set(baseUrl, [hit]);
      order.push(baseUrl);
    }
  }

  const results: DocSearchResult[] = [];
  for (const baseUrl of order) {
    const page = pages.get(baseUrl);
    if (!page || (section && page.slugs[0] !== section)) {
      continue;
    }

    const hits = grouped.get(baseUrl) ?? [];
    const snippetHit =
      hits.find((h) => h.type === "text") ?? hits.find((h) => h.type === "heading");
    const snippet = snippetHit?.content ?? page.data.description ?? "";

    results.push({
      id: page.url,
      rank: results.length + 1,
      ...(page.data.lastModified || page.data.lastVerified
        ? {
            updated_at: page.data.lastModified
              ? new Date(page.data.lastModified).toISOString()
              : page.data.lastVerified,
          }
        : {}),
      description: page.data.description ?? "",
      slug: page.slugs.join("/") || "index",
      snippet: snippet.slice(0, 600),
      title: page.data.title,
      url: `${BASE_URL}${page.url}`,
    });

    if (results.length > limit) {
      break;
    }
  }

  return { results: results.slice(0, limit), has_more: results.length > limit, ranking };
}
