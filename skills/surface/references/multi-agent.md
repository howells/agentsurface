# Multi-Agent Support

## Summary

Dimension 9 scores multi-agent orchestration patterns when justified. Consensus is clear: single-agent-with-good-tools is the default. Multi-agent adds complexity and is valuable only for genuine task decomposition (orchestrator-worker), parallel research, skill specialization, or cross-org coordination (A2A). Baseline is no support or basic sub-agent spawning without structure. Production includes supervisor pattern, state management, human-in-the-loop gates. Advanced includes A2A agent-card discovery, workflow composition, durable memory, dynamic agent selection, and cross-framework interop.

- **0**: No multi-agent patterns (not always negative)
- **1**: Basic sub-agent support, no structured delegation or state
- **2**: Supervisor pattern, structured delegation, state management, human gates
- **3**: A2A cards published, workflow composition, persistent memory, dynamic selection
- **N/A**: Project not an agent system and does not orchestrate agents

---

Community consensus from Cognition, 12-factor agents, and Lilian Weng is clear: **single-agent-with-tools is the default**. Multi-agent is valuable only for genuine task decomposition (orchestrator-worker pattern), parallel research across domains, skill specialization, or cross-organization coordination (A2A). This reference scores whether a project supports multi-agent patterns when justified, not whether it uses them unnecessarily. The default architecture is one capable agent with a rich tool belt; multi-agent adds operational complexity and must earn its place.

## Scoring Rubric

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No multi-agent patterns. Single-agent or no agent support. | No agent orchestration code. No sub-agent definitions. |
| 1 | Basic sub-agent support. Can spawn agents but no structured delegation. | Agent definitions exist but: no state management between agents, no delegation patterns, no memory sharing. |
| 2 | Supervisor pattern. Structured delegation with clear agent roles. State management. Human-in-the-loop at critical points. | Supervisor/orchestrator agent delegates to specialists. State passed between agents. Approval gates on destructive actions. |
| 3 | Advanced multi-agent. A2A agent cards published. Workflow composition. Memory patterns (working, semantic, observational). Dynamic agent selection. Cross-framework interop. | /.well-known/agent-card.json published. Multiple orchestration patterns. Memory system with persistence. Agents discoverable by external systems. |

**N/A when:** Project is not an agent system and does not orchestrate agents.

## Evidence to Gather

- **Agent definitions**: `.claude/agents/` (Anthropic Claude Code SDK), Agent instantiation in code, ADK `Agent` classes, LangGraph `Graph` nodes, Mastra `Agent` definitions.
- **A2A discovery**: `/.well-known/agent.json` or `/.well-known/agent-card.json`.
- **Durable execution**: Temporal, Inngest, Trigger.dev, LangGraph checkpointers, step-function platforms.
- **State management**: Typed state schemas, checkpointers, multi-turn resumption patterns.
- **Human-in-the-loop**: Approval tools, interrupt-and-resume patterns, callbacks, signals.
- **Memory systems**: Working memory (context window), episodic memory (vector DB), semantic memory (fact store), Memory Bank endpoints.

## Deep Dive

### The Default: Single Agent with Good Tools

Cognition's "[Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents)" essay: context isolation between agents breaks assumptions, parallel workers conflict, and errors amplify without rigorous state management. Single agent + good tools (verb_noun, exhaustive enums, when/why descriptions) is simpler, cheaper, deterministic.

Lilian Weng: agent = LLM + tools + memory + planning. Multi-agent is *composition*, not prerequisite. 12-factor agents Factor #10 ("Small, Focused Agents") refers to agent scope, not orchestration.

**Justify multi-agent only for:**
- Clear parallel task decomposition (Anthropic research: parallel URL fetch, independent summaries returned to orchestrator).
- Skill specialization (code review agent, writer agent, planner agent).
- Cross-organization delegation (A2A protocol).
- Cost routing (Haiku/Nano for simple steps, Opus/GPT-5.4 for reasoning).

### Orchestration Patterns

#### Supervisor / Orchestrator-Worker

Central agent decomposes task, routes to specialists, gathers and synthesizes. Best for clearly separable work (research + review + writing).

