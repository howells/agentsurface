# Surface Scaffold Workflow

Use this reference before creating or extending an agent surface.

The Scaffold route is product-side and framework-neutral: it creates or extends the contact
points agents use to reach this software - discovery files, API/CLI/MCP surfaces, tool
contracts, retrieval endpoints - and the evaluation harnesses that verify those surfaces
work. It does not generate agent-internal architecture (agents, orchestration, memory, model
routing, or an agent's own retrieval/RAG pipeline); that belongs to the agent-building
inventory (`/docs/agents`, `/docs/agent-retrieval`), not this skill. Browser or sandbox
scaffolding is in scope only when it builds a harness that exercises or validates a surface
(for example, a browser-driven task test proving an agent can complete a real flow) - never
as a general-purpose agent capability.

## Phase 0: Project Detection

Read the project before scaffolding.

Detect:

- Package manager and workspace layout.
- Runtime/language and deployment target.
- Existing surfaces: API specs/routes, CLI entry points, MCP servers, discovery files
  (AGENTS.md, llms.txt, `.well-known`), auth flows, error shapes, tool/function-calling
  definitions, search/retrieval endpoints, test/eval directories.
- TypeScript module target and runtime constraints.
- Test and typecheck commands.

Present the inventory before generating code.

## Shared Scaffolding Rules

1. Prefer the project's existing layout and conventions over a generic template.
2. Add typed input and output schemas to anything agents will call.
3. Document failure shapes: structured errors, retry guidance, and recoverable vs. terminal states.
4. Include an evaluation or test case with every surface scaffolded, not as a follow-up.
5. Register and export everything that should be publicly callable.
6. Document environment variables and runtime bindings the surface needs.
7. Treat authenticated, destructive, and production-facing capabilities as high-risk: require explicit confirmation gates and document the permission boundary.

## Mode: init

Initialize the baseline agent-surface conventions for a project that has none yet.

Create the smallest useful set for the detected project shape:

- `AGENTS.md` at the repo root (commands, conventions, permission boundaries).
- `public/llms.txt` (and `llms-full.txt` where useful) for a project with public docs or a website.
- `.well-known/` metadata appropriate to the surfaces present (OAuth protected-resource metadata, MCP server card, Agent Skills index) - only for capabilities that actually exist.
- `robots.txt`/sitemap updates so intended discovery and retrieval bots are allowed and can find the sitemap.

Do not install dependencies or scaffold agent runtime code as part of `init`.

## Mode: api

Improve the API surface for agent tool generation.

- Add or upgrade an OpenAPI/GraphQL schema with agent-oriented descriptions: when/why to use an operation, disambiguation from similar operations, exhaustive enums, examples on parameters.
- Add pagination, async-job, and bulk-operation contracts per [Retrieval and Job Contracts](/docs/api-surface/retrieval-and-job-contracts).
- Read `references/api-surface.md` for the full rubric this mode targets.

## Mode: cli

Improve a CLI's machine-readable surface.

- Add or standardize `--json`/`--output json` across commands, with a consistent shape.
- Add semantic exit codes, `--dry-run` on mutating commands, and TTY detection so output degrades gracefully when piped.
- Add a `--schema`/`--describe` command that dumps the CLI's full machine-readable command surface.
- Read `references/cli-design.md` for the full rubric this mode targets.

## Mode: mcp

Scaffold or extend an MCP server that exposes this project's existing capabilities.

Ask only for missing decisions:

- Which existing operations should become tools, resources, or prompts?
- Read-only, write, or destructive behavior per tool?
- Transport: stdio, Streamable HTTP, or both?

Generate:

- Server registration with tool/resource/prompt definitions.
- MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) and `outputSchema`/`structuredContent` where results are structured.
- RFC 9728 protected-resource metadata when the server is remote and protected.
- A test using `InMemoryTransport` covering at least one tool call and one error case.

Read `references/mcp-servers.md` for the full rubric this mode targets.

## Mode: tool

Create or refine one typed tool contract - a function-calling/MCP tool definition that lets an agent call an existing capability of this product. This is not an internal agent's private helper function; it is part of the product's public surface.

Ask:

- What capability does the tool expose, and what does it do?
- Inputs and outputs, with field-level descriptions.
- Read/write/destructive/idempotent behavior.
- Identity and permission handling (never accept user/tenant identity as a tool input parameter; resolve it server-side from the caller's authenticated context).

Generate:

- Tool definition with a typed schema and field descriptions.
- Output schema that whitelists safe fields (no internal IDs, secrets, or unrelated PII).
- MCP annotations when the tool is also exposed over MCP.
- A confirmation-gate note for any write/destructive tool.
- A test or fixture when the project has a test surface.

Read `references/tool-design.md` for the full rubric this mode targets.

## Mode: test-harness

Scaffold an evaluation harness that validates one of the surfaces above, rather than a
capability of its own.

Examples:

- MCP conformance tests using `InMemoryTransport.createLinkedPair()` covering tool
  selection, valid parameters, error recovery, and a multi-step sequence.
- CLI contract tests asserting `--json` shape, exit codes, and `--dry-run` behavior.
- Retrievability evals: a representative query through the actual search/retrieval API,
  checking result shape, pagination across pages, and freshness fields.
- A browser-driven task test that walks a real agent task through the deployed surface
  (discovery -> action -> recovery -> result) to prove the surface works end to end. Use a
  browser here only to validate an existing surface; do not scaffold general-purpose browser
  tool access as part of this mode.

Read `references/testing.md` for the eval design this mode targets.

## Wiring

After generating code:

1. Register the new surface (route, MCP server entry, CLI command) in the project's existing entry points.
2. Export public modules from the project's existing barrel/index files.
3. Document environment variables and bindings the surface needs.
4. Run or propose the project's typecheck/test commands.
5. Confirm the failure shape is visible: structured errors, retry guidance, and any confirmation gate.
6. Note the eval/test case added alongside the surface.

## File Preview Format

Before writing substantial scaffolding, show:

```text
Files to change:
- src/api/search.ts - new typed search endpoint (Retrievability mode)
- openapi.yaml - documented query params and result schema
- src/api/search.test.ts - pagination and empty-result test

Key decisions:
- Surface: typed search API with cursor pagination
- Auth: reuses existing session middleware, read-only
- Eval: one representative query test asserting result schema and freshness field
```
