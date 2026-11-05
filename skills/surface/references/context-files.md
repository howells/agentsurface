# Context Files

Dimension 8: AGENTS.md and any tool-specific overlays. A well-curated AGENTS.md
alone can score 3.

## Score

- **0**: No AGENTS.md, CLAUDE.md or equivalent.
- **1**: A file exists but is generic, uncurated `/init` output, prose
  architecture without commands, or over 500 lines.
- **2**: Hand-curated; exact commands first; testing expectations; always /
  ask-first / never boundaries; non-obvious conventions with file references;
  under 370 lines.
- **3**: AGENTS.md is the single source. Overlays (CLAUDE.md, Cursor rules,
  Copilot instructions) exist only for what AGENTS.md can't give that tool, and
  defer to it rather than restate it. Nested files where the repo needs them.
  Clearly maintained from real friction.

Two length numbers, two jobs: under 370 lines is the audit tolerance for a file
you didn't write; about 150 lines (300 at most) is the target for a file you
generate. A 340-line file passes, but don't write one.

## Evidence to gather

- `AGENTS.md` at the root and in packages; `CLAUDE.md`, `.claude/CLAUDE.md`,
  `CLAUDE.local.md`; `.cursor/rules/*.mdc`; `.github/copilot-instructions.md`
  and `.github/instructions/*.instructions.md`; `GEMINI.md`;
  `.windsurf/rules/`.
- Line counts, whether commands are exact and current (run one or two), and
  whether boundaries are rules ("Never…") or aspirations ("We try not to…").
- Duplication between AGENTS.md and the overlays.
- Git history: edited over time, or generated once.

## How the clients load these files

- **Claude Code** (v2.1.277+) reads AGENTS.md only when no `CLAUDE.md`,
  `.claude/CLAUDE.md` or `CLAUDE.local.md` exists in the directory or above it.
  If one does, it reads that instead: one or the other, not both. A CLAUDE.md
  loads AGENTS.md only with an `@AGENTS.md` import (a prose "see AGENTS.md"
  doesn't), or when the per-person Project instructions setting
  (`claude-md-and-agents-md`) is on. That setting is ignored in project settings,
  so a repo can't set it for contributors.
- Keep a CLAUDE.md containing `@AGENTS.md` anyway when contributors may run
  Claude Code before v2.1.277; before v2.1.281 on some sessions (Amazon Bedrock,
  telemetry disabled); with the built-in AGENTS.md plugin disabled; or in the
  first session after upgrading from v2.1.276 or earlier. Newer versions never
  load it twice. A personal `CLAUDE.local.md` hides AGENTS.md for that developer
  unless it imports it too.
- Put `@AGENTS.md` on the first line (house rule; imports work anywhere), then
  only Claude-specific lines. Check what loaded with `/context` → Memory files;
  `/memory` manages files but doesn't confirm loading.
- Rules that must hold whatever the model decides belong in
  `.claude/settings.json` permissions or a `PreToolUse` hook, not prose. Model
  choice and memory belong in settings, not instruction files.
- **Cursor** reads AGENTS.md and `.cursor/rules/*.mdc` (scoped by `globs` or
  `alwaysApply`). Nested AGENTS.md files combine with their parents; the more
  specific wins on conflict.
- **GitHub Copilot** reads AGENTS.md, `.github/copilot-instructions.md` and
  path-scoped `.github/instructions/*.instructions.md` (`excludeAgent:
"code-review"` or `"cloud-agent"` keeps one away from that surface).
- **Gemini CLI** reads the filenames in `context.fileName`, default `GEMINI.md`.
  AGENTS.md loads only if added there; it isn't a fallback.
- AGENTS.md is plain Markdown with no schema, frontmatter or parser
  (agents.md, Agentic AI Foundation under the Linux Foundation).

## What a good AGENTS.md holds

In this order:

1. Purpose in one to three sentences.
2. Exact commands with flags (`pnpm test --filter=@app/api`, not "run the
   tests"), marked fast or slow, and which ones gate CI.
3. A map of key directories, as paths, not descriptions.
4. Conventions an agent would get wrong, each with a file reference.
5. How to verify a change.
6. Boundaries in three tiers:

```text
Always: read src/ and tests/, run pnpm test, open draft PRs
Ask first: add dependencies, run migrations, change tsconfig
Never: deploy to production, rotate secrets, delete branches
```

7. Gotchas with file references ("Node 18.12+ required; see .nvmrc").
8. Links to deeper docs (ADRs, runbooks) rather than pasted content.

Write imperatives and relative paths. Point to files instead of describing
code. In a monorepo the root file maps packages and their filtered commands,
and each package has its own AGENTS.md with its own boundaries. Which nested
files load is up to each client, so check the clients the team uses.

## Templates

- `templates/discovery/AGENTS.md`
- `templates/discovery/monorepo-AGENTS.md`
- `templates/discovery/CLAUDE.md` (only when Claude needs something extra)
- `templates/discovery/cursor-rules.mdc`
- `templates/discovery/copilot-instructions.md`
