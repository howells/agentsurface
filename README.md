# agentify

A framework and philosophy for building production-grade agentic systems. Agentify codifies best practices from the Anthropic Claude Agent SDK, MCP 2025-11-25, and battle-tested production codebases. It's opinionated: Bun + TypeScript + Next.js + Biome, with first-class support for evaluation, retrievability, and multi-agent orchestration.

## Summary

**agentify** is a plugin for Claude Code that helps teams:
- **Design agent-grade tools** with clear contracts, explicit error modes, and safety constraints
- **Evaluate agents empirically** with pass@k metrics, red-teaming, and production monitoring
- **Build retrieval systems** that agents can trust (hybrid search, reranking, RAGAS evaluation)
- **Orchestrate multi-agent workflows** via queues and event streams
- **Deploy proactive agents** that monitor, batch, and notify without user input

**For whom**: Engineers building agentic systems in production. Not a beginner's toy; assumes familiarity with LLMs, APIs, and system design.

**Key offerings**:
- 6 discipline guides (60+ pages) covering tool design, orchestration, evaluation, retrievability, proactive agents, and transferable patterns
- 42+ templates for common agent tasks (invoice approval, transaction categorization, reconciliation, support workflows)
- Cookbook with 10 transferable agentic patterns and real-world examples
- House style reference based on a surveyed production codebase (Bun + Turborepo + Next.js)
- Compatibility with AGENTS.md spec, MCP SDK, and Vercel AI SDK

---

## Quick Start

### Installation

**Via Claude Code plugin marketplace** (recommended):
1. Open Claude Code
2. Settings → Plugins → Search "agentify"
3. Install

**Via git**:
```bash
git clone https://github.com/anthropic-labs/agentify.git
cd agentify && bun install
```

**Manual setup**: See `INSTALL.md` for step-by-step guidance.

---

## What's in This Repo

| Directory | Purpose |
|-----------|---------|
| `/disciplines/` | 6 foundational guides: tool design, orchestration, evaluation, retrievability, proactive agents, transferable patterns |
| `/skills/agentify/` | Plugin logic, CLI handlers, and utilities |
| `/skills/agentify/references/` | Reference materials: tool design principles, safety, house style, observability |
| `/templates/` | 42+ copy-paste templates for agents, tools, and workflows |
| `/cookbook/` | Step-by-step recipes for common patterns (few-shot prompting, reflection, hierarchical decomposition, etc.) |
| `/docs/` | Full Fumadocs site (MDX pages, searchable, auto-generated from this repo) |
| `/packages/` | Core libraries (eval harness, tool validator, orchestration utilities) |

---

## The 11 Dimensions of Agent Design

Agentify structures agent thinking around 11 dimensions. Master these, and you can design agents for any domain:

| Dimension | Description |
|-----------|-------------|
| **Tool Design** | Atomic, understandable, safe tools; explicit error modes and constraints |
| **Orchestration** | Single vs. multi-agent; queues, workflows, and event streams |
| **Evaluation** | Empirical metrics, pass@k, red-teaming, and production monitoring |
| **Retrievability** | Hybrid search, chunking strategy, RAGAS evaluation, latency |
| **Proactive Agents** | Event-driven scheduling, persistent state, notifications, batching |
| **Patterns** | 10 transferable recipes (composition, reflection, decomposition, few-shot, constraints, recovery, RAG, dialogue, telemetry, confidence) |
| **Safety & Constraints** | Guardrails, compliance, audit trails, human-in-the-loop |
| **Observability** | Logging, tracing, metrics, dashboards |
| **Cost Optimization** | Token budgets, caching, batch processing, model selection |
| **Latency & Throughput** | Critical path analysis, parallelism, timeouts, degradation |
| **User Experience** | Notifications, explanation, transparency, feedback loops |

---

## Patterns & Cookbook

The `/cookbook/` directory contains step-by-step recipes for the 10 most common agentic patterns:

1. **Tool Composition**: Chain simple tools into complex workflows
2. **Reflection & Self-Correction**: Agent reviews its own work
3. **Hierarchical Decomposition**: Break large goals into sub-goals
4. **Few-Shot Prompting**: Teach via examples, not descriptions
5. **Constraint-Driven Reasoning**: Encode rules in tools, not prompts
6. **Error Recovery Loops**: Graceful fallbacks and retries
7. **Retrieval-Augmented Generation**: Ground reasoning in external data
8. **Multi-Turn Dialogue**: Accumulate context across conversation turns
9. **Agentic Loops with Telemetry**: Instrument every tool call
10. **Staged Reasoning with Confidence**: Route decisions by confidence threshold

