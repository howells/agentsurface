# Agent Surface Product Vision

Date: 2026-06-13
Status: working strategic note for review
Audience: Daniel Howells, future maintainers, and agents helping shape the repository

## Executive Summary

Agent Surface can be more than a documentation site, template collection, or skill. The stronger version is a named standard, diagnostic, and transformation toolkit for making software operable by AI agents.

The category claim is simple:

> Every serious software product will need an agent surface, just as every serious product needed a UI, API, documentation, authentication, observability, and accessibility.

Today, most software exposes agent surfaces accidentally. Agents encounter a mixture of human docs, brittle web UIs, incomplete APIs, ambiguous CLIs, string-only errors, hidden auth flows, missing IDs, non-recoverable rate limits, and insufficient examples. A capable agent can sometimes fight through that mess, but it cannot reliably discover, reason over, retrieve from, act through, or be evaluated against the product.

Agent Surface should name and systematize that missing layer.

The repo already contains many of the right parts: guidance, scoring dimensions, templates, specialist prompts, a `surface` skill, MCP docs, CLI design guidance, discovery patterns, context-file patterns, auth/error guidance, testing guidance, and framework-selection material. The opportunity is to make these feel less like a broad body of agent documentation and more like a coherent product/category:

> Agent Surface is the measurable interface between software and autonomous agents.

That means three public artifacts should become central:

1. **The Standard** — a clear model of what an agent-ready product/repo/API/CLI must expose.
2. **The Scorecard** — a repeatable diagnostic that says whether something is actually usable by agents.
3. **The Transformer** — a practical skill/toolchain that can audit, plan, patch, and verify improvements.

The long-term ambition is not just “better docs for agents.” It is closer to **Lighthouse for agent usability**, **WCAG for non-human operators**, and **Stripe-quality implementation guidance for agent-readable software**.

## The Core Definition

Agent Surface should continue to use the strong definition already associated with the project:

> Agent Surface is the discipline of designing software so agents can discover it, reason over it, retrieve from it, act through it, and be evaluated against it.

That definition is good because it covers the whole lifecycle:

- **Discover** — an agent can find the system, identify entry points, understand capabilities, and know what is safe to do.
- **Reason over** — an agent can build a correct mental model of concepts, resources, constraints, permissions, side effects, and workflows.
- **Retrieve from** — an agent can search, list, filter, page, dereference, and cite data without scraping fragile human-only views.
- **Act through** — an agent can perform useful operations through APIs, CLIs, MCP tools, browser flows, or workflows with typed inputs and clear side-effect boundaries.
- **Be evaluated against** — an agent’s use of the system can be tested, scored, replayed, inspected, and improved.

That definition also prevents the project from collapsing into any one protocol or implementation fashion. Agent Surface is broader than MCP, broader than OpenAPI, broader than `AGENTS.md`, broader than `llms.txt`, broader than CLI JSON output, and broader than agent frameworks. Those are all surfaces or support structures. Agent Surface is the discipline that decides what each one is for and how they fit together.

## Why This Matters Now

Software has historically grown new surfaces whenever a new class of user or intermediary became important:

| Era / user class | Surface that emerged | Why it mattered |
| --- | --- | --- |
| Humans | GUI, navigation, interaction design | People needed to operate software directly. |
| Developers | APIs, SDKs, reference docs | Other software needed programmable access. |
| Search engines | SEO, sitemaps, structured data | Crawlers needed to discover and rank pages. |
| Screen readers / assistive tech | Accessibility semantics, ARIA, WCAG | Interfaces needed to be perceivable and operable by more users. |
| Operations teams | Logs, metrics, traces, health checks | Systems needed to be observable and debuggable. |
| AI agents | Agent Surface | Agents need to discover, understand, act, recover, and be tested. |

The agent surface is currently under-designed. Teams often assume one of these is enough:

