# Discovery & Agent Engine Optimisation (AEO)

## Summary

Dimension 4 measures how discoverable, readable, governable, and callable a project is for AI agents. Covers llms.txt (agent-optimized link index), AGENTS.md (project guidance), structured JSON-LD schemas, robots.txt crawler policies, sitemap freshness, Markdown content negotiation, Content Signals, `.well-known` capability discovery, OAuth metadata, MCP discovery, Agent Skills discovery, and optional agent-commerce protocol signals. AEO is to agents what SEO is to search engines: navigation files, structured data, crawler directives, and capability manifests that enable discovery and reliable use.

- **llms.txt**: H1 title, blockquote summary, H2 sections with link descriptions
- **AGENTS.md**: commands, tech stack, testing expectations, permission boundaries
- **Structured data**: JSON-LD (FAQPage, TechArticle, etc.) on key pages
- **robots.txt**: explicitly allow AI bots (GPTBot, ClaudeBot, etc.)
- **Content negotiation**: Accept: text/markdown → markdown response or `.md` fallback URLs
- **Content Signals**: `search`, `ai-input`, and `ai-train` preferences in robots.txt or response headers
- **.well-known**: API Catalog, MCP Server Card, Agent Skills index, OAuth metadata, Web Bot Auth keys
- **Evidence**: File globs for llms.txt, AGENTS.md, sitemap, JSON-LD grep, robots.txt analysis

> AEO is to agents what SEO is to search engines. It encompasses the navigation files, structured data schemas, content negotiation protocols, crawler directives, bot identity mechanisms, and capability manifests that enable AI agents to discover, understand, navigate, authenticate against, and use a codebase or web service.

## Agent-readiness scan model

When auditing a public website, evaluate the same categories that current agent-readiness scanners measure:

| Category | Signals |
|---|---|
| Discoverability | `robots.txt`, `sitemap.xml`, HTTP `Link` headers, stable URLs for docs and API specs |
| Content accessibility | `llms.txt`, `llms-full.txt`, Markdown content negotiation, `.md` URL fallbacks, token count hints |
| Bot access control | Content Signals, explicit AI crawler policy, Web Bot Auth for high-trust bots |
| Capability discovery | API Catalog, OpenAPI, MCP Server Card or MCP metadata, Agent Skills index, OAuth metadata |
| Commerce, when applicable | x402, Universal Commerce Protocol, Agentic Commerce Protocol |

Use these scan results as evidence for Dimension 4. Do not overfit to one vendor's exact score: the goal is durable agent-readiness, not passing a single checker.

## Scoring rubric

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No agent-specific discovery files. No llms.txt, no AGENTS.md, no structured data. robots.txt blocks AI bots or hides public docs from retrieval. | No llms.txt at web root. No AGENTS.md in repo. No JSON-LD in HTML. robots.txt Disallow for GPTBot/ClaudeBot/search agents. |
| 1 | Basic discovery. AGENTS.md, llms.txt, robots.txt, or sitemap exists but is minimal. No capability discovery and no agent-specific content format. | AGENTS.md present but <50 lines or auto-generated. OR llms.txt present but <10 links. Basic sitemap only. No JSON-LD. No Markdown response path. |
| 2 | Good discovery. llms.txt with categorized links + AGENTS.md with commands and conventions. JSON-LD on key pages. robots.txt allows intended AI retrieval/search bots. Sitemap with accurate lastmod. OpenAPI is linked from docs or root. | llms.txt with H2 sections and descriptions. AGENTS.md with commands, conventions, boundaries. FAQPage/TechArticle/WebAPI JSON-LD. robots.txt explicitly allows retrieval bots and references sitemap. OpenAPI discoverable at a stable URL. |
| 3 | Full agent-readable web surface. llms.txt + llms-full.txt. Markdown content negotiation or `.md` URL fallback with Vary: Accept and token hints. Content Signals declared. Capability discovery via `.well-known` API Catalog, MCP Server Card or MCP metadata, Agent Skills index where applicable, and OAuth protected-resource metadata for gated resources. Web Bot Auth considered for outbound or high-trust bots. Agent-commerce protocols checked when commerce applies. | llms-full.txt present. Markdown response code or generated `.md` routes. Content-Signal in robots/headers. `/.well-known/api-catalog`, `/.well-known/mcp/server-card.json` or `/.well-known/mcp.json`, `/.well-known/agent-skills/index.json`, `/.well-known/oauth-protected-resource` where applicable. `http-message-signatures-directory` when bot identity is implemented. |

