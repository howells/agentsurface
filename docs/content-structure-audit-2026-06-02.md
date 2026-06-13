# Agent Surface Docs Content And Structure Audit

Date: 2026-06-02

Scope: every MDX page under `src/content/docs/`, plus section `meta.json` ordering.

## Validation Summary

- `pnpm docs:check` passes.
- `pnpm build` passes and generates 149 static pages.
- Internal docs routes referenced by Markdown links are valid.
- Navigation metadata is complete: every docs directory has `meta.json`, and every sibling page is listed.
- The site is dense by design, but the navigation currently mixes four jobs: learning the topic, auditing a codebase, implementing surfaces, and browsing reference material.

## High-Level Editorial Finding

The content is strongest when it follows this pattern:

1. State the agent-facing problem in the first 150 words.
2. Give the decision rule.
3. Show the implementation shape.
4. Name failure modes.
5. Link to adjacent surfaces.

Most pages already do this. The clarity problem is not primarily prose quality. It is information architecture. Readers must know whether a topic belongs under API Surface, Tool Design, MCP Servers, Discovery, Context Files, Protocols, or Cookbook before they can find it. Those categories are all valid, but they are not one consistent mental model.

## Current Structure Assessment

Current top-level docs order:

1. Overview and starting points
2. Reference links and tooling catalog
3. Agent scaffolding and runtime surfaces
4. Audit dimensions and implementation surfaces
5. Protocols and authentication
6. Testing, multi-agent patterns, cookbook, scoring

What works:

- The audit dimensions are concrete and map well to the `surface` skill.
- Section index pages are short and scan quickly.
- Most leaf pages have a direct summary and useful checklists.
- The cookbook gives applied patterns that are more memorable than abstract reference pages.

What does not work yet:

- The site asks readers to choose between dimension labels and implementation labels too early.
- `Protocols`, `MCP Servers`, `Tool Design`, and `API Surface` overlap in ways that will confuse readers.
- `Discovery` and `Context Files` duplicate AGENTS.md-related material.
- `Data Retrievability` has several very thin pages alongside a strong RAG taxonomy page.
- `Tooling Catalog` is valuable but too large to sit as a normal docs leaf.
- Many implementation pages lack a "Related" or "Next" section, so dense reading paths stop abruptly.

## Factual Freshness Checks

These checks used current public sources on 2026-06-02.

| Area                | Current finding                                                                                                                    | Docs impact                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| MCP                 | The `modelcontextprotocol/modelcontextprotocol` repo lists release `2025-11-25` as latest.                                         | Current MCP spec claims are okay.                                                                              |
| A2A                 | Linux Foundation reported on 2026-04-09 that A2A has 150+ supporting organizations and active production deployments.              | Treat A2A as production-relevant, not merely an RC/watch item.                                                 |
| ACP                 | Stripe docs now describe ACP as an open standard created by Stripe, OpenAI, and Meta, with spec path `spec/2026-04-17`.            | Update pages saying only OpenAI + Stripe or beta 2025.                                                         |
| Arazzo              | OpenAPI latest page now shows Arazzo `v1.1.0`, not `v1.0.1`.                                                                       | Update `api-surface/arazzo-workflows` and `protocols/emerging-standards`.                                      |
| OpenTelemetry GenAI | OpenTelemetry docs still mark GenAI semantic conventions as Development and say the transition plan will be updated before stable. | Remove "stable" language from `protocols/emerging-standards` and soften `testing/observability`.               |
| auth.md             | WorkOS released auth.md on 2026-05-21 as an open protocol and Markdown discovery layer for agent registration.                     | Current auth.md coverage is timely, but should be marked new/emerging.                                         |
| AGENTS.md           | Public reporting cites Linux Foundation/AAIF adoption and roughly 60,000 public projects/frameworks.                               | AGENTS.md current claims are broadly supported, but cite the source and avoid over-claiming exact tool counts. |

Sources checked:

