# Changelog

All notable changes to Agent Surface are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [2.3.0] — 2026-08-27

### Added

- Canonical WebMCP guide covering the current `document.modelContext` Community Group draft, Chrome implementation status, security boundaries, remote-MCP distinction, and the separate `webmcp.dev` library
- Is Agentic coverage across the tooling catalog, scoring guidance, reference index, and distributable skill, including Agent Skills discovery v0.2, per-signal applicability, semantic capability validation, and an explicit outside-in-scan versus source-audit boundary
- August 2026 currency and relevance review (`docs/currency-review-2026-08-27.md`)

### Changed

- MCP guidance now targets the shipped `2026-07-28` revision and treats `2025-11-25` as compatibility-only; corrected Tasks extension methods and optional `server/discover`
- Google example default updated to Gemini 3.7 Flash; Anthropic Opus 4.1 retirement recorded as complete
- Compatible dependency ranges refreshed, including Next 16.3, React 19.2.8, Fumadocs 16.15, MCP SDK 1.30, Tailwind 4.3.3, and shadcn 4.19
- Confirmed stale external references migrated to current Promptfoo, LangGraph, Claude Code, Copilot, Bun, OpenAI, Google, and MCP destinations
- Agent Skills discovery now publishes canonical `skill-md` URLs with exact-byte SHA-256 digests, enforced by the docs integrity gate

### Fixed

- Removed dead A2A and MCP server-card `$schema` URLs instead of advertising schemas that no longer resolve
- Reverified the stale docs-coverage audit against the current Mastra topic map

## [2.2.0] — 2026-07-28

The July 2026 currency review: a full-repository audit and remediation on the day the MCP 2026-07-28 revision reached its scheduled final publication. Also closes out the reference-upgrade program that began 2026-07-06.

### Added

- MCP 2026-07-28 revision coverage across docs and the skill: stateless core, sessions removal, `server/discover`, `subscriptions/listen`, multi round-trip requests, Tasks and MCP Apps as official extensions, Roots/Sampling/Logging deprecations with migration paths, and the six authorization changes including the RFC 7591 DCR deprecation
- Eight ecosystem patterns: standing objectives (`runtime-boundaries/durable-execution`), signal providers (`cookbook/notification-to-conversation`, proactive-agents discipline), LSP inspection as a workspace surface (`agents/sandboxes-and-workspaces`), runtime Agent Skills consumption (`discovery/agent-skills`), Agent Client Protocol as a delegation interface (`protocols/acp`), OpenUI (`protocols/emerging-standards`), deterministic evaluation checks (`testing/metrics`), and in-framework messaging channels (`cookbook/external-app-routing`)
- Integrity gate extensions: model-ID drift check now scans `skills/surface/`; new server-card/package version-parity check; `docs:check` runs in `build` with freshness non-fatal (`--no-freshness`)
- Currency review briefing document (`docs/currency-review-2026-07-28-briefing.md`)
- Two writer agents: `tool-design-writer` and `multi-agent-writer` (`skills/surface/agents/`)
- Two templates: `errors-and-auth/rate-limit-headers.ts` and `tools-and-orchestration/memory-bank.ts`
- Template-path existence check in the docs-integrity script, so template references are verified in CI
- The 2026-07-06 reference-upgrade plan's workstream D (new 2026 coverage): agentic-ui session control and MCP Apps pages, `agents/sandboxes-and-workspaces`, `cookbook/code-execution` orchestration pattern, `testing/datasets-and-experiments`, procedural-memory guidance in `multi-agent/memory-patterns`, and Cloudflare Monetization Gateway coverage for x402 and crawler economics in `protocols/agentic-commerce`

### Changed

- Model roster refresh across docs, skill, and templates: Anthropic Opus 5 (2026-07-24), OpenAI GPT-5.6 family Sol/Terra/Luna (2026-07-09), Google Gemini 3.6 Flash (2026-07-21); ~100 stale model IDs replaced against the canonical list
- `robots-ai.txt` template now blocks training crawlers by default, matching the reference guidance and the site's own `robots.ts`, leads with a Content-Signal line, and keeps `.well-known/` discovery JSON crawlable
- Softened pricing claims in docs and skill references to ranges rather than point figures; corrected the OpenAI large-embedding price ($0.13/1M, not $0.02/1M)
- Version reconciliation: Arazzo 1.1.0, OAuth 2.1 draft-15, A2A v1.0.1, MCP TypeScript SDK 1.x (not "v2.x")
- AGENTS.md length guidance now carries two labeled numbers: <370-line audit tolerance vs ~150/<300 authoring target
- Legacy documentation URLs migrated: docs.anthropic.com → platform.claude.com / code.claude.com, sdk.vercel.ai → ai-sdk.dev, docs.cursor.sh → docs.cursor.com, tools.ietf.org → datatracker.ietf.org
- Re-pathed template references in the skill to match the kit layout under `templates/`
- Renamed the `readiness-auditing` discipline and de-orphaned it from the guide set
- Rewrote this changelog to reflect the project's actual history (see below)
- The 2026-07-06 reference-upgrade plan's workstreams B (currency sweep) and C (reorg + dedup): refreshed the tooling-catalog rows (`capability-map`, `frameworks-and-runtimes`, `browser-sandbox-and-integration`) and `discovery/well-known-endpoints` and `discovery/robots-txt` for July 2026