- “We have docs.”
- “We have an API.”
- “We have OpenAPI.”
- “We have MCP.”
- “We have a chatbot.”
- “We have an SDK.”
- “Claude/Codex/Cursor can read the repo.”

Each can help, but none is sufficient alone. Agents use software through multiple channels at once: repository context, documentation, APIs, CLIs, MCP servers, browser tools, local files, test suites, logs, schemas, examples, and human approvals. The surface is the sum of those channels plus the rules that make them safe and recoverable.

The market language around this is still vague. “AI-native” is often used as a mood rather than a testable property. Agent Surface can give it teeth.

A product is not agent-ready because it mentions AI. It is agent-ready when agents can operate it reliably under bounded permissions, with structured feedback, recoverable errors, and measurable task success.

## What Agent Surface Could Become

### 1. A Public Standard

The first evolution is to define an **Agent Surface Standard**.

This does not need to start as a formal standards-body document. It can begin as an opinionated, versioned model:

- Agent Surface Standard v0.1
- Agent Surface Scorecard v0.1
- Agent Surface Ready levels
- Reference implementations and examples

The standard should answer:

- What must a repo expose for coding agents?
- What must an API expose for workflow agents?
- What must a CLI expose for local assistants?
- What must a SaaS product expose for browser/API/MCP agents?
- What must errors, auth, pagination, IDs, dry-runs, and permissions look like?
- What evidence proves that agents can use the thing reliably?

The strongest framing:

> Agent Surface is not a protocol. It is the cross-surface design standard for making software usable by agents.

That allows it to include existing and emerging protocols without being captured by them.

### 2. A Diagnostic / Audit Product

The most obvious practical wedge is an audit:

```bash
surface audit .
```

or, eventually:

```bash
npx surface audit .
surface audit https://api.example.com/openapi.json
surface audit github.com/org/repo
surface audit --target=cli ./bin/tool
surface audit --target=mcp ./server
```

The output should be concrete, not hand-wavy:

```text
Agent Surface Score: 21/30
Readiness: Silver
Autonomous-use verdict: unsafe for write operations

Blocking issues:
- Write operations have no dry-run or confirmation boundary.
- Errors are string-only and do not include machine-actionable recovery guidance.
- Auth setup depends on a browser login with no service-token path.
- List endpoints omit stable object IDs needed for follow-up actions.
- Documentation has examples, but no task-oriented agent workflows.

Highest-impact fixes:
1. Add problem-details JSON errors with retry/permission hints.
2. Add --json, --dry-run, and --fields to the CLI.
3. Add AGENTS.md and llms.txt entry points.
4. Add an MCP server exposing read-only list/get/search tools first.
5. Add eval fixtures for three representative agent tasks.
```

This is where the repo’s existing 11 dimensions become a strong product primitive. The scorecard should not be buried as an internal rubric. It should be one of the project’s most public and memorable artifacts.

### 3. A Transformation Kit

Audits are useful, but transformation is where the project becomes hard to ignore.

The desired loop:

1. Inspect the repo/product/API/CLI.
2. Score the current agent surface.
3. Cluster blockers and opportunities.
4. Generate a plan.
5. Apply the safest high-impact changes.
6. Re-score.
7. Produce a before/after delta.

Possible commands or skill workflows:

```bash
surface init
surface score
surface plan
surface transform --target=silver
surface transform --dimension=errors
surface add llms
surface add agents-md
surface add mcp
surface add cli-json
surface add dry-run
surface add evals
surface verify
```

The current skill already gestures at this. The product vision is to make it feel inevitable and repeatable.

The transformation kit should not try to magically rewrite everything. It should be careful, evidence-grounded, and preferably staged:

- **Stage 1: Discoverability** — `AGENTS.md`, `llms.txt`, docs entry points, capability maps.
- **Stage 2: Structured operation** — JSON CLI output, OpenAPI hygiene, stable IDs, field selection, pagination.
- **Stage 3: Safety** — dry-run writes, idempotency keys, confirmation boundaries, auth scopes, permission docs.
- **Stage 4: Recoverability** — structured errors, retry hints, rate-limit semantics, trace IDs.
- **Stage 5: Interoperability** — MCP tools, SDK examples, workflow specs, context bundles.
- **Stage 6: Evaluation** — task fixtures, eval harnesses, replay logs, score deltas.