- https://github.com/modelcontextprotocol/modelcontextprotocol
- https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year
- https://docs.stripe.com/agentic-commerce/acp
- https://spec.openapis.org/arazzo/latest.html
- https://opentelemetry.io/docs/specs/semconv/gen-ai/
- https://workos.com/blog/agent-registration-with-auth-md
- https://www.itpro.com/software/open-source/anthropic-says-mcp-will-stay-open-neutral-and-community-driven-after-donating-project-to-linux-foundation

## Proposed Future Site Structure

Use one orientation area plus five primary guide journeys. Keep dense content, but route it by reader intent. Agent Surface should read as the go-to guide for agent-readable software and production agent systems, not as an audit tool with documentation attached. Scoring remains useful, but it becomes one way to evaluate progress rather than the site's top-level identity.

### 1. Start Here

Purpose: orient a new reader and give the shortest path to action.

Pages:

- What is Agent Surface?
- Getting Started
- Agent concepts and vocabulary
- How to use the guide
- Common implementation paths
- Glossary
- Reference Links

Move or create:

- Keep `index.mdx` and `getting-started.mdx`.
- Add a "Choose your path" page with five routes: learn the concepts, design an agent system, expose capabilities to agents, evaluate agent-readiness, and track standards/tools.
- Move `reference-links` here as a source appendix, not a primary nav item.

### 2. Agent Fundamentals

Purpose: explain the topic before asking the reader to choose an implementation surface.

Pages:

- Agent Design Principles
- Runtime Boundaries
- Framework Selection
- Protocols and Standards overview
- Tool Design overview
- Agentic UI overview

This section should answer: what is an agent system, where does it run, what does it touch, and what makes software legible to agents?

### 3. Build Agent Systems

Purpose: implementation architecture for production agents.

Sections:

- Agent Scaffolding
- Runtime Boundaries
- Agentic UI
- Multi-Agent Patterns
- Data Retrievability
- Testing and Observability
- Cookbook / Patterns

Restructure recommendation:

- Move `runtime-boundaries` near `agents`, before framework selection.
- Treat `cookbook` as "Patterns" rather than a late appendix.
- Merge very thin retrieval pages into a smaller number of stronger pages, or explicitly mark them as quick references.
- Make testing the final section in the build journey, not an isolated dimension-only area.

### 4. Expose Agent-Readable Surfaces

Purpose: one place for "make my product, API, CLI, repository, or data useful to agents."

Sections:

- API Surface
- Tool Design
- CLI Design
- MCP Servers
- Discovery and AEO
- Context Files
- Authentication
- Error Handling

Restructure recommendation:

- Keep these as dense reference chapters.
- Add a unifying intro page: "Agent-readable surfaces".
- Add cross-links from every leaf page to the matching concepts, standards, and evaluation criteria.
- Deduplicate AGENTS.md content between `discovery/agents-md` and `context-files/agents-md`.

### 5. Evaluate And Improve

Purpose: help teams assess whether their agent-facing surface actually works, without making auditing the whole site's identity.

Pages:

- Scoring Framework
- Rubric
- Evidence and grounding
- Scorecard format
- Delta scorecard
- Clustering findings
- Calibration

Then link each scoring dimension back to the guide sections:

- API Surface
- CLI Design
- MCP Servers
- Discovery and AEO
- Authentication
- Error Handling
- Tool Design
- Context Files
- Multi-Agent
- Testing
- Data Retrievability

This lets readers use the rubric after they understand the topic. A codebase audit is one workflow in the guide, not the guide's organizing metaphor.

### 6. Standards And Catalog

Purpose: reference material that changes quickly.

Sections:

- Protocols and Standards
- Tooling Catalog
- Reference Links

Restructure recommendation:

- Keep `protocols` as canonical reference.
- Split `tooling-catalog/index.mdx` into multiple catalog pages or move it to a searchable catalog route.
- Add "last verified" dates for pages with current vendor/platform claims.

## Recommended Navigation Order

Proposed `src/content/docs/meta.json` order:

```json
{
  "title": "Agent Surface",
  "pages": [
    "index",
    "getting-started",
    "---",
    "agents",
    "runtime-boundaries",
    "agentic-ui",
    "multi-agent",
    "data-retrievability",
    "testing",
    "cookbook",
    "---",
    "api-surface",
    "tool-design",
    "cli-design",
    "mcp-servers",
    "discovery",
    "context-files",
    "authentication",
    "error-handling",
    "---",
    "scoring",
    "---",
    "protocols",
    "reference-links",
    "tooling-catalog"
  ]
}
```

