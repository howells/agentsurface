# Testing & Evaluation

Dimension 9: whether the product's agent surfaces are tested, and agent
behaviour is measured, beyond a demo that worked once.

## Contents

- Rubric
- Evidence to gather
- Build
- What good looks like: layers, metrics, non-determinism, model graders,
  datasets, CI, red team, MCP tests, tracing, platforms
- Templates

## Rubric

- **0**: Ordinary unit and integration tests only; nothing exercises tool
  selection, an MCP server or agent behaviour.
- **1**: Some tests check tool selection or MCP responses, but none cover error
  recovery or multi-step flows.
- **2**: Selection, parameter correctness, error → recovery and multi-step
  sequences are tested; MCP is tested with
  `InMemoryTransport.createLinkedPair()`.
- **3**: An eval suite with several runs per case and pass@k / pass^k, regression
  baselines, CI integration, and cases drawn from real failures.

Always applicable: every project can test its agent surfaces, so a project
with no such tests scores 0, never N/A. Scripted calls with fixed tool choices
count as contract tests (level 1); levels 2 and 3 need selection made by a
model.

## Evidence to gather

- Test paths containing `agent`, `tool`, `mcp`, `eval`
- Eval tooling: Braintrust, Promptfoo, LangSmith, Phoenix, Langfuse, autoevals,
  `@mastra/evals`, OpenAI Evals
- CI workflows that run evals, and stored baselines per commit
- Labelled datasets and grader code (code, model, human)
- OpenTelemetry GenAI attributes in instrumentation

## Build

Use the project's package manager and existing test runner; add an eval
platform only when the project already uses one or asks for it. Take the model
from the project's configuration or an environment variable and check it
against the provider's current model list. Put one agent loop behind a test
helper that returns text, tool calls and tool results, and build every test on
it; frameworks share no `generate` or retry contract. Use the project's own
loop when it has one. A product that only exposes surfaces to outside agents
gets a minimal loop inside the test harness, never in production code.

Build in this order; each is done when the stated assertion fails on a
deliberately broken surface and passes on the real one.

1. **Handler and MCP tests.** Each tool handler and, for an MCP server, a
   linked in-memory client and server: every tool listed with its annotations,
   one successful call and one `isError` result per tool. Annotations in a test
   prove the declaration, not enforcement.
2. **Routing.** For each case, assert the actual tool-call names and arguments
   the agent produced against the expected ones. Asserting on response text
   proves nothing about routing. Every tool has at least one case, and
   near-sibling tools have a case each way.
3. **Error recovery.** Validation, not found, rate limit and auth: the agent
   receives the structured error and the next call is the corrected one. A
   retry test records consecutive invocation timestamps (or drives the
   scheduler directly) and asserts both that a retry happened and that it
   waited the advertised interval; elapsed wall time alone proves neither.
4. **Multi-step and outcome.** A sequence whose final state is asserted, such
   as the record existing or the file being gone.
5. **Repeats.** Run each case k times (k of 3 or more) with the runner's repeat
   option and record every attempt. A runner's `retry` option re-runs until a
   pass and hides the failure, so evals and safety tests never set it; one
   unsafe run fails a safety case.
6. **Red team.** Active cases for each applicable risk, and each out-of-scope
   category recorded with its reason.
7. **Tracing** on agent, model and tool calls, flushed before a short-lived
   process exits.
8. **CI.** Deterministic tests (mocked tools, in-memory MCP) need no external
   service and gate pull requests; credentialed live evals are a separate job.

Report pass@k and pass^k where the project tracks evidence, such as the owning
issue, rather than in a new repository document.

## What good looks like

**Layers.** Deterministic handler tests; routing tests (right tool, right
arguments); trajectory tests for step order; outcome evals on the final state;
adversarial suites. Grade the outcome, not the path: agents find valid routes
evaluators didn't expect. Gate on trajectory only where the workflow requires
it (mandatory order, call budgets, never mutating before confirmation). Assert
the effect happened (the file is gone), not merely that `delete_file` was called.

**Metrics.** pass@k (at least one of k succeeds) where one success is enough;
pass^k (all k succeed) where every run must be safe. Tool F1 for routing.
Parameter correctness by schema or regex. Retrieval by MRR or NDCG.

**Non-determinism.** Claude API version `2026-10-21` removes `temperature`,
`top_p` and `top_k`, so repeatability comes from a fixed dataset, several trials
per case and code graders, never from a sampling setting. Keep every
transcript.

**Model graders.** Give the judge a rubric (and a reference answer where one
exists); prefer pairwise over 1-10 scales; randomise order; control for length;
never let the model under test judge itself; calibrate on 20-30 human-labelled
cases (Cohen's kappa) before trusting it.

**Datasets.** Start with 20-50 cases from real traces. Cover ambiguous intent,
malformed input, rate limits, approval interrupts, multi-step dependencies and
injection. Version datasets immutably; each case records its source and
labeller, and each run records dataset version, model, prompt and code revision.
Tag failures against a taxonomy and prioritise by a business outcome metric
(resolution rate, time saved), compared with the human baseline where one
exists. Canonical: https://agentsurface.dev/docs/testing/datasets-and-experiments.

**CI.** Fast deterministic routing checks with mocked tools gate PRs. Real-model
runs compare against a baseline on the same pinned dataset, model and prompt,
with a stated threshold and enough trials to separate a drop from noise.
Red-team suites run nightly. A crashed harness fails the build. Don't gate on an
unpinned dataset.

**Red team.** Prompt injection, exfiltration through tool chains, tool loops,
jailbreaks. Map coverage to both the OWASP Top 10 for LLM Applications and the
separate OWASP Top 10 for Agentic Applications 2026 (published 2025-12-09), which
covers risks from tools, identity and autonomy.

**MCP tests.** In SDK v2, `Client` comes from `@modelcontextprotocol/client` and
`InMemoryTransport` from `@modelcontextprotocol/server`. Wire-level checks
against a deployed URL are in mcp-servers.md.

**Tracing.** OpenTelemetry GenAI conventions are Development status and
unversioned, so pin a commit. Required: `gen_ai.operation.name` (`chat`,
`invoke_agent`, `execute_tool`); `gen_ai.provider.name` on inference and client
agent spans (`anthropic`, `openai`, `gcp.gemini`, `gcp.vertex_ai`,
`gcp.gen_ai`). Spans are named `chat {model}`, `invoke_agent {name}` and
`execute_tool {tool}` (with `gen_ai.tool.name`, `gen_ai.tool.call.id`). Message
content (`gen_ai.input.messages`, `gen_ai.output.messages`) and tool arguments
and results are opt-in; omit them when sensitive.

**Platforms.** Promptfoo is being acquired by OpenAI (announced 2026-03-09).
OpenAI Evals grades Agents SDK traces; Google's Gen AI evaluation service offers
per-prompt adaptive rubrics.

## Templates

- `templates/mcp-and-api/mcp-client-test.ts` (in-memory MCP client and server)
- `templates/cli-and-evals/mcp-test-harness.ts` (generated inputs against a
  stdio server)
- `templates/cli-and-evals/eval-vitest-harness.ts` (routing on tool-call names,
  adversarial cases, repeats without retries)
- `templates/cli-and-evals/eval-braintrust.ts` (scorers and trials)
- `templates/cli-and-evals/eval-promptfoo.yaml`
- `templates/cli-and-evals/red-team-suite.yaml` (OWASP LLM Top 10 mapping)
- `templates/cli-and-evals/otel-genai-instrument.ts` (agent, chat and tool
  spans)
