# Discovery & AEO

Dimension 4: whether agents can find, read, govern and call the product from
the open web.

## Score

- **0**: No llms.txt, AGENTS.md or structured data; robots.txt blocks intended
  retrieval bots or hides public docs.
- **1**: Something exists but is thin: AGENTS.md under 50 lines or uncurated,
  llms.txt under 10 links, a bare sitemap, no JSON-LD, no Markdown path.
- **2**: llms.txt with H2 sections and link descriptions; a curated AGENTS.md;
  JSON-LD on key pages; robots.txt that allows intended retrieval bots and names
  the sitemap; accurate `lastmod`; OpenAPI at a stable, linked URL.
- **3**: Every applicable artifact is semantically valid, not just present:
  Markdown negotiation or `.md` twins, `llms-full.txt` where useful, a
  Content-Signal policy consistent with robots.txt, and the applicable API
  Catalog, MCP, Agent Skills, OAuth, Web Bot Auth, WebMCP or commerce artifacts
  parse, link to real content and work.

N/A when there is no web presence (a pure library or CLI). Judge its repo-local
context files and package metadata instead.

## Which signals apply

| Detected surface            | Activate                                                         |
| --------------------------- | ---------------------------------------------------------------- |
| Public site or docs         | Crawl policy, sitemap, canonical URLs, structured data           |
| Substantial public docs     | llms.txt, llms-full.txt, Markdown negotiation or `.md` twins     |
| Public HTTP API             | OpenAPI, API Catalog, docs and status links                      |
| OAuth-protected resource    | Protected-resource and authorization-server metadata             |
| Remote MCP server           | Server Card and the advertised tools, resources, transport, auth |
| Published skills            | Agent Skills index, linked `SKILL.md`, digests                   |
| Page-scoped agent actions   | WebMCP registration and live behaviour                           |
| Agent-mediated commerce     | The protocol actually implemented (agentic-commerce.md)          |
| Outbound or high-trust bots | HTTP Message Signatures directory and key lifecycle              |

Anything else is not applicable: no credit, no penalty.

## Semantic validation