This keeps the current pages but turns the site into:

1. orient
2. learn agent fundamentals
3. build agent systems
4. expose agent-readable surfaces
5. evaluate and improve
6. verify standards and tools

## Section-Level Recommendations

| Section             | Status                                                                    | Recommendation                                                                                                  |
| ------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Root docs           | Clear but too brief as a router.                                          | Add a stronger "choose your path" decision table that presents Agent Surface as a guide, not an audit workflow. |
| Agents              | Clear and useful.                                                         | Move `runtime-boundaries` beside this section and make framework selection downstream of runtime choice.        |
| Runtime Boundaries  | Strong standalone page.                                                   | Promote earlier in nav.                                                                                         |
| Agentic UI          | Strong and concise.                                                       | Keep as a build-system chapter.                                                                                 |
| API Surface         | Strong but overlaps with Tool Design and MCP.                             | Keep focused on HTTP/OpenAPI contracts. Move general tool guidance to Tool Design.                              |
| Tool Design         | Strong and concise.                                                       | Make it the cross-framework tool chapter.                                                                       |
| CLI Design          | Strong.                                                                   | Add more leaf cross-links to Tool Design, Error Handling, and Context Files.                                    |
| MCP Servers         | Strong.                                                                   | Add related links to all leaves and keep MCP-specific content here.                                             |
| Discovery           | Valuable but overlaps Context Files.                                      | Split web discovery from repo context.                                                                          |
| Context Files       | Good material, but some pages are code-heavy and thin after code removal. | Deduplicate with Discovery and tighten examples.                                                                |
| Data Retrievability | Conceptually important, but uneven page depth and high freshness risk.    | Consolidate thin pages or label quick references. Add last verified dates.                                      |
| Protocols           | Important but fast-moving.                                                | Update Arazzo, ACP, A2A, OTel status language.                                                                  |
| Authentication      | Strong and timely.                                                        | Fix duplicate Summary heading and mark auth.md as emerging.                                                     |
| Error Handling      | Strong.                                                                   | Add related links to MCP/API/CLI surfaces.                                                                      |
| Testing             | Good but several pages are quick-reference length.                        | Decide whether this is an eval guide or a tool reference set.                                                   |
| Multi-Agent         | Strong applied architecture section.                                      | Keep with build-system journey.                                                                                 |
| Cookbook            | Useful, memorable, production-shaped.                                     | Promote from appendix to Patterns.                                                                              |
| Scoring             | Strong operational framework.                                             | Position as "Evaluate And Improve" after the core guide material, not as the product spine.                     |
| Reference Links     | Useful.                                                                   | Keep as source appendix.                                                                                        |
| Tooling Catalog     | Valuable but oversized.                                                   | Split or make it a separate catalog experience.                                                                 |

## Page-Level Pass

Legend:

- Keep: clear, concise enough, structurally useful.
- Tighten: prose or cross-links need work, but page should remain.
- Merge: page is too thin or overlaps another page.
- Update: factual freshness issue.
- Split: page is too large for one docs page.

