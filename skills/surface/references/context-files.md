# Context Files

## Summary

Dimension 8 scores presence and quality of AGENTS.md, CLAUDE.md, and tool-specific overrides. AGENTS.md is the cross-tool baseline; CLAUDE.md and .cursor/rules are tool-specific overlays. Well-curated files (hand-written, <370 lines, commands-first, permission boundaries explicit) scale knowledge across agents. Quality vs. presence: auto-generated files score low; iteratively maintained files from friction score high. Multi-tool context with progressive disclosure scores highest.

- **0**: No AGENTS.md or context files (blocker)
- **1**: Generic/auto-generated, >500 lines, no actionable commands
- **2**: Hand-curated, commands at top with flags, permission boundaries, <370 lines
- **3**: Multi-tool (AGENTS.md + CLAUDE.md + .cursor/rules), progressive disclosure, evolved from use
- **Evidence**: File presence, line count, command sections, permission tiers, recency

---

Context files are the foundational onboarding layer for AI coding agents. They define what an agent can and cannot do, where to find key files and commands, and how to navigate architectural decisions. A well-curated AGENTS.md beats ten generic prompts—it scales your knowledge across all agents and tools that read it, from Claude Code to Cursor to GitHub Copilot. This dimension assesses both presence and quality: Do context files exist? Are they curated or auto-generated? Do they follow the AGENTS.md standard?

## Scoring rubric

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No AGENTS.md, CLAUDE.md, or equivalent. | No agent context files found. |
| 1 | Context file exists but generic or auto-generated. Prose paragraphs. No actionable commands. | AGENTS.md or CLAUDE.md present but: >500 lines, or contains architecture overview without commands, or was clearly auto-generated (/init without curation). |
| 2 | Hand-curated context files. Commands with exact flags first. Testing expectations. Three-tier permission boundaries (always/ask-first/never). Code examples. | Commands section at top with exact invocations. Permission boundaries defined. <370 lines. Non-obvious conventions documented with examples. |
| 3 | Multi-tool context. AGENTS.md (universal) + CLAUDE.md (Claude-specific) + .cursor/rules (Cursor-specific). Progressive disclosure (points to detailed docs). Updated iteratively from friction. | Multiple context file formats. Progressive disclosure via file references. Permission boundaries enforced. Files clearly evolved from usage (not auto-generated). |

## Evidence to gather