**N/A when:** Project has no web presence (pure library, CLI-only tool).

---

## Evidence to gather

- `public/llms.txt`, `public/llms-full.txt` at web root
- `AGENTS.md` in repo root (also distributed at `/agents.md` endpoint)
- `robots.txt` and crawler directives (`User-agent`, `Disallow`)
- Content Signals in `robots.txt` or response headers (`Content-Signal: search=yes, ai-input=yes, ai-train=no`)
- Sitemap (`sitemap.xml`) with accurate `<lastmod>` timestamps
- JSON-LD blocks in HTML (grep `application/ld+json` in layout / page templates)
- `.well-known/` directory: `api-catalog`, `mcp/server-card.json`, `mcp.json`, `agent-skills/index.json`, `agent.json`, `agent-card.json`, `oauth-protected-resource`, `oauth-authorization-server`, `http-message-signatures-directory`
- Server middleware supporting content negotiation (`Accept: text/markdown` → markdown response)
- `Vary: Accept` header in HTTP responses
- `x-markdown-tokens` header on markdown responses (token budget hints)
- NLWeb `/ask` REST endpoint or `/mcp` server mode
- "Copy for AI" button or `.md` URL suffix on docs pages (e.g. `/docs/api.md`)
- Commerce manifests or headers when applicable: x402, Universal Commerce Protocol, Agentic Commerce Protocol

---

## Deep dive

### llms.txt (Jeremy Howard, Sep 2024)

**Spec:** https://llmstxt.org

**Format:** Plain text. H1 title, optional `> ` blockquote summary (one paragraph), H2 sections with markdown link + description pairs.

Example structure:
```
# Your Project Name

> One-sentence summary of the entire project for context windows.

## Overview
- [Getting started](https://example.com/docs/intro) — Quick start for new users.
- [Installation](https://example.com/docs/install) — Requirements and setup.

## API Reference
- [REST endpoints](https://example.com/docs/api) — Complete endpoint listing.
- [Authentication](https://example.com/docs/auth) — OAuth 2.1 client credentials.

## Architecture
- [System design](https://example.com/docs/architecture) — High-level patterns.
```

**llms-full.txt variant:** Concatenated markdown of all documentation pages. Used by token-constrained agents or offline ingestion. Include a token budget hint comment:

```
# Your Project — Full Documentation

<!--- llms-full.txt auto-generated on 2026-04-17 from 23 pages, ~45k tokens --->

[Full docs concatenated as single markdown file...]
```

**Adoption examples:** OpenAI, Vercel, Stripe, Anthropic, and 100+ open-source projects.

**Detection:** Check `/llms.txt` and `/llms-full.txt` at web root. If behind auth, check repo root for both files.

---

### AGENTS.md

**Specification:** https://agents.md — governed by the Agentic AI Foundation (Linux Foundation).

**Adoption:** 60k+ public repositories. Read by Claude Code, Cursor, Windsurf, Kilo, GitHub Copilot, JetBrains Codex, Aider, Jules, Zed, Warp, and emerging agent runtimes.

**Format:** Plain markdown. No strict schema. Recommended structure:

```markdown
# Project Name

## Overview
High-level description of what this project does and why agents should use it.

## Commands
Exact, copy-pasteable commands for common tasks. No placeholders.
```
$ npm run test
$ npm run build
$ npm run dev -- --port 3000
```

## Conventions
Agent-relevant patterns: naming style, error handling, file organization, testing approach.

## Testing
How to verify changes. Unit test patterns, integration test locations, CI expectations.

## Architecture
System boundaries, which subsystems agents can safely modify vs read-only.

## Boundaries
Three-tier permission model: always (read docs), ask-first (run tests), never (deploy to production).
```