| Page                                             | Verdict | Notes                                                                                    |
| ------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------- |
| `index.mdx`                                      | Tighten | Good mission statement; add stronger path routing.                                       |
| `getting-started.mdx`                            | Tighten | Useful but very short; turn into a guided triage checklist.                              |
| `agentic-ui/index.mdx`                           | Keep    | Clear, concise, good checklist.                                                          |
| `agents/index.mdx`                               | Keep    | Good scaffold entry point.                                                               |
| `agents/design-principles.mdx`                   | Keep    | Strong principles page.                                                                  |
| `agents/framework-selection.mdx`                 | Keep    | Strong, but should follow runtime boundary choice.                                       |
| `agents/anthropic-platform.mdx`                  | Update  | Fast-moving vendor page; add last verified date and related links.                       |
| `agents/browser-access.mdx`                      | Keep    | Good decision matrix.                                                                    |
| `runtime-boundaries/index.mdx`                   | Keep    | Promote in nav.                                                                          |
| `api-surface/index.mdx`                          | Tighten | Short, needs better next-step routing.                                                   |
| `api-surface/openapi-for-agents.mdx`             | Keep    | Strong practical page.                                                                   |
| `api-surface/tool-definitions.mdx`               | Merge   | Overlaps Tool Design; keep only API-specific framing here.                               |
| `api-surface/arazzo-workflows.mdx`               | Update  | Update latest Arazzo version.                                                            |
| `api-surface/openapi-extensions.mdx`             | Update  | Good page, but verify current extension examples.                                        |
| `api-surface/api-versioning.mdx`                 | Keep    | Strong agent-specific framing.                                                           |
| `api-surface/webhooks-events.mdx`                | Keep    | Clear and scoped.                                                                        |
| `tool-design/index.mdx`                          | Keep    | Good section overview.                                                                   |
| `tool-design/naming-and-descriptions.mdx`        | Keep    | Strong, concise.                                                                         |
| `tool-design/schemas.mdx`                        | Keep    | Strong.                                                                                  |
| `tool-design/idempotency-and-safety.mdx`         | Keep    | Strong.                                                                                  |
| `tool-design/tool-curation.mdx`                  | Keep    | Useful and concise.                                                                      |
| `tool-design/cross-framework-portability.mdx`    | Keep    | Good architecture pattern.                                                               |
| `tool-design/token-budget.mdx`                   | Keep    | Useful agent-specific material.                                                          |
| `tool-design/anti-patterns.mdx`                  | Keep    | Good quick-reference page.                                                               |
| `cli-design/index.mdx`                           | Tighten | Add next-step links.                                                                     |
| `cli-design/command-structure.mdx`               | Keep    | Strong.                                                                                  |
| `cli-design/machine-readable-output.mdx`         | Keep    | Strong.                                                                                  |
| `cli-design/raw-payload-input.mdx`               | Keep    | Strong.                                                                                  |
| `cli-design/schema-introspection.mdx`            | Keep    | Strong.                                                                                  |
| `cli-design/context-window-discipline.mdx`       | Keep    | Strong.                                                                                  |
| `cli-design/input-hardening.mdx`                 | Keep    | Strong.                                                                                  |
| `cli-design/safety-rails.mdx`                    | Keep    | Strong.                                                                                  |
| `cli-design/agent-knowledge-packaging.mdx`       | Keep    | Useful bridge to context files and skills.                                               |
| `cli-design/cli-scale.mdx`                       | Keep    | Good scoring aid.                                                                        |
| `mcp-servers/index.mdx`                          | Tighten | Add related links and stronger section decision tree.                                    |
| `mcp-servers/architecture.mdx`                   | Keep    | Clear.                                                                                   |
| `mcp-servers/tool-best-practices.mdx`            | Keep    | Strong MCP-specific tool page.                                                           |
| `mcp-servers/resources-prompts.mdx`              | Keep    | Clear.                                                                                   |
| `mcp-servers/transports.mdx`                     | Keep    | Clear.                                                                                   |
| `mcp-servers/authentication.mdx`                 | Update  | Verify OAuth language against latest MCP auth spec.                                      |
| `mcp-servers/annotations.mdx`                    | Keep    | Clear.                                                                                   |
| `mcp-servers/testing.mdx`                        | Keep    | Clear.                                                                                   |
| `mcp-servers/nextjs-integration.mdx`             | Update  | Vendor/tooling page; add last verified date.                                             |
| `mcp-servers/auto-generation.mdx`                | Keep    | Strong warning against naive generation.                                                 |
| `mcp-servers/real-world-examples.mdx`            | Update  | Public server behavior changes; add last verified date.                                  |
| `discovery/index.mdx`                            | Tighten | Needs web-discovery vs repo-context distinction.                                         |
| `discovery/llms-txt.mdx`                         | Update  | Make adoption/support claims conservative.                                               |
| `discovery/agents-md.mdx`                        | Merge   | Overlaps `context-files/agents-md`. Keep one canonical AGENTS.md page.                   |
| `discovery/agent-skills.mdx`                     | Keep    | Concise and useful.                                                                      |
| `discovery/structured-data.mdx`                  | Update  | Validate AI Overview and JSON-LD impact claims.                                          |
| `discovery/content-negotiation.mdx`              | Keep    | Clear.                                                                                   |
| `discovery/well-known-endpoints.mdx`             | Update  | Fast-moving draft standards. Add last verified date.                                     |
| `discovery/robots-txt.mdx`                       | Update  | Keep training vs retrieval split, cite current crawler names.                            |
| `discovery/content-structure.mdx`                | Keep    | Good content guidance.                                                                   |
| `discovery/aeo-checklist.mdx`                    | Split   | Long checklist; consider tier pages or accordion/checklist component.                    |
| `context-files/index.mdx`                        | Keep    | Good dimension page.                                                                     |
| `context-files/agents-md.mdx`                    | Merge   | Make this the canonical AGENTS.md page and link from Discovery.                          |
| `context-files/claude-md.mdx`                    | Keep    | Good overlay framing.                                                                    |
| `context-files/cursor-and-copilot.mdx`           | Keep    | Useful but verify current tool behavior periodically.                                    |
| `context-files/monorepos.mdx`                    | Tighten | Thin after examples; add more decision guidance or merge into AGENTS.md.                 |
| `context-files/drift-detection.mdx`              | Keep    | Useful and practical.                                                                    |
| `context-files/anti-patterns.mdx`                | Keep    | Strong.                                                                                  |
| `data-retrievability/index.mdx`                  | Update  | High freshness risk; add last verified date.                                             |
| `data-retrievability/rag-patterns.mdx`           | Keep    | Strong taxonomy page.                                                                    |
| `data-retrievability/embeddings.mdx`             | Update  | Current model/leaderboard claims need dated verification.                                |
| `data-retrievability/multimodal-embeddings.mdx`  | Update  | Current model claims need dated verification.                                            |
| `data-retrievability/chunking.mdx`               | Merge   | Too thin; fold into RAG patterns or make a quick-reference card.                         |
| `data-retrievability/vector-databases.mdx`       | Update  | Vendor/cost claims need verification.                                                    |
| `data-retrievability/hybrid-search.mdx`          | Merge   | Too thin; combine with RAG patterns or retrieval pipeline page.                          |
| `data-retrievability/reranking.mdx`              | Merge   | Too thin; combine with retrieval pipeline.                                               |
| `data-retrievability/knowledge-graphs.mdx`       | Update  | Verify GraphRAG/LightRAG and vendor claims.                                              |
| `data-retrievability/agentic-rag.mdx`            | Merge   | Too thin; combine with RAG patterns.                                                     |
| `data-retrievability/evaluation.mdx`             | Merge   | Too thin; could live under Testing or retrieval pipeline.                                |
| `data-retrievability/anti-patterns.mdx`          | Keep    | Useful.                                                                                  |
| `protocols/index.mdx`                            | Update  | A2A/ACP status should reflect 2026 state.                                                |
| `protocols/mcp.mdx`                              | Keep    | Current MCP version claim checks out.                                                    |
| `protocols/a2a.mdx`                              | Update  | Treat as production-relevant; verify Agent Card path.                                    |
| `protocols/acp.mdx`                              | Update  | Add Meta and 2026-04-17 spec references.                                                 |
| `protocols/comparison.mdx`                       | Update  | Re-rank maturity table for A2A and ACP.                                                  |
| `protocols/emerging-standards.mdx`               | Update  | Fix Arazzo version and OpenTelemetry GenAI stability language; remove duplicate heading. |
| `authentication/index.mdx`                       | Keep    | Strong decision tree.                                                                    |
| `authentication/api-keys.mdx`                    | Keep    | Clear.                                                                                   |
| `authentication/oauth-for-agents.mdx`            | Keep    | Good core page; keep OAuth 2.1 as draft/current wording precise.                         |
| `authentication/agent-identity.mdx`              | Keep    | Clear.                                                                                   |
| `authentication/token-exchange.mdx`              | Keep    | Clear.                                                                                   |
| `authentication/dpop.mdx`                        | Keep    | Clear.                                                                                   |
| `authentication/protected-resource-metadata.mdx` | Keep    | Strong and timely.                                                                       |
| `authentication/mcp-auth-model.mdx`              | Keep    | Strong.                                                                                  |
| `authentication/auth-md.mdx`                     | Update  | Mark as new/emerging WorkOS protocol.                                                    |
| `authentication/idempotency-and-replay.mdx`      | Keep    | Clear.                                                                                   |
| `authentication/anti-patterns.mdx`               | Tighten | Remove duplicate Summary heading.                                                        |
| `error-handling/index.mdx`                       | Keep    | Clear.                                                                                   |
| `error-handling/rfc-9457.mdx`                    | Keep    | Strong.                                                                                  |
| `error-handling/agent-extensions.mdx`            | Keep    | Concise.                                                                                 |
| `error-handling/errors-for-agents.mdx`           | Keep    | Strong.                                                                                  |
| `error-handling/retry-patterns.mdx`              | Keep    | Strong.                                                                                  |
| `error-handling/idempotency.mdx`                 | Keep    | Clear.                                                                                   |
| `error-handling/cli-errors.mdx`                  | Keep    | Strong.                                                                                  |
| `testing/index.mdx`                              | Tighten | Add a clearer testing journey.                                                           |
| `testing/evaluation-framework.mdx`               | Keep    | Strong.                                                                                  |
| `testing/metrics.mdx`                            | Keep    | Good reference.                                                                          |
| `testing/llm-as-judge.mdx`                       | Keep    | Strong.                                                                                  |
| `testing/vitest-harness.mdx`                     | Tighten | Short; okay if positioned as quick implementation guide.                                 |
| `testing/promptfoo.mdx`                          | Update  | OpenAI ecosystem/acquisition claim needs source or softer wording.                       |
| `testing/braintrust.mdx`                         | Tighten | Short; useful as tool guide.                                                             |
| `testing/observability.mdx`                      | Update  | Fix OpenTelemetry GenAI stability wording.                                               |
| `testing/ci-integration.mdx`                     | Tighten | Short; useful as implementation guide.                                                   |
| `testing/red-teaming.mdx`                        | Keep    | Clear.                                                                                   |
| `multi-agent/index.mdx`                          | Keep    | Clear.                                                                                   |
| `multi-agent/orchestration-patterns.mdx`         | Keep    | Strong.                                                                                  |
| `multi-agent/supervisor-pattern.mdx`             | Keep    | Strong.                                                                                  |
| `multi-agent/council-pattern.mdx`                | Keep    | Concise and useful.                                                                      |
| `multi-agent/swarm-pattern.mdx`                  | Keep    | Strong.                                                                                  |
| `multi-agent/human-in-the-loop.mdx`              | Keep    | Strong.                                                                                  |
| `multi-agent/memory-patterns.mdx`                | Keep    | Strong.                                                                                  |
| `multi-agent/tool-sprawl.mdx`                    | Keep    | Strong.                                                                                  |
| `cookbook/index.mdx`                             | Keep    | Promote to Patterns.                                                                     |
| `cookbook/agentic-loop.mdx`                      | Keep    | Strong.                                                                                  |
| `cookbook/platform-agnostic-core.mdx`            | Tighten | Short, but useful; consider combining with external app routing.                         |
| `cookbook/system-prompt-as-config.mdx`           | Keep    | Strong pattern.                                                                          |
| `cookbook/tool-annotations.mdx`                  | Keep    | Strong.                                                                                  |
| `cookbook/semantic-tool-selection.mdx`           | Keep    | Strong.                                                                                  |
| `cookbook/external-app-routing.mdx`              | Keep    | Useful applied pattern.                                                                  |
| `cookbook/mcp-as-external-api.mdx`               | Update  | ACP/MCP client support claims may need fresh verification.                               |
| `cookbook/notification-to-conversation.mdx`      | Keep    | Strong pattern.                                                                          |
| `cookbook/autonomous-background-agents.mdx`      | Keep    | Clear.                                                                                   |
| `cookbook/cloudflare-agent-stack.mdx`            | Update  | Vendor page; add last verified date.                                                     |
| `cookbook/two-step-confirmation.mdx`             | Keep    | Strong pattern despite compact length.                                                   |
| `scoring/index.mdx`                              | Keep    | Move near top.                                                                           |
| `scoring/rubric.mdx`                             | Split   | Authoritative but long; consider one page per dimension or collapsible sections.         |
| `scoring/evidence.mdx`                           | Keep    | Strong.                                                                                  |
| `scoring/scorecard-format.mdx`                   | Tighten | Very short; maybe fold into scoring index or keep as schema reference.                   |
| `scoring/delta-scorecard.mdx`                    | Keep    | Useful.                                                                                  |
| `scoring/clustering.mdx`                         | Keep    | Strong.                                                                                  |
| `scoring/calibration.mdx`                        | Tighten | Good but should be lower-priority advanced material.                                     |
| `reference-links/index.mdx`                      | Keep    | Source appendix.                                                                         |
| `reference-links/coverage-map.mdx`               | Keep    | Useful internal maintenance page.                                                        |
| `tooling-catalog/index.mdx`                      | Split   | 9k+ words; move to catalog-style route or split by category.                             |

