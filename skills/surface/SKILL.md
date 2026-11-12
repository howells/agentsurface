---
name: surface
description: Audits, scores and scaffolds the surfaces AI agents use to reach existing software, such as AGENTS.md, llms.txt, discovery files, APIs, CLIs, MCP servers, tool contracts, auth, errors and retrieval. Use when asked for agent readiness, a scorecard, or to build or fix one of those surfaces for agents. Not for building an agent itself.
---

# Surface

Surface improves the contact points agents use to reach existing software:
discovery, context files, APIs, CLIs, MCP servers, tool contracts, auth, errors,
retrieval and the tests that prove them. It is framework-neutral and
product-side. For agent internals (frameworks, orchestration, memory, model
routing, an agent's own RAG), say this skill doesn't cover them and point to
https://agentsurface.dev/docs/agents and /docs/agent-retrieval.

Paths below are relative to the directory holding this file. With no more
specific request, run an audit in `plan` mode.

- **Report audits in your reply, never into the repo.** Give the scorecard,
  findings and plan in the response. File them to a tracker only when the user
  asks and has one.
- **Transform only after the user approves the plan.**
- **Read each reference whole, with its own read.** Long output is cut in the
  middle, so never concatenate several references in one read.
- **Score what exists, not intent.** Mark a dimension N/A only when the project
  can't expose that surface, and never penalize an optional capability the
  product doesn't have (MCP metadata without a remote MCP server, OAuth
  metadata without protected resources, commerce manifests without a commerce
  flow).
- **Check the content, not the file.** A `.well-known` file that returns 200
  but points at nothing scores as absent.
- **Merge into** existing AGENTS.md, CLAUDE.md, llms.txt and MCP files.
- **A direct ask gets the artifact.** "Write our llms.txt" doesn't need a full
  audit: detect narrowly, make it, and say what wasn't audited. An ambiguous
  "make this agentic" starts with an audit.

## Guide

For explanations, comparisons and design decisions, answer from the Agent
Surface guide: `src/content/docs/` in its own repository, otherwise
https://agentsurface.dev/docs (every page has a Markdown twin at `<path>.md`;
the index is https://agentsurface.dev/llms.txt). Read only the pages the
question needs. Verify fast-moving standards against primary sources before
calling anything current.

| Need                             | Docs section                                                  |
| -------------------------------- | ------------------------------------------------------------- |
| Start or route                   | `getting-started`                                             |
| Expose capabilities              | `api-surface/`, `tool-design/`, `cli-design/`, `mcp-servers/` |
| Be discoverable                  | `discovery/`, `context-files/`                                |
| Secure and recover               | `authentication/`, `error-handling/`                          |
| Retrieval and structured content | `retrievability/`                                             |
| Rich UI in agent clients         | `agentic-ui/`                                                 |
| Let agents buy                   | `agentic-commerce/`                                           |
| Verify                           | `testing/`, `scoring/`                                        |
| Standards                        | `protocols/`, `reference-links/`                              |

## Audit

Modes: `score` (inventory and scorecard), `plan` (plus findings and plan),
`transform` (plan, then execution), `--dimension=<name>`, `--format=json`.

1. Read `references/audit-workflow.md` first. It holds detection,
   applicability, scoring rules, delegation, product journeys and every output
   format.
2. Before scoring a dimension, read its reference. Each holds that dimension's
   0-3 rubric, the evidence to gather and how to build the fix:

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

3. For a storefront, marketplace or anything agents can buy, read
   `references/agentic-commerce.md`; it informs the dimensions above and is not
   an eleventh.
4. Score the dimensions yourself, or hand each to a child agent when the host
   offers delegation, using the brief in `references/audit-workflow.md`. The
   audit is done when every applicable dimension has a result or a recorded
   failure.

Monorepos get per-package and aggregate scores. A polyglot repo is scored per
surface, reporting the weakest user-facing path. A pure CLI or a project with
no web presence isn't penalized for missing public `llms.txt`; judge its
repo-local context files and package metadata.

## Scaffold

Modes: `init` (AGENTS.md, llms.txt, `.well-known`), `api`, `cli`, `mcp`,
`tool <name>`, `test-harness`.

Read `references/scaffold-workflow.md` before generating anything, then the
reference for the mode:

| Mode           | Reference                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `init`         | `references/context-files.md`, then `references/discovery-aeo.md`                              |
| `api`          | `references/api-surface.md`, then `references/error-handling.md`                               |
| `cli`          | `references/cli-design.md`                                                                     |
| `mcp`          | `references/mcp-servers.md`, then `references/authentication.md` for a remote protected server |
| `tool <name>`  | `references/tool-design.md`                                                                    |
| `test-harness` | `references/testing.md`                                                                        |

A search or retrieval surface needs `references/retrievability.md`; auth work
needs `references/authentication.md`. Each reference's Build section ends its
tasks on a check; the work is done when those checks pass.

`templates/<kit>/<file>` paths in the references are not part of an installed
skill. Inside the Agent Surface repository they are local files; anywhere else,
fetch them from https://github.com/howells/agentsurface/tree/main/templates.

- **Resolve identity server-side.** Never accept a user or tenant id as a tool
  or API parameter.
- **Ship each surface with the first test that proves it works.**
- **Browsers and sandboxes only to validate** a surface, never as a
  general-purpose capability.

## Standards that models get wrong

- **AGENTS.md is the one instruction file.** Claude Code reads it when no
  CLAUDE.md exists on the path. Add CLAUDE.md only for Claude-only
  instructions, with `@AGENTS.md` as its first line; a CLAUDE.md that says
  "see AGENTS.md" in prose doesn't load it. Other tools' rule files stay thin
  overlays that point at AGENTS.md.
- **`llms.txt` aids inference-time retrieval**, not SEO or citation. Pair it
  with crawlable docs, structured data, a sitemap and stable canonical URLs.
- **MCP `2026-07-28` is current** and every Tier 1 SDK supports it. It removes
  sessions and the initialize handshake, adds `server/discover` (servers must
  implement it) and `subscriptions/listen`, moves Tasks into an extension, and
  deprecates roots, sampling and logging. Audit against it; keep `2025-11-25`
  compatibility only when a real client needs it.
- **MCP tools** should have input schemas, `outputSchema` with
  `structuredContent`, annotations, resource links where useful and structured
  recoverable errors. Annotations and descriptions are hints, not
  authorization: enforce approvals, auth and scopes in the server.
- **Protected remote MCP servers** publish RFC 9728 protected-resource
  metadata and validate issuer, audience, expiry and scopes on every request.
  DPoP (RFC 9449) is separate; claim it only when implemented.
- **WebMCP** (`document.modelContext`) is a browser-native draft for
  page-scoped tools, distinct from remote MCP and the old `webmcp.dev` library.
- **Claude model IDs, context limits and beta headers change often.** Check the
  Claude Platform release notes before hard-coding them.