**Curation:** Hand-written (not auto-generated by `/init` without review). Keep <370 lines. Commands at the top with exact flags.

---

### JSON-LD structured data

**Purpose:** Embed semantic information in HTML so agents can understand content without parsing prose.

**Schema.org types for agent discovery:**
- `SoftwareApplication` — project identity
- `WebAPI` — REST API description
- `APIReference` — API docs structure
- `FAQPage` — common questions
- `HowTo` — step-by-step guides
- `TechArticle` — blog posts / technical docs
- `Dataset` — downloadable datasets or data sources

**Implementation:** Embed as `<script type="application/ld+json">` in root layout or page templates.

**TypeScript / Next.js example (App Router):**

```typescript
// app/layout.tsx
export const generateMetadata = () => ({
  // Standard meta tags...
});

// Generate JSON-LD for SoftwareApplication
export const generateJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Your Project Name',
  description: 'A brief description for AI agents.',
  url: 'https://example.com',
  author: {
    '@type': 'Organization',
    name: 'Your Org',
    url: 'https://example.com',
  },
  codeRepository: 'https://github.com/org/repo',
  issueTracker: 'https://github.com/org/repo/issues',
  downloadUrl: 'https://www.npmjs.com/package/your-package',
  operatingSystem: 'Any',
  applicationCategory: 'DeveloperApplication',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '0',
    highPrice: '999',
  },
});

export default function RootLayout({ children }) {
  const jsonLd = generateJsonLd();
  return (
    <html>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Multiple schema types per page:** Combine SoftwareApplication (identity), WebAPI (endpoints), and FAQPage (docs) in a single `<script>` or separate scripts.

---

### Content negotiation (Markdown)

**Pattern:** When a client sends `Accept: text/markdown`, return a markdown-formatted representation of the page instead of HTML. Also expose `.md` or `index.md` URL fallbacks for clients that cannot set custom headers.

**HTTP headers:**
- Request: `Accept: text/markdown`
- Response: `Content-Type: text/markdown; charset=utf-8`
- Always include: `Vary: Accept` (tells caches this response varies by Accept header)
- Recommended: `x-markdown-tokens: 1250` (hint for token-constrained agents)
- Recommended: `Content-Signal: search=yes, ai-input=yes, ai-train=no` or the site's chosen content-use policy

**Cloudflare option:** Cloudflare Markdown for Agents can convert HTML origin responses to Markdown at the edge when enabled. It is useful when changing the origin is impractical. Prefer origin-served Markdown when you control the docs pipeline; use edge conversion for legacy or hosted sites. Cloudflare documents a 2 MB HTML-origin response limit and alternatives such as Workers AI `AI.toMarkdown()` and Browser Run Markdown extraction for other conversion needs.

**Next.js middleware example:**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const accept = request.headers.get('accept') || '';
  
  if (accept.includes('text/markdown')) {
    // Only for docs pages
    if (request.nextUrl.pathname.startsWith('/docs/')) {
      return NextResponse.rewrite(new URL(`${request.nextUrl.pathname}.md`, request.url), {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept',
        },
      });
    }
  }
  
  // Default HTML response
  const response = NextResponse.next();
  response.headers.set('Vary', 'Accept');
  return response;
}

export const config = {
  matcher: ['/docs/:path*'],
};
```

**Stripe-style Instructions section:** Include a special block at the top of markdown responses:

```markdown
> **For AI agents:** This page is optimized for machine reading. Use `/ask` for natural language queries or clone the repo for full browsing context.
```

---

### Robots.txt for AI crawlers

**Standard training bots:**
- `GPTBot` (OpenAI training)
- `ClaudeBot` (Anthropic training)
- `Google-Extended` (Google training, invisible in logs via Search Console)
- `Meta-ExternalAgent` (Meta training)

**Standard search bots:**
- `OAI-SearchBot` (OpenAI search)
- `Claude-SearchBot` (Anthropic search)
- `PerplexityBot` (Perplexity search)

