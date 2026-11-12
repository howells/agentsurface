# API Surface

Dimension 1: how well the HTTP API is described for an agent to generate tools
from and call correctly.

## Contents

- Rubric
- Evidence to gather
- The house way (versions, operationId, descriptions, enums, shape, errors,
  idempotency, Arazzo, extensions, spec to MCP, versioning, webhooks,
  onboarding)
- Provider schema translation
- Build
- Templates

## Rubric

- **0**: Endpoints but no machine-readable spec (no OpenAPI, Swagger or GraphQL
  schema).
- **1**: A spec with human-oriented descriptions ("Gets the data"),
  operationIds missing on >30% of operations, no examples, nested parameters.
- **2**: Descriptions say when to use the operation, what to use instead and
  its prerequisites; operationId on every operation; exhaustive enums; examples
  on parameters; flat parameter structures.
- **3**: Arazzo workflows for multi-step tasks, agent extensions that a
  generator or gateway actually maps, an MCP server generated or curated from the
  spec, and descriptions under roughly 200 tokens per operation (a house
  heuristic).

N/A when there is no HTTP API.

## Evidence to gather

- Find specs by content, not filename:
  `rg -l --glob '*.{yaml,yml,json}' -e '^\s*"?(openapi|swagger)"?\s*:'`, then
  parse each hit.
- Count operationIds, examples and enums from the parsed spec with `$ref`s and
  split files resolved. Line greps miss unquoted YAML keys.
- Sample five descriptions for "use when" and "do not use" content.
- With no spec, derive the surface from routes (`app/**/route.ts`,
  `router.get(`, `@app.get(`, `@Get(`, `HandleFunc`) and score 0.
- Arazzo: `*.arazzo.yaml|json`.
- For collections, jobs and bulk operations: who may read or cancel a job,
  continuation, limits, partial failure and terminal state. Test two pages, an
  empty result, an invalid cursor and data changing between pages. Compare the
  declared success and error schemas with real responses.

## The house way

**Versions.** Target OpenAPI 3.1 (JSON Schema 2020-12). 3.2.1 (2026-09-10) is
current, but 3.1 has wider generator and validator support. 3.0 uses its own
schema dialect; flag it. Overlay 1.2.0 adds agent descriptions without editing
the source spec. `format` is an annotation, not validation.

**operationId.** Optional in the spec but treat it as required: lowercase
snake_case `verb_noun` (`list_users`, `get_user_by_id`, `search_users`,
`create_user`, `replace_user`, `delete_user`). Uniqueness is the only spec rule;
the casing is the house convention. Keep them stable after release.

**Descriptions**, in order: what it does; when to use it; what to use instead;
prerequisites (scopes, rate limits, an operation to call first, by
operationId); the key fields it returns; pagination and size limits; errors and
how to recover; known gaps.

```yaml
description: |
  Retrieve a paginated list of users.
  **Use when:** you need a searchable list of accounts.
  **Do not use for:** a single user by ID (use `get_user_by_id`).
  **Prerequisites:** Bearer token with `users:read`.
```

**Enums.** Every closed set of values gets `enum` and a meaning per value
(`x-enum-descriptions` or the description). Codes like `PEND_ACTN` with no
explanation are a finding.

**Shape.** Flat request bodies over nested objects (two levels at most);
four or fewer required parameters where the operation allows, about ten in
total; separate endpoints over one endpoint whose behaviour depends on
parameter combinations; `oneOf`/`anyOf` avoided in inputs. Every parameter has
a description, an example, and a format or enum where one applies. Paginated
responses carry `has_more` or a total.

**Errors per operation.** Declare the statuses each operation can return, with
`application/problem+json` bodies (see error-handling.md). A global error
declaration hides which errors are possible where.

**Idempotency.** Declare the `Idempotency-Key` header on POST, and on PATCH
where it isn't naturally idempotent, and document the retention window. The
server contract is in error-handling.md.

**Arazzo 1.1.0** models multi-step workflows. It has no default success
criterion, so declare `successCriteria` on every step you depend on. It isn't
transactional: a failed later step doesn't roll back earlier ones. `workflows`
is an array of objects with a `workflowId`; a step names its operation by
`operationId`, qualified as `$sourceDescriptions.<name>.<operationId>` when
there is more than one source description.

**Extensions.** `x-agent-*`, `x-category` and `x-rate-limit` are house
conventions; credit them only where the generator or gateway reads them.
`x-openai-isConsequential` comes from GPT Actions and its support elsewhere is
unconfirmed. Check `x-speakeasy-mcp` keys against the Speakeasy version in use.
None of these replace server-side authorization.

**Spec to MCP.** Speakeasy and Stainless generate MCP servers; OpenAPI Generator
has no first-party MCP output; FastMCP has `from_openapi()`. Generators differ
in naming, collision handling, body merging and output schemas, so inspect the
generated tools and curate the set. Keep the spec as the source of truth.

**Versioning.** Breaking changes get a URL major version or date header; a
description change that makes agents pick the wrong operation is breaking.
Deprecated operations are marked `deprecated: true` and answered with
`Deprecation` (RFC 9745) and `Sunset` (RFC 8594) headers.

**Webhooks** go in the OpenAPI `webhooks` field, discriminated by `event_type`,
deduplicated by `event_id`, with `created_at` and a `schema_version`, signed
per Standard Webhooks with a replay window, and carry state snapshots so the
receiver needs no follow-up call.

**Onboarding.** An official SDK traceable to the API (npm `repository` and
`homepage`), linked from the docs and `llms.txt`, and self-serve keys plus a
sandbox, so an agent reaches a first successful call with no human step.

## Provider schema translation

**OpenAI strict mode** accepts a JSON Schema subset: `additionalProperties:
false` on every object at every level; every property in `required`, with
optional ones nullable (`type: [string, "null"]`) and passed as `null`; nested
`anyOf` allowed but no root-level `anyOf`; published caps on properties, depth
and enum size. Strict is a setting, not a requirement.

**Gemini** takes `functionDeclarations` with `parameters` (an OpenAPI subset)
or `parametersJsonSchema`, never both. Gemini 3 returns thought signatures on
function-call parts: send those parts back exactly as received, and keep tool
declarations stable within a session.

Generate both from one source (the spec or Zod 4's `z.toJSONSchema()`).
`zod-to-json-schema` is unmaintained and Zod 3 only.

## Build

Edit the project's existing spec; with none, derive one from the routes.

1. **Move to OpenAPI 3.1** where the spec is 3.0, replacing `nullable: true`
   with `null` in the schema's `type`. Done when the spec parses as 3.1 in the
   project's validator.
2. **operationIds and descriptions** on every operation, in the house form.
   Released operationIds keep their names.
3. **Parameters and enums**: descriptions, examples, formats, closed sets as
   enums with a meaning per value.
4. **Errors and idempotency** per operation.
5. **Arazzo workflow** for each multi-step task agents perform, every step
   with `successCriteria`.
6. **Extensions and generated MCP tools** only where a generator or gateway in
   the project reads them; inspect the generated tools.

Done when the spec and any Arazzo file pass the project's linter, every
operation has an operationId, a "use when" description and its error
responses, every Arazzo `operationId` exists in the spec, and one real
response per changed operation matches its declared schema.

## Templates

- `templates/mcp-and-api/openapi-skeleton.yaml`
- `templates/mcp-and-api/arazzo-workflow.yaml`
- `templates/errors-and-auth/problem-details.ts`
