# Agent Surface: The July 2026 Currency Review

## A briefing on everything that changed, why it changed, and what it says about documenting a fast-moving ecosystem

This document explains a full-repository review and remediation of Agent Surface — a documentation site, skill, and template library about making software legible to AI agents — carried out on July 28, 2026. The working instruction for the review was blunt: assume everything you think you know is now out of date. What follows is the story of what that assumption turned up, what got fixed, and the systems now in place to keep the content honest.

---

## The setup: auditing the auditors

Agent Surface is a project with an unusual shape. It is simultaneously a public documentation site (about 150 pages covering agent protocols, tool design, retrieval, evaluation, and discovery), an installable skill that AI coding agents use to audit *other* codebases for agent-readiness, and a library of 59 code templates that get copied into real projects. That triple identity raises the stakes on accuracy: a stale claim in the docs misleads a reader, but a stale claim in the skill gets mechanically applied to someone else's repository, and a broken import path in a template gets pasted into someone's production code.

The review ran as a foreman-style operation: one coordinating agent planned the work, did the load-bearing research, and inspected every diff, while seven delegated workstreams did the writing — heavyweight agents for judgment-sensitive content, cheaper ones for mechanical sweeps. Before any editing began, the plan itself was put through two independent expert reviews, which caught real problems in it — including one instruction that would have handed a mechanical agent *wrong* fix-it directions. More on that later.

## Surprise number one: three weeks is now a long time

The repository's content had last been verified against the outside world on July 6, 2026 — twenty-two days before the review. The reasonable expectation was that little would have moved in three weeks.

Instead, the entire frontier model lineup had turned over:

- **Anthropic shipped Claude Opus 5 on July 24** — four days before the review — positioned as an everyday default with a one-million-token context window and near-flagship capability at half the flagship's price.
- **OpenAI shipped the GPT-5.6 family on July 9**, replacing the single-model scheme with three named capability tiers: Sol for deep reasoning, Terra for balance, and Luna for speed and cost.
- **Google shipped Gemini 3.6 Flash on July 21**, superseding the 3.5 Flash model the docs recommended.

Every model recommendation in the repository — the canonical reference page, dozens of documentation examples, and the model IDs baked into templates — referenced a lineup that no longer represented anyone's current defaults. The repository's own continuous-integration check flagged exactly one hundred stale model identifiers once the canonical list was updated. All one hundred were replaced, with the judgment applied per context: flagship examples moved to flagship models, cost-tier examples to cost-tier models.

The lesson for anyone maintaining AI-adjacent documentation: model references now have a shelf life measured in weeks, and any page that hard-codes them needs machinery, not good intentions, to stay current.

## Surprise number two: the protocol shipped on review day

The Model Context Protocol — MCP, the standard for connecting AI agents to tools and data, and the single most-referenced specification in the entire repository — had its largest revision since launch scheduled for final publication on July 28, 2026. The day of the review.

This was not a coincidence the review got lucky on; the repository's own July 6 upgrade plan had explicitly scheduled a recheck for after July 28. The review honored that appointment, and found a subtlety worth recording: on the morning of the 28th, the official specification site had not yet flipped — the "latest" pointer still served the previous revision, and no final-release announcement existed. So rather than writing "the 2026-07-28 spec was released" as settled history, every touched page uses precise framing: the revision's release candidate has been locked since May 21, final publication is scheduled for today, and the predecessor revision remains the one with the fullest deployed SDK support while the rollout window runs.

The changes themselves are substantial enough to reshape how MCP servers get built, and the docs now cover all of them:

- **The protocol becomes stateless.** Sessions and the connection handshake are removed entirely. Every request carries its own version and capability information. Cross-call state moves to explicit handles passed as ordinary tool arguments — which means the horizontally-scalable serverless pattern the site's own MCP endpoint already uses becomes the mandatory model.
- **Three long-standing features are deprecated**: Roots, Sampling, and Logging, each with a documented migration path and a minimum twelve-month removal window under a new formal deprecation policy.
- **Long-running tasks and interactive UI move out of the core** and become official extensions under a new extensions framework.
- **Tool schemas open up to the full JSON Schema standard**, authorization gets six separate hardening changes, and the old dynamic client registration mechanism is deprecated in favor of Client ID Metadata Documents.

Rather than deleting working guidance — the deployed SDK ecosystem still runs on the previous revision — every affected page keeps its current-revision instructions and adds clearly-marked "changing in 2026-07-28" callouts with migration advice. Readers get told what works today and what survives tomorrow.

## The real finding: the docs were fine, the skill was drifting

Here is the part of the review that inverted expectations. The documentation site — the thing that looks most perishable — turned out to be in good shape, because it had been systematically refreshed three weeks earlier. The stale surface was the *skill*: the instructions and reference files that agents actually execute.

The skill's reference files disagreed with each other and with reality in ways an audit-by-hand had missed:

- Four different model IDs were each presented somewhere as "the current Opus."
- The MCP software development kit was described as "version 2.x" — no version 2 exists; the real current version is 1.30.
- One template imported a transport class called `HttpServerTransport` from a module path that has never existed in the SDK, and called it with a constructor signature that also doesn't exist. Another agent prompt called the same class by a *third* name. The real export is `StreamableHTTPServerTransport`, and every corrected import path in the review was verified against the actual installed package rather than anyone's memory — including the reviewing agents' own.
- The guidance gave four different maximum lengths for an AGENTS.md file. The review's expert pass caught something subtle here: two of those numbers weren't contradictions at all, but two different jobs — a lenient tolerance for *scoring other people's existing files* and a stricter target for *writing new ones*. Collapsing them into one number would have silently made the audit harsher for repositories that hadn't changed. The fix labels both numbers by role instead of unifying them.
- A pricing claim stated OpenAI's large embedding model costs $0.02 per million tokens. That's the *small* model's price; the large one costs $0.13. The kind of error that quietly corrupts a cost estimate six times over.
- The template robots.txt file — the one scaffolded into user projects — *allowed* AI training crawlers by default, directly contradicting both the skill's own written guidance and the site's actual production robots.txt, which block them. The template now matches the guidance, leads with a machine-readable Content-Signal policy line, and keeps a commented alternative for projects that want training visibility. The review also caught that a long-standing rule blocking all JSON files would have blocked the very discovery endpoints — the MCP server card, the agent-skills index — that the project tells everyone to publish.
- A template cited an SDK documentation page for a utility called "toolpick" — which turned out to be the template's *own invented name*, with a citation pointing at a page that has never existed. The citation now points at the SDK's real, verified equivalent and honestly labels the pattern as custom.

Beyond the skill, targeted fixes landed across the docs: a wrong npm package name for the Pinecone client, an install instruction for a package that was never published, legacy documentation URLs across five files (Anthropic's docs moved domains; so did Cursor's and Vercel's AI SDK), and a changelog that had never recorded the 2.1.0 release despite three files claiming that version. The changelog entry was reconstructed from git history and properly dated.

## New frontier coverage

The review's brief included pushing the corpus forward, not just repairing it. A parallel research pass over a fast-shipping agent framework's live documentation surfaced eight patterns that existed nowhere in the corpus, each now written up as a *general ecosystem pattern* — with the framework as one cited implementation, never as the definition:

1. **Standing objectives** — durable goals with a judge model and a run budget that outlive any single agent run, a primitive distinct from tasks and workflows.
2. **Signal providers** — a standard interface for turning external events like GitHub activity or webhooks into agent wake-ups, now shipped capability rather than proposal.
3. **Language-server inspection as a workspace surface** — agents querying LSP servers for precise code intelligence alongside filesystem and search access.
4. **Runtime consumption of the Agent Skills spec** — frameworks now load skill folders at runtime and expose them as tools, evidence the spec has outgrown coding CLIs.
5. **The Agent Client Protocol as a delegation interface** — the editor protocol repurposed so a framework can drive Claude Code, Amp, or Codex as callable subagents with structured permission handling.
6. **OpenUI** — an open generative-UI standard added to the emerging-standards watchlist, with honest caveats about its single-vendor governance and missing version pin.
7. **Deterministic evaluation checks** — a named zero-cost tier of micro-scorers below LLM-as-judge evaluation, composable in the same eval run.
8. **In-framework messaging channels** — Slack, Teams, Discord, Telegram, and WhatsApp adapters as first-class agent capabilities rather than a separate bot layer.

The tooling catalog also gained verified updates — hosted browser sandboxes from Firecrawl, new observability entrants, vector-store adapter changes — with every claim checked against the vendor's live site first. One vendor's domain had silently moved; the catalog links to the new one.

## The machinery, so this doesn't happen again

The most durable output of the review isn't any individual fix — it's the enforcement. The repository already had an integrity script checking links, navigation, template citations, model-ID drift, and page freshness. The review extended it in three ways:

- **The model-ID check now scans the skill**, not just docs and templates — closing the exact blind spot where four different "current Opus" claims had accumulated unseen.
- **A version-parity check** ensures the machine-readable MCP server card can never silently drift from the package version again.
- **The whole check now runs as part of every build**, with one deliberate carve-out: freshness violations warn but don't fail the build. A page quietly aging past its 120-day verification window should trigger a re-verification, not break an unrelated deploy on a Tuesday. That distinction — correctness failures block, staleness warnings nag — was a considered product decision, not an accident.

The conventions are also now written where every agent can see them: the repository's cross-runtime AGENTS.md file documents the canonical model list, the freshness system, and the audit-history index, so a non-Claude agent landing in the repo learns the rules that were previously documented only in a Claude-specific file.

Finally, the site itself got a small but real security improvement: three routes had near-identical file-reading code, but only one of them sanitized path input. The shared helper now hardens all of them, verified with a live path-traversal probe.

## The takeaway

A project about making software legible to agents got reviewed *by* agents, and the pattern of what had rotted is instructive. Prose about concepts held up. Anything naming a version, a price, a model, a URL, or an import path had a measurable half-life — some of it under a month. The things that stayed correct were the things a machine checked; the things that drifted were the things a human was supposed to remember. The review's answer was symmetrical: fix everything once, then move as much of "remembering" as possible into the build.

One hundred stale model IDs, the largest protocol revision in MCP's history, a template that contradicted its own documentation, a fictional SDK class, and a four-cents-off price that was actually eleven cents off — all caught, all fixed, all now guarded by a gate that runs on every build. The site builds green, the linter is clean, the endpoints answer correctly, and every fast-decay page carries today's verification date.

Until the next model ships. Which, on current evidence, is about two weeks away.
