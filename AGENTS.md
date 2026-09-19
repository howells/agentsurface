# Agent Surface

A guide and implementation kit for making software legible to agents: a Fumadocs site plus a distributable skill, templates and specialist agent prompts. Don't narrow it to one framework - Mastra is one supported orchestration option, not the default answer.

Use the `/surface` skill for all guide, audit, score, scaffold, transform and generate work here rather than inventing parallel instructions.

## Layout

- `src/content/docs/` is the published docs and the canonical place for explanations. Keep this file operational; positioning lives in `README.md`.
- `skills/surface/SKILL.md` is the operative workflow, with `references/` and `agents/` beside it. `templates/` holds the starter files a consumer repo copies, `disciplines/` the cross-cutting notes.
- `docs/surface/README.md` indexes prior audits and transformation plans. Read it before audit work so you don't repeat findings.

## Gates and constraints

- `src/content/docs/reference-links/models.mdx` is the single allowlist for model ids used anywhere in docs, templates or skill references, enforced by `pnpm docs:check`. Update that page first, then sweep the examples.
- Fast-decay pages carry a `lastVerified: YYYY-MM-DD` stamp and go stale after 120 days. Bump it only on a real re-verification. `pnpm build` runs integrity with `--no-freshness`, so a stale page fails only standalone `pnpm docs:check`.
- `postinstall` runs `fumadocs-mdx`, so `pnpm install` regenerates `.source/`. Generated Fumadocs output is never hand-edited.
- Builds run on Apple Silicon, so `next.config.mjs` drops the macOS sharp binaries from file tracing and `deploy:prod:build` parks the local `.env` under `.vercel/` first. Without both, the Vercel builder traces files it then refuses to upload.
- Never `npm publish` here.

## Commands

`pnpm dev` serves Fumadocs on port 3900. `pnpm check` is the whole gate: docs integrity, lint, typecheck. Production deploys are `deploy:prod:pull`, `:stamp`, `:build`, `:verify`, `:publish` in order. If `deploy:prod:publish` trips over a `<claude-code-hint>` line on stderr, deploy with `vercel deploy --prebuilt --prod --scope danielhowells` and check the routes by hand.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
