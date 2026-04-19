# Surface Transformation Plan — agentsurface.dev
**Date:** 2026-04-19
**Session:** Round 2 (picking up open items from prior audit)

---

## Execution order

### Group 1 — Quick wins (parallel, no dependencies)

| ID | Task | Complexity | Dimension | Delta |
|----|------|-----------|-----------|-------|
| G1-A | Create `CLAUDE.md` — Claude Code overlay referencing AGENTS.md, listing `/surface` skill | S | Context Files | 2→3 |
| G1-B | Create `src/app/llms-full.txt/route.ts` — dynamic route serving concatenated MDX | S | Discovery | 2→3 |
| G1-C | Create `middleware.ts` — content negotiation + Content-Signal headers on all responses | S | Discovery | 2→3 |

### Group 2 — Callable surface (after Group 1)

| ID | Task | Complexity | Dimension | Delta |
|----|------|-----------|-----------|-------|
| G2-A | Create `src/app/api/search/route.ts` — JSON search over fumadocs source | S | Retrievability | 0→1 |
| G2-B | Create `src/app/mcp/route.ts` — MCP server with `search_docs` + `get_page` tools | M | MCP Server | 0→2 |
| G2-C | Create `public/.well-known/mcp/server-card.json` — MCP discovery | S | Discovery | 2→3 |

### Group 3 — Testing (after Group 2)

| ID | Task | Complexity | Dimension | Delta |
|----|------|-----------|-----------|-------|
| G3-A | Add vitest + MCP InMemoryTransport tests for search + get_page | M | Testing | 0→1 |

---

## Expected delta scorecard (after all groups)

| Dimension | Before | After | Delta |
|-----------|--------|-------|-------|
| MCP Server | 0/3 | 2/3 | +2 ✦ |
| Discovery & AEO | 2/3 | 3/3 | +1 ↑ |
| Context Files | 2/3 | 3/3 | +1 ↑ |
| Testing | 0/3 | 1/3 | +1 ↑ |
| Data Retrievability | 0/3 | 1/3 | +1 ↑ |

**Total: 4/15 → 10/15 raw → 8/30 → 20/30 scaled**
**Rating: Agent-tolerant → Agent-ready**

---

## Key technical decisions

### MCP server approach
- Package: `@modelcontextprotocol/sdk` (canonical) with Streamable HTTP transport
- Route: `src/app/mcp/route.ts` — Next.js App Router POST handler
- Tools: `search_docs(query, limit)` + `get_page(slug)` 
- No auth (public docs)
- Backed by `source.getPages()` from fumadocs — no external DB

### Search API
- Route: `src/app/api/search/route.ts`
- Strategy: simple case-insensitive substring match on title + description
- Returns: `{ results: [{ title, url, description, slug }] }`
- Backed by same `source.getPages()` — zero extra infra

### Content negotiation
- `middleware.ts` at project root
- Pattern: docs paths + `Accept: text/markdown` → rewrite to `.md` route
- Also adds `Content-Signal: search=yes, ai-input=yes, ai-train=no` header to ALL responses
- `Vary: Accept` on all doc responses

### llms-full.txt
- Dynamic route at `/llms-full.txt`
- Iterates `source.getPages()`, fetches content from `.source/` data
- Includes token budget comment at top
- Cached with `revalidate: 3600`
