---
name: surface
description: Make software legible to agents. Use when asked for Agent Surface guidance, agent-readable software, agent readiness, AGENTS.md/llms.txt/MCP/OpenAPI/CLI/tool surfaces, agent protocols, audits or scorecards, transformation plans, or scaffolding a discovery/API/CLI/MCP/tool/retrieval surface and its evaluation harness.
---

# Surface

Make software easier for agents to discover, understand, call, recover from, and be
evaluated against. This skill is product-side and framework-neutral: it improves the
contact points agents use to reach existing software, not the internals of an agent you are
building. For agent-internal architecture (frameworks, orchestration, memory, model routing,
an agent's own retrieval/RAG pipeline), see the agent-building inventory at `/docs/agents`
and `/docs/agent-retrieval` - that inventory sits outside this skill.

Surface has three routes:

- **Guide**: explain agent-surface concepts, standards, and implementation patterns.
- **Audit**: detect project surfaces, score agent readiness, produce findings, and write transformation plans (plan and transform are Audit modes, not separate routes).
- **Scaffold**: create or extend agent surfaces (discovery files, API/CLI/MCP surfaces, tool contracts, retrieval endpoints) and the evaluation harnesses that verify them.

Use the existing project shape first. Read files before making claims or generating code.

## Quick Routing

| User asks for                                                               | Route                                                               |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| explain, compare, choose, best practice, reference, guide, standards        | Guide                                                               |
| audit, score, assess, agent-ready, agent-readiness                          | Audit                                                               |
| plan, transform, improve, fix agent DX                                      | Audit, then optionally execute                                      |
| add MCP, create llms.txt, write AGENTS.md, improve discovery                | Audit single-area transform unless they ask for direct generation   |
| scaffold an API/CLI/MCP/tool/search surface, init agent-surface conventions | Scaffold                                                            |
| ambiguous "make this agentic"                                               | Start with Audit unless they clearly want a new agent surface built |

If the user explicitly wants a direct artifact, do not force a full audit. Do a narrow detection pass, create the artifact, and explain the skipped audit scope.

If the user wants agent-internal architecture built (an agent, an orchestration workflow, durable memory, model routing, or a RAG/retrieval pipeline for an agent's own knowledge), say that this skill covers the product's surface, not agent internals, and point to `/docs/agents` and `/docs/agent-retrieval`.

## Modes

Guide modes:

- `concept`: explain an agent surface, protocol, pattern, or tradeoff.
- `decision`: recommend a surface design or protocol choice.
- `reference`: point to canonical docs, standards, and Agent Surface pages.

Audit modes:

- `score`: quick scorecard only.
- `plan`: scorecard, findings, and transformation plan.
- `transform`: plan plus execution after explicit confirmation.
- `--dimension=<name>`: score one dimension only.
- `--format=json`: return structured JSON as well as, or instead of, prose when useful.

Scaffold modes:

- `init`: initialize baseline agent-surface conventions (AGENTS.md, llms.txt, `.well-known`).
- `api`: scaffold or upgrade API descriptions for agent tool generation.
- `cli`: scaffold or upgrade CLI JSON output, schema introspection, exit codes.
- `mcp`: scaffold or extend an MCP server exposing existing capabilities.
- `tool <name>`: create or refine one typed tool contract exposed to agents.
- `test-harness`: scaffold an evaluation harness that validates a surface (MCP conformance tests, CLI contract tests, retrievability evals, or a browser-driven task test).

## Required Context Discipline

1. Start by detecting the project type, package manager, framework, runtime, and existing agent surfaces.
2. Use fast file discovery (`rg`, `rg --files`, `find`) and read the important files. Do not infer from filenames alone.
3. Keep findings evidence-based. Cite paths and line numbers where possible.
4. Prefer project-native conventions over generic templates.
5. Treat destructive, authenticated, and production operations as high-risk. Require clear confirmation before executing them.
6. Preserve user edits. Do not overwrite existing AGENTS.md, CLAUDE.md, llms.txt, or MCP server files without reading and merging.

## Guide Workflow

Use guide mode when the user wants agent information, standards context, or surface design guidance without asking to modify a project.

1. Identify whether the user needs concepts, a decision, or implementation guidance.
2. Prefer the docs site when available: `src/content/docs/` is the canonical Agent Surface guide.
3. Read only the relevant docs pages. Start with section indexes, then load leaf pages as needed.
4. Keep answers dense and decision-oriented. Name tradeoffs, failure modes, and adjacent surfaces.
5. For fast-moving standards, tools, and vendor platforms, verify current primary sources before making "latest", "current", or "recommended" claims.

High-signal guide entry points:

| Need                             | Docs path                                                     |
| -------------------------------- | ------------------------------------------------------------- |
| Start or route through the guide | `src/content/docs/getting-started.mdx`                        |
| Expose capabilities to agents    | `api-surface/`, `tool-design/`, `cli-design/`, `mcp-servers/` |
| Make software discoverable       | `discovery/`, `context-files/`                                |
| Secure and recover               | `authentication/`, `error-handling/`                          |
| Retrieval and structured content | `retrievability/`                                             |
| Rich UI for agent clients        | `agentic-ui/`                                                 |
| Let agents buy from you          | `agentic-commerce/`                                           |
| Verify behavior                  | `testing/`, `scoring/`                                        |
| Standards                        | `protocols/`, `reference-links/`                              |

The agent-building inventory (`agents/`, `agent-retrieval/`, `tooling-catalog/`) is a
secondary reference outside the core guide - point users there explicitly rather than
folding it into a guide answer about the product's own surface.

## Audit Workflow

Read `references/audit-workflow.md` before running a full audit, scorecard, plan, or transform.

Also load dimension references only when needed:

| Dimension       | Reference                      |
| --------------- | ------------------------------ |
| API Surface     | `references/api-surface.md`    |
| CLI Design      | `references/cli-design.md`     |
| MCP Server      | `references/mcp-servers.md`    |
| Discovery & AEO | `references/discovery-aeo.md`  |
| Authentication  | `references/authentication.md` |
| Error Handling  | `references/error-handling.md` |
| Tool Design     | `references/tool-design.md`    |
| Context Files   | `references/context-files.md`  |
| Testing         | `references/testing.md`        |
| Retrievability  | `references/retrievability.md` |

Load `references/agentic-commerce.md` alongside the relevant dimension references above when the audited project has an agent-mediated commerce surface (storefront, marketplace, or purchasable product/service) - it is cross-cutting guidance, not an eleventh dimension.

Do not load every reference at once. Load the workflow reference first, then only the relevant dimension files.

### Audit Detection Checklist

Gather these surfaces before scoring:

- Stack files: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `deno.json`, `bun.lockb`, lockfiles.
- API specs/routes: OpenAPI, Swagger, `app/api`, `pages/api`, route handlers, controllers.
- CLI: `bin` field, command entrypoints, argument parsers, TTY/output handling.
- MCP: `.mcp.json`, `.mcp/mcp.json`, `@modelcontextprotocol/sdk`, `mcp-handler`, server transports, protocol version, roots, sampling, elicitation, and task support.
- Discovery: `AGENTS.md`, `CLAUDE.md`, Cursor/Copilot/Windsurf rules, `llms.txt`, `llms-full.txt`, `robots.txt`, `sitemap.xml`, `.well-known`.
- Agent web readiness: Markdown content negotiation, JSON-LD, OpenAPI links, API catalog, MCP metadata, OAuth protected-resource metadata.
- Auth: OAuth, API keys, bearer/JWT validation, scopes, token exchange, env-var handling.
- Tools: typed tool/function-calling definitions the product exposes for agents to call.
- Retrievability: search/query endpoints, pagination and freshness contracts, structured content, feeds.
- Tests/evals: unit, integration, MCP transport tests, CLI contract tests, task-level evals, CI.

For Discovery & AEO, activate optional checks only when the corresponding surface is detected. For example, require Agent Skills discovery only when skills are published, MCP metadata only for a remote MCP server, OAuth metadata only for protected resources, and commerce manifests only for a commerce flow. Validate the returned content and linked capability, not merely the presence of a file or an HTTP 200 response.

### Scoring Rules

- Score each applicable dimension from 0-3.
- Mark a dimension N/A only when the project genuinely cannot expose that surface.
- Within an applicable dimension, mark individual signals not applicable when their activating capability is absent; do not turn an optional protocol into a penalty.
- Derive the final rating from the scaled score out of 30, not the raw score.
- Score current implementation, not intent or roadmap.
- Be conservative when evidence is partial.
- If delegation is available and appropriate, score independent dimensions in parallel using the specialist scoring prompts in `agents/score-*.md`. If not, score locally with the same output format.

For the exact scorecard, finding, plan, and delta formats, use `references/audit-workflow.md`.

## Scaffold Workflow

Read `references/scaffold-workflow.md` before generating or extending an agent surface. It
covers Phase 0 detection, shared scaffolding rules, and every mode (`init`, `api`, `cli`,
`mcp`, `tool`, `test-harness`) in full - this skill no longer ships separate per-mode
reference files, since scaffolding stays inside a project's existing framework and
conventions rather than a house stack.

### Scaffold Principles

1. **Surfaces over internals**: scaffold what an external agent calls (API, CLI, MCP, tool contract, search endpoint), not the calling agent's own architecture.
2. **Typed contracts**: every scaffolded surface gets typed input/output schemas and documented error shapes.
3. **Identity stays server-side**: never accept user/tenant identity as a tool or API parameter; resolve it from authenticated request context.
4. **Eval hooks ship with the surface**: every scaffold includes the first test/eval that verifies it works, not a follow-up task.
5. **High-risk surfaces need policy**: authenticated, destructive, and production-facing surfaces need confirmation gates, scoping, and audit logging.
6. **Browser/sandbox only to validate**: use a browser or sandboxed run to build a test harness that proves a surface works end to end; do not scaffold general-purpose browser or code-execution capability here.

When execution would benefit from focused specialist instructions, load only the matching prompt from `agents/*.md`. These files are task resources, not required context for ordinary guide, audit, or scaffold routing.

## Interaction Pattern

For guide requests:

1. Present the relevant concept, decision rule, or comparison.
2. Link the answer to the right Agent Surface section or primary standard.
3. Mention what would change if the user moves from learning to implementation.

For audits:

1. Present detected stack and surfaces.
2. Score the applicable dimensions.
3. For a full audit, file the findings as a Linear issue on the repo's team, titled `Surface audit: <repo> <YYYY-MM-DD>`, with the scorecard as its first comment. Never write audit files into the repo.
4. For plan mode, file the plan as a Linear issue with one sub-issue per task.
5. Ask before executing transform work.

For scaffolds:

1. Present detected stack and existing surfaces.
2. Ask only the missing decisions needed to generate useful code.
3. Preview file changes and key decisions.
4. Generate narrowly scoped files.
5. Register/export/wire the new code.
6. Run or suggest the project's typecheck/test command according to the user's permissions and repo norms.

## Output Files

Use these defaults unless the project already has a better convention:

- Audit report, scorecard history and transformation plan: Linear issues on the repo's team, never markdown in the repo. The scorecard lives as comments on the audit issue so re-audits can diff it.
- Agent context: `AGENTS.md` at repo root
- Web discovery: `public/llms.txt`, `public/llms-full.txt`, or framework-equivalent routes
- MCP discovery/auth: `.mcp.json`, `.mcp/mcp.json`, and `.well-known/*` where applicable

## Edge Cases

- **Monorepo**: offer per-package scoring and aggregate scoring; do not flatten package-specific context.
- **Polyglot repo**: score each exposed surface in its native language; report the weakest user-facing path.
- **Pure CLI**: Discovery & AEO may be N/A, but Context Files, CLI Design, Error Handling, Testing, and MCP still matter.
- **No web presence**: do not penalize for missing public `llms.txt`; consider repo-local context files and package metadata instead.
- **Existing generated context**: improve it surgically; avoid replacing hard-won local notes.
- **Re-audit**: read the previous `Surface audit` issue's scorecard comment and show deltas.
- **Transform mode**: execution requires explicit user confirmation after the plan.

## Current Standards Notes

- AGENTS.md is a Markdown convention for project-specific agent instructions and the single project instruction file to maintain. Claude Code (v2.1.277+) reads it directly when no CLAUDE.md/CLAUDE.local.md exists on the path; most repos need nothing else. Add a CLAUDE.md only when Claude Code needs instructions no other tool should see, and start it with a literal `@AGENTS.md` import so Claude Code still loads AGENTS.md too - a CLAUDE.md that only says "see AGENTS.md" in prose does not load it. Keep other tool-specific files (`.cursor/rules`, `.github/copilot-instructions.md`) as thin overlays that reference AGENTS.md rather than restating it.
- `llms.txt` is a useful Markdown discovery convention for inference-time retrieval, not a guaranteed SEO or citation signal. Pair it with crawlable docs, structured data, sitemap, and stable canonical URLs.
- MCP `2026-07-28` is the current revision and all Tier 1 SDKs support it. It removes sessions and the initialize handshake, offers optional `server/discover`, adds `subscriptions/listen`, moves Tasks into an official extension, and deprecates roots, sampling, and logging. Audit against `2026-07-28`; retain `2025-11-25` compatibility only when an actual client requires it. Check tools, resources, prompts, negotiated extensions, Streamable HTTP, per-request protocol metadata, and explicit state handles where relevant.
- WebMCP is a separate browser-native draft for page-scoped tools through `document.modelContext`. Do not confuse it with remote MCP or the older `webmcp.dev` JavaScript library.
- Remote protected MCP servers should publish OAuth protected-resource metadata using RFC 9728, point clients to authorization-server metadata, and validate issuer, audience/resource, expiry, and scopes on every protected request. DPoP (RFC 9449) is a separate sender-constraining mechanism, not part of the MCP authorization spec itself; only claim DPoP support when the server actually implements RFC 9449, not because it is MCP-protected.
- MCP tool descriptions and annotations are advisory hints, not authorization policy. Treat them as untrusted unless the server is trusted, and enforce approvals, auth, and scope checks in the server or workflow.
- MCP tools should provide input schemas, `outputSchema` plus `structuredContent` for structured results, annotations, resource links where useful, and structured recoverable errors.
- Anthropic guidance changes quickly. For Claude-native surfaces, check Claude Platform release notes for current model IDs, context limits, and beta headers before hard-coding recommendations.

## Useful References

- AGENTS.md format: https://agents.md
- llms.txt proposal: https://llmstxt.org
- MCP specification: https://modelcontextprotocol.io/specification
- OAuth Protected Resource Metadata (RFC 9728): https://www.rfc-editor.org/rfc/rfc9728.html
- DPoP (RFC 9449): https://www.rfc-editor.org/rfc/rfc9449.html
- Claude Platform release notes: https://platform.claude.com/docs/en/release-notes/overview
- Agent Surface retrievability guide: /docs/retrievability
- Agent Surface agent-building inventory: /docs/agents, /docs/agent-retrieval
- Agent Surface disciplines (longer-form design guidance): `disciplines/`

## Skill Folder Structure

- `SKILL.md`: trigger metadata and core routing workflow.
- `references/`: detailed audit and scaffold references. Load only the relevant file.
- `agents/openai.yaml`: UI metadata generated for skill listings.
- `agents/*.md`: specialist task prompts for scoring and targeted transformations. Load only when delegating or executing that specialty.

## Public product audits

For websites and integrations, read `references/product-journeys.md` alongside the relevant dimension references. Start from a real user task, verify authoritative decision facts, follow the intended interface and permission boundary, exercise recovery, and inspect the final result. Apply findings to the existing Surface rubric; use external reports as supporting evidence.
