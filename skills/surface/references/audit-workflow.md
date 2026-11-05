# Audit Workflow

Detection, applicability, scoring rules and every output format for `score`,
`plan`, `transform` and `--dimension` runs. Each dimension's 0-3 rubric lives in
its own reference.

## Detect

Read the project before scoring. Record stack, runtime, deployment target and
which surfaces exist: HTTP API, CLI, MCP server, public web/docs, auth, error
shapes, tool definitions, context files, tests, searchable data. Show the
inventory before the scorecard.

| Dimension       | In the denominator when                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| API Surface     | The project exposes HTTP endpoints or an API spec                            |
| CLI Design      | The project is or ships a CLI                                                |
| MCP Server      | Usually; any useful product can expose one. Go easy on tiny internal scripts |
| Discovery & AEO | Public docs, website, package docs or a web API                              |
| Authentication  | Protected APIs, hosted services or secrets                                   |
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
- Confidence: high (examined >80% of the relevant code), medium (key files),
  low (sampled).
- N/A dimensions leave the denominator. A dimension that applies but is missing
  scores 0, not N/A.
- A dimension that couldn't be scored shows `[???] ?/3 Scoring failed`, is
  excluded from the totals, and gets a warning footer. In JSON it is
  `status: "failed"` with a null score. If nothing could be scored, report the
  run as failed with no total, rating or scorecard.
- Scoring helpers may have read-only tools. Run live checks (HTTP fetches,
  AFDocs, MCP calls against a deployed URL) yourself and pass the dated results
  to them.
- Assign each defect to the dimension that owns its root cause. One broken
  endpoint is one finding, however many dimensions it touches.

Each dimension result has: number and name, score/3, confidence, bar, evidence
with paths, applicable and not-applicable signals where the dimension has
optional ones, a one-sentence summary, and findings when below 3.

### Product journeys (public products and integrations)

Score with a representative task as the lens, not a second scoring system:

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
`round(raw / max_applicable * 30)`. Ratings: 0-7 Human-only, 8-14
Agent-tolerant, 15-22 Agent-ready, 23-30 Agent-first.

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
dependencies, and the writer prompt in `agents/` that fits it. Default order:
context files, discovery, error handling, API descriptions, CLI
output/schema/exit codes, authentication, MCP server, structured data,
retrievability, testing.

## Report

Put the scorecard, findings and plan in your reply. Write nothing into the
repo. File to a tracker only when the user asks and has one: the audit as one
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
          "description": "JSON envelope",
          "location": "src/cli/output.ts:12",
          "result": "--json emits { success, data }"
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
