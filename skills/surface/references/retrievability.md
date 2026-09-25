# Retrievability

## Summary

Dimension 10 scores whether agents can find and pull the product's own data and content
through a query-able, well-specified surface: search APIs, retrieval contracts, and
structured content. It does not score whether the product runs a retrieval-augmented
generation (RAG) pipeline for its own AI features - that is agent-internal architecture and
belongs to the agent-building inventory, not this dimension. See "Not this dimension" below.

- **0**: No queryable retrieval surface. Content is reachable only by reading whole pages or
  files; no search endpoint, no filters, no structured result schema.
- **1**: Basic search or lookup exists (a search box, a `/search` route, a grep-style query)
  but has no pagination contract, no typed/structured results, no freshness signal, and is
  undocumented.
- **2**: A documented search or retrieval API: typed query and result schemas, pagination,
  filters or facets, and structured content (JSON-LD/schema.org markup or typed API objects)
  so results are usable without scraping rendered HTML.
- **3**: A full retrieval contract: query refinement (sort, filter, facet), source/citation
  metadata on results, freshness and versioning exposed (last-modified, ETag, since/cursor
  params), stable identifiers for re-fetch, and documented rate/size limits for bulk retrieval.

## Not this dimension

Vector databases, embeddings, chunking, reranking, knowledge graphs, and RAG pattern
selection are how an agent finds and uses knowledge for _its own_ work. That is the
agent-building inventory's concern (`/docs/agent-retrieval`), not a property of the product
being scored. This dimension asks a narrower question: when an external agent needs to look
something up in this product, does the product expose a way to do that reliably - a search
API, a structured feed, a documented query contract - or does the agent have to scrape pages
and guess?

## Scoring rubric

| Score | Criteria                                                                                                                                                                                                                                                                       | Detection                                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | No queryable retrieval surface. No search endpoint, index, or structured feed; content is reachable only by browsing/reading whole documents.                                                                                                                                  | No `/search` route, no OpenAPI path with query parameters, no sitemap/feed, no structured data markup.                                                                                                              |
| 1     | Basic search or lookup exists but is undocumented or unstructured. Results are HTML fragments or free text, not typed records.                                                                                                                                                 | A search box or endpoint exists but returns rendered HTML, has no documented query parameters, no pagination, and no result schema.                                                                                 |
| 2     | Documented search/retrieval API or content surface. Typed query and result schemas. Pagination and filters. Structured content (JSON-LD/schema.org, typed API objects, or a machine-readable feed) so an agent can consume results directly.                                   | OpenAPI or equivalent spec documents the search endpoint's parameters and response schema. Results carry stable fields (id, title, url, updated_at). Filters/facets are documented.                                 |
| 3     | Full retrieval contract. Query refinement (sort/filter/facet) beyond keyword match. Citations or source metadata on results. Freshness/versioning exposed (last-modified, ETag, cursor/since params). Stable IDs for re-fetch. Documented limits for bulk/paginated retrieval. | Response includes freshness metadata. Cursor-based pagination survives concurrent updates. Bulk export or feed endpoint documented with size/rate limits. Result objects are individually addressable by stable ID. |

**Key files:** search route handlers, `/search` or `/query` API definitions, OpenAPI paths with query parameters, sitemap/feed generators, structured-data (JSON-LD) templates, docs-site search index config.

**N/A when:** The project exposes no searchable corpus or dataset at all (for example, a pure single-purpose CLI utility with no content or records to look up).

## Evidence to gather

- **Search/query endpoints:** REST or GraphQL routes that accept a query, filters, sort, or facets and return structured results, not rendered pages.
- **Pagination and cursors:** documented page/cursor contracts on result sets; see [Retrieval and Job Contracts](/docs/api-surface/retrieval-and-job-contracts) for the shared pagination and async-job pattern this dimension expects.
- **Structured content:** JSON-LD or schema.org markup, typed API response objects, or a machine-readable feed (RSS/Atom/sitemap) that lets an agent read results without HTML scraping. See [Structured Data](/docs/discovery/structured-data) and [Content Structure](/docs/discovery/content-structure).
- **Freshness and versioning:** `Last-Modified`/`ETag` headers, `updated_at` fields, `since`/cursor query params, or a changelog feed.
- **Stable identifiers:** results addressable by a durable ID or canonical URL that can be re-fetched later, not just a transient session-scoped index position.
- **Bulk/export paths:** documented rate limits, page size caps, and an export or feed endpoint for retrieving many records.

## Related dimensions

- [Discovery & AEO](/docs/discovery) covers whether an agent can _find_ the software and its capabilities at all (llms.txt, AGENTS.md, sitemaps, robots.txt, `.well-known`). Retrievability assumes discovery already succeeded and asks whether the agent can then query and pull specific data reliably.
- [API Surface](/docs/api-surface) and its [retrieval and job contracts](/docs/api-surface/retrieval-and-job-contracts) page cover the general pagination/async-job shape this dimension's evidence draws on.

## See also

- `/docs/retrievability` - the product-side retrieval guide this dimension scores against.
- `agents/retrievability-engineer.md` - specialist prompt for scaffolding or upgrading this surface (search/retrieval APIs, retrieval contracts, structured content).
- `/docs/agent-retrieval` - vector databases, embeddings, RAG patterns, and knowledge graphs for teams building their own agents. Out of scope for this dimension; that inventory is scored and improved separately from the surface skill.
