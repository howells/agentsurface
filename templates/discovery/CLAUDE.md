<!--
CLAUDE.md — Claude Code-specific context overrides.

What: A focused markdown file that augments AGENTS.md with Claude Code-only settings:
slash commands, subagents, MCP servers, skills, model preference, thinking budget.

When to use: When you want Claude Code to behave differently from other tools reading AGENTS.md.
If there are no Claude-specific overrides needed, omit this file.

What to customize:
1. Model selection (claude-opus-5, claude-sonnet-5, etc.)
2. Subagents (path to .claude/agents/*.md files)
3. MCP servers (remote servers, local stdio servers)
4. Skills (scoped to project)
5. Slash commands (what Claude can invoke automatically)
6. Extended thinking budget (for reasoning-intensive tasks)
7. Permission mode (default, acceptEdits, bypassPermissions, plan, dontAsk, auto)

Rule: Start with "See AGENTS.md for commands, testing, and boundaries."
Only override where Claude differs. Keep <150 lines.

Citation: https://code.claude.com/docs/en/claude-code
-->

# CLAUDE.md

Claude Code context for Acme Agent Tools.

**For shared context (commands, conventions, boundaries):** See [AGENTS.md](./AGENTS.md).

This file documents Claude Code-specific settings only.

---

## Model selection

**Default:** `claude-opus-5` for agent-related tasks (high reasoning, tool use, code generation).

**Override for specific tasks:**

- Lightweight refactoring, docs: `claude-sonnet-5`
- Very fast turnaround (prototypes): `claude-haiku-4-5-20251001`

Use the `model:` override in the prompt when needed; otherwise, Claude Code defaults to Opus 5.

**Extended thinking:** Opus 5 allocates its thinking budget adaptively, and thinking tokens count
toward the context window. Drop to `claude-sonnet-5` for long, cost-sensitive sessions.

---

## Subagents (.claude/agents/)

Ephemeral, isolated contexts for side tasks. Use them to keep the parent context lean.

- **reviewer.md** — Code review only. Reads the PR, checks linting and test coverage. Read-only tools. Invoke `/review`.
- **tester.md** — Runs `pnpm test`, analyzes failures, suggests fixes. Can modify test files only. Invoke `/test`.
- **types.md** — Runs `pnpm type-check`, reports errors with file and line. Read-only.

Reach for a subagent when the task is orthogonal, the parent context is already large, a cheaper
model will do, or you need a hard permission boundary.

---

## MCP servers

Claude Code auto-discovers MCP servers in `.claude/mcp.json`, the inline `mcp_servers:` field of
`.claude/agents/*.md`, and workspace-level IDE settings.

**Local server (stdio):**

```json
{
  "mcpServers": {
    "mcp-acme": {
      "command": "node",
      "args": ["packages/mcp-server/dist/server.js"],
      "env": { "NODE_ENV": "development" }
    }
  }
}
```

Exposes every tool in `packages/mcp-server/src/tools/`. Test with `pnpm --filter=@acme/mcp-server start`.

**Remote server:**

```json
{
  "mcpServers": {
    "example-remote": {
      "url": "https://api.example.com/mcp",
      "auth": { "type": "oauth2", "clientId": "...", "clientSecret": "..." }
    }
  }
}
```

---

## Skills and slash commands

Project-scoped skills live in `.claude/skills/`:

- `schema-validate.md` — Zod schema validator. Checks `src/schemas/*.ts` against spec.
- `test-summary.md` — Summarize test results from the latest run.
- `deploy-staging.md` — Deploy dashboard to staging and run smoke tests (ask-first).

Invoke as `/schema-validate`, `/test-summary`, `/deploy-staging`. Built-in `/test`, `/lint`, and
`/review` map onto the subagents above.

---

## Permissions

**Default mode:** `default` — ask-first for destructive actions, always-allow for read and test.
AGENTS.md owns the full three-tier boundary list; only Claude-specific overrides belong here.

- Never deploy to production without explicit confirmation
- Never rotate secrets or modify `.env`
- Never force-push to main

Override `permission_mode` only for trusted, fully-automated tasks:

```
permission_mode: plan  # Show plan, ask for confirmation once
```

---

## Known issues (Claude Code-specific)

**MCP server lifecycle:** After restarting the MCP server, Claude Code may hold stale tool
definitions. Refresh the IDE tab or start a new session.

**Monorepo filter commands:** `pnpm --filter=@acme/api dev` works in the Claude Code terminal, but
IDE breakpoints only bind if you `cd packages/api/` first.

---

## See also

- [Claude Code docs](https://code.claude.com/docs/en/claude-code)
- [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview)
- [MCP spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [AGENTS.md](./AGENTS.md) — Shared context (canonical reference)
- `.claude/agents/reviewer.md`, `.claude/agents/tester.md` — subagents