## Immediate Fix List

1. Update factual freshness issues:
   - Arazzo latest version.
   - OpenTelemetry GenAI stability.
   - ACP maintainers/spec path.
   - A2A maturity.
   - auth.md status as new/emerging.
2. Remove duplicate headings:
   - `authentication/anti-patterns.mdx`: duplicate `## Summary`.
   - `protocols/emerging-standards.mdx`: duplicate `## Practical Strategy`.
3. Add related/next sections to implementation-heavy pages that stop abruptly.
4. Decide AGENTS.md canonical home:
   - Recommended: `context-files/agents-md.mdx` is canonical.
   - `discovery/agents-md.mdx` becomes a short discovery-facing bridge.
5. Restructure Data Retrievability:
   - Keep `index`, `rag-patterns`, `vector-databases`, `anti-patterns`.
   - Combine `chunking`, `hybrid-search`, `reranking`, `agentic-rag`, and `evaluation` into either `retrieval-pipeline.mdx` or clearly labeled quick-reference pages.
6. Split Tooling Catalog:
   - Standards and protocols.
   - Frameworks and runtimes.
   - Retrieval and memory.
   - Evaluation and observability.
   - Browser/sandbox/integration tools.
7. Reframe scoring as "Evaluate And Improve" instead of the main navigation spine.