### 4. A Certification / Badge

A public badge sounds slightly gimmicky, but it could be strategically useful because it makes the concept legible.

Possible labels:

- **Agent Surface Ready**
- **Agent-Ready API**
- **Agent-Callable CLI**
- **Agent-Safe Tool**
- **Agent-Operable Product**

Possible levels:

| Level | Meaning |
| --- | --- |
| Bronze | Agents can discover the product/repo and understand basic capabilities. |
| Silver | Agents can perform read operations through structured interfaces with stable IDs and machine-readable errors. |
| Gold | Agents can perform bounded write operations with dry-runs, idempotency, permissions, and recovery guidance. |
| Platinum | Autonomous task completion is verified through evals, replayable traces, and documented operational limits. |

This should be evidence-based, not self-attested marketing. A badge is only valuable if it corresponds to a scorecard and verification artifacts.

### 5. A Category Narrative

The bigger narrative is that **agent surface area** becomes a property of every software product.

Good language:

- “Agent-readable software”
- “Agent-operable products”
- “Agent-safe workflows”
- “The surface area agents actually use”
- “A measurable interface between software and autonomous agents”
- “Designing software for non-human operators”

Weak or risky language:

- “AI-native” without criteria
- “MCP solves this”
- “Just add an agent”
- “Chat with your docs”
- “Agent SEO” as the whole story

Agent Surface should be opinionated: the point is not to chase every agent trend. It is to explain what remains true across frameworks and protocols.

## The Product Shape

Agent Surface could have four tightly connected layers.

### Layer 1: Manifesto And Conceptual Model

This is the public explanation of the category.

It should answer:

- What is an agent surface?
- Why is it different from an API, docs site, MCP server, or chatbot?
- Why do agents fail against normal software?
- What are the dimensions of agent usability?
- How do safety, auth, and side effects change when the operator is an autonomous system?
- What should founders, infra teams, and developer-experience teams do first?

This layer should be crisp enough that people cite it.

Useful page ideas:

- `What is an Agent Surface?`
- `Agents Need Interfaces Too`
- `Why APIs Are Not Enough`
- `Why MCP Is Not Enough`
- `The Agent Surface Model`
- `The Agent Surface Standard`
- `Agent-Ready Is A Measurable Property`

### Layer 2: Standard And Scorecard

This is the evaluative core.

The repo already uses 11 dimensions:

1. API Surface
2. CLI Design
3. MCP Server
4. Discovery and AEO
5. Authentication
6. Error Handling
7. Tool Design
8. Context Files
9. Multi-Agent and Orchestration
10. Testing and Evaluation
11. Data Retrievability

These are good, but the standard should make the “why” even clearer. Each dimension should have:

- What agents need.
- What good looks like.
- What bad looks like.
- What evidence to inspect.
- What automatic checks are possible.
- What requires human/product judgment.
- What fixes move the score.

Example:

```text
Dimension: Error Handling
Agent need: know whether to retry, ask a human, change input, wait, authenticate, or abandon.
Bad: HTTP 500 with string message.
Better: RFC 9457-style problem details with code, category, retryability, docs link, trace ID.
Best: structured recovery hints, idempotency semantics, rate-limit reset, and examples in docs/tests.
Evidence: API responses, CLI stderr/stdout, docs, tests, logs.
Automatic checks: sample failure cases, schema shape, retry headers.
Human checks: whether recovery advice is truthful and safe.
```

### Layer 3: Implementation Guides And Templates

This is the “how to fix it” layer.

The current docs already cover many of these. The opportunity is to connect them more explicitly to the standard and scorecard.

Every implementation guide should follow the same pattern:

