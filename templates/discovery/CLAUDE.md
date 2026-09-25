<!--
CLAUDE.md - optional Claude Code-only overlay.

Most repositories don't need this file. Claude Code (v2.1.277+) reads AGENTS.md
on its own when no CLAUDE.md exists, and so do most other coding agents.

Add CLAUDE.md only when Claude Code needs instructions no other tool should see:
skills, subagents or slash commands to use here, or hooks and MCP servers that
change how Claude should work.

If you add it, keep the `@AGENTS.md` import on the first line. Without it,
Claude Code reads this file instead of AGENTS.md and never loads AGENTS.md.
A sentence such as "see AGENTS.md" doesn't load the file.

Keep out of this file:
- Anything true for every agent (commands, conventions, boundaries): AGENTS.md
- Tool rules and the default permission mode: .claude/settings.json
  (permissions.allow / ask / deny, permissions.defaultMode), where they're enforced
- Model choice

Citation: https://code.claude.com/docs/en/memory#agents-md
-->

@AGENTS.md

## Claude Code

- Run /security-review on changes under `src/auth/` and `src/crypto/`.
- Use the `reviewer` subagent in `.claude/agents/` for pull request review; it has read-only tools.
- The `PostToolUse` hook in `.claude/settings.json` formats each file after an edit. Don't run the formatter by hand.
- The project MCP server in `.mcp.json` exposes the tools in `packages/mcp-server/src/tools/`. After changing a tool, restart the session so Claude sees the new definition.