## Implementation Plan

### Phase 1: Corrections and routing

- Fix factual status claims and duplicate headings.
- Add "Related" sections to pages missing them.
- Update root and section index pages with stronger next-step routing.

### Phase 2: Navigation restructure

- Update top-level `meta.json` to the proposed journey-based order.
- Promote `runtime-boundaries` beside `agents`.
- Promote `cookbook` as Patterns.
- Move `scoring` after the build and surface chapters as an evaluation section.
- Move `reference-links` and `tooling-catalog` to reference position.

### Phase 3: Consolidation

- Deduplicate AGENTS.md pages.
- Consolidate thin Data Retrievability pages.
- Decide whether short Testing tool pages are quick references or should be merged.

### Phase 4: Catalog and freshness system

- Split the Tooling Catalog.
- Add `lastVerified` or visible "Last verified" notes for vendor/platform/standard pages.
- Extend `scripts/check-docs-integrity.mjs` with editorial checks:
  - duplicate headings outside code blocks
  - pages above 2,500 words
  - pages below 350 words outside index/quick-reference pages
  - missing Related/See also sections

## Success Criteria

- A new reader can answer "where do I start?" in one click.
- A reader can use Agent Surface as a general guide to agent concepts, architecture, surfaces, standards, and evaluation.
- A user doing an audit can still move from score to fix without searching, but auditing is presented as one workflow.
- A user building an agent system sees runtime, framework, UI, multi-agent, retrieval, and testing in one coherent journey.
- Reference-heavy material stays available without dominating the main learning path.
- Fast-moving claims have dates and source links.
