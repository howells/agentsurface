# Notes Audit - 2026-04-18

Scope: Markdown and MDX notes across `src/content/docs`, `docs`, `disciplines`, `skills`, `templates`, `README.md`, `INSTALL.md`, and `AGENTS.md`.

The repo has strong raw material: about 247k words of notes, references, templates, and published docs. The main issue is not lack of content. The issue is structure, drift, and some pages carrying older assumptions after the recent Agent Skills, MCP, Cloudflare, and Agent Surface work.

## Highest Priority

| Area | Status | Why It Matters | Suggested Work |
|---|---|---|---|
| Main docs navigation | Fixed in this pass | `context-files`, `cookbook`, `data-retrievability`, and `tool-design` existed as substantial doc sections but were not listed in `src/content/docs/meta.json`. They were effectively hidden from the primary docs nav. | Keep these sections visible and review nav order as the product story settles. |
| README / install story | Fixed in this pass | `README.md` and `INSTALL.md` mostly framed the repo around `agentify`. `AGENTS.md` already said there are two capabilities: `agentify` and `agents`. | Keep both skills first-class as the product story evolves. |
| CLI SKILL.md docs | Fixed in this pass | `src/content/docs/cli-design/agent-knowledge-packaging.mdx` and `src/content/docs/cli-design/schema-introspection.mdx` described a CLI-specific `SKILL.md` format with fields like `schema_command`, `auth`, and `invariants`. That could conflict with the Agent Skills public format. | The docs now distinguish portable Agent Skills from CLI metadata extensions. |
| MCP version assumptions | Fixed in this pass | Several pages claimed very specific MCP 2025-11-25 features: async tasks, CIMD, EMA, registry counts, SDK download counts, and Linux Foundation governance. Some were valid, some were speculative or over-precise. | Keep MCP claims tied to the official spec and date any ecosystem metrics if reintroduced. |
| `disciplines/` folder | Low integration | The discipline notes are useful but not connected to the published docs. Several duplicate public sections: evaluation vs testing, retrievability vs data-retrievability, tool-design vs tool-design docs, orchestration vs multi-agent docs. | Either promote them into docs as "principles" pages or treat them as source notes and link each one to its canonical published page. |

## Incomplete Or Hidden Notes

### Hidden Published Sections

These directories existed under `src/content/docs` but were not in the main nav:

- `src/content/docs/context-files`
- `src/content/docs/cookbook`
- `src/content/docs/data-retrievability`
- `src/content/docs/tool-design`

These are not low-value. They are among the stronger areas of the repo. They have now been added to the main nav; the remaining work is deciding the ideal order and learning path.

### Thin Index Pages

Several section index pages are thin compared with their child pages. This is fine if they are only nav stubs, but they would be more useful as decision maps:

- `src/content/docs/cli-design/index.mdx` - 258 words
- `src/content/docs/api-surface/index.mdx` - 264 words
- `src/content/docs/multi-agent/index.mdx` - 310 words
- `src/content/docs/error-handling/index.mdx` - 322 words
- `src/content/docs/discovery/index.mdx` - 324 words
- `src/content/docs/mcp-servers/index.mdx` - 351 words
- `src/content/docs/testing/index.mdx` - 368 words

Suggested pattern: each index should answer "when do I use this section?", "what are the core decisions?", and "which page should I read first?".

## Notes That Need Expansion

### Agent Skills

Current coverage exists in:

- `src/content/docs/discovery/agent-skills.mdx`
- `src/content/docs/reference-links/index.mdx`
- `src/content/docs/discovery/well-known-endpoints.mdx`
- `src/content/docs/discovery/aeo-checklist.mdx`
- `skills/agentify/references/discovery-aeo.md`

Fixed in this pass:

- Added a dedicated Agent Skills docs page.
- Clarified the relationship between `AGENTS.md`, `SKILL.md`, local skills, public Agent Skills indexes, and MCP.

Still useful later:

- Add a small example skill folder:
  - `SKILL.md`
  - `references/`
  - `scripts/`
  - `assets/`

### Cloudflare Agent-Readable Web

Current coverage exists in:

- `src/content/docs/discovery/content-negotiation.mdx`
- `src/content/docs/cookbook/cloudflare-agent-stack.mdx`
- `src/content/docs/tooling-catalog/index.mdx`
- `skills/agentify/references/discovery-aeo.md`

Needed expansion:

- Add a short "Agent Readiness signals" checklist page or section that maps scanner categories to implementation tasks.
- Clarify what is Cloudflare-specific vs generally useful web practice.
- Add implementation guidance for `.md` or `index.md` fallbacks in Fumadocs/Next.js.

### Agents Skill

Current coverage exists in:

- `skills/agents/SKILL.md`
- `skills/agents/references/*`
- `src/content/docs/agents/index.mdx`
- `README.md`
- `src/content/docs/cookbook/cloudflare-agent-stack.mdx`