**Anthropic Claude Code SDK:** Subagents defined in `.claude/agents/*.md` with YAML frontmatter. Orchestrator calls them via tool-like syntax, receives summaries.

**LangGraph StateGraph:** Typed state schema, supervisor node makes routing decisions, specialist nodes process tasks, final node synthesizes.

#### Swarm / Hand-Off

Agents decide when to hand off. More dynamic; less central control. OpenAI Agents SDK: agents are tools that return other agents. LangGraph `createSwarm`: active agents autonomously route.

#### Sequential Pipeline & Parallel + Gather

Sequential: one output → next input (Google ADK `SequentialAgent`). Parallel: independent agents run concurrently, reducer merges results (Google ADK `ParallelAgent`). Trade-off: sequential is predictable, parallel is fast but requires explicit merge semantics.

#### Loop Agent

Retry-until-condition pattern (Google ADK `LoopAgent`). Useful for task refinement: "Try this approach. If <signal>, try again with updated strategy."

### State Management

**Typed state schema (LangGraph):** Annotation.Root with TypedDict fields. Each field has a reducer (default: merge/overwrite; custom: list append, dict merge). Every agent call receives full state, returns delta.

```typescript
const AgentState = Annotation.Root({
  task: Annotation<string>,
  results: Annotation<string[], addMessagesReducer>,  // Append
  approval: Annotation<"pending" | "approved" | "rejected">,
  metadata: Annotation<Record<string, any>, mergeReducer>  // Dict merge
});

const workflow = new StateGraph(AgentState)
  .addNode("fetch", fetchNode)
  .addNode("summarize", summarizeNode)
  .addEdge("fetch", "summarize")
  .compile({ checkpointer: new MemorySaver() });
```

**Checkpointers:** MemorySaver (development), RedisSaver (production). Preserve state across interrupts; on failure, resume from last checkpoint, not from scratch.

**Interrupt for HITL:** Pause at critical node, wait for user response, resume from same thread using `thread_id`. LangGraph: `interrupt_before: ["approve"]` pauses execution.

### Memory Patterns

- **Working memory:** Task state + conversation history in context window.
- **Episodic memory:** Timestamped past trials (vector DB: pgvector, Qdrant, Pinecone).
- **Semantic memory:** Agent-authored facts ("User prefers DD/MM/YYYY"). Small, dense, queryable.
- **Vertex AI Memory Bank:** Managed `$0.25/1k memories/month`. No infra overhead.
- **Claude Code memory tool (beta):** Client-side `/memories` persistent across sessions.

### A2A (Agent-to-Agent Protocol)

**v1.0 RC (March 2026, Linux Foundation):** https://a2a-protocol.org/latest/specification/

- **Discovery:** AgentCard at `/.well-known/agent.json` (canonical) or `agent-card.json` (fallback). Fields: name, description, endpoints (JSON-RPC URL), skills, capabilities, auth.
- **Task lifecycle:** Pending → Accepted → In_Progress → Completed/Failed.
- **Transport:** JSON-RPC 2.0 over HTTPS. gRPC/REST on roadmap.
- **Backers:** AWS, Cisco, Google, IBM, Microsoft, Salesforce, SAP, ServiceNow.

### Human-in-the-Loop

**When to interrupt:** Destructive ops, ambiguity (confidence <70%), cost thresholds.