1. Problem agents face.
2. Decision rule.
3. Minimal acceptable surface.
4. Strong surface.
5. Anti-patterns.
6. Template or example.
7. How it is scored.
8. Related dimensions.

Example page structure:

```md
# JSON-first CLI output

## Agent problem
Agents cannot reliably parse prose or terminal tables.

## Decision rule
If a CLI is expected to be called by an agent, every read command should support JSON output.

## Minimal surface
...

## Strong surface
...

## Anti-patterns
...

## Template
...

## Scorecard impact
CLI Design + Error Handling + Data Retrievability
```

### Layer 4: Tooling / Skill / Automation

This is the operational layer.

The `surface` skill can remain the initial distribution artifact. Over time, Agent Surface could also become:

- an npm CLI
- a GitHub Action
- a CI check
- a Codex/Claude skill
- a MCP server
- a hosted score viewer
- a docs/report generator

Potential product workflows:

```bash
surface audit . --format=markdown > agent-surface-report.md
surface audit . --format=json > agent-surface-report.json
surface transform . --target=bronze
surface transform . --dimension=discovery
surface verify . --against=agent-surface-standard@0.1
```

GitHub Action example:

```yaml
name: Agent Surface
on: [pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: commoninstruments/agent-surface-action@v1
        with:
          min-score: silver
          report-path: agent-surface-report.md
```

Hosted report example:

```text
commoninstruments/agentsurface
Score: Gold, 26/30
Last checked: 2026-06-13
Weakest dimensions: Authentication, Testing, MCP Server
Verified artifacts: AGENTS.md, llms.txt, OpenAPI, CLI schema, eval fixtures
```

## What This Is Not

Agent Surface should be explicit about its boundaries.

### It Is Not Just MCP

MCP is important, but it is one interface type. A product can have an MCP server and still be poor for agents if:

- tools are too broad or ambiguous
- auth is unclear
- errors are not recoverable
- resources are not retrievable
- side effects are unsafe
- docs do not explain workflows
- evals do not prove task success

Agent Surface should treat MCP as one implementation surface within a broader discipline.

### It Is Not Just `AGENTS.md`

Context files are powerful for coding agents, but they mostly help agents understand repositories. They do not by themselves create safe runtime access, machine-readable errors, stable APIs, auth scopes, or evals.

### It Is Not Just “AEO”

Discovery matters, but being discoverable to an LLM is not the same as being operable by an agent. Agent Surface includes discovery, but the stronger wedge is operational reliability.

### It Is Not A Generic Agent Framework

The repo should not compete directly with OpenAI Agents SDK, Claude Code SDK, Mastra, LangGraph, Cloudflare Agents, Vercel AI SDK, or MCP SDKs.

Instead, Agent Surface should help teams choose and expose the right surfaces around whatever framework they use.

### It Is Not A Consultancy Report Generator

Reports are useful, but the value should come from repeatable standards, concrete fixes, and verification. Avoid generic “AI readiness assessment” sludge.

## Relationship To Dan’s Other Projects

Agent Surface becomes more compelling because it explains a pattern already visible across the wider Common Instruments ecosystem.

### `@howells/cli`

The CLI harness is an implementation primitive for agent-callable command-line tools:

- JSON output
- field selection
- pagination
- structured errors
- validation
- MCP helpers
- safe argument parsing

Agent Surface can use this as a reference implementation for CLI Design.

### `arc`

Arc is the software-development lifecycle and workflow layer for coding agents. Agent Surface can define the surface requirements; Arc can operationalize them inside development workflows.

Relationship:

- Agent Surface: what software should expose to agents.
- Arc: how coding agents should plan, implement, review, test, and ship changes.

### `skills`

The skills repo is a portable method library. Agent Surface can publish a canonical `surface` skill and possibly dimension-specific skills.

Relationship:

- Agent Surface defines the discipline and audit model.
- Skills distribute executable workflows for applying it.

### `envelope`

