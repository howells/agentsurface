# Audit Workflow

Detection, applicability, scoring rules and every output format for `score`,
`plan`, `transform` and `--dimension` runs. Each dimension's 0-3 rubric lives in
its own reference, under `## Rubric`.

## Contents

- Detect: inventory and applicability
- Score: rules, delegation, result format, product journeys
- Scorecard
- Findings
- Plan
- Report
- Transform
- JSON

## Detect

Read the project before scoring. Record stack, runtime, deployment target and
which surfaces exist: HTTP API, CLI, MCP server, public web/docs, auth, error
shapes, tool definitions, context files, tests, searchable data. Show the
inventory before the scorecard in every mode.

This table decides applicability. A dimension it excludes is N/A without
reading its reference.

| Dimension       | In the denominator when                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| API Surface     | The project exposes HTTP endpoints or an API spec                            |
| CLI Design      | The project is or ships a CLI                                                |
| MCP Server      | Usually; any useful product can expose one. Go easy on tiny internal scripts |
| Discovery & AEO | Public docs, website, package docs or a web API                              |
| Authentication  | Protected APIs, signed-in hosted services or secrets                         |
| Error Handling  | Always                                                                       |
| Tool Design     | It defines agent tools or has operations that could be tools                 |
| Context Files   | Always                                                                       |
| Testing         | Always                                                                       |
| Retrievability  | It holds a corpus, dataset or records an agent might query                   |

Applicability works at two levels. A dimension can apply while some of its
signals don't: a public docs site activates core discovery checks but not MCP,
OAuth, Agent Skills, WebMCP, commerce or bot-identity checks unless those
capabilities exist. List inactive signals as `not applicable` in the evidence;
never count them as passes or failures. A capability that exists only in a
roadmap, placeholder manifest or stale doc is not detected.

## Score

- Score the current state with file:line evidence or dated command output. When
  unsure, score lower.
- Rubric levels are cumulative: the score is the highest level whose every
  requirement that applies to this product is met. A requirement for a
  capability the product has no use for (resources on a server with no static
  data, cursors on a fixed corpus that fits one page, tenant filters on public
  data) is not applicable and doesn't hold the score down; record it under
  NOT_APPLICABLE_SIGNALS.
- Gather evidence read-only. Read script definitions rather than running
  builds, test suites or anything that writes files.
- Confidence: high (examined >80% of the relevant code), medium (key files),
  low (sampled).
- N/A dimensions leave the denominator. A dimension that applies but is missing
  scores 0, not N/A: a product with no MCP server scores 0 on MCP Server, while
  a product with no remote MCP server is simply not checked for MCP discovery
  metadata.
- A dimension that couldn't be scored shows `[???] ?/3 Scoring failed`, is
  excluded from the totals, and gets a warning footer. In JSON it is
  `status: "failed"` with a null score. If nothing could be scored, report the
  run as failed with no total, rating or scorecard.
- Assign each defect to the dimension that owns its root cause. One broken
  endpoint is one finding, however many dimensions it touches.

### Delegating a dimension

Where the host can run child agents, each dimension can go to one; otherwise
score them yourself in the scorecard's order. Run live checks (HTTP fetches,
AFDocs, MCP calls against a deployed URL) yourself first and pass the dated
output along; when a check can't run, record it as untested and lower the
confidence. Give each child this brief with the brackets filled in and the
Dimension result block pasted beneath it, then wait for every result before
building the scorecard:

```text
Score the [dimension] dimension of [project] at [project root] for agent
readiness. Read-only: do not edit files, run the test suite or run
state-changing commands. Read-only HTTP requests are fine.

Read [absolute path of the skill directory]/references/[file].md in full, then
score against its Rubric using its Evidence to gather.
Stack: [language, framework, package manager].
Already detected: [paths and patterns for this dimension].
Live check output: [dated results, or "none"].

Score the current state, citing file:line for every claim. When unsure, score
lower. Return only the result block below.
```

### Dimension result

Every dimension, delegated or not, produces this block:

```text
DIMENSION: [name]
STATUS: scored | not_applicable | failed
SCORE: [0-3; omit unless scored]
CONFIDENCE: high | medium | low
EVIDENCE:
- [observation with file:line or dated command output]
NOT_APPLICABLE_SIGNALS:
- [optional capability the product doesn't have]
SUMMARY: [one sentence: what exists, what's missing]
REASON: [why not applicable, or what blocked scoring; omit when scored]
FINDINGS: [omit at 3/3]
- WHAT: [issue]
  WHY: [effect on an agent]
  WHERE: [file:line]
  SEVERITY: Critical | High | Medium | Low
  FIX: [concrete action]
  IMPACT: [dimension] [current] -> [target]
```

`not_applicable` is for a surface the project can't expose, never for one that
applies but is missing (that is a 0). `failed` is for evidence that couldn't be
reached; never turn missing access into N/A or a guessed score.

### Product journeys (public products and integrations)

In `plan` and `transform` runs, score with a representative task as the lens,
not a second scoring system. Its observations go into the dimensions' evidence:

1. Name the task, intended client, acting identity, authorized boundary and
   observable completion condition.