Fixed in this pass:

- Added public docs for the `agents` skill.
- Updated the docs homepage and README so `agentify` and `agents` are both first-class.

Still useful later:

- Add a page explaining when to scaffold Mastra vs AI SDK vs Cloudflare Agents vs MCP-only.
- Add examples for updating existing agents, not only creating new ones.

## Low-Value Or Redundant Notes

### `disciplines/agent-evaluation.md` vs `disciplines/evaluation.md`

Both are useful, but they overlap. One is agentify-scoring oriented; the other is general eval practice. Merge, rename, or link them to avoid two "evaluation" sources of truth.

Suggested split:

- `agent-evaluation.md` -> scoring discipline for `agentify`
- `evaluation.md` -> product/runtime eval discipline

### `disciplines/retrievability.md`

Good source note, but lower value while disconnected from the much richer `src/content/docs/data-retrievability/*` section.

Suggested work: add a "principles" summary page in `data-retrievability`, then retire or link the discipline note.

### `disciplines/tool-design.md`

Good material, but public docs already have detailed tool-design pages. Keep it only if it acts as the compact canon for the skill. Otherwise fold into `src/content/docs/tool-design/index.mdx`.

### `src/content/docs/tooling-catalog/index.mdx`

High value, but too large to keep growing as a single page forever. It is already a 6k+ word catalog. Split later into:

- standards and protocols
- runtimes and frameworks
- memory and retrieval
- browser/sandbox
- eval/observability
- UI/media
- watchlist

## Stale Or Risky Claims To Verify

These are not necessarily wrong, but they should not remain unverified because they are precise and likely to drift.

| Claim Area | Files | Concern |
|---|---|---|
| MCP 2025-11-25 features | `src/content/docs/protocols/mcp.mdx`, `skills/agentify/references/mcp-servers.md`, `skills/agentify/agents/mcp-builder.md`, `src/content/docs/authentication/mcp-auth-model.mdx` | Fixed against the official spec: tasks are experimental; Client ID Metadata Documents are OAuth client registration, not `/.well-known/mcp-client.json`; EMA/CIMD shorthand was removed; auth language now uses protected-resource metadata and authorization-server discovery. |
| MCP ecosystem counts | `src/content/docs/protocols/mcp.mdx`, `src/content/docs/protocols/comparison.mdx` | Removed unsupported counts like 10,000+ servers and 97M SDK downloads/month. Reintroduce only with dated citations. |
| Legacy MCP discovery paths | `src/content/docs/cookbook/mcp-as-external-api.mdx`, `src/content/docs/discovery/well-known-endpoints.mdx`, `skills/agentify/references/discovery-aeo.md` | Fixed obvious `/.well-known/mcp` examples to prefer `/.well-known/mcp/server-card.json`, leaving `mcp.json` as compatibility language. |
| MCP 0.6 references | `src/content/docs/cookbook/index.mdx`, `src/content/docs/cookbook/mcp-as-external-api.mdx`, `src/content/docs/cookbook/tool-annotations.mdx` | Fixed obvious version shorthand to use MCP-compatible/current language. |
| Claude plugin marketplace | `src/content/docs/cookbook/mcp-as-external-api.mdx` | Fixed stale-prone "coming soon" language by replacing it with registry/directory-neutral distribution guidance. |
| OAuth/device auth in discovery checklist | `src/content/docs/discovery/aeo-checklist.mdx` | Fixed to avoid over-prescribing OAuth 2.0 Device Authorization and align with OAuth 2.1/token-exchange/host-managed auth language. |

## Needs Repositioning

### Discovery vs Context Files

There are two `agents-md.mdx` pages:

- `src/content/docs/discovery/agents-md.mdx`
- `src/content/docs/context-files/agents-md.mdx`

This can be legitimate if one is "public discovery" and one is "repo context", but the distinction should be explicit. Otherwise merge or redirect one to the other.

### Protocols vs MCP Servers

The MCP material is split across:

- `src/content/docs/protocols/mcp.mdx`
- `src/content/docs/mcp-servers/*`
- `skills/agentify/references/mcp-servers.md`

This is the right split in principle:

- protocols page = conceptual standard
- mcp-servers section = implementation
- skill reference = audit/scaffold criteria

But it needs a brief "source of truth" note so future edits do not drift.

## Concrete Backlog

1. Split or restructure the tooling catalog once it grows again.
2. Decide whether `disciplines/` is source material, published content, or archive material.
3. Expand thin index pages into decision maps.
4. Add a parity checklist that maps each skill reference file to its corresponding published docs page.

## Suggested Priority Order

Do this first:

1. Reconcile `disciplines/`.

Do this next:

2. Split the tooling catalog if it keeps growing.

Defer:

3. Expand every thin index page.
4. Add a skill/docs parity checklist.