Envelope turns local agent CLIs into typed, validated calls. It supports the broader principle that agents and model calls should be treated as typed interfaces rather than raw prompt strings.

### `gauge`, `linearcli`, `thingscli`, `starlingcli`, `revolutcli`

These are concrete examples of agent-first operational tools. They prove the design taste behind Agent Surface:

- structured output
- schema introspection
- dry-run or bounded writes
- clear auth boundaries
- no guessed identifiers
- recoverable errors

Agent Surface should point to these as living proof, not merely adjacent repos.

### `scaffold`

Scaffold can become the “start with a good surface” path. If Agent Surface defines the target, Scaffold can produce new repos that already meet Bronze/Silver requirements.

## Target Audiences

### Developer Tool Companies

They need agents to use their products reliably. They care about APIs, SDKs, docs, examples, auth, and integration paths. Agent Surface gives them a checklist and score.

### API Companies

They often already have docs and OpenAPI. Agent Surface shows the missing layer: task workflows, auth for agents, side-effect safety, error recovery, evals, MCP/tool design, and context packaging.

### Internal Platform Teams

They need internal agents to safely operate internal tools. They care about permissions, auditability, service tokens, logs, approval boundaries, and recoverable failures.

### Startups Claiming “AI-Native”

Agent Surface gives them a way to make that claim concrete. If they want agents to integrate with their product, the scorecard becomes a product-readiness test.

### Coding-Agent Users

They need repos that agents can understand and modify without costly rediscovery. Context files, conventions, tests, scripts, and docs become part of the surface.

### Agent Framework Authors

They may not be the primary customer, but they are an important audience. Agent Surface should be framework-neutral and help explain how framework features map to real product surfaces.

## Product Wedges

There are several possible wedges. The strongest is probably not “read this big docs site.” It is a concrete evaluation or transformation result.

### Wedge 1: The Scorecard

A public self-serve audit:

```bash
surface audit github.com/org/repo
```

This produces a memorable report. People share it. Teams debate it. It becomes the artifact.

### Wedge 2: Agent-Ready CLI Checklist

A narrower entry point:

> Make your CLI usable by agents.

This is practical, specific, and Dan already has strong proof examples.

### Wedge 3: Repo Context Pack

A coding-agent wedge:

> Make this repo easy for Claude Code, Codex, Cursor, Devin, and Copilot to understand.

Generates:

- `AGENTS.md`
- `CLAUDE.md` if appropriate
- `.github/copilot-instructions.md`
- `llms.txt`
- task maps
- command maps
- test/eval instructions

### Wedge 4: API Agent-Readiness

For SaaS/API companies:

> Your OpenAPI spec is not enough. Here is what agents cannot do yet.

Checks:

- schema quality
- examples
- auth flows
- idempotency
- pagination
- rate limits
- error shape
- task recipes
- MCP fit
- workflow specs

### Wedge 5: Gold Path Templates

A set of “gold path” implementation templates:

- agent-readable REST API
- agent-callable CLI
- safe MCP server
- repo context bundle
- structured errors
- eval harness
- auth.md / llms.txt / AGENTS.md bundle

## The Scorecard As Product

The scorecard should become more visual and decisive.

Possible top-level format:

```text
Agent Surface Report
Target: github.com/example/product
Date: 2026-06-13
Evaluator: surface@0.1

Overall: Silver — 21/30
Autonomous-readiness: Read-safe, write-unsafe
Confidence: Medium-high

Dimension scores:
API Surface                 3/3
CLI Design                  1/3
MCP Server                  0/3
Discovery and AEO           2/3
Authentication              2/3
Error Handling              1/3
Tool Design                 2/3
Context Files               3/3
Multi-Agent/Orchestration   2/3
Testing/Evaluation          1/3
Data Retrievability         2/3

Blocking agent tasks:
- Create a project from a brief.
- Update billing settings.
- Recover from rate limits.

Recommended next target: Gold-read-only
Estimated changes: 9 files, 2 docs, 3 tests
```

