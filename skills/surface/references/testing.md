# Testing & Evaluation

Dimension 9: whether the product's agent surfaces are tested, and agent
behaviour is measured, beyond a demo that worked once.

## Score

- **0**: Ordinary unit and integration tests only; nothing exercises tool
  selection, an MCP server or agent behaviour.
- **1**: Some tests check tool selection or MCP responses, but none cover error
  recovery or multi-step flows.
- **2**: Selection, parameter correctness, error → recovery and multi-step
  sequences are tested; MCP is tested with
  `InMemoryTransport.createLinkedPair()`.
- **3**: An eval suite with several runs per case and pass@k / pass^k, regression
  baselines, CI integration, and cases drawn from real failures.

## Evidence to gather

- Test paths containing `agent`, `tool`, `mcp`, `eval`
- Eval tooling: Braintrust, Promptfoo, LangSmith, Phoenix, Langfuse, autoevals,
  `@mastra/evals`, OpenAI Evals
- CI workflows that run evals, and stored baselines per commit
- Labelled datasets and grader code (code, model, human)
- OpenTelemetry GenAI attributes in instrumentation

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

- `templates/cli-and-evals/mcp-test-harness.ts`
- `templates/cli-and-evals/eval-vitest-harness.ts`
- `templates/cli-and-evals/eval-braintrust.ts`
- `templates/cli-and-evals/eval-promptfoo.yaml`
- `templates/cli-and-evals/red-team-suite.yaml`
- `templates/cli-and-evals/otel-genai-instrument.ts`
