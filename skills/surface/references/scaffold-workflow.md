# Scaffold Workflow

Create or extend the contact points agents use to reach this product. Not agent
internals (orchestration, memory, model routing, an agent's own RAG). A browser
or sandbox belongs in a scaffold only as a harness that proves a surface works.

## Before generating

Find the package manager and workspace layout, runtime and module target,
deployment target, the test and typecheck commands, and every existing surface:
API specs and routes, CLI entry points, MCP servers, AGENTS.md, llms.txt,
`.well-known` files, auth flows, error shapes, tool definitions, search
endpoints and test directories. Extend what exists in the project's own layout;
a generic template comes second.

For anything substantial, show the plan first:

```text
Files to change:
- src/api/search.ts - typed search endpoint
- openapi.yaml - documented query params and result schema
- src/api/search.test.ts - pagination and empty-result test

Key decisions:
- Surface: typed search API with cursor pagination
- Auth: reuses existing session middleware, read-only
```

## Rules for every mode

- Typed input and output schemas on anything an agent calls.
- Documented failure shapes: structured errors, retry guidance, retriable versus
  terminal.
- Authenticated, destructive and production-facing capabilities get a
  confirmation gate and a stated permission boundary.
- Identity comes from the authenticated context, never a parameter. A target ID
  (the record being read) is a normal parameter; the caller's own user or tenant
  ID is not.
- Register new surfaces in the existing entry points (routes, MCP server, CLI
  command table, barrel exports) and list the environment variables they need.

## init

The smallest useful set for the detected shape, with no dependency installs and
no agent runtime code:

- `AGENTS.md` at the root: commands, conventions, boundaries.
- `public/llms.txt` (and `llms-full.txt` when the docs are large) for a project
  with public docs.
- `.well-known` files only for capabilities that exist: OAuth protected-resource
  metadata, MCP Server Card, Agent Skills index, API Catalog.
- `robots.txt` and sitemap updates so intended retrieval bots are allowed and
  find the sitemap.

## api

Agent-oriented OpenAPI descriptions (when to use, what to use instead,
prerequisites), unique snake_case operationIds, exhaustive documented enums,
examples on parameters, per-operation RFC 9457 errors, and pagination, job and
bulk contracts per `/docs/api-surface/retrieval-and-job-contracts`.

## cli

`--json` on every command with one envelope, a published exit-code contract,
`--dry-run` and `--yes` on mutations, TTY detection, progress on stderr, and a
`--schema` command that dumps the whole command surface.

## mcp

Ask only for missing decisions: which operations become tools, resources or
prompts; read, write or destructive per tool; stdio, Streamable HTTP or both.
Generate registrations with annotations, `outputSchema` with
`structuredContent`, RFC 9728 metadata for a protected remote server, and an
`InMemoryTransport` test covering one call and one error.

## tool <name>

One typed tool contract for an existing product capability. Field-level
descriptions; an output schema that keeps the stable IDs needed for follow-up
calls and drops secrets, unrelated personal data and internal identifiers; MCP
annotations when exposed over MCP; a confirmation gate on writes.

## test-harness

A harness that validates a surface:

- MCP: `InMemoryTransport.createLinkedPair()` for selection, parameters, error
  recovery and a multi-step sequence; wire-level checks against the deployed URL
  (`server/discover`, `Origin`, the OAuth discovery chain, wrong-user and
  wrong-tenant negatives).
- CLI: `--json` shape, exit codes and `--dry-run` behaviour.
- Discovery: `Accept: text/markdown` and the `.md` twin return Markdown with
  `Vary: Accept` and no navigation chrome; every `llms.txt` link resolves;
  `.well-known` files parse.
- Retrieval: a real query through the search API checking result shape,
  pagination across pages and freshness fields.
- End to end: a browser-driven task through the deployed surface (discovery,
  action, recovery, result).