**User-agent bots:**
- `ChatGPT-User` (ChatGPT browsing)
- `Claude-User` (Claude browsing)

**Template for AI-friendly robots.txt:**

```
# State the content-use policy before per-bot directives.
User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /docs
Allow: /llms.txt
Allow: /llms-full.txt
Disallow: /admin
Disallow: /private

# Allow retrieval/search bots to use public docs.
User-agent: OAI-SearchBot
Allow: /docs
Disallow: /admin

User-agent: Claude-SearchBot
Allow: /docs
Disallow: /admin

# Block or restrict model-training bots according to product policy.
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

Sitemap: https://example.com/sitemap.xml
```

**Opt-out pattern:** To block all AI bots:
```
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /
```

**Google-Extended control:** Managed via Google Search Console, not robots.txt. Other bots respect Disallow rules in real time.

---

### Content Signals

**Spec:** https://contentsignals.org

Content Signals let a site declare what automated systems may do with content after access. Use them alongside `robots.txt`; they are not a replacement for crawl allow/block rules.

Supported purposes:

- `search` — building a search index and returning linked search results
- `ai-input` — using content as query-time context, grounding, or RAG input
- `ai-train` — training or fine-tuning models

Recommended default for public developer docs:

```
Content-Signal: search=yes, ai-input=yes, ai-train=no
```

Audit for consistency. A common bad state is `robots.txt` allowing retrieval bots while response headers or managed bot settings imply `ai-input=no`.

---

### .well-known/ endpoints

**API discovery:**

- `/.well-known/api-catalog` — RFC 9727 API Catalog listing API specs, docs, and related endpoints

**OAuth endpoints (standard):**

- `/.well-known/oauth-authorization-server` — describes OAuth server capabilities (RFC 8414)
- `/.well-known/oauth-protected-resource` — describes a protected resource expecting OAuth tokens (RFC 9728)

**MCP discovery:**

- `/.well-known/mcp/server-card.json` — MCP Server Card describing tools, transport, auth, and connection metadata
- `/.well-known/mcp.json` — older/emerging MCP metadata path; treat as compatibility, not the only discovery path

**Agent discovery endpoints:**

- `/.well-known/agent-skills/index.json` — index of reusable Agent Skills available for this site or service
- `/.well-known/agent.json` — A2A v1.0 RC agent card (canonical endpoint)
- `/.well-known/agent-card.json` — alternative name (accepted by most tools)

**Bot identity:**

- `/.well-known/http-message-signatures-directory` — public keys for Web Bot Auth signed requests

**Deprecated (do not use):**

- `/.well-known/ai-plugin.json` — ChatGPT plugin manifest. **REMOVED Jan 2025.** Do not implement.

**A2A agent card example** (`/.well-known/agent.json`):

```json
{
  "name": "Your Service Agent",
  "description": "Brief description of agent capabilities.",
  "homepage": "https://example.com",
  "rpc_endpoint": {
    "url": "https://example.com/rpc",
    "protocol": "json-rpc-2.0"
  },
  "auth": {
    "type": "oauth2",
    "grant_type": "client_credentials",
    "token_endpoint": "https://example.com/oauth/token"
  },
  "capabilities": ["task_execution", "message_routing"],
  "version": "1.0.0"
}
```

See https://a2a-protocol.org/latest/specification/ for full schema.

---

### API Catalog

**Spec:** RFC 9727

Publish `/.well-known/api-catalog` when a service has one or more public APIs. The catalog points agents to OpenAPI specs, docs, status pages, and related machine-readable assets without forcing them to scrape a developer portal.

Minimal shape:

```json
{
  "apis": [
    {
      "id": "public-rest-api",
      "title": "Public REST API",
      "description": "Create, read, and manage resources.",
      "specification": "https://api.example.com/openapi.json",
      "documentation": "https://example.com/docs/api",
      "status": "https://status.example.com"
    }
  ]
}
```

Also reference the catalog with an HTTP `Link` header when possible:

