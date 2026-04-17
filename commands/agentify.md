---
name: agentify
description: Audit and transform a codebase for AI agent consumability
argument-hint: "[score|plan|transform] [--dimension=X] [--format=json]"
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Agent
model: sonnet
---

Run the Agentify audit workflow.

Read `${CLAUDE_PLUGIN_ROOT}/skills/agentify/SKILL.md` and follow its instructions exactly.

The user's argument determines the mode:
- No argument or "audit": Full audit (Phases 0-2)
- "score": Quick scorecard only (Phases 0-1)
- "plan": Full audit + transformation plan (Phases 0-3)
- "transform": Full audit + plan + execute (Phases 0-4)

If `--dimension=X` is provided, audit only that dimension (api, cli, mcp, discovery, auth, errors, tools, context, multi-agent, testing).

If `--format=json` is provided, output the scorecard as JSON.

Begin with Phase 0: Project Detection. Gather all context in parallel before scoring.