HTTP 200 proves nothing. For each applicable artifact check transport (status,
content type, redirects, caching), artifact (parses as the claimed format, isn't
an SPA shell, login page or placeholder) and capability (linked content
resolves; the advertised operation works where it's safe to try). Examples:
sample llms.txt links; resolve API Catalog links; JSON-LD must match what the
page visibly says; `Link` header targets must be the declared relation, not the
home page; `resources/read` on advertised MCP resources returns non-empty
content with the right MIME type; each Agent Skills URL hashes to its published
digest. If auth or mutation risk stops you, record the strongest layer reached
and lower confidence.

## Evidence to gather

- `/llms.txt`, `/llms-full.txt`, `/robots.txt`, `/sitemap.xml`, and every
  `/.well-known/` path below.
- `application/ld+json` in layouts and page templates.
- `curl -H 'Accept: text/markdown'` on a docs page: Markdown body,
  `Vary: Accept`, optional `x-markdown-tokens`. Also try the `.md` twin.
- Content that only renders on interaction: glossary terms inside `<button>`,
  tab panels mounted on demand, MDX components left as raw JSX in the Markdown.
- AFDocs for docs sites: `npx afdocs check <url> --format json` (or `--urls`
  against a local build). It implements the Agent-Friendly Documentation Spec
  (draft v0.6.0, 28 checks) and powers Fern's and Mintlify's agent scores.
  Hosted reports sample about 15 unnamed pages; the JSON gives per-page
  evidence. Cite `markdown-content-parity`, `content-start-position`,
  `llms-txt-directive-html`, `llms-txt-directive-md` and
  `markdown-link-portability`. House parity bar: under 5% of content segments
  missing from the Markdown twin. `data-markdown-ignore` (an AFDocs convention)
  marks intentional human-only elements. Page checks don't apply to non-page
  llms.txt targets such as OpenAPI files.
- Other scanners are dated, outside-in evidence, never a score to copy. Is
  Agentic (Vercel, powered by Ora's checks; also an API, CLI and MCP).
  AgentReady v2.0 defines requirement IDs (`AR-FIND-*`, `AR-READ-*`,
  `AR-ACT-*`) and no scoring, so cite IDs. Lighthouse 13.3+ has an experimental
  `agentic-browsing` category (`--only-categories=agentic-browsing`).
  Cloudflare's scan returned 23 checks on 2026-10-29. Ora's crawler-policy
  check never penalises blocking training bots. Never submit private,
  authenticated or pre-release URLs to a public scanner.

## Facts and formats

**llms.txt** (llmstxt.org) is an inference-time link index, not an SEO or
citation signal. H1 title, optional one-paragraph `>` summary, H2 sections of
`- [Title](url) — description`. Generate it from the docs source. llms-full.txt
has no size limit in the proposal, but large files exceed client fetch limits:
pick a budget (around 30k tokens) and split by section past it. Put an llms.txt
pointer near the start of every page. Per-locale llms.txt files should agree
with `hreflang` and the locale in Markdown paths.

**Markdown negotiation.** Parse `Accept` with q-values: a substring test serves
Markdown to `text/markdown;q=0`. Send `Vary: Accept` on both variants, and
check the deployed, cached response keeps existing `Vary` dimensions too. Next.js
16 renamed `middleware.ts` to `proxy.ts` (function `proxy`); route `params` is a
promise; a folder named `_md` is private and not routable. llms.txt v2 accepts
`page.html.md` or `page.md` and discovery via `rel="alternate"
type="text/markdown"`. Cloudflare Markdown for Agents converts at the edge (2 MB
HTML limit) and keeps origin `Content-Signal` and `Vary`; prefer origin-served
Markdown when you own the pipeline. An agent-mode page view (`?mode=agent`) is a
separate pattern; build it only when the value is action links.

**robots.txt.** Without a matching rule a path is allowed (RFC 9309), so silence
is a policy. Decide search, user-initiated retrieval and training separately.
Training: `GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`,
`Meta-ExternalAgent`. Search: `OAI-SearchBot`, `Claude-SearchBot`,
`PerplexityBot`. User fetch: `ChatGPT-User`, `Claude-User`. `Google-Extended`
is a robots token with no HTTP user agent; it covers Gemini training and
grounding, and Google and Apple say blocking their `-Extended` tokens doesn't
affect Search. Microsoft's training bots honour only `NOARCHIVE` for now.
Cloudflare splits Search, Agent and Training (live 2026-07-01), syncs dashboard
choices into robots.txt (from 2026-08-21) and defaults Training to Disallow on
ad-monetised pages of new domains (from 2026-09-15).

**Content Signals** (contentsignals.org) declare use after access:
`Content-Signal: search=yes, ai-input=yes, ai-train=no` in robots.txt or a
header. Allowing a fetch while declining `ai-input` can be deliberate; it's a
defect only when it contradicts the owner's stated policy or two declarations
of the same permission disagree. RSL 1.0 attaches a price or licence; IETF
aipref (`Content-Usage`) is still drafts, so track it but don't require it.

**Web Bot Auth** signs bot requests (RFC 9421) with keys at
`/.well-known/http-message-signatures-directory`; the IETF adopted
`draft-ietf-webbotauth-httpsig-protocol` on 2026-09-01.

**JSON-LD.** `SoftwareApplication`, `WebAPI`, `TechArticle`, `FAQPage`,
`HowTo`, `Dataset` as fits. In Next.js, a layout may export only allowed names,
so keep JSON-LD helpers local or in their own module.

**API Catalog** (RFC 9727) at `/.well-known/api-catalog`, served as
`application/linkset+json;profile="https://www.rfc-editor.org/info/rfc9727"`.
It's an RFC 9264 linkset: the first entry is anchored at the catalog and lists
APIs as `item`; each API then has its own entry with `service-desc` (spec),
`service-doc`, `service-meta` and `status`. Advertise it with
`Link: </.well-known/api-catalog>; rel="api-catalog"`.

**MCP Server Card**: see mcp-servers.md. Hosted at
`<streamable-http-url>/server-card`, listed in `/.well-known/ai-catalog.json`;
`/.well-known/mcp/server-card.json` and `/.well-known/mcp.json` are
compatibility only.

**Agent Skills index** at `/.well-known/agent-skills/index.json`. The
discovery index is a proposal separate from the stable `SKILL.md` format; its
draft schema host doesn't resolve, so omit `$schema`. Each `skill-md` entry has
`name`, `type`, a `description` saying when to use it, `url` and
`digest: sha256:<hex of the exact served bytes>`. Check with
`curl -fsS <url> | shasum -a 256`; templating, line-ending conversion or a
gateway newline change the digest. Also parse the linked frontmatter.

**A2A** cards live at `/.well-known/agent-card.json` (`agent.json` is the
pre-1.0 name). v1.0 uses `supportedInterfaces`, `securitySchemes` and
`securityRequirements` (v0.3 called the last one `security`); the old
`authentication` object is obsolete. `/.well-known/ai-plugin.json` is retired:
delete it.

**ARD and AI Catalog** are separate drafts, active only when the product
publishes a resource catalog. ARD: `/.well-known/ard.json`, advertised by an
`Agentmap:` robots line, `<link rel="ard">` or DNS. AI Catalog:
`/.well-known/ai-catalog.json`, `rel="ai-catalog"`. Validate against the exact
schema revision, resolve every listed resource, and treat a `trustManifest` as
an unverified claim until issuer, expiry, subject and publisher binding check
out.

**DNS-AID** (individual draft) advertises agents via SVCB/HTTPS records under
`_index._agents`, `_a2a._agents` and `_mcp._agents`. Activate it only for a
client that supports the revision in use; missing records are not a penalty.
DNSSEC authenticates DNS data; it doesn't authorise actions.

**WebMCP** (`document.modelContext.registerTool`) is a browser draft for
page-scoped tools, distinct from remote MCP and the old `webmcp.dev` library.

**NLWeb** `/ask` (`query` required, `streaming` defaults to true) returns ranked
schema.org results in `list` mode; `answer` fields exist only in `summarize` or
`generate` mode. `score` is relevance, not probability.

**Also worth having:** a dated changelog feed (RSS or Atom with specific
entries), a status page linked from the API Catalog, and a standalone agent
terms-of-use page linked from llms.txt and the API docs. No scanner checks
these.

## Templates

- `templates/discovery/llms.txt`, `templates/discovery/llms-full.txt`
- `templates/discovery/robots-ai.txt`
- `templates/discovery/json-ld-softwareapp.ts`
- `templates/discovery/content-negotiation.ts`
- `templates/discovery/api-catalog.json`
- `templates/discovery/agent-skills-index.json`
- `templates/mcp-and-api/mcp-server-card.json`
- `templates/mcp-and-api/agent-card.json`
