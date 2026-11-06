# agentsurface

Agent Surface (https://agentsurface.dev) is a Next.js and Fumadocs guide to making software legible to AI agents, plus the installable `surface` skill.

## Terms

- **Guide**: the published docs in `src/content/docs`.
- **Surface skill**: the agent skill in `skills/surface`, installed from the site.
- **Markdown twin**: every docs page is also served as Markdown at `<path>.md` or with `Accept: text/markdown`. Request routing for this lives in `src/proxy.ts`.

## Commands

```sh
pnpm dev         # http://localhost:3900
pnpm typecheck
pnpm lint
pnpm test        # docs integrity and runtime contract tests
pnpm build
```

## Deploying to production

Git deploys are off. Production is built on this machine and published as a prebuilt artifact. Run these steps in order from a pushed `main`, with the token from the macOS keychain (`vercel-token-howells`):

```sh
export VERCEL_TOKEN_HOWELLS="$(security find-generic-password -s vercel-token-howells -w)" VERCEL_TOKEN="$VERCEL_TOKEN_HOWELLS"
pnpm deploy:prod:pull
pnpm deploy:prod:build
pnpm deploy:prod:publish  # deploys, checks the homepage, promotes
```

## Safety rules

- Never commit `.env` or anything from `.vercel/`.

## Agent skills

### Issue tracker

Issues live in Linear (howells, AGE). See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