- **Presence**: AGENTS.md in project root (highest priority); CLAUDE.md, .claude/agents/, .claude/CLAUDE.md
- **Format variants**: .cursor/rules/*.mdc, .github/copilot-instructions.md, .windsurf/rules/, GEMINI.md
- **Quality heuristics**: 
  - Line count (50–370 ideal; >500 is a red flag)
  - Commands section at top with exact invocations (pnpm, npm, cargo, python -m, etc.)
  - Permission boundaries explicitly stated (always / ask-first / never)
  - Architecture links rather than prose (references to /docs/arc/decisions/, not paragraphs)
  - Recency: timestamps or git history show active maintenance
  - Absence of generic template language ("This project uses..."; auto-generated footprints)

## Deep dive

### AGENTS.md as the unified baseline

AGENTS.md is governed by the [Agentic AI Foundation (Linux Foundation)](https://agents.md). It is read by Claude Code, Cursor, Windsurf, Kilo, GitHub Copilot, JetBrains Codex, Aider, Jules, Zed, Warp, RooCode, and many others. More than 60,000 public repositories now ship AGENTS.md. The format is **plain markdown with no schema**—no YAML frontmatter, no JSON. This simplicity is intentional: agents must parse it with regex and heuristics, so readability and structural consistency matter more than strict formats.

Recommended top-to-bottom sections:
1. **Project purpose** (1–3 sentences). Why does this repo exist? What does it do?
2. **Common commands with exact invocations** (pnpm, npm, turbo, make, etc.). `pnpm dev`, not "run dev". Include `--verbose`, `--json` variants.
3. **Tech stack / key files / directory map**. Link to src/, tests/, docs/. No generic descriptions.
4. **Coding conventions**. Naming (kebab-case filenames; camelCase functions). Import style. Tools used (ESLint, Prettier, LSP).
5. **Testing expectations**. `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`. Which tests block merge? CI integration.
6. **Permission boundaries** (always / ask-first / never). 
   - Always: read files, run tests, open PRs via `gh`.
   - Ask first: install dependencies, run migrations, modify DB schema.
   - Never: production deploys, rotate credentials, delete branches.
7. **Non-obvious gotchas with code references**. "Do not modify package.json directly; use changesets" (reference `/CONTRIBUTING.md`). "pnpm install may fail if Node <18.12" (reference `.nvmrc`).
8. **Links to deeper docs**. Point to ADRs, architecture diagrams, runbooks, onboarding guides.

### Tool-specific overrides

- **CLAUDE.md**: Claude Code-specific hooks only. If Claude Code should behave differently (e.g., use a different model, trigger specific skills), document it here. But keep it minimal—avoid duplication. Start with "See AGENTS.md" and layer on top.
- **.cursor/rules/*.mdc**: Cursor-specific rules, scoped by `globs` or `alwaysApply`. Reference AGENTS.md for shared commands; override only where Cursor differs.
- **.github/copilot-instructions.md**: GitHub Copilot custom instructions. Same pattern: reference AGENTS.md, add Copilot-only guidance.
- **GEMINI.md** / **.windsurfrules** / **.windsurf/rules/**: Tool-specific variants. Keep as thin overlays.

### Progressive disclosure

Large repos need a hierarchy:
- AGENTS.md at root = overview, commands, boundaries. Tight (~150 lines).
- Per-package AGENTS.md in monorepos (e.g., packages/api/AGENTS.md, packages/web/AGENTS.md) = scoped detail.
- Link out to deeper docs: `/docs/arc/decisions/` for ADRs, `/docs/architecture.md` for diagrams, `/docs/CONTRIBUTING.md` for full flow.

This lets an agent start with the root AGENTS.md, then drill down only if needed.

### Permission boundaries (three-tier)

Make boundaries explicit and enforceable:

```
Always:
- Read files in src/, tests/, docs/
- Run tests: pnpm test
- Open PRs: gh pr create --draft
- Review lint errors

Ask first:
- Install new dependencies (pnpm add ...)
- Run migrations (pnpm db:migrate)
- Modify TypeScript config
- Commit directly to main (use PR instead)

Never:
- Deploy to production
- Rotate API keys or secrets
- Delete branches or tags
- Modify .env in git
```

### Commands with exact invocations

Ship the actual command lines, not prose. Denote which commands are fast (<5s) vs slow (minutes). Include flags that affect agent behavior (--json, --dry-run, --force).

**Development** (fast):
```
pnpm dev          # Start dev server (http://localhost:3000)
pnpm test         # Run all tests (~8s)
pnpm test:watch   # Watch mode (blocks on first failure)
pnpm lint         # ESLint + Prettier check (~3s)
pnpm type-check   # TypeScript full check (~5s)
```

**Build** (slow):
```
pnpm build        # Production bundle (~2m)
pnpm build:preview  # Local server preview (http://localhost:4173)
turbo run test --filter=@app/* -- --coverage  # Monorepo subset
```

**Monorepo commands**:
```
turbo run build    # All packages in dependency order
turbo run test --parallel -- --watch  # Parallel test watch
changeset add      # Stage version bump (required before release)
changeset version  # Update versions from changesets
```

**Database / migrations** (ask-first):
```
pnpm db:migrate    # Apply pending migrations (~30s)
pnpm db:migrate:rollback  # Undo last migration
pnpm db:seed       # Populate test data
```

Include timing (fast <5s, slow >30s), whether they require user input (--yes flag to bypass), and which commands block CI/CD.

### Writing style

- **Imperative voice**: "Run pnpm dev", not "running the dev server".
- **Headings short**; bullets tight. Aim for scannability.
- **Cite file paths** with relative root. `src/lib/`, not `~/projects/my-app/src/lib/`.
- **Never describe what code does in prose** when a file reference suffices. Instead of "We use Zod for schema validation," write: "See `src/schemas/` for Zod types."
- **Update iteratively**. When an agent gets something wrong, update the file. AGENTS.md is live documentation, not a snapshot.

### Anti-patterns to avoid

- **Auto-generated CLAUDE.md from `/init`** that nobody curated. Delete it; write by hand.
- **Prose-heavy architecture paragraphs** with no commands. If you're explaining a pattern, include a code reference.
- **1500-line files** that exhaust context budget. Split into multiple files or link to /docs/.
- **Stale content**. Commands that no longer exist, removed directories, deprecated flags. Tag entries with last-verified date if >6 months old.
- **Duplication across AGENTS.md, CLAUDE.md, .cursor/rules/**.  Single source of truth: AGENTS.md. Others reference it.
- **Boundaries written as aspirations**, not rules. "We try not to..." should be "Never...". Agents follow rules, not culture.

### Multi-file strategy

- **Single source of truth**: AGENTS.md.
- **CLAUDE.md**: "See AGENTS.md for commands and boundaries. Claude-specific additions: [list]."
- **.cursor/rules/*.mdc**: Reference AGENTS.md section headers. Add Cursor-scoped rules (e.g., per-file globs).
- **.github/copilot-instructions.md**: Same pattern. Copilot overrides only.

Resist sprawl. Every tool should link to the canonical AGENTS.md.

### Memory patterns (cross-session)

Claude Code's memory tool (beta `context-management-2025-06-27`) persists `/memories` across sessions. Use this for "learned" constraints that came from friction:

```
# memories/AGENTS.md-lessons.md
- pnpm install needs Node 18.12+ (added to .nvmrc)
- changesets required for version bumps; ci blocks merge without them
- Always run pnpm type-check before commit (blocks CI otherwise)
- Database migrations require approval; never run auto-migrate in CI without explicit gate
```

Cursor's memory system also surfaces relevant past context across sessions. Update AGENTS.md when a memory becomes stable; use memory for transient lessons or session-specific constraints discovered during work.

### Monorepo-specific patterns

Monorepos (pnpm workspaces, Yarn workspaces, Lerna, Turbo) need per-package AGENTS.md files:

```
packages/api/AGENTS.md         # API server conventions, env vars, test setup
packages/web/AGENTS.md         # Frontend commands, build targets
packages/shared/AGENTS.md      # Shared types, publishing flow
```

Root AGENTS.md should reference the monorepo structure:
```
Monorepo layout:
  packages/api       pnpm --filter=@app/api dev
  packages/web       pnpm --filter=@app/web dev
  packages/shared    pnpm --filter=@app/shared type-check
```

Each package can override permission boundaries (e.g., API server can deploy, web package cannot). Turbo tasks should reference both global and per-package AGENTS.md files.

## Cross-vendor notes

- **Anthropic** treats AGENTS.md as first-class. CLAUDE.md takes precedence when both present. Fully supported: [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code/overview).
- **Cursor** reads AGENTS.md + .cursor/rules/ with high fidelity. See [Cursor rules docs](https://docs.cursor.sh/advanced/rules-for-ai).
- **GitHub Copilot** reads AGENTS.md and .github/copilot-instructions.md. Lower token budget than Claude; keep instructions terse.
- **Google Gemini CLI** reads GEMINI.md + AGENTS.md (if Gemini-specific file missing, defaults to AGENTS.md).

## Templates and tooling

- `/templates/AGENTS.md` — universal baseline (80–150 lines).
- `/templates/CLAUDE.md` — Claude override template.
- `/templates/cursor-rules.mdc` — Cursor rule example.
- `/templates/copilot-instructions.md` — GitHub Copilot template.
- `/templates/monorepo-AGENTS.md` — per-package pattern for pnpm/turbo workspaces.

Tooling:
- [agentskills.io](https://agentskills.io) — registry + validation.
- `aicodecheck` — lint AGENTS.md for common issues (line count, missing commands).
- `llm-context` — CLI to preview token cost of context files.
- Simple npm scripts: `node scripts/validate-agents.js` (check presence, line count, command parsing).

### Real-world example structure

A minimal AGENTS.md for a TypeScript Next.js monorepo:

```markdown
# AGENTS.md

Monorepo for SaaS platform: API (Node + Fastify), Web (Next.js 15), Shared types.

## Quick start

Development:
  pnpm dev        # Both API + Web
  pnpm test       # All packages
  pnpm lint       # ESLint + Prettier

Build & release:
  pnpm build      # Production builds (~2m)
  changeset add   # Stage version bump
  pnpm release    # Publish to npm

## Commands by package

API server (packages/api):
  pnpm --filter=@app/api dev         # http://localhost:3001
  pnpm --filter=@app/api test:watch
  pnpm --filter=@app/api db:migrate  # Ask before running

Web (packages/web):
  pnpm --filter=@app/web dev         # http://localhost:3000
  pnpm --filter=@app/web build       # Static export to out/

Shared (packages/shared):
  pnpm --filter=@app/shared type-check
  pnpm --filter=@app/shared build    # Emits TS + ESM

## Conventions

- Filenames: kebab-case
- Functions: camelCase
- API routes: /api/v1/...
- Environment: .env.example tracked; .env.local ignored
- Git: changesets required for version bumps (no hand-edit package.json)

## Testing

Unit tests: vitest (--coverage flag for reports)
Integration: playwright in packages/web, e2e agent tests in ci

pnpm test passes before merge.

## Boundaries

Always:
  - Read files, run tests, open PRs (gh pr create --draft)

Ask first:
  - New dependencies (pnpm add ...)
  - Database migrations (pnpm db:migrate)
  - Merge to main (use PR instead)

Never:
  - Deploy to production
  - Modify secrets or env vars
  - Delete branches or tags

## Gotchas

- pnpm install requires Node 18.12+ (.nvmrc enforced)
- TS errors block build; use // @ts-expect-error with comment
- Changesets required for npm publish (ci gate)
- Database: migrations are append-only; rollback only in dev

## Links

- Architecture: docs/ARCHITECTURE.md
- API: packages/api/README.md
- Contributing: CONTRIBUTING.md
```

This example is ~90 lines, command-first, boundary-explicit, and ready to ship.

## Citations

- [agents.md](https://agents.md) — Agentic AI Foundation (Linux Foundation).
- [Claude Code docs on CLAUDE.md](https://docs.anthropic.com/en/docs/claude-code/overview).
- [Cursor rules docs](https://docs.cursor.sh/advanced/rules-for-ai).
- [GitHub Copilot custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-copilot).
- Simon Willison: [Context Engineering](https://simonwillison.net/2023/Dec/28/context-engineering/) (foundational essay on agent context design).
- Anthropic: [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).

## See also

- `docs/context-files` (project-specific deep dive)
- `templates/AGENTS.md`, `templates/CLAUDE.md` (starter files)
- `references/multi-agent.md` (orchestrator context patterns)
- `references/tool-design.md` (tool descriptions inform AGENTS.md examples)
