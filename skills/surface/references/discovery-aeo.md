# Discovery & Agent Engine Optimisation (AEO)

## Summary

Dimension 4 measures how discoverable, readable, governable, and callable a project is for AI agents. Covers llms.txt (a proposed inference-time Markdown link index), AGENTS.md (project guidance), structured JSON-LD schemas, robots.txt crawler policies, sitemap freshness, Markdown content negotiation, `.well-known` capability discovery, OAuth metadata, MCP discovery, WebMCP page tools, Agent Skills discovery, and optional agent-commerce protocol signals.

- **llms.txt**: H1 title, blockquote summary, H2 sections with link descriptions; useful, but not a guaranteed ranking or citation signal
- **AGENTS.md**: commands, tech stack, testing expectations, permission boundaries
- **Structured data**: JSON-LD (FAQPage, TechArticle, etc.) on key pages
- **robots.txt**: explicitly allow AI bots (GPTBot, ClaudeBot, etc.)
- **Content negotiation**: Accept: text/markdown → markdown response or `.md` fallback URLs
- **Content Signals**: `search`, `ai-input`, and `ai-train` preferences in robots.txt or response headers
- **.well-known**: API Catalog, MCP Server Card, Agent Skills index, OAuth metadata, Web Bot Auth keys
- **WebMCP**: page-scoped tools through `document.modelContext` when the deployed UI itself is the execution surface
- **Evidence**: File globs for llms.txt, AGENTS.md, sitemap, JSON-LD grep, robots.txt analysis

Treat AEO as practical discoverability engineering, not a promise that any specific model provider will crawl, rank, or cite the site. Strong discovery combines stable URLs, crawlable content, structured data, sitemap freshness, policy files, and capability manifests.

## Agent-readiness scan model

When auditing a public website, evaluate the same categories that current agent-readiness scanners measure:

| Category                  | Signals                                                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discoverability           | `robots.txt`, `sitemap.xml`, HTTP `Link` headers, stable URLs for docs and API specs                                                                                                                  |
| Content accessibility     | `llms.txt`, `llms-full.txt`, Markdown content negotiation, `.md` URL fallbacks, token count hints, an llms.txt pointer on every page, HTML/Markdown parity, content before navigation in source order |
| Bot access control        | Content Signals, explicit AI crawler policy, Web Bot Auth for high-trust bots                                                                                                                         |
| Capability discovery      | API Catalog, OpenAPI, MCP Server Card or MCP metadata, Agent Skills index, OAuth metadata                                                                                                             |
| Commerce, when applicable | x402, MPP, UCP, ACP, product feeds - see `references/agentic-commerce.md`                                                                                                                             |