Important: the score should include **confidence** and **evidence**. Agent Surface should not pretend to know what it did not inspect.

Evidence examples:

- read `README.md`, `AGENTS.md`, package scripts
- inspected OpenAPI schema
- ran CLI commands
- sampled error responses
- verified docs links
- tested MCP tools
- ran eval fixtures

That evidence model differentiates it from vague AI-readiness reports.

## Agent Surface Readiness Levels

A possible maturity model:

### Level 0: Opaque

Agents can only use the product through brittle human UI or prose docs. There are no explicit machine/operator surfaces.

Typical signs:

- no API or CLI
- no context files
- no stable IDs in UI
- no structured errors
- no auth docs for automation
- side effects hidden behind clicks

### Level 1: Discoverable

Agents can understand what exists and where to start.

Artifacts:

- clear docs entry point
- `AGENTS.md` or equivalent repo context
- `llms.txt` or docs map
- capability overview
- task examples
- command/test map

### Level 2: Read-Operable

Agents can retrieve and inspect data safely.

Artifacts:

- list/get/search endpoints or commands
- stable IDs
- JSON output
- filtering/pagination
- schemas
- read-only tokens/scopes
- recoverable read errors

### Level 3: Write-Bounded

Agents can perform mutations with controlled side effects.

Artifacts:

- dry-run mode
- idempotency keys
- explicit confirmation boundaries
- scoped permissions
- audit logs
- rollback/undo guidance where possible
- typed write schemas

### Level 4: Workflow-Ready

Agents can complete multi-step tasks reliably.

Artifacts:

- task recipes
- workflow specs
- MCP/API/CLI composition guidance
- state transitions
- event/webhook model
- trace IDs
- background job semantics

### Level 5: Evaluated

Agent operation is measured and regressions can be caught.

Artifacts:

- eval fixtures
- golden task traces
- CI checks
- replayable logs
- benchmark tasks
- human approval tests
- score deltas over time

This maturity model may be easier for readers than raw 0–3 dimension scores. The two can coexist: maturity levels for communication, dimension scores for diagnosis.

## Opinionated Principles

Agent Surface should have a small set of memorable principles.

### 1. Agents Need Interfaces, Not Just Intelligence

More capable models reduce friction, but they do not eliminate the need for well-designed interfaces. A strong model can infer more, but inference is not a substitute for stable contracts.

### 2. Agent-Ready Is A Measurable Property

If a team cannot test whether agents can complete representative tasks, the product is not meaningfully agent-ready.

### 3. Every Side Effect Needs A Boundary

Agents need explicit dry-run, approval, idempotency, permission, or audit boundaries before performing meaningful writes.

### 4. Errors Are Part Of The Interface

For agents, errors are not just messages. They are control-flow signals. They should say whether to retry, wait, authenticate, change input, ask a human, or stop.

### 5. Discovery Is Not Operation

Being findable by an LLM is useful. It is not enough. The agent must also be able to act safely and recover.

### 6. MCP Is A Surface, Not The Surface

MCP is an important tool protocol, but the overall agent surface also includes docs, auth, APIs, CLIs, context, data retrieval, tests, and operational semantics.

### 7. Human-Friendly And Agent-Friendly Should Reinforce Each Other

Good agent surfaces often improve human developer experience too: clearer docs, better errors, safer CLIs, stronger schemas, better examples, and more predictable workflows.

### 8. Agent Surfaces Should Be Least-Privilege By Default

The easiest path for an agent should not be full admin access. Read-only and scoped write paths should be first-class.

## Suggested Repository Changes

This note is strategic, not an implementation plan, but several concrete repo changes follow from it.

### 1. Add A Canonical “What Is Agent Surface?” Page

The page should make the category argument and define the discipline in under 1,500 words. It should be more opinionated and less reference-like than the current docs.

Suggested route:

```text
src/content/docs/what-is-agent-surface.mdx
```