### Fixed

- SDK import paths in MCP templates verified against the installed package: `StreamableHTTPServerTransport` from `server/streamableHttp.js` (the previous `HttpServerTransport`/`server/http.js` never existed), `StdioServerTransport` from `server/stdio.js`, `InMemoryTransport` from package-root `inMemory.js`, `McpServer` in `mcp-server-public.ts`, and type imports from `types.js`
- Hardened the site's `/api/md` route against path traversal via a shared `src/lib/docs-fs.ts` helper
- Repaired phantom citations: the invented "toolpick" SDK docs page (now cites the real `filterActiveTools`), a fake `docs.anthropic.com/agents` URL, a mis-dated Simon Willison link, and the `claude.code.com` typo
- Removed the dead `AnimatedScorecard` component
- Wrong package name `@pinecone-client/web` → `@pinecone-database/pinecone`; unpublished `npm install -g agentsurface` instruction → `npx skills add`

---

## [2.1.0] — 2026-07-07

Site productionization and the first phase of the complete reference-upgrade program: a canonical model-ID list with CI enforcement, a `lastVerified` staleness system, and a July 2026 currency and coverage sweep across the docs, plus a homepage redesign and packaging alignment across the plugin surfaces.

### Added

- Agentic glossary with an animated card-to-overlay treatment
- Homepage redesign: navigation header, animated scorecard, agentic primitives section, theme switcher, author attribution
- Production-readiness essentials for agentsurface.dev: generated `llms.txt`, the `docs/surface` audit-history index, and full-content search shared by the search API and the MCP tool
- Canonical model-ID list (`reference-links/models.mdx`) with a model-ID integrity check in `scripts/check-docs-integrity.mjs`
- `lastVerified` frontmatter staleness enforcement and stamp rendering, applied across fast-decay pages (models, MCP, protocol statuses)

### Changed

- Aligned plugin version, naming, and install commands across `.claude-plugin/plugin.json`, `.skill.yaml`, and docs
- Refreshed framework and tooling references, and MCP/A2A/ACP protocol statuses, OTel/llms.txt/auth.md/Promptfoo statuses, and the Anthropic platform page to July 2026
- Reorganized docs to remove duplicate coverage: merged idempotency and dynamic-tool-selection into canonical homes, merged MCP auth/annotations/auto-generation into canonical homes, merged agent-extensions into `rfc-9457`, and split `emerging-standards`
- Aligned Node (`>=24.15.0`) and pnpm (`11.5.2`) versions across the workspace

### Fixed

- Formatter-stable ACP disambiguation callout
- pnpm v10 build-script allowlist (`esbuild`, `sharp`) and explicit dependencies (`zod`, `@radix-ui/react-scroll-area`) for Vercel builds

---

## [2.0.0] — 2026-04-19

Consolidated the two earlier skills (`agentify` and `agents`) into a single unified `surface` skill covering guide, audit, and scaffold workflows. Version `2.0.0` is recorded in both `.claude-plugin/plugin.json` and `.skill.yaml`.

### Added

- Unified `surface` skill (guide / audit / scaffold) replacing the separate `agentify` and `agents` skills
- Next.js + Fumadocs documentation site with 19 sections and 141 MDX pages under `src/content/docs/`
- 7 template kits under `templates/` (`cli-and-evals`, `cookbook`, `data-retrievability`, `discovery`, `errors-and-auth`, `mcp-and-api`, `tools-and-orchestration`) — 59 template files in total
- 11 scoring agents (`score-*`) and 10 writer agents under `skills/surface/agents/`
- 7 discipline guides under `disciplines/` (agentic patterns, evaluation, orchestration, proactive agents, readiness auditing, retrievability, tool design)
- Agent-discovery surfaces served by the site: an MCP server (`/mcp`), `llms.txt` and `llms-full.txt`, a served `AGENTS.md`, and `.well-known/` endpoints for agent-skills and MCP
- Agentic glossary with an animated card-to-overlay treatment
- Neutral design system applied across the homepage and docs

---

## [1.0.0] — 2026-04-17

Initial release as the `agentify` plugin: a Claude Code plugin with a cookbook, discipline guides, and agent scaffolding, plus a docs scaffold.