Use scanner results as timestamped outside-in evidence for Dimension 4. [Is Agentic](https://is-agentic.com/) is a Vercel public-site scanner powered by Ora; its completed reports are also available through a read-only API, CLI, and remote MCP server. Inspect the individual checks and observed journey rather than copying its headline score into the Surface score. Do not overfit to one vendor's methodology, and never submit private, authenticated, confidential, or pre-release URLs merely to get a score.

### Documentation delivery: AFDocs

For documentation sites, the [Agent-Friendly Documentation Spec](https://agentdocsspec.com/spec/web/) (draft v0.6.0, September 2026) defines 28 checks on how a docs site serves fetching agents. [AFDocs](https://github.com/agent-ecosystem/afdocs) (`npx afdocs check <url>`, MIT, 0.x) implements it and powers Fern's Agent Score; Mintlify's Agent Score reports cite the same checks. Hosted reports sample about 15 pages and do not name them; run AFDocs with `--format json` to get per-page evidence, including against a local build with `--urls`. The page-level checks most often worth citing are `markdown-content-parity`, `content-start-position`, `llms-txt-directive-html`, `llms-txt-directive-md` and `markdown-link-portability`. Results for non-page targets listed in llms.txt (OpenAPI, JSON discovery documents) are not applicable to page checks. The house parity bar is under 5% of content segments missing from the Markdown twin. Mark intentional human-only elements (counters, "choose a card" prompts) with `data-markdown-ignore`, which is an AFDocs convention, not part of the spec. Put the llms.txt pointer near the start of each page, and check the deployed, cached response keeps every existing `Vary` dimension plus `Accept`. Canonical explanation: `src/content/docs/scoring/public-scanners.mdx`.

### Other scanners

[AgentReady](https://agentready.org) v2.0 (October 2026, Ora and Vercel) is a requirements standard with stable `AR-FIND-*`, `AR-READ-*` and `AR-ACT-*` IDs; it deliberately defines no scoring or weights, so cite requirement IDs rather than a score. Google Lighthouse (13.3.0 and later) ships an `agentic-browsing` category of seven audits, including accessibility-tree, WebMCP tool coverage, `llms-txt` and `ard-schema`; run it with `npx lighthouse <url> --only-categories=agentic-browsing` and treat it as experimental evidence. AFDocs, Cloudflare and Ora are not the whole public verification model, and none of them changes the Surface weights. Canonical explanation: `src/content/docs/scoring/public-scanners.mdx`.

### ARD and AI Catalog

Two separate drafts, activated only when the product publishes an agent resource catalog. [ARD](https://agenticresourcediscovery.org/spec/) (a proposal) publishes `/.well-known/ard.json`, advertised by an `Agentmap:` line in `robots.txt`, `<link rel="ard">` or DNS, and keeps `ai-catalog.json` only as an optional fallback. [AI Catalog](https://ai-catalog.io/specification/) owns `/.well-known/ai-catalog.json` and `rel="ai-catalog"`. Validate each representation against the exact schema revision you target, resolve every listed resource with a compatible client, and treat a `trustManifest` as a claim: check its framework, issuer, expiry, subject and publisher binding, and record unverifiable claims as unverified. Canonical explanation: `src/content/docs/discovery/catalogs-and-feeds.mdx`.

### Cloudflare comparison

Observed 2026-10-29: Cloudflare's scan API returned 23 checks (the page's script recognises 23 IDs, the form renders 22 checkboxes, and the default selection excludes A2A and AP2). DNS-AID is additional to Ora's published 132-check catalog (contract 1.38.0). Content Signals has a separate Cloudflare check; Ora's crawler-policy check (`robots-ai-policy-quality`) scores search-crawler access, says blocking training crawlers never lowers the score, and does not describe scoring Content Signals, so confirm its treatment before comparing. Is Agentic uses Ora's checks. Do not add all scanner requirements to the Surface rubric or change its weights.

### Optional DNS discovery

DNS-AID advertises agent services through DNS. Treat it as an emerging, individual Internet-Draft and activate it only for an integration whose client supports the chosen revision. Cloudflare probes SVCB/HTTPS records under `_index._agents`, `_a2a._agents` and `_mcp._agents`, plus a TXT index. Its catalog check separately probes `_catalog._agents` TXT and `_search._agents` SRV. These are observed scanner routes, not universal client requirements.

Verify the intended client's actual lookup, record parsing, DNSSEC result, TLS connection, protocol response and authentication boundary. Missing records on an unrelated website are not a scoring penalty. DNSSEC authenticates DNS data; it does not authorize an action or prove an endpoint safe. Keep ordinary HTTP discovery available for other clients.

Canonical explanation: `src/content/docs/discovery/dns-discovery.mdx`. Primary references: https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/ and https://isitagentready.com/.well-known/agent-skills/dns-aid/SKILL.md.

## Signal applicability

Discovery & AEO can apply while many of its optional signals do not. Detect the product surface first, then activate only the matching checks:

| Detected surface                    | Activate these checks                                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Public website or docs              | Crawl policy, sitemap, stable canonical URLs, structured data, human-readable and machine-readable content |
| Substantial public documentation    | `llms.txt`, `llms-full.txt` when useful, Markdown negotiation or `.md` fallbacks, documentation links      |
| Public HTTP API                     | OpenAPI, API Catalog, API documentation and status links                                                   |
| OAuth-protected API or resource     | Protected Resource Metadata and authorization-server metadata                                              |
| Remote HTTP MCP server              | MCP endpoint and discovery metadata; advertised tools, resources, prompts, transport, and auth             |
| Published task-specific skills      | Agent Skills discovery index, linked `SKILL.md` artifacts, and digest verification                         |
| Page-scoped agent interactions      | WebMCP registration and live browser behavior                                                              |
| Agent-mediated commerce             | The commerce protocol actually implemented by the product - see `references/agentic-commerce.md`           |
| Outbound or high-trust bot identity | HTTP Message Signatures directory and key lifecycle                                                        |

When no activating surface exists, record the signal as **not applicable**. Do not award credit for an absent optional capability, and do not deduct points for it. A capability mentioned only in a roadmap, placeholder manifest, or stale documentation is not detected implementation.

## Semantic validation rule

Presence is only the first check. For every applicable discovery artifact, verify three layers:

1. **Transport:** the canonical URL resolves with the intended status, content type, cache behavior, and redirects.
2. **Artifact:** the body parses as the claimed format and contains meaningful, internally consistent metadata rather than an HTML shell, login page, placeholder, or empty response.
3. **Capability:** linked content resolves and the advertised operation works from an agent client where safe to test.

Examples:

- `llms.txt` is text with a useful H1, categorized links, and descriptions; it is not the site's SPA fallback. Sample linked pages must contain the promised documentation.
- An OpenAPI URL parses as OpenAPI and describes real endpoints; an API Catalog's specification, documentation, and status links resolve to the advertised resources.
- OAuth metadata parses as JSON and its issuer and endpoint relationships are coherent. Do not count a redirect to an interactive login page as metadata.
- JSON-LD parses and matches visible page content. A syntactically valid block containing claims the page does not make is a failure.
- HTTP `Link` targets resolve to the declared relation instead of a generic home page.
- An MCP endpoint speaks the advertised transport. If `resources/list` advertises resources, sample them with `resources/read` and require non-empty content with an accurate MIME type. Validate listed tools and prompts similarly without executing mutations.
- An Agent Skills index conforms to its declared schema; each skill URL returns the exact artifact whose digest is published; and each `SKILL.md` has valid frontmatter and a description that explains when to use it.

If production access, authentication, or mutation risk prevents capability testing, stop at the strongest safe layer and lower confidence. Do not convert an untested claim into a pass.

## Scoring rubric

| Score | Criteria                                                                                                                                                                                                                                  | Detection                                                                                                                                                                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | No agent-specific discovery files. No llms.txt, no AGENTS.md, no structured data. robots.txt blocks AI bots or hides public docs from retrieval.                                                                                          | No llms.txt at web root. No AGENTS.md in repo. No JSON-LD in HTML. robots.txt Disallow for GPTBot/ClaudeBot/search agents.                                                                                                                                                                |
| 1     | Basic discovery. AGENTS.md, llms.txt, robots.txt, or sitemap exists but is minimal. No capability discovery and no agent-specific content format.                                                                                         | AGENTS.md present but <50 lines or auto-generated. OR llms.txt present but <10 links. Basic sitemap only. No JSON-LD. No Markdown response path.                                                                                                                                          |
| 2     | Good discovery. llms.txt with categorized links + AGENTS.md with commands and conventions. JSON-LD on key pages. robots.txt allows intended AI retrieval/search bots. Sitemap with accurate lastmod. OpenAPI is linked from docs or root. | llms.txt with H2 sections and descriptions. AGENTS.md with commands, conventions, boundaries. FAQPage/TechArticle/WebAPI JSON-LD. robots.txt explicitly allows retrieval bots and references sitemap. OpenAPI discoverable at a stable URL.                                               |
| 3     | Full agent-readable web surface. Core discovery is semantically valid, not just present. Applicable capability signals are published and verified; unrelated optional protocols are recorded as not applicable.                           | `llms-full.txt` when useful. Markdown response code or generated `.md` routes. Content-Signal in robots/headers. Applicable API Catalog, MCP, Agent Skills, OAuth, Web Bot Auth, WebMCP, or commerce artifacts parse correctly, link to real content, and advertise working capabilities. |

**N/A when:** Project has no web presence (pure library, CLI-only tool).

---

## Evidence to gather

- `public/llms.txt`, `public/llms-full.txt` at web root
- `AGENTS.md` in repo root (also distributed at `/agents.md` endpoint)
- `robots.txt` and crawler directives (`User-agent`, `Disallow`)
- Content Signals in `robots.txt` or response headers (`Content-Signal: search=yes, ai-input=yes, ai-train=no`)
- Sitemap (`sitemap.xml`) with accurate `<lastmod>` timestamps
- JSON-LD blocks in HTML (grep `application/ld+json` in layout / page templates)
- `.well-known/` directory: `api-catalog`, `mcp/server-card.json`, `mcp.json`, `agent-skills/index.json`, `agent-card.json`, `oauth-protected-resource`, `oauth-authorization-server`, `http-message-signatures-directory`
- Server middleware supporting content negotiation (`Accept: text/markdown` → markdown response)
- `Vary: Accept` header in HTTP responses
- `x-markdown-tokens` header on markdown responses (token budget hints)
- NLWeb `/ask` REST endpoint or `/mcp` server mode
- "Copy for AI" button or `.md` URL suffix on docs pages (e.g. `/docs/api.md`)
- Commerce manifests or headers when applicable: x402, MPP, UCP, ACP - see `references/agentic-commerce.md` for the full detection and scoring guidance
- WebMCP registration (`document.modelContext.registerTool`) in browser code when page-local tools apply
- Public readiness report URL, scanner name, and scan timestamp when an outside-in scan is available
- AFDocs JSON output (`npx afdocs check <url> --format json`) for page-level evidence: which pages miss the llms.txt directive, where content starts in the converted page, and which HTML segments are missing from the Markdown twin
- Glossary, tooltip or popover terms rendered only inside `<button>`; tab or disclosure panels mounted on demand; MDX components left as raw JSX in Markdown output

---

## Deep dive

### llms.txt (Jeremy Howard, Sep 2024)

**Spec:** https://llmstxt.org

**Reality check:** llms.txt is a proposal for helping models and agents use website content at inference time. It complements `robots.txt`, `sitemap.xml`, structured data, and Markdown docs; it does not replace them and should not be sold as a guaranteed AI-search ranking mechanism.

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

**Detection:** Check `/llms.txt` and `/llms-full.txt` at web root. If behind auth, check repo root for both files.

---

### AGENTS.md

**Specification:** https://agents.md - contributed to the Agentic AI Foundation under the Linux Foundation.

**Adoption:** Treat AGENTS.md as the single project instruction file - Claude Code (v2.1.277+), Cursor, and Copilot all read it directly, so most repos need nothing else. Add a tool-specific file such as `CLAUDE.md`, Cursor rules, or Copilot instructions only when that tool needs something AGENTS.md can't give it, and layer it on top rather than duplicate it: a `CLAUDE.md` should import `@AGENTS.md` (first line by house recommendation; an import works anywhere in the file), because by default Claude Code reads a `CLAUDE.md` instead of AGENTS.md unless it imports it or the `claude-md-and-agents-md` setting is on.

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

**Curation:** Hand-written (not auto-generated by `/init` without review). Commands at the top with exact flags. Two different length numbers apply depending on what you are doing: the **audit tolerance** is <370 lines (the ceiling an existing file is scored against), while the **authoring target** for a file you generate fresh is ~150 lines ideal, <300 hard maximum.

---

### JSON-LD structured data

**Purpose:** Embed semantic information in HTML so agents can understand content without parsing prose.

**Schema.org types for agent discovery:**

- `SoftwareApplication` - project identity
- `WebAPI` - REST API description
- `APIReference` - API docs structure
- `FAQPage` - common questions
- `HowTo` - step-by-step guides
- `TechArticle` - blog posts / technical docs
- `Dataset` - downloadable datasets or data sources

**Implementation:** Embed as `<script type="application/ld+json">` in root layout or page templates.

**TypeScript / Next.js example (App Router):**

```typescript
// app/layout.tsx
export const generateMetadata = () => ({
  // Standard meta tags...
});

// Generate JSON-LD for SoftwareApplication. Keep this helper local (or in its own
// module): a layout may only export Next.js's allowed names, such as generateMetadata.
const generateJsonLd = () => ({
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

**Next.js proxy example** (Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`; the function is `proxy`). Parse `Accept` with quality weights - a substring test would treat `text/markdown;q=0` as a request for Markdown - and send `Vary: Accept` on both variants:

```typescript
// proxy.ts
import { NextRequest, NextResponse } from "next/server";

// Quality of the most specific range matching `type` (exact, then type/*, then */*).
function qualityFor(accept: string, type: string): number {
  const [main] = type.split("/");
  let best = { specificity: -1, q: 0 };
  for (const part of accept.toLowerCase().split(",")) {
    const [range, ...params] = part.split(";").map((piece) => piece.trim());
    const specificity = range === type ? 2 : range === `${main}/*` ? 1 : range === "*/*" ? 0 : -1;
    if (specificity <= best.specificity) continue;
    const qParam = params.find((param) => param.startsWith("q="));
    const q = qParam === undefined ? 1 : Number.parseFloat(qParam.slice(2));
    best = { specificity, q: Number.isNaN(q) ? 0 : q };
  }
  return best.q;
}