or as the new index framing.

### 2. Make The Standard A First-Class Section

Add a section between getting started and implementation guides:

```text
standard/
  index.mdx
  maturity-model.mdx
  scorecard.mdx
  evidence.mdx
  readiness-levels.mdx
```

Current scoring docs can remain, but the public framing should be “standard” before “rubric.”

### 3. Create Example Reports

Examples make the concept real.

Possible examples:

- agent-ready CLI report
- API with weak errors report
- repo context report
- MCP server report
- before/after transformation report

These can be fictional or use Dan’s public packages as examples.

### 4. Add A “Surface Patterns” Gallery

Show concrete patterns:

- JSON-first CLI
- dry-run mutation
- machine-actionable error
- read-only MCP tool
- scoped service token
- `AGENTS.md` repo map
- `llms.txt` docs map
- OpenAPI task recipe
- eval fixture

Each pattern should be short, copyable, and linked to scorecard dimensions.

### 5. Make The Tooling Path Obvious

If the project stays skill-first, the docs should still make the operational path clear:

```text
Use the surface skill to audit, plan, transform, and verify.
```

Eventually, consider a small CLI wrapper if distribution warrants it.

### 6. Connect Related Common Instruments Repos

The repo should explicitly identify reference implementations:

- `@howells/cli` for CLI design
- `arc` for SDLC/coding-agent workflow
- `skills` for portable agent procedures
- `envelope` for typed local agent invocation
- `gauge` / `linearcli` / `thingscli` / finance CLIs as proof examples

This would make Agent Surface feel less theoretical.

## Risks And Failure Modes

### Risk: Becoming A Huge Docs Dump

The repo already has lots of useful material. The danger is that it becomes “a big docs site about agents” rather than a sharp product.

Mitigation: orient everything around the standard, scorecard, and transformation loop.

### Risk: Being Too Abstract

A manifesto without tooling will be forgettable.

Mitigation: prioritize concrete scorecards, reports, templates, and transformations.

### Risk: Being Too Tool-Specific

If Agent Surface becomes “MCP best practices” or “Claude Code repo docs,” the category shrinks.

Mitigation: remain protocol/framework-neutral and treat specific tools as surfaces within the model.

### Risk: Certification Without Trust

Badges become meaningless if anyone can self-claim them.

Mitigation: require evidence artifacts and versioned scoring criteria.

### Risk: Over-Automating Judgment

Some dimensions require product and safety judgment. A tool cannot fully infer whether a write path is safe or whether auth guidance matches business reality.

Mitigation: separate automatic checks, evidence, confidence, and human-review notes.

## A Possible One-Year Vision

If Agent Surface were pushed hard for a year, a strong version might look like this:

- A clear public site explaining the category.
- A versioned Agent Surface Standard.
- A memorable scorecard and maturity model.
- A `surface` skill that works across Codex/Claude-style agents.
- A CLI or GitHub Action for basic audits.
- 5–10 excellent example reports.
- Templates for common surfaces: API, CLI, MCP, repo context, errors, evals.
- Reference implementations from Common Instruments packages.
- A small badge/certification language backed by evidence.
- A reputation as the pragmatic guide for teams asking: “Can agents actually use our product?”

## The Blunt Strategic Read

The strongest version of Agent Surface is not another agent framework and not another collection of agent resources.

The strongest version is the thing that gives teams a vocabulary and test for a problem they are about to feel acutely:

> Our product works for humans and maybe developers, but agents still cannot use it reliably.

Agent Surface should own that problem.

The project’s unfair advantage is that it comes from practical taste: JSON-first CLIs, safe writes, schema introspection, dry-runs, context files, MCP, typed tools, structured errors, and evaluation. Those are not random preferences. They are the shape of software designed for autonomous operators.

The sharpest positioning is therefore:

> Agent Surface is a standard and toolchain for making software operable by AI agents.

Everything else in the repo should support that claim.
