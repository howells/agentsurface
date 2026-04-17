# Agent Evaluation Discipline

## Summary

A systematic evaluation loop (Detect → Score → Report → Plan → Transform → Re-score → Track) for measuring agent-readiness. Every score must be evidence-based (file paths, grep results, command output), never guesses. Avoid optimism bias by grounding in specifics. Mark dimensions N/A only when genuinely inapplicable. Track confidence levels (high/medium/low) based on coverage. Group findings by action ("what you'd fix together"), not by category. Maintenance is key: keep scorecards as historical record for trend analysis.

- **Detect**: Identify existing agent surfaces (MCP, OpenAPI, CLI, context files)
- **Score**: Rate each dimension 0-3 with evidence
- **Report**: Cluster findings by dependency/action, not dimension
- **Plan**: Prioritize by impact-to-effort ratio
- **Transform**: Execute via specialist agents
- **Re-score**: Measure improvement with delta scorecard
- **Track**: Maintain history for trend analysis

---

How to systematically evaluate whether a codebase is ready for AI agent consumption.

## Core Principle

> Ambiguity that humans resolve through intuition becomes failure modes at scale with agents.
> Every design decision should be evaluated against: "what happens when the consumer
> cannot ask a clarifying question?"

## The Evaluation Loop

```
Detect → Score → Report → Plan → Transform → Re-score → Track
```

1. **Detect**: Identify what agent surfaces exist (MCP, OpenAPI, CLI, context files)
2. **Score**: Rate each dimension 0-3 using evidence-based rubrics
3. **Report**: Cluster findings by what you'd fix together
4. **Plan**: Prioritize by impact-to-effort ratio
5. **Transform**: Execute via specialist agents
6. **Re-score**: Measure improvement with delta scorecard
7. **Track**: Maintain scorecard history for trend analysis

## Evidence-Based Scoring

Every score MUST cite specific evidence:

- **File paths**: "openapi.yaml:45 — description is 4 words"
- **Grep results**: "No files contain 'isError' or 'is_retriable'"
- **Glob findings**: "0 files match **/llms.txt"
- **Command output**: "`mytool --help --json` returns exit code 2 with no output"

Scores without evidence are guesses. Guesses drift high (optimism bias).

## Confidence Levels

| Level | Meaning | When to Use |
|-------|---------|-------------|
| High | Examined >80% of relevant code | Small projects, focused dimensions |
| Medium | Examined key files and patterns | Large projects, sampled representatively |
| Low | Examined <30% or inferred from structure | Very large projects, quick scans |

Low-confidence scores should be flagged for manual verification.

## The N/A Trap

Marking a dimension N/A when it could apply inflates the score.
Only mark N/A when the dimension is genuinely inapplicable:

- CLI Design N/A: project is a web app with no CLI tool
- Multi-Agent N/A: project does not orchestrate agents
- Discovery N/A: project is a pure library with no web presence

"We haven't built an MCP server yet" is a 0, not N/A.
"This project has no reason to have an MCP server" is N/A.

## Clustering Findings

Group by action, not by category.

Bad: "3 API findings, 2 MCP findings, 1 Discovery finding"
Good: "Agent tool discoverability (3 findings: weak OpenAPI descriptions + no MCP + no llms.txt)"

The cluster name should answer: "What user-visible problem does fixing this cluster solve?"
