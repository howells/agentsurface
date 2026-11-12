# Retrievability

Dimension 10: whether an outside agent can look up and pull the product's own
data through a documented query surface, rather than scraping pages.

Not this dimension: vector databases, embeddings, chunking, reranking and RAG
used by the product's own AI features. Those are agent internals
(https://agentsurface.dev/docs/agent-retrieval).

## Rubric

- **0**: No search endpoint, structured feed or markup; content can only be read
  whole, page by page.
- **1**: A search box or endpoint returning HTML or free text, with no
  documented parameters, pagination or result schema.
- **2**: A documented search or retrieval API (or feed) with typed query and
  result schemas, pagination, documented filters, and results carrying stable
  fields (`id`, `title`, `url`, `updated_at`).
- **3**: Level 2 plus sort, filter and facet refinement; source and citation
  metadata per result; freshness (`Last-Modified`, `ETag`, and a change token for
  incremental sync where supported, separate from the page cursor); stable IDs to
  re-fetch; documented page, rate and bulk limits; and pagination whose ordering
  and snapshot behaviour are stated and tested with changes between pages.

N/A when there is no corpus, dataset or record set to look up. Cap the score
at 1 when a query can return another tenant's or user's records. For a public
corpus that only changes on deploy, offset paging with stated ordering meets
the pagination requirements, and the change-between-pages and tenant checks
are not applicable.

## Evidence to gather

- Search or query routes, and their entries in OpenAPI or the GraphQL schema.
- Run a real query: result shape, two pages, an empty result, an invalid
  cursor, and a record changed between page fetches.
- Tenant, workspace and permission filters applied server-side before ranking,
  with a negative test that another tenant's records never appear.
- Relevance: a rank or score whose meaning is documented (metric, direction,
  whether it compares across queries), never called confidence. Estimated
  totals labelled as estimates.
- Provenance: a source and citation anchor per result; attribution on derived
  results.
- Freshness: `updated_at`, `since` parameters, `ETag`/`Last-Modified`, a
  changelog or change feed.
- Bulk: an export or feed endpoint with size and rate limits.
- JSON-LD, typed objects, RSS/Atom or sitemaps that let an agent read results
  without parsing HTML.

Discovery & AEO covers whether an agent can find the product at all; this
dimension starts once it has.

## Build

Use the project's existing API framework and response conventions.

1. **Inventory.** List each corpus or record set an agent might query (docs,
   catalog, records, support content) and whether it has a query interface or
   can only be browsed.
2. **Query contract.** Apply tenant, workspace and permission scope
   server-side before ranking. Prefer typed filters, date ranges, sort and
   facets to a single free-text `q`. Return typed results (`id`, `title`,
   `url`, `updated_at`, `excerpt`) with enough content that the agent doesn't
   need one follow-up call per item. Document what the rank or score measures,
   its direction and whether it compares across queries. Name an estimated
   count `total_estimate`.
3. **Pagination.** Cursor-based wherever results can change between pages,
   with `next_cursor` and `has_more`, and the ordering and behaviour under
   concurrent writes documented. Shared contract:
   https://agentsurface.dev/docs/api-surface/retrieval-and-job-contracts.
4. **Freshness and identity.** `Last-Modified`/`ETag`, an ISO 8601
   `updated_at` per record and a stated staleness policy; volatile decision
   facts (price, stock, slots) get a way to fetch the current value. Where
   incremental sync exists, a change token (`since` or a change feed) with its
   retention window and how deletions appear; a pagination cursor is not a
   change token. Stable IDs or canonical URLs that re-fetch the same record.
5. **Provenance.** The source of each result, attribution on derived results,
   and a citation anchor (section, page or fragment) where the source has one.
6. **Enumeration.** JSON-LD on canonical pages, and a sitemap, RSS/Atom feed
   or JSON index so an agent can list content, not only search it.
7. **Limits.** Document page-size caps, rate limits and any bulk export or
   streaming endpoint.

Done when a test runs a real query through the public interface and passes on:
typed results, two pages with a record changed between the fetches, an empty
result, an invalid cursor, an invalid query, another tenant's records never
returned, and accurate freshness fields; and the query and result schemas are
in the OpenAPI document or its equivalent.
