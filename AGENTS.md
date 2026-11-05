# agentsurface

Agent Surface (https://agentsurface.dev) is a Next.js and Fumadocs guide to making software legible to AI agents, plus the installable `surface` skill. Project documentation and issues are in Linear (howells, AGE): [agentsurface — project documentation](https://linear.app/howells/document/agentsurface-project-documentation-8729bfeb67ab).

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

Git deploys are off. Production is built on this machine and published as a prebuilt artifact. Run these steps in order from a clean, pushed `main`, with the token from the macOS keychain (`vercel-token-howells`):

```sh
export VERCEL_TOKEN_HOWELLS="$(security find-generic-password -s vercel-token-howells -w)" VERCEL_TOKEN="$VERCEL_TOKEN_HOWELLS"
pnpm deploy:prod:pull
pnpm deploy:prod:stamp    # bakes the HEAD SHA into the build
pnpm deploy:prod:build
pnpm deploy:prod:publish  # deploys, checks the SHA, promotes
git checkout -- src/lib/build-info.generated.ts
```

## Safety rules

- Never commit `.env` or anything from `.vercel/`.
- `pnpm deploy:prod:publish` refuses to run on a dirty tree or a build stamped with a different SHA. Fix the tree; do not edit the stamp by hand.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