```
Link: </.well-known/api-catalog>; rel="api-catalog"
```

---

### MCP Server Card

Publish an MCP Server Card when the project exposes MCP over HTTP. It gives agents transport, tool, and auth metadata before they connect.

Preferred path:

```
/.well-known/mcp/server-card.json
```

Minimal shape:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
  "version": "1.0",
  "serverInfo": {
    "name": "docs-search",
    "title": "Documentation Search",
    "version": "1.0.0"
  },
  "description": "Search public documentation and retrieve canonical pages.",
  "transport": {
    "type": "streamable-http",
    "endpoint": "https://example.com/mcp"
  },
  "authentication": {
    "required": false
  }
}
```

If the project still uses `/.well-known/mcp.json`, keep it as a compatibility redirect or pointer, but do not rely on it as the only advertised metadata.

---

### Agent Skills index

Publish an Agent Skills index when a site can teach agents how to complete domain-specific tasks. This is especially useful for docs sites and developer platforms where a generic model may know stale or partial patterns.

Use the public Agent Skills format for linked skills: a folder containing `SKILL.md`, required `name` and `description` frontmatter, and optional `scripts/`, `references/`, and `assets/` directories. The discovery index is only the catalog; the full skill is loaded later through progressive disclosure.

Preferred path:

```
/.well-known/agent-skills/index.json
```

Minimal shape:

```json
{
  "skills": [
    {
      "id": "create-api-token",
      "name": "Create API Token",
      "description": "How to create a scoped API token for automation.",
      "format": "agent-skill",
      "url": "https://example.com/.well-known/agent-skills/create-api-token/SKILL.md"
    }
  ]
}
```

Keep skills procedural and narrow. The index should point to skill documents, not inline every workflow. Prefer descriptions that include when to use the skill, not just what topic it covers.

---

### NLWeb

**Project:** https://github.com/microsoft/NLWeb

**Purpose:** REST endpoint (`/ask`) and MCP server mode (`/mcp`) for natural language queries over indexed content.

**Pattern:** Agent sends natural language query, service returns JSON with answer + source citations using schema.org + vector DB.

**Example `/ask` endpoint:**

```
POST /ask
Content-Type: application/json

{
  "query": "How do I authenticate with OAuth?",
  "max_sources": 3
}

