# Retrievability

Dimension 10: whether an outside agent can look up and pull the product's own
data through a documented query surface, rather than scraping pages.

Not this dimension: vector databases, embeddings, chunking, reranking and RAG
used by the product's own AI features. Those are agent internals
(https://agentsurface.dev/docs/agent-retrieval).

## Score

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

N/A when there is no corpus, dataset or record set to look up.

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
dimension starts once it has. Pagination and job contracts are shared with API
Surface: https://agentsurface.dev/docs/api-surface/retrieval-and-job-contracts.