2. Start from the public entry point and follow discovery links. Note any
   private knowledge needed to reach the capability.
3. Check decision facts (identity, price, units, availability, limits, terms)
   against the owned source; compare the visible and machine-readable versions
   of one real item.
4. Exercise the chosen API, CLI, MCP or browser path, then one meaningful
   failure and its recovery. Reconcile interrupted mutations by stable ID.
5. Observe the authoritative final state. Keep acceptance, completion, payment
   and fulfilment separate where they differ.

External scanner reports are leads to reproduce: keep their date and observed
behaviour, judge applicability, and never import their weights or
platform-listing assumptions. `templates/discovery/product-journey-audit.md`
holds the fields.

## Scorecard

Use this shape for a full score, dimensions in this order:

```text
==============================================================================
                           SURFACE SCORECARD
                           [Project Name]
                           [YYYY-MM-DD]
==============================================================================

  1. API Surface          [---]  N/A   No HTTP API surface
  2. CLI Design           [###]  3/3   Full JSON output, schema introspection, hardened
  3. MCP Server           [...]  0/3   No MCP server
  4. Discovery & AEO      [#..]  1/3   AGENTS.md exists, no public discovery
  5. Authentication       [##.]  2/3   Scoped API keys, rotation untested
  6. Error Handling       [#..]  1/3   Structured errors are inconsistent
  7. Tool Design          [---]  N/A   No agent tools
  8. Context Files        [##.]  2/3   Curated AGENTS.md, no overlays
  9. Testing              [##.]  2/3   CLI contract tests, no evals
  10. Retrievability      [---]  N/A   No searchable corpus or dataset

==============================================================================
  TOTAL: 11/21 (scaled: 16/30)
  RATING: Agent-ready

  Human-only        Agent-tolerant      Agent-ready        Agent-first
  0          7      8           14      15        22       23        30
==============================================================================
```

Bars: `[...]` 0, `[#..]` 1, `[##.]` 2, `[###]` 3, `[---]` N/A. Scaled score is
`round(raw / max_applicable * 30)`. The rating comes from the scaled score: 0-7
Human-only, 8-14 Agent-tolerant, 15-22 Agent-ready, 23-30 Agent-first. Each
line's summary is the dimension's SUMMARY cut to one clause.

A single-dimension run prints the dimension's line under a
`SURFACE DIMENSION SCORE` header (`[Project] - [Dimension]`, date), followed by
an `EVIDENCE` list of paths and observations.

## Findings

Each finding has What (with path/line), Why (the effect on an agent), Fix
(concrete steps), Impact (dimension, current → target score) and Severity:

- Critical: blocks agent use entirely.
- High: significant friction or a safety risk.
- Medium: works, but badly.
- Low: polish.

Cluster findings by what gets fixed together, not by dimension. Each cluster has
a name, a one-sentence rationale, a table (severity, file, issue, dimension), the
approach and its dependencies.

## Plan

One task per fix: ID, description, files, size (S/M/L), score impact,
dependencies, and the reference whose Build section covers it. Default order:
context files, discovery, error handling, API descriptions, CLI
output/schema/exit codes, authentication, MCP server, structured data,
retrievability, testing.

## Report

Put the inventory and scorecard in your reply, with findings and plan in
`plan` and `transform` runs. Write nothing into the repo. File to a tracker only when the user asks and has one: the audit as one
item with the scorecard, the plan as one item per task. A re-audit compares with
the previous scorecard the user gives you or that the tracker holds.

## Transform

After the user approves the plan, make the changes, re-score the affected
dimensions and show the delta:

```text
==============================================================================
                         SURFACE DELTA SCORECARD
==============================================================================

  Dimension              Before  After  Delta
  Error Handling         0/3     2/3    +2
  Context Files          1/3     3/3    +2
  Discovery & AEO        1/3     2/3    +1

  TOTAL: 11/27 -> 16/27 (scaled: 12/30 -> 18/30)
  RATING: Agent-tolerant -> Agent-ready
==============================================================================
```

## JSON

`--format=json` emits the published schema
(https://agentsurface.dev/docs/scoring/scorecard-format): `version: "1.0"`, a
`project` object, an ISO 8601 `date`, exactly ten `dimensions` records (`score`
and `confidence` are `null` for N/A), `findingClusters`, and camelCase `overall`
totals with a lower-case rating.

```json
{
  "version": "1.0",
  "project": { "name": "example-cli" },
  "date": "2026-10-29T15:30:00Z",
  "dimensions": [
    { "name": "api-surface", "score": null, "confidence": null, "evidence": [], "findings": [] },
    {
      "name": "cli-design",
      "score": 3,
      "confidence": "high",
      "evidence": [
        {
          "type": "file",
          "description": "Machine-readable output",
          "location": "src/cli/output.ts:12",
          "result": "--json emits bare data on stdout"
        }
      ],
      "findings": []
    }
  ],
  "findingClusters": [],
  "overall": { "rawScore": 11, "maxApplicable": 21, "scaledScore": 16, "rating": "agent-ready" }
}
```

The example omits eight dimension records; a real scorecard has all ten. Plans
never go in the JSON. Print the normal report as well unless the user asked for
JSON only.