**Patterns:**
- Approval tool: agent calls a tool, pauses, resumes on user response.
- LangGraph interrupt: `interrupt_before: ["approval_node"]` pauses execution.
- HumanLayer: managed HITL service (https://humanlayer.ai). Integrates with 12-factor agents.

### Durable Execution

LLM stochasticity, tool errors, timeouts, HITL delays require automatic retries and checkpoints.

- **Temporal:** Industrial-grade, deterministic workflow-as-code, auto-retries. Steep curve.
- **Inngest:** Event-driven steps, TS-first, free <1k invocations/month.
- **Trigger.dev:** Serverless, TS-first, simplest API for web apps.
- **AWS Durable Functions, Cloudflare Workflows, Vercel Workflow DevKit:** Launched late 2025; similar primitives (steps-as-code, auto-checkpoint, managed retry).

### Anthropic's Multi-Agent Research System (Case Study)

https://www.anthropic.com/engineering/multi-agent-research-system

**Key patterns:** Orchestrator decomposes into parallel URL-fetch jobs. Workers fetch and summarize independently. Effort scaling: simple queries (3–10 calls, 1 agent) vs. complex (10–50 calls, many agents) via explicit prompts. Summary pattern: workers return summaries, not transcripts; orchestrator synthesizes compressed context.

### Cognition's "Don't Build Multi-Agents"

https://cognition.ai/blog/dont-build-multi-agents

Context isolation breaks assumptions. Parallel workers conflict without coordination. Without rigorous state management, multi-agent amplifies errors. Default: single agent; multi-agent for clear task decomposition only.

### Observability & Tracing

Multi-agent workflows must be observable: which agent did what, when, with what inputs/outputs, and why did it fail?

**OpenTelemetry GenAI semconv** (https://opentelemetry.io/docs/specs/semconv/gen-ai/):
- Span name: `{gen_ai.operation.name} {gen_ai.request.model}` (e.g., "orchestrator claude-opus-4-7").
- Key attrs: `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.input.messages`, `gen_ai.output.messages`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`.
- Tool calls: child spans named `tool.{tool_name}`.
- Nested agents: child spans for subagent calls.

**Tracing backends:** Langfuse (OTEL backend), Arize Phoenix (self-hosted), Datadog, New Relic all support GenAI semconv. OpenAI Agents SDK exports OTLP automatically.

### Cross-Vendor Integration

**Anthropic Claude Code SDK (TypeScript):** Subagents in `.claude/agents/*.md` (YAML: name, description, prompt, tools, model). Ephemeral context, summary → parent. Supports `resume` option for multi-turn state.

**Anthropic Claude Code:** Skill `context: fork` + `agent: <name>` for isolated, fresh conversation. Subagent auto-messages include `parent_tool_use_id` for tracing.

**OpenAI Agents SDK (TypeScript):** Agent-as-Tool pattern: agents are callable tools that return other agents. Handoff preserves full conversation history. Built-in tracing: spans nest automatically, export OTLP.

**Google ADK (TypeScript):** `SequentialAgent`, `ParallelAgent`, `LoopAgent` for workflow composition. Sub-agents via `sub_agents` parameter on LlmAgent. Python-first, TS stable.

**LangGraph (TypeScript):** StateGraph with typed Annotation. Supervisor (central router) and swarm (active routing) patterns built-in. Checkpointers (MemorySaver, RedisSaver). Interrupt + resume for HITL. Extensive documentation.

**Mastra (TypeScript):** Agent + Workflow primitives. Built-in memory integration (working, episodic, semantic). Native MCP support. Lightweight alternative to LangGraph.

## Anti-Patterns

- **Multi-agent without justification:** Default to single agent with rich tools (Cognition's warning). Multi-agent must earn its complexity.
- **Implicit state across agents:** Always use typed state schemas (TypedDict + Annotation) and checkpoints. No magic strings, no assumption sharing.
- **Missing checkpoints on failure:** On error, restart from scratch, amplifying mistakes. Checkpointers (LangGraph Memory/Redis) are non-negotiable.
- **Unbounded loops:** No `maxTurns`, timeouts, cost budgets. Agent loops indefinitely or explodes token usage.
- **No HITL on destructive actions:** Even confident agents delete, overwrite, or execute irreversible changes without approval gates.
- **Mixing state management and orchestration in prompts:** Orchestration logic (routing decisions, state transitions) belongs in code; agents focus on tasks.
- **Parallel agents without summarization:** Returning full transcripts explodes orchestrator context. Workers must summarize and return.
- **Logging agent → agent calls without tracing:** Use OpenTelemetry GenAI semconv. Parent-child span relationships are critical for debugging failures.

## Evaluation & Testing

Multi-agent workflows are harder to test than single agents: non-determinism multiplies, state branching explodes, and failure modes are subtle.

**Multi-step flow evals (Dimension 10):**
- Define success criteria upfront: "Orchestrator correctly delegates to 3 agents" + "agents return summaries <500 tokens" + "final output correct".
- `pass@k`: run N times, measure success rate. Example: "pass@3" = succeeded in at least 1 of 3 runs.
- `pass^k` (rare): *all* N runs succeeded (strict, but useful for critical ops).
- Test at inference, not training: use actual models, real tools, live APIs.

**Regression detection:** Baseline each orchestration pattern (supervisor vs swarm). If success rate drops >5% on new changes, investigate.

**Trace-based debugging:** OpenTelemetry spans expose agent decisions, tool calls, state mutations. Review traces for:
- Wrong agent selected (orchestrator routing logic bug).
- Summarization truncated critical info (worker prompt issue).
- State not updated correctly (reducer bug).

## Cost & Performance Considerations

**Token efficiency:** Multi-agent can increase token spend if orchestrator echoes full agent outputs. Always summarize before returning to orchestrator. Anthropic's multi-agent research system reduces transcripts to summaries, keeping orchestrator context <5k tokens per worker.

**Latency:** Parallel agents reduce wall-clock time (3 parallel agents = 1/3 latency if network-bound). Sequential agents add latency (3 sequential = 3x latency). Trade-off: prioritize clarity and correctness over raw speed unless performance is critical.

**Model routing:** Cost-optimize by routing cheap steps (summarization, formatting) to Haiku/Nano, expensive reasoning to Opus/GPT-5.4. Supervisor → Haiku workers + Opus orchestrator can reduce costs 40–60% vs. all-Opus.

## Workflow Design Guidelines

When designing a multi-agent system:

1. **Start single.** Build one agent + rich tools. Measure success rate, latency, cost.
2. **Justify multi-agent.** Only decompose if: clear subtasks, independent parallelism, or skill specialization.
3. **Define state schema.** Every field typed, every reducer explicit. No surprises.
4. **Checkpoint early.** Place checkpoints after expensive operations, before HITL, before state mutations.
5. **Test orchestration.** Evals must verify correct agent selection, proper state flow, successful handoffs.
6. **Monitor production.** OTEL traces for every agent call. Alert on high failure rates, token overruns, latency spikes.
7. **Iterate on prompts.** Orchestrator and workers evolve separately. Use eval-driven development.

## Templates and Tooling

- `/templates/agent-card.json` — A2A AgentCard example.
- `/templates/langgraph-supervisor.ts` — Supervisor pattern with typed state.
- `/templates/langgraph-swarm.ts` — Swarm pattern (active agent routing).
- `/templates/agents-sdk-handoff.ts` — Agent-as-tool handoff (OpenAI).
- `/templates/subagent.md` — Claude Code subagent definition.
- `/templates/durable-workflow.ts` — Inngest or Trigger.dev example.
- `/templates/memory-bank.ts` — Vertex AI Memory Bank integration.

## Citations

- Cognition "Don't Build Multi-Agents": https://cognition.ai/blog/dont-build-multi-agents
- Anthropic multi-agent research system: https://www.anthropic.com/engineering/multi-agent-research-system
- 12-factor agents: https://github.com/humanlayer/12-factor-agents
- A2A v1.0 RC specification: https://a2a-protocol.org/latest/specification/
- Claude Code SDK: https://docs.anthropic.com/en/docs/claude-code/sdk
- Claude Code subagents: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- OpenAI Agents SDK (TypeScript): https://openai.github.io/openai-agents-js/
- Google ADK: https://google.github.io/adk-docs/
- LangGraph JS: https://langchain-ai.github.io/langgraphjs/
- Mastra: https://mastra.ai
- Temporal: https://temporal.io
- Inngest: https://inngest.com
- Trigger.dev: https://trigger.dev
- Vertex AI Agent Engine: https://docs.cloud.google.com/agent-builder/agent-engine/overview
- HumanLayer: https://humanlayer.ai

## See Also

- `docs/multi-agent` — Deeper guidance on orchestration patterns and state management.
- `references/context-files.md` — How to structure orchestrator context for clarity.
- `references/testing.md` — Multi-step flow evaluation metrics (pass@k, pass^k).
- `references/tool-design.md` — Tool naming and disambiguation for agents.
- `templates/agent-card.json` — Example A2A AgentCard.
- `templates/langgraph-supervisor.ts` — Runnable supervisor pattern.