Each recipe includes: motivation, architecture diagram, code snippets (Bun + TypeScript), eval harness, and real-world examples.

---

## How to Use: `/agentify` Slash Command

In Claude Code, invoke `/agentify` with one of these modes:

### Design
```
/agentify design --domain "invoicing" --agents 2
```
Generates a multi-agent architecture for the domain, including tool specs, orchestration plan, and eval strategy.

### Evaluate
```
/agentify evaluate --agent-file ./agents/invoice-approver.ts --eval-set ./evals/invoices.jsonl
```
Runs pass@k evaluation on your agent, reports metrics and failure analysis.

### Optimize
```
/agentify optimize --agent-file ./agents/transaction-categorizer.ts --cost-limit 0.01
```
Suggests prompt rewrites, caching strategies, and model downgrades to meet cost target.

### Style
```
/agentify style --show-config
```
Displays house style configuration. Run `--apply` to lint and format code per house style.

### Scaffold
```
/agentify scaffold --pattern "tool-composition" --domain "reconciliation"
```
Generates a starter agent with the pattern, including tests and evals.

---

## Project Stack

**Runtime**: Bun 1.3+ (scripts, tests, dev server)

**Framework**: Next.js 16 with App Router (web UI for docs site)

**Language**: TypeScript 6.0+, strict mode

**Monorepo**: Turborepo-style (apps/* for CLI/docs, packages/* for libraries)

**Linter/Formatter**: Biome 2.4+ (no ESLint, no Prettier)

**Validation**: Zod 4.3+ (all APIs, tool schemas)

**LLM/AI**: Vercel AI SDK 6.0+ (model-agnostic), Anthropic SDK for native features

**Database**: Drizzle ORM 0.45+ (if using examples with persistence)

**Observability**: OpenTelemetry GenAI semconv, Sentry (error tracking), structured logging (pino)

**Testing**: Bun test + Vitest (interoperable)

**Deployment**: Vercel (docs), Fly/Railway (worker agents), Cloud Run (serverless)

**Docs**: Fumadocs (MDX, full-text search, dark mode)

---

## Compatibility

- **Claude Agent SDK**: ≥1.0.0
- **Claude Code Plugin API**: Latest
- **AGENTS.md specification**: Full compliance (see `/docs/specs/AGENTS.md`)
- **MCP (Model Context Protocol)**: 2025-11-25 release
- **Anthropic API**: claude-opus-4-1 and later; claude-3.5-sonnet recommended for agentic tasks
- **OpenAI Codex / function calling**: Compatible (adapt schemas if needed)
- **A2A (Agent-to-Agent)**: v1.0 RC compatible
- **RFC 9457 (Problem Details for HTTP APIs)**: Error format compliant

---

## Docs Site

Full documentation (disciplines, cookbook, templates, FAQ) is available at:

```bash
bun run dev
# Opens http://localhost:3000
```

Search, sidebar navigation, dark mode, and offline support included.

---

## Contributing

**Reporting issues**: Use GitHub issues. Include minimal reproduction and agentify version.

**Adding templates**: Place new templates in `/templates/` with:
- `agent.ts`: Annotated agent implementation
- `tools.ts`: Tool definitions
- `evals.jsonl`: 10+ eval cases
- `README.md`: Purpose, usage, and customization guide

**Improving disciplines**: Edit files in `/disciplines/`. Keep summaries to 2-4 sentences, examples concise, and anti-patterns explicit.

**House style updates**: Update `/skills/agentify/references/house-style.md` based on evolving best practices.

---

## Licence

MIT. Use freely in commercial and open-source projects.

---

## Links

- [Anthropic MCP](https://modelcontextprotocol.io/)
- [Claude Agent SDK](https://github.com/anthropic-labs/agent-sdk)
- [AGENTS.md Specification](./AGENTS.md)
- [A2A (Agent-to-Agent)](https://anthropic.com/docs/agents)
- [RFC 9457 (Problem Details for HTTP APIs)](https://tools.ietf.org/html/rfc9457)
- [Evaluating LLM-based Systems (Anthropic Blog)](https://anthropic.com)
