# Claude Code Context

Primary context is in `AGENTS.md` — read that first. This file adds Claude Code-specific notes only.

## Operative Skill

Use `/surface` for all audit, scoring, scaffold, and transform work in this repo.
The skill is installed via:

```bash
npx skills add https://github.com/howells/agentsurface
```

## Audit History and Plans

`docs/surface/` contains audit history and active transformation plans for this repository.
Check there before starting any audit or remediation work to avoid duplicating prior findings.

## Build Notes

`postinstall` runs `fumadocs-mdx`, so `npm install` will regenerate `.source/`.
This is expected — do not flag `.source/` changes as unexpected drift.

## Permission Boundaries

- Do not run `npm publish` under any circumstances.
- Do not `git push` without explicit instruction from the user.
- Do not modify `AGENTS.md` — it is the cross-runtime source of truth.
- Prefer editing source docs over duplicating explanations across files.
