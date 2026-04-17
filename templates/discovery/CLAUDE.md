<!--
CLAUDE.md — Claude Code-specific context overrides.

What: A focused markdown file that augments AGENTS.md with Claude Code-only settings: 
slash commands, subagents, MCP servers, skills, model preference, thinking budget.

When to use: When you want Claude Code to behave differently from other tools reading AGENTS.md.
If there are no Claude-specific overrides needed, omit this file.

What to customize:
1. Model selection (claude-opus-4-7, claude-sonnet-4-6, etc.)
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

**Default:** `claude-opus-4-7` for agent-related tasks (high reasoning, tool use, code generation).

**Override for specific tasks:**
- Lightweight refactoring, docs: `claude-sonnet-4-6`
- Very fast turnaround (prototypes): `claude-haiku-4-5-20251001`

Use the `model:` override in the prompt when needed; otherwise, Claude Code defaults to Opus 4.7.

---

## Subagents (.claude/agents/)

Subagents are ephemeral, isolated contexts for side tasks. Use to keep parent context lean.

**Available subagents:**

- **reviewer.md** — Code review only. Reads PR, checks linting + test coverage, returns summary. Read-only tools.
  
  ```
  Invoke: /review (Claude Code recognizes this)
  ```

- **tester.md** — Test runner. Runs `pnpm test`, analyzes failures, suggests fixes. Can modify test files only.
  
  ```
  Invoke: /test (automatic on test failure)
  ```

- **types.md** — TypeScript type checker. Runs `pnpm type-check`, reports errors with file + line. Read-only.

**Pattern:** Use subagents when:
- Task is orthogonal (review, testing, type-checking)
- Parent context is already large
- You want cheaper model (Sonnet 4.6) for side task
- You need permission boundary (read-only for reviewer)

---

## MCP servers

Claude Code auto-discovers MCP servers in:
1. `.claude/mcp.json` (local config)
2. `.claude/agents/*.md` (inline `mcp_servers:` field)
3. Workspace-level servers (IDE preference)

**Local servers (stdio):**

```json
{
  "mcpServers": {
    "mcp-acme": {
      "command": "node",
      "args": ["packages/mcp-server/dist/server.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

The local MCP server exposes all tools from `packages/mcp-server/src/tools/`. 
Test with: `pnpm --filter=@acme/mcp-server start`

**Remote servers:**

```json
{
  "mcpServers": {
    "example-remote": {
      "url": "https://api.example.com/mcp",
      "auth": {
        "type": "oauth2",
        "clientId": "...",
        "clientSecret": "..."
      }
    }
  }
}
```

---

## Skills

Project-scoped skills are stored in `.claude/skills/`. They persist in the session and auto-compact 
to ~5k tokens. Use for:
- Reusable agent workflows (e.g., "run tests and generate coverage report")
- Domain-specific helpers (e.g., "validate agent schema against MCP spec")
- Custom CLI wrappers (e.g., "deploy to staging + smoke test")

**Available skills:**

- `schema-validate.md` — Zod schema validator. Checks `src/schemas/*.ts` against spec.
- `test-summary.md` — Summarize test results from latest run.
- `deploy-staging.md` — Deploy dashboard to staging + run smoke tests (ask-first).

Invoke: `/schema-validate`, `/test-summary`, etc.

---

## Extended thinking

Claude Code supports extended thinking on Opus 4.7 (adaptive reasoning). 

Enable for complex tasks:
```
@task analyze-agent-bottleneck
Think deeply about why agent tool calls are slow. Profile, trace, suggest optimizations.
```

Claude will automatically allocate thinking budget. Monitor token usage via `model:info` command.

---

## Slash commands (Claude Code extensions)

Built-in Claude Code commands:

- `/test` — Run `pnpm test`, analyze failures
- `/lint` — Run `pnpm lint`
- `/review` — Code review via reviewer subagent
- `/init` — Generate CLAUDE.md (auto-run on repo first visit)

**Custom aliases** (if configured in IDE):

```
/schema-validate    → Run .claude/skills/schema-validate.md
/deploy-staging     → Run .claude/skills/deploy-staging.md (ask-first)
```

---

## Permissions

**Default mode:** `default` (ask-first for destructive actions; always for read/test).

**Enforced by Claude Code:**
- Never deploy to production without explicit confirmation
- Never rotate secrets or modify .env
- Never force-push to main
- Always ask before installing new dependencies (can break things)

**By task:**
- Read files + run tests: always
- Modify code + create PRs: always (but PR is draft by default)
- Install deps / DB migrations: ask-first
- Deploy / rotate credentials: never (Claude refuses)

Override `permission_mode` in CLAUDE.md only for trusted, fully-automated tasks:

```
permission_mode: plan  # Show plan, ask for confirmation once
```

---

## Known issues / gotchas (Claude Code-specific)

**MCP server lifecycle:** If you restart the MCP server (e.g., `pnpm --filter=@acme/mcp-server start`), 
Claude Code may keep stale tool definitions in memory. Workaround: refresh the IDE tab or start a new session.

**Type narrowing on optional fields:** Zod schema exports from `@acme/shared` sometimes show as `unknown` 
in Claude's type-checking pass. Workaround: Use `.parse()` before tool call; Claude then infers the shape.

**Monorepo filter commands:** `pnpm --filter=@acme/api dev` works in Claude Code terminal, but 
IDE debugging (breakpoints) only works if you `cd packages/api/` first.

**Extended thinking token count:** Thinking tokens count toward your 1M-token context on Opus 4.7. 
For long thinking sessions, use `model: claude-sonnet-4-6` to save on cost (no thinking).

---

## Context engineering (Claude-specific)

Claude Code caches `AGENTS.md` + `CLAUDE.md` at session start. Updates within a session are reflected 
immediately; changes persist across sessions.

**Prompt caching optimization:**
- Root layout + JSON-LD cached (doesn't change often)
- Test files cached (improves cache hit rate for test-heavy workflows)
- Tool schemas from MCP cached (refresh via IDE preference if needed)

Cache TTL: 5 minutes. Cost: ~10% of input tokens for cache reads.

---

## See also

- [Claude Code docs](https://code.claude.com/docs/en/claude-code)
- [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview)
- [MCP spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [AGENTS.md](./AGENTS.md) — Shared context (canonical reference)
- [.cursor/rules/project.mdc](./.cursor/rules/project.mdc) — Cursor IDE rules (different tool)
- `.claude/agents/reviewer.md` — Code review subagent
- `.claude/agents/tester.md` — Test runner subagent