Response 200:
{
  "answer": "Use OAuth 2.1 client credentials...",
  "sources": [
    {
      "title": "Authentication docs",
      "url": "https://example.com/docs/auth",
      "snippet": "..."
    }
  ]
}
```

**Adoption:** Early stage (2025–2026). Pair with llms.txt and AGENTS.md for broader compatibility.

---

### "Copy for AI" UX patterns

**Pattern 1: Button on each docs page**
- Place a "Copy as Markdown" button next to or in the page header
- Copies markdown-formatted version of current page + parent context to clipboard
- Often combined with keyboard shortcut (e.g. `Cmd+Shift+M`)

**Pattern 2: Markdown URL suffix**
- `/docs/api` (HTML) vs `/docs/api.md` (markdown)
- Served via content negotiation or explicit routes

**Detection in code:**
```typescript
// docs/[slug].tsx — Next.js example
export default function DocsPage({ slug, content }) {
  return (
    <article>
      <header>
        <h1>{content.title}</h1>
        <button onClick={() => copyAsMarkdown(content)}>
          Copy for AI
        </button>
      </header>
      <MDXRemote source={content.markdown} />
    </article>
  );
}
```

---

## OpenAI Apps SDK / ChatGPT Directory

**Submission:** https://developers.openai.com/apps-sdk

Built on MCP. Apps use MCP servers as transport layer for agent interaction. Complement your MCP server with:
1. `/.well-known/mcp/server-card.json` and `/.well-known/mcp.json` only as a compatibility pointer when needed
2. Clear AGENTS.md with OpenAI-specific notes
3. OAuth 2.1 client credentials for agent authentication

---

## Anti-patterns

- **Blocking all AI bots indiscriminately.** Many legitimate use cases (internal agents, search integration, code analysis). Use targeted blocklists if needed.
- **Auto-generated AGENTS.md via `/init` without curation.** Agents need hand-written, actionable guidance.
- **llms.txt with only top-level page, no section annotations.** Agents can't locate sub-pages without H2 headers and links.
- **Outdated schema.org types** (deprecated in 2024+). Audit JSON-LD for current specs.
- **Using deprecated `/.well-known/ai-plugin.json`.** Removed; replaced by OpenAI Apps SDK. Delete any implementations.
- **llms-full.txt >30k tokens without pagination hints.** Add comment like `<!-- llms-full-page-2-of-3 -->` or split into sections.
- **No robots.txt policy for AI bots.** Default is opt-in; explicit rules signal curation.
- **Only publishing human docs for agent-facing APIs.** If a service has public APIs, publish an API Catalog and OpenAPI link.
- **MCP endpoint hidden in prose.** If an MCP server exists, publish a Server Card or metadata under `.well-known`.
- **Contradictory access signals.** Do not allow a bot in robots.txt while declaring `ai-input=no` for the same public docs.

---

## Templates and tooling

**Templates:**
- `/templates/llms.txt` — starter structure with sections
- `/templates/llms-full.txt` — full docs template with token comment
- `/templates/robots-ai.txt` — pre-filled robots.txt allowing major AI bots
- `/templates/AGENTS.md` — hand-curated baseline structure
- `/templates/json-ld-softwareapp.ts` — SoftwareApplication schema helper (Next.js)
- `/templates/content-negotiation.ts` — markdown negotiation middleware (Next.js)
- `/templates/agent-card.json` — A2A v1.0 RC card scaffold
- `/templates/discovery/api-catalog.json` — RFC 9727 API catalog scaffold
- `/templates/mcp-and-api/mcp-server-card.json` — MCP Server Card scaffold
- `/templates/discovery/agent-skills-index.json` — Agent Skills discovery index

**Tooling (verify currency):**
- `llmstxt-generator` — CLI to build llms.txt from docs structure
- `@vercel/llms` — Vercel SDK helper (if exists; check npm)
- `next-llmstxt` — Next.js plugin for auto-serving llms.txt
- `a2a-agent-card-builder` — A2A schema validator

---

## Citations

- https://llmstxt.org — llms.txt specification (Jeremy Howard, Answer.AI)
- https://agents.md — AGENTS.md specification (Agentic AI Foundation, Linux Foundation)
- https://schema.org/SoftwareApplication — schema.org type definitions
- https://a2a-protocol.org/latest/specification/ — A2A v1.0 RC agent card protocol
- https://github.com/microsoft/NLWeb — NLWeb project
- https://modelcontextprotocol.io/specification/2025-11-25 — MCP spec with OAuth 2.0 M2M
- https://www.rfc-editor.org/rfc/rfc8414.html — OAuth 2.0 Authorization Server Metadata
- https://www.rfc-editor.org/rfc/rfc9457.html — Problem Details for HTTP APIs
- https://developers.openai.com/apps-sdk — OpenAI Apps SDK (MCP-based)
- https://docs.cloud.google.com/agent-builder/agent-engine/overview — Google Vertex AI Agent Engine discovery
- https://blog.cloudflare.com/agent-readiness/ — Agent Readiness scoring model and measured standards
- https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/ — Markdown for Agents and token hints
- https://developers.cloudflare.com/ai-crawl-control/ — AI crawler visibility and access controls
- https://contentsignals.org — Content Signals
- https://www.rfc-editor.org/rfc/rfc9727.html — API Catalog
- https://www.rfc-editor.org/rfc/rfc9728.html — OAuth 2.0 Protected Resource Metadata

---

## See also

- `docs/discovery` — Agent discovery workflows (in Fumadocs site)
- `templates/llms.txt`, `templates/AGENTS.md`, `templates/json-ld-softwareapp.ts` — AEO templates
- `references/context-files.md` — Detailed AGENTS.md curation guide
- `references/authentication.md` — OAuth 2.1 and .well-known/oauth-protected-resource
