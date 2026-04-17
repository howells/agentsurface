# Discovery & Agent Engine Optimisation (AEO)

## Summary

Dimension 4 measures how discoverable and navigable a project is for AI agents. Covers llms.txt (agent-optimized link index), AGENTS.md (project guidance), structured JSON-LD schemas, robots.txt crawler policies, sitemap freshness, content negotiation for markdown, and .well-known endpoints. AEO is to agents what SEO is to search engines: navigation files, structured data, and crawler directives enabling discovery and understanding.

- **llms.txt**: H1 title, blockquote summary, H2 sections with link descriptions
- **AGENTS.md**: commands, tech stack, testing expectations, permission boundaries
- **Structured data**: JSON-LD (FAQPage, TechArticle, etc.) on key pages
- **robots.txt**: explicitly allow AI bots (GPTBot, ClaudeBot, etc.)
- **Content negotiation**: Accept: text/markdown → markdown response
- **.well-known**: /.well-known/agent.json, oauth endpoints, MCP config
- **Evidence**: File globs for llms.txt, AGENTS.md, sitemap, JSON-LD grep, robots.txt analysis

> AEO is to agents what SEO is to search engines. It encompasses the navigation files, structured data schemas, content negotiation protocols, and crawler directives that enable AI agents to discover, understand, and navigate a codebase or web service. Key dimensions: llms.txt discovery, AGENTS.md conventions, structured JSON-LD schemas, robots.txt crawler policies, sitemap freshness, content negotiation for markdown, and well-known endpoints for authentication and inter-agent discovery.

## Scoring rubric

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No agent-specific discovery files. No llms.txt, no AGENTS.md, no structured data. robots.txt blocks AI bots. | No llms.txt at web root. No AGENTS.md in repo. No JSON-LD in HTML. robots.txt Disallow for GPTBot/ClaudeBot. |
| 1 | Basic discovery. AGENTS.md or llms.txt exists but minimal. No structured data. | AGENTS.md present but <50 lines or auto-generated. OR llms.txt present but <10 links. No JSON-LD. |
| 2 | Good discovery. llms.txt with categorized links + AGENTS.md with commands and conventions. JSON-LD on key pages. robots.txt allows AI bots. Sitemap with accurate lastmod. | llms.txt with H2 sections and descriptions. AGENTS.md with commands, conventions, boundaries. At least FAQPage or TechArticle JSON-LD. robots.txt explicitly allows AI crawlers. |
| 3 | Full AEO. llms.txt + llms-full.txt. Content negotiation (Accept: text/markdown → Markdown response). Vary: Accept header. x-markdown-tokens header. /.well-known/ endpoints. Stripe-style Instructions section. "Copy for AI" button. Token budgets per page. NLWeb /ask endpoint. | llms-full.txt present. Markdown content negotiation in server code. /.well-known/ai or agent-card.json. Multiple JSON-LD schema types. All docs pages <30K tokens. |

**N/A when:** Project has no web presence (pure library, CLI-only tool).

---

## Evidence to gather

- `public/llms.txt`, `public/llms-full.txt` at web root
- `AGENTS.md` in repo root (also distributed at `/agents.md` endpoint)
- `robots.txt` and crawler directives (`User-agent`, `Disallow`)
- Sitemap (`sitemap.xml`) with accurate `<lastmod>` timestamps
- JSON-LD blocks in HTML (grep `application/ld+json` in layout / page templates)
- `.well-known/` directory: `agent.json`, `agent-card.json`, `ai-plugin.json` (deprecated), `oauth-protected-resource`, `oauth-authorization-server`, `mcp.json` (emerging)
- Server middleware supporting content negotiation (`Accept: text/markdown` → markdown response)
- `Vary: Accept` header in HTTP responses
- `x-markdown-tokens` header on markdown responses (token budget hints)
- NLWeb `/ask` REST endpoint or `/mcp` server mode
- "Copy for AI" button or `.md` URL suffix on docs pages (e.g. `/docs/api.md`)

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

**Pattern:** When a client sends `Accept: text/markdown`, return a markdown-formatted representation of the page instead of HTML.

**HTTP headers:**
- Request: `Accept: text/markdown`
- Response: `Content-Type: text/markdown; charset=utf-8`
- Always include: `Vary: Accept` (tells caches this response varies by Accept header)
- Optional: `x-markdown-tokens: 1250` (hint for token-constrained agents)

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
# Allow all AI training and search bots
User-agent: GPTBot
Disallow: /admin
Disallow: /private

User-agent: ClaudeBot
Disallow: /admin
Disallow: /private

User-agent: Google-Extended
Disallow: /admin
Disallow: /private

User-agent: OAI-SearchBot
Disallow: /admin
Disallow: /private

User-agent: *
Disallow: /admin
Disallow: /*.json$
Allow: /llms.txt
Allow: /llms-full.txt
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

### .well-known/ endpoints

**OAuth endpoints (standard):**

- `/.well-known/oauth-authorization-server` — describes OAuth server capabilities (RFC 8414)
- `/.well-known/oauth-protected-resource` — describes a resource server expecting OAuth tokens (MCP extension)

**Agent discovery endpoints:**

- `/.well-known/agent.json` — A2A v1.0 RC agent card (canonical endpoint)
- `/.well-known/agent-card.json` — alternative name (accepted by most tools)

**MCP endpoints (emerging):**

- `/.well-known/mcp.json` — MCP server metadata (not yet standardised; use with caution)

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

Built on MCP. Directory launched Dec 17 2025. Apps use MCP servers as transport layer for agent interaction. Complement your MCP server with:
1. `/.well-known/mcp.json` (emerging standard)
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

---

## See also

- `docs/discovery` — Agent discovery workflows (in Fumadocs site)
- `templates/llms.txt`, `templates/AGENTS.md`, `templates/json-ld-softwareapp.ts` — AEO templates
- `references/context-files.md` — Detailed AGENTS.md curation guide
- `references/authentication.md` — OAuth 2.1 and .well-known/oauth-protected-resource