function prefersMarkdown(accept: string): boolean {
  const markdown = qualityFor(accept, "text/markdown");
  return markdown > 0 && markdown > qualityFor(accept, "text/html");
}

export function proxy(request: NextRequest) {
  const accept = request.headers.get("accept") || "";

  // Only for docs pages
  if (prefersMarkdown(accept) && request.nextUrl.pathname.startsWith("/docs/")) {
    const response = NextResponse.rewrite(new URL(`${request.nextUrl.pathname}.md`, request.url));
    response.headers.set("Vary", "Accept");
    return response;
  }

  // Default HTML response
  const response = NextResponse.next();
  response.headers.set("Vary", "Accept");
  return response;
}

export const config = {
  matcher: ["/docs/:path*"],
};
```

If you serve Markdown from a route handler, `params` is a promise in Next.js 16 (`{ params }: { params: Promise<{ slug: string[] }> }`, then `await params`). A folder named `_md` is a private folder and is not routable; use `%5Fmd` or a name without a leading underscore. llms.txt v2 allows `.md` appended to the page URL (`page.html.md`) or replacing the extension (`page.md`), and uses `rel="alternate" type="text/markdown"` and `rel="describedby"` links for discovery.

Cloudflare's Markdown conversion (docs updated 2026-10-09) preserves an origin `Content-Signal` header and existing `Vary` dimensions. The roughly 80% token saving Cloudflare reports is illustrative and varies by page.

**Stripe-style Instructions section:** Include a special block at the top of markdown responses:

```markdown
> **For AI agents:** This page is optimized for machine reading. Use `/ask` for natural language queries or clone the repo for full browsing context.
```

**Agent-mode page view:** a distinct stripped view (e.g. `?mode=agent`) is a separate pattern from Markdown negotiation - build it only when the value is direct action links rather than prose, and keep its facts in sync with the canonical page. Ora's `agent-mode-view` check looks for this by name; there's no formal spec.

**Locale negotiation:** `Accept-Language` (RFC 9110 §12.5.4) picks a language the same way `Accept` picks a format. Keep `hreflang` alternates, the locale segment in Markdown route paths, and per-locale `llms.txt` files in agreement.

---

### Robots.txt for AI crawlers

**Standard training bots:**

- `GPTBot` (OpenAI training)
- `ClaudeBot` (Anthropic training)
- `Google-Extended` (a robots.txt product token with no separate HTTP user agent, not a Search Console setting; it controls use for Gemini training and for grounding in Gemini Apps and Grounding with Google Search on Vertex AI, and Google states disallowing it does not affect Search ranking or inclusion)
- `Applebot-Extended` (Apple training - same pattern: disallowing it does not affect Search ranking)
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

**Opt-out pattern:** To block the OpenAI and Anthropic training crawlers (search and user-initiated fetch agents are listed separately and stay unaffected; robots.txt is a request, not access control):

```
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /
```

**Google-Extended control:** A `Disallow` rule in robots.txt, same as any other bot. Google and Apple both confirm disallowing their `-Extended` training bot does not affect Search ranking or inclusion; Microsoft's training bots currently support only the `NOARCHIVE` meta tag, with robots.txt support targeted for early 2027.

**Cloudflare's three-way classification (Search/Agent/Training):** Live for all Cloudflare customers since 2026-07-01. Bot Preference Sync (from 2026-08-21) writes those dashboard settings into robots.txt automatically. New domains on Cloudflare default Training to Disallow on ad-monetized pages from 2026-09-15. Decide Search, Agent, and Training as three separate questions - not one toggle.

**Web Bot Auth:** signed HTTP requests (RFC 9421) let a site verify bot identity instead of trusting a spoofable user-agent string. The IETF webbotauth working group adopted `draft-ietf-webbotauth-httpsig-protocol` on 2026-09-01, replacing the earlier individual draft it was based on.

---

### Content Signals

**Spec:** https://contentsignals.org

Content Signals let a site declare what automated systems may do with content after access. Use them alongside `robots.txt`; they are not a replacement for crawl allow/block rules.

Supported purposes:

- `search` - building a search index and returning linked search results
- `ai-input` - using content as query-time context, grounding, or RAG input
- `ai-train` - training or fine-tuning models

Recommended default for public developer docs:

```
Content-Signal: search=yes, ai-input=yes, ai-train=no
```

Audit for consistency between the intended policy and every place it is declared. Fetch permission and use permission are separate, so `robots.txt` allowing retrieval bots alongside `ai-input=no` can be intentional; it is a defect only when it contradicts the owner's stated policy, or when two declarations of the same permission disagree.

**RSL vs IETF aipref:** RSL 1.0 (rslstandard.org) is a ratified standard for attaching a price or licence condition (pay-per-crawl, subscription, pay-per-inference, attribution, free) via robots.txt, HTTP headers, HTML, RSS, or media files - use it when Content Signals' yes/no isn't enough. IETF aipref (`draft-ietf-aipref-vocab` -08, `draft-ietf-aipref-attach` -05) is still two pre-consensus Internet-Drafts defining a similar `Content-Usage` robots.txt rule and HTTP header - track it, don't require it yet.

---

### .well-known/ endpoints

**API discovery:**

- `/.well-known/api-catalog` - RFC 9727 API Catalog listing API specs, docs, and related endpoints

**OAuth endpoints (standard):**

- `/.well-known/oauth-authorization-server` - describes OAuth server capabilities (RFC 8414)
- `/.well-known/oauth-protected-resource` - describes a protected resource expecting OAuth tokens (RFC 9728)

**MCP discovery:**

- `<streamable-http-url>/server-card` (listed in `/.well-known/ai-catalog.json`) - MCP Server Card describing identity and remote connection metadata, not tools; `/.well-known/mcp/server-card.json` is the older compatibility path
- `/.well-known/mcp.json` - older/emerging MCP metadata path; treat as compatibility, not the only discovery path

**Agent discovery endpoints:**

- `/.well-known/agent-skills/index.json` - index of reusable Agent Skills available for this site or service
- `/.well-known/agent-card.json` - A2A agent card (IANA-registered name)
- `/.well-known/agent.json` - pre-1.0 fallback name; some older clients still look for it

**Bot identity:**

- `/.well-known/http-message-signatures-directory` - public keys for Web Bot Auth signed requests

**Deprecated (do not use):**

- `/.well-known/ai-plugin.json` - legacy ChatGPT plugin manifest. **Retired.** Do not implement.

**A2A agent card example** (`/.well-known/agent-card.json`, A2A v1.0 shape). Declare credentials with `securitySchemes` and `securityRequirements` (v0.3 cards call the second field `security`); the old `authentication` object is obsolete:

```json
{
  "name": "Your Service Agent",
  "description": "Brief description of agent capabilities.",
  "version": "1.0.0",
  "supportedInterfaces": [
    { "url": "https://example.com/a2a", "protocolBinding": "JSONRPC", "protocolVersion": "1.0" }
  ],
  "capabilities": { "streaming": false, "pushNotifications": false },
  "securitySchemes": {
    "oauth": {
      "oauth2SecurityScheme": {
        "flows": {
          "clientCredentials": {
            "tokenUrl": "https://example.com/oauth/token",
            "scopes": { "tasks": "Run tasks" }
          }
        }
      }
    }
  },
  "securityRequirements": [{ "schemes": { "oauth": { "list": ["tasks"] } } }],
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["text/plain"],
  "skills": [
    {
      "id": "run-task",
      "name": "Run task",
      "description": "Runs a documented task and returns the result.",
      "tags": ["tasks"]
    }
  ]
}
```

See https://a2a-protocol.org/latest/specification/ for full schema.

---

### API Catalog

**Spec:** RFC 9727

Publish `/.well-known/api-catalog` when a service has one or more public APIs. The catalog points agents to OpenAPI specs, docs, status pages, and related machine-readable assets without forcing them to scrape a developer portal.

The catalog is an RFC 9264 linkset. The first entry is anchored at the catalog and lists each API as an `item` link; each API then gets its own entry with `service-desc` (spec), `service-doc` (human docs), `service-meta` and `status` links. Serve it as `application/linkset+json;profile="https://www.rfc-editor.org/info/rfc9727"`.

Minimal shape:

```json
{
  "linkset": [
    {
      "anchor": "https://example.com/.well-known/api-catalog",
      "item": [{ "href": "https://api.example.com/v1", "title": "Public REST API" }]
    },
    {
      "anchor": "https://api.example.com/v1",
      "service-desc": [
        {
          "href": "https://api.example.com/openapi.json",
          "type": "application/vnd.oai.openapi+json"
        }
      ],
      "service-doc": [{ "href": "https://example.com/docs/api", "type": "text/html" }],
      "status": [{ "href": "https://status.example.com", "type": "text/html" }]
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

Publish an MCP Server Card when the project exposes MCP over HTTP. It gives agents identity and remote transport metadata before they connect. SEP-2127 (Final, 2026-10-06) charters the `io.modelcontextprotocol/server-card` extension; the card format itself is still draft in the extension repository, and the card should omit tools (clients read those at runtime via `server/discover`).

Recommended location (extension draft): `<streamable-http-url>/server-card`, advertised in `/.well-known/ai-catalog.json` with entry type `application/mcp-server-card+json`. The extension advises against `/.well-known/mcp/server-card`; the older path below is what many early publishers used, so keep it only as a compatibility copy.

Earlier proposal path and shape:

```
/.well-known/mcp/server-card.json
```

Minimal shape:

```json
{
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

The hosted discovery index is a proposal, separate from the stable `SKILL.md` format at agentskills.io/specification. Its draft schema URL (`schemas.agentskills.io/discovery/0.2.0/schema.json`) does not resolve, so omit `$schema` and validate the fields your target consumer needs. A `skill-md` entry points directly to a `SKILL.md` artifact and publishes the SHA-256 of the exact response bytes. Recompute the digest whenever the served artifact changes.

Preferred path:

```
/.well-known/agent-skills/index.json
```

Minimal shape:

```json
{
  "skills": [
    {
      "name": "create-api-token",
      "type": "skill-md",
      "description": "Use when an agent needs to create a scoped API token for automation.",
      "url": "https://example.com/.well-known/agent-skills/create-api-token/SKILL.md",
      "digest": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    }
  ]
}
```

Keep skills procedural and narrow. The index should point to skill documents, not inline every workflow. Prefer descriptions that include when to use the skill, not just what topic it covers.

Validate the index and linked artifact together:

```bash
curl --fail --silent --show-error \
  https://example.com/.well-known/agent-skills/create-api-token/SKILL.md \
  | shasum -a 256
```

Compare the hex result with the index's `sha256:` value. Hash the exact served bytes; line-ending conversion, templating, or a gateway-added newline changes the digest. Also parse the linked `SKILL.md` frontmatter, check that `name` and `description` are present, and confirm the description provides a useful activation condition.

---

### NLWeb

**Project:** https://github.com/nlweb-ai/NLWeb

**Purpose:** REST endpoint (`/ask`) and MCP server mode (`/mcp`) for natural language queries over indexed content.

**Pattern:** Agent sends a natural language query; in the default `list` mode the service returns ranked schema.org-backed results. `summarize` and `generate` modes add a summary or generated answer.

**Example `/ask` request** (per the reference REST API docs; `query` is required, `streaming` defaults to true):

```
GET /ask?query=How+do+I+authenticate+with+OAuth&streaming=false
Accept: application/json

Response 200:
{
  "query_id": "q-1234",
  "results": [
    {
      "url": "https://example.com/docs/auth",
      "name": "Authentication docs",
      "site": "example.com",
      "score": 87,
      "description": "How to authenticate API requests.",
      "schema_object": {}
    }
  ]
}
```

Do not promise `answer` or `sources` fields unless you select `summarize` or `generate` and have checked what your pinned version returns. Treat `score` as implementation-defined relevance, not a probability.

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

### Changelog feeds, status pages, agent terms of use

No scanner checks these; all three have real primary-source or practical backing.

- **Changelog / RSS or Atom feed** - a dated changelog (RSS 2.0 or Atom, RFC 4287) lets an agent already holding your docs detect drift with one small fetch instead of re-ingesting everything. Advertise it with `<link rel="alternate" type="application/atom+xml" href="/changelog/feed.xml">`. Entries need a real date and a specific description of what changed, not "bumped dependencies."
- **Status page** - a public `/status` page or third-party status service lets an agent tell an outage from its own error before retrying or backing off. Link it from the API Catalog entry.
- **Agent terms of use** - a published, standalone policy stating what automated/unattended use is actually permitted. No IETF/W3C standard backs this; it's a legal-practice recommendation. Link it from `llms.txt` and API docs, not just general Terms of Service.

---

## OpenAI Apps SDK / ChatGPT Directory

**Submission:** https://developers.openai.com/plugins

Built on MCP. Apps use MCP servers as transport layer for agent interaction. Complement your MCP server with:

1. The MCP Server Card at `<streamable-http-url>/server-card`, with `/.well-known/mcp/server-card.json` and `/.well-known/mcp.json` only as compatibility pointers when needed
2. Clear AGENTS.md with OpenAI-specific notes
3. For user-specific data, OAuth 2.1 authorization code with PKCE (S256) and MCP authorization metadata; ChatGPT does not support machine-to-machine grants such as client credentials. Public read-only tools can stay unauthenticated.

---

## Anti-patterns

- **Blocking all AI bots indiscriminately.** Many legitimate use cases (internal agents, search integration, code analysis). Use targeted blocklists if needed.
- **Auto-generated AGENTS.md via `/init` without curation.** Agents need hand-written, actionable guidance.
- **llms.txt with only top-level page, no section annotations.** Agents can't locate sub-pages without H2 headers and links.
- **Outdated schema.org types** (deprecated in 2024+). Audit JSON-LD for current specs.
- **Using deprecated `/.well-known/ai-plugin.json`.** Removed; replaced by OpenAI Apps SDK. Delete any implementations.
- **An unbounded llms-full.txt.** The llms.txt proposal sets no size limit or pagination protocol, but very large files exceed many clients' fetch limits. Pick a house budget (for example around 30k tokens), measure the clients you target, and split by section when you exceed it.
- **No robots.txt policy for AI bots.** Without a matching rule, crawlers treat paths as allowed (RFC 9309), so the absence is a policy too. State search, user retrieval and training choices explicitly.
- **Only publishing human docs for agent-facing APIs.** If a service has public APIs, publish an API Catalog and OpenAPI link.
- **MCP endpoint hidden in prose.** If an MCP server exists, publish a Server Card or metadata under `.well-known`.
- **Conflating access with content use.** Allowing a fetch while declining AI input can be intentional. Check each use against its declared policy; do not treat different permissions for search, AI input, and training as a contradiction.
- **Treating a scanner score as certification.** Public readiness scans are point-in-time observations and can be false positive, false negative, or partial; they do not certify security, accessibility, quality, compliance, or compatibility.
- **Treating HTTP 200 as semantic success.** An SPA shell, login page, placeholder JSON, empty MCP resource, or broken linked artifact does not prove the advertised capability works.
- **Scoring absent optional protocols as failures.** Activate MCP, OAuth, Agent Skills, WebMCP, commerce, and bot-identity checks only when the corresponding surface exists.

---

## Templates and tooling

**Templates:**

- `/templates/discovery/llms.txt` - starter structure with sections
- `/templates/discovery/llms-full.txt` - full docs template with token comment
- `/templates/discovery/robots-ai.txt` - pre-filled robots.txt content for major AI bots (publish it as `/robots.txt`)
- `/templates/discovery/AGENTS.md` - hand-curated baseline structure
- `/templates/discovery/json-ld-softwareapp.ts` - SoftwareApplication schema helper (Next.js)
- `/templates/discovery/content-negotiation.ts` - markdown negotiation middleware (Next.js)
- `/templates/mcp-and-api/agent-card.json` - A2A v1.0 AgentCard scaffold (`supportedInterfaces`, `securitySchemes`, `securityRequirements`)
- `/templates/discovery/api-catalog.json` - RFC 9727 API catalog scaffold
- `/templates/mcp-and-api/mcp-server-card.json` - MCP Server Card scaffold
- `/templates/discovery/agent-skills-index.json` - Agent Skills discovery index

**Tooling (verify currency):**

- `afdocs` (npm) - Agent-Friendly Documentation Spec checker for llms.txt, Markdown delivery and page conversion
- Generate `llms.txt` from the docs source in a route handler or build step rather than maintaining it by hand; check any third-party generator on npm before recommending it
- Validate A2A Agent Cards against the pinned official A2A schema

---

## Citations

- https://llmstxt.org - llms.txt specification (Jeremy Howard, Answer.AI)
- https://agents.md - AGENTS.md specification (Agentic AI Foundation, Linux Foundation)
- https://schema.org/SoftwareApplication - schema.org type definitions
- https://a2a-protocol.org/latest/specification/ - A2A v1.0.1 agent card protocol
- https://github.com/nlweb-ai/NLWeb - NLWeb project
- https://modelcontextprotocol.io/specification/2026-07-28 - current MCP specification revision
- https://webmachinelearning.github.io/webmcp/ - current WebMCP Community Group draft
- https://is-agentic.com/methodology - Is Agentic scoring model and limitations
- https://is-agentic.com/docs - Is Agentic report API, CLI, MCP, and skill surfaces
- https://www.rfc-editor.org/rfc/rfc8414.html - OAuth 2.0 Authorization Server Metadata
- https://www.rfc-editor.org/rfc/rfc9457.html - Problem Details for HTTP APIs
- https://developers.openai.com/plugins - OpenAI plugins and apps (MCP-based)
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale - Google Agent Engine (Gemini Enterprise Agent Platform)
- https://blog.cloudflare.com/agent-readiness/ - Agent Readiness scoring model and measured standards
- https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/ - Markdown for Agents and token hints
- https://developers.cloudflare.com/ai-crawl-control/ - AI crawler visibility and access controls
- https://contentsignals.org - Content Signals
- https://www.rfc-editor.org/rfc/rfc9727.html - API Catalog
- https://www.rfc-editor.org/rfc/rfc9728.html - OAuth 2.0 Protected Resource Metadata

---

## See also

- `/docs/discovery` - Agent discovery workflows (https://agentsurface.dev/docs/discovery)
- `templates/discovery/llms.txt`, `templates/discovery/AGENTS.md`, `templates/discovery/json-ld-softwareapp.ts` - AEO templates
- `references/context-files.md` - Detailed AGENTS.md curation guide
- `references/authentication.md` - OAuth 2.1 and .well-known/oauth-protected-resource

## Discovery through to use

Verify that a caller can move from the intended entry point to the advertised capability without private knowledge. Check consistent identity, authoritative decision facts, link resolution, and a real invocation. Catalog and feed guidance is at `/docs/discovery/catalogs-and-feeds`; pricing, availability, section indexes, and external identity guidance is at `/docs/discovery/commercial-and-entity-discovery`. Use `product-journeys.md` to connect this evidence to the existing audit.
