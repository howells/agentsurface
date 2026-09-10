# Agent Surface

A guide and implementation kit for making software legible to agents. It's a Fumadocs site plus a distributable skill, templates, and specialist agent prompts. Don't narrow it to one framework: Mastra is one supported orchestration option, not the default answer for every agent system.

Use the `/surface` skill for all guide, audit, score, scaffold, transform and generate work here rather than inventing parallel instructions. It installs with `npx skills add https://github.com/howells/agentsurface`.

## Layout

- `src/content/docs/` - the published docs, the canonical place for explanations.
- `skills/surface/SKILL.md` - operative workflow. `skills/surface/references/` - skill reference pages. `skills/surface/agents/` - specialist agent prompts.
- `templates/` - reusable templates cited by the docs.
- `disciplines/` - cross-cutting discipline notes (agentic patterns, tool design, evaluation, orchestration, retrievability, readiness auditing, proactive agents).
- `docs/surface/README.md` - the index of prior audits and active transformation plans. Read it before starting audit or remediation work so you don't repeat findings. Source documents live in `docs/` and `docs/arc/`.

## Traps and gates

- `src/content/docs/reference-links/models.mdx` is the single allowlist for model IDs used anywhere in docs, templates or skill references. `pnpm docs:check` enforces it. Update that page first, then sweep the examples.
- Fast-decay docs pages carry a `lastVerified: YYYY-MM-DD` frontmatter stamp and go stale after 120 days. Bump the date only when you substantively re-verify a page, never for a string swap. `pnpm build` runs the integrity check with `--no-freshness`, so a stale page only fails standalone `pnpm docs:check`.
- `postinstall` runs `fumadocs-mdx`, so `pnpm install` regenerates `.source/`. That's expected; don't flag it as drift, and never hand-edit generated Fumadocs output.
- Docs integrity also checks internal link targets, `meta.json` coverage, and that template paths cited in prose actually exist.
- Never run `npm publish` here, under any circumstances.
- Don't `git push` without an explicit instruction.

## Conventions

- Don't duplicate long explanations between this file and the docs. Update the canonical doc page instead, and keep `AGENTS.md` operational while product positioning lives in `README.md`, `INSTALL.md` and the docs content.
- Don't claim framework, auth, CLI, MCP or eval support exists unless code or templates provide it. Keep every example aligned with files that actually exist in this repo.
- Keep the scoring model, template names and specialist-agent names synchronised across docs and skill files.
- Route lint and format through the existing `@howells/lint` scripts; don't add direct lint tool dependencies.
- `rg` over `src/content/docs`, `skills/surface` and `templates` before creating new guidance, and search existing templates before adding a variant. For ambiguous agent terms, prefer this repo's docs and `skills/surface/references/` over general memory.
- Say which surface a change improves: docs, skill, template, API, CLI, MCP, auth, evals or retrievability.

## Commands

- `pnpm dev` - Next/Fumadocs dev server on port 3900.
- `pnpm docs:check` - documentation integrity, including the freshness gate.
- `pnpm build` - integrity check without freshness, then production build.
- `pnpm lint` / `pnpm lint:fix` / `pnpm format` - the shared lint and format lanes.
- `pnpm env:check` - validate local env through Envy.
- `pnpm deploy:preview` - env check, load `.env`, then a Vercel preview deploy.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
