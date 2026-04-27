# Surface Audit Workflow

Use this reference for `/surface`, score, plan, transform, and single-dimension audits.

## Phase 0: Project Detection

Phase 0 must complete before scoring. Read the project; do not guess.

Detect:

1. Stack, package manager, framework, runtime, deployment target.
2. Surfaces: API, CLI, MCP, discovery, auth, errors, tools, context files, agents/workflows, tests, retrieval.
3. Applicable dimensions.
4. Previous reports in `docs/surface/`.

Applicability:

| Dimension | Applies when |
| --- | --- |
| API Surface | Project exposes HTTP endpoints or API specs |
| CLI Design | Project is or ships a CLI |
| MCP Server | Usually applicable; any useful project can expose one, but do not penalize tiny/internal scripts harshly |
| Discovery & AEO | Project has public docs, website, package docs, or a web API |
| Authentication | Project has protected APIs, hosted services, or secrets |
| Error Handling | Always |
| Tool Design | Project defines agent tools/functions or can expose operations as tools |
| Context Files | Always |
| Multi-Agent | Project orchestrates or contains agents |
| Testing | Always |
| Data Retrievability | Project exposes documents, knowledge, search, datasets, or RAG |

Present detected surfaces before scoring.

## Phase 1: Dimension Scoring

Score each applicable dimension 0-3 using its reference file. If subagents are available and allowed by the current runtime, dispatch independent dimensions in parallel; otherwise score locally.

Each dimension result must contain:

- Dimension number and name
- Score and max
- Confidence: high, medium, or low
- Bar visualization
- Evidence with paths/lines
- One-sentence summary
- Findings when score is below 3

Failure handling:

- If a dimension cannot be scored, mark `[???] ?/3 Scoring failed`.
- Exclude failed dimensions from math.
- Add a warning footer.

## Scorecard Format

Use this exact shape for full scorecards. Keep dimensions in this order.

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
  5. Authentication       [##.]  2/3   Scoped API keys, no token exchange
  6. Error Handling       [#..]  1/3   Structured errors are inconsistent
  7. Tool Design          [---]  N/A   No agent tools
  8. Context Files        [##.]  2/3   Curated AGENTS.md, no overlays
  9. Multi-Agent          [---]  N/A   Not an agent system
  10. Testing             [##.]  2/3   CLI contract tests, no evals
  11. Data Retrievability [---]  N/A   No retrievable knowledge surface

==============================================================================
  TOTAL: 10/18 (scaled: 17/30)
  RATING: Agent-ready

  Human-only        Agent-tolerant      Agent-ready        Agent-first
  0          7      8           14      15        22       23        30
==============================================================================
```

Bars:

- 0/3: `[...]`
- 1/3: `[#..]`
- 2/3: `[##.]`
- 3/3: `[###]`
- N/A: `[---]`

Rating bands, based on scaled score:

| Range | Rating |
| --- | --- |
| 0-7 | Human-only |
| 8-14 | Agent-tolerant |
| 15-22 | Agent-ready |
| 23-30 | Agent-first |

Scaled score:

```text
round((raw_score / max_applicable) * 30)
```

## Single-Dimension Format

```text
==============================================================================
                       SURFACE DIMENSION SCORE
                       [Project Name] - [Dimension Name]
                       [YYYY-MM-DD]
==============================================================================

  6. Error Handling       [##.]  2/3   RFC 9457 plus retry hints, missing docs

------------------------------------------------------------------------------
  EVIDENCE
  - src/lib/errors.ts:12 defines Problem Details fields.
  - src/http/rate-limit.ts:44 includes Retry-After.
  - No doc_uri field found.
==============================================================================
```

## Phase 2: Findings Report

Write full findings to `docs/surface/audit-YYYY-MM-DD.md`.

Every finding must include:

| Field | Content |
| --- | --- |
| What | Specific issue with path/line when possible |
| Why | Why this matters for agent consumption |
| Fix | Concrete steps |
| Impact | Dimension and current-to-target score |
| Severity | Critical, High, Medium, Low |

Cluster findings by what should be fixed together, not by scoring dimension.

Cluster format:

- Name
- One-sentence rationale
- Findings table: severity, file, issue, dimension
- Suggested approach
- Dependencies

Severity:

- Critical: blocks agent use entirely.
- High: significant friction or safety risk.
- Medium: suboptimal but functional.
- Low: polish or completeness issue.

## Phase 3: Transformation Plan

Write `docs/surface/plan.md`.

Each task includes:

- ID
- Description
- Files to create/modify
- Complexity: S, M, or L
- Score impact
- Dependencies
- Suggested owner/agent type
- Verification command or manual check

Default priority:

1. Context files
2. Discovery
3. Error handling
4. API descriptions
5. CLI output/schema/exit codes
6. Authentication
7. MCP server
8. Structured data
9. Data retrievability
10. Testing/evals
11. Multi-agent patterns

## Phase 4: Execution

Transform mode requires explicit user confirmation after presenting the plan summary.

Execution steps:

1. Group tasks by file ownership.
2. Identify parallel-safe groups.
3. Apply changes with narrow diffs.
4. Run targeted verification.
5. Re-score affected dimensions.
6. Update `docs/surface/scorecard.md`.
7. Present a delta scorecard.

Delta format:

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

## JSON Output

When `--format=json` is requested, include:

```json
{
  "project": "name",
  "date": "YYYY-MM-DD",
  "raw_score": 10,
  "max_applicable": 18,
  "scaled_score": 17,
  "rating": "Agent-ready",
  "dimensions": [],
  "findings": [],
  "plans": []
}
```

Do not omit the normal human-readable report unless the user asked for JSON only.
