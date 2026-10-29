/**
 * OpenTelemetry GenAI Instrumentation - Emit semantic conventions for agent tracing
 *
 * **What it is:** Manual setup that emits OpenTelemetry GenAI semantic conventions:
 * a model-call span named `chat {model}` with `gen_ai.operation.name`, `gen_ai.provider.name`,
 * `gen_ai.request.model` and `gen_ai.usage.input_tokens` / `gen_ai.usage.output_tokens`, plus
 * tool spans named `execute_tool {tool}` with `gen_ai.tool.name` and `gen_ai.tool.call.id`.
 * It also shows an `invoke_agent {agent}` parent span. These spans are written by hand around
 * your own calls; they are not provider auto-instrumentation. OTLP and Langfuse exporters
 * run side by side.
 *
 * **When to use:**
 * - Tracing agent operations end-to-end (for debugging and eval)
 * - Exporting to observability backends (Langfuse, Arize Phoenix, Datadog)
 * - Measuring token usage and latency per operation
 * - Correlating tool calls with parent agent spans
 *
 * **Canonical URL:** https://github.com/open-telemetry/semantic-conventions-genai
 * (the `gen_ai.*` and `mcp.*` conventions moved there from the mainline semantic-conventions repo)
 *
 * **Customisation checklist:**
 * - [ ] Set OTEL_EXPORTER_OTLP_TRACES_ENDPOINT (or use the default local collector)
 * - [ ] Configure Langfuse API key (LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY)
 * - [ ] Update MODEL_NAME and PROVIDER to your target model
 * - [ ] Add domain-specific attributes (e.g., user_id, request_id)
 * - [ ] Wrap your agent, model and tool calls with withAgentSpan / withChatSpan / withToolSpan
 * - [ ] Test tracing with `pnpm test:traces` or export to UI
 *
 * **Environment variables:**
 * - `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` - full OTLP traces URL (default: http://localhost:4318/v1/traces)
 * - `OTEL_EXPORTER_OTLP_HEADERS` - Additional headers
 * - `LANGFUSE_SECRET_KEY` - Langfuse API secret
 * - `LANGFUSE_PUBLIC_KEY` - Langfuse public key
 * - `LANGFUSE_BASE_URL` - Langfuse instance (default: https://cloud.langfuse.com)
 *
 * **References:**
 * - OTel GenAI conventions: https://github.com/open-telemetry/semantic-conventions-genai
 * - GenAI spans: https://raw.githubusercontent.com/open-telemetry/semantic-conventions/main/docs/gen-ai/gen-ai-spans.md
 * - Langfuse: https://langfuse.com/docs/integrations/opentelemetry
 * - Arize Phoenix: https://docs.arize.com/phoenix
 * - Traceloop SDK: https://www.traceloop.com/docs
 */

import { context, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import type { Attributes } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  NodeTracerProvider,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import type { SpanProcessor } from "@opentelemetry/sdk-trace-node";

// <CUSTOMISE>: Update model, provider, agent name, system prompt
const MODEL_NAME = "claude-opus-5-5";
const PROVIDER = "anthropic";
const AGENT_NAME = "support-agent";
const SYSTEM_PROMPT = "You are a helpful AI agent...";

/**
 * Initialize OpenTelemetry tracing.
 *
 * In the JavaScript SDK 2.x, span processors are passed to the provider constructor
 * (`addSpanProcessor` was removed), and the OTLP HTTP exporter needs the full signal path.
 */
export async function initializeTracing(): Promise<NodeTracerProvider> {
  const spanProcessors: SpanProcessor[] = [];

  // Console exporter (for development)
  if (process.env.OTEL_DEBUG === "1") {
    spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  // OTLP exporter (production)
  const otlpExporter = new OTLPTraceExporter({
    headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
      ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
      : {},
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || "http://localhost:4318/v1/traces",
  });
  spanProcessors.push(new BatchSpanProcessor(otlpExporter));

  // Langfuse integration (optional): @langfuse/otel provides a span processor
  // that reads LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY and LANGFUSE_BASE_URL.
  if (process.env.LANGFUSE_SECRET_KEY) {
    const { LangfuseSpanProcessor } = await import("@langfuse/otel");
    spanProcessors.push(new LangfuseSpanProcessor());
  }

  const provider = new NodeTracerProvider({ spanProcessors });
  provider.register(); // also installs the context manager that makes span parenting work
  return provider;
}

/**
 * Tracer instance
 */
const tracer = trace.getTracer("agent-tracer", "1.0.0");

/**
 * Structured message in the GenAI convention: a role plus typed parts,
 * not a plain `{role, content}` object.
 */
function textMessage(role: string, content: string) {
  return { parts: [{ content, type: "text" }], role };
}

function recordError(span: ReturnType<typeof tracer.startSpan>, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  span.recordException(err);
  span.setAttribute("error.type", err.name);
  span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
}

/**
 * Model-call span (`gen_ai.operation.name` = "chat")
 *
 * Span name: `chat {model}`. Sets:
 * - gen_ai.operation.name = "chat"
 * - gen_ai.provider.name = "anthropic" | "openai" | "google"
 * - gen_ai.request.model = model ID
 * - gen_ai.usage.input_tokens / gen_ai.usage.output_tokens
 * - gen_ai.response.finish_reasons
 * Opt-in (may contain sensitive content): gen_ai.input.messages, gen_ai.output.messages
 */
export interface ChatSpanInput {
  prompt: string;
  systemPrompt?: string;
  model?: string;
}

export interface ChatSpanOutput {
  text: string;
  inputTokens: number;
  outputTokens: number;
  stopReason?: string;
}

export async function withChatSpan<R extends ChatSpanOutput>(
  input: ChatSpanInput,
  fn: () => Promise<R>,
  extraAttributes: Attributes = {},
): Promise<R> {
  const model = input.model || MODEL_NAME;
  // CLIENT kind: the span covers a call to a model provider
  const span = tracer.startSpan(`chat ${model}`, { kind: SpanKind.CLIENT });

  try {
    span.setAttributes({
      "gen_ai.operation.name": "chat",
      "gen_ai.provider.name": PROVIDER,
      "gen_ai.request.model": model,
      ...extraAttributes,
    });

    // Opt-in: record content only where your privacy policy allows it
    if (process.env.OTEL_GENAI_CAPTURE_CONTENT === "1") {
      span.setAttribute(
        "gen_ai.input.messages",
        JSON.stringify([textMessage("user", input.prompt)]),
      );
      span.setAttribute(
        "gen_ai.system_instructions",
        JSON.stringify([{ content: input.systemPrompt || SYSTEM_PROMPT, type: "text" }]),
      );
    }

    const result = await context.with(trace.setSpan(context.active(), span), fn);

    span.setAttributes({
      "gen_ai.usage.input_tokens": result.inputTokens,
      "gen_ai.usage.output_tokens": result.outputTokens,
    });
    if (result.stopReason) {
      span.setAttribute("gen_ai.response.finish_reasons", [result.stopReason]);
    }
    if (process.env.OTEL_GENAI_CAPTURE_CONTENT === "1") {
      span.setAttribute(
        "gen_ai.output.messages",
        JSON.stringify([
          { ...textMessage("assistant", result.text), finish_reason: result.stopReason },
        ]),
      );
    }

    return result;
  } catch (error) {
    recordError(span, error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Agent invocation span (`gen_ai.operation.name` = "invoke_agent")
 *
 * Span name: `invoke_agent {agent name}`. Parent of the chat and tool spans for one agent run.
 */
export async function withAgentSpan<T>(agentName: string, fn: () => Promise<T>): Promise<T> {
  const span = tracer.startSpan(`invoke_agent ${agentName}`);

  try {
    span.setAttributes({
      "gen_ai.agent.name": agentName,
      "gen_ai.operation.name": "invoke_agent",
      "gen_ai.provider.name": PROVIDER,
    });
    return await context.with(trace.setSpan(context.active(), span), fn);
  } catch (error) {
    recordError(span, error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Tool call span (`gen_ai.operation.name` = "execute_tool")
 *
 * Child span for each tool invocation:
 * - Span name: `execute_tool {tool_name}`
 * - gen_ai.operation.name = "execute_tool"
 * - gen_ai.tool.name = tool_name
 * - gen_ai.tool.call.id = call_id
 * Opt-in: gen_ai.tool.call.arguments / gen_ai.tool.call.result
 */
export async function withToolSpan<T>(
  toolName: string,
  callId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const span = tracer.startSpan(`execute_tool ${toolName}`);

  try {
    span.setAttributes({
      "gen_ai.operation.name": "execute_tool",
      "gen_ai.tool.call.id": callId,
      "gen_ai.tool.name": toolName,
    });

    return await context.with(trace.setSpan(context.active(), span), fn);
  } catch (error) {
    recordError(span, error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Example: agent run with instrumentation
 */
interface AgentRequest {
  prompt: string;
}

export class InstrumentedAgent {
  async run(input: AgentRequest): Promise<ChatSpanOutput> {
    return withAgentSpan(AGENT_NAME, async () => {
      // Call your actual agent SDK here. This is a stub.
      const toolResult = await withToolSpan("search_docs", `call-${Date.now()}`, async () => ({
        docs: "example documentation",
      }));

      return withChatSpan(input, async () => ({
        inputTokens: 100,
        outputTokens: 150,
        stopReason: "end_turn",
        text: `Found documentation: ${JSON.stringify(toolResult)}`,
      }));
    });
  }
}

/**
 * Helper: Log span context (for manual tracing)
 */
export function logSpanContext(): void {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    console.log(`Trace ID: ${spanContext.traceId}, Span ID: ${spanContext.spanId}`);
  }
}

/**
 * Example usage:
 *
 * ```typescript
 * import { initializeTracing, InstrumentedAgent } from './otel-genai-instrument';
 *
 * // Initialize at startup
 * await initializeTracing();
 *
 * const agent = new InstrumentedAgent();
 *
 * // Spans are created and exported: invoke_agent > execute_tool + chat
 * const response = await agent.run({ prompt: 'Find documentation on MCP' });
 * ```
 *
 * Environment setup for local tracing:
 *
 * ```bash
 * # Start a local OTLP collector (e.g., via Docker)
 * docker run -p 4318:4318 otel/opentelemetry-collector-contrib
 *
 * # Or use Langfuse (cloud option)
 * export LANGFUSE_SECRET_KEY=sk_lf_...
 * export LANGFUSE_PUBLIC_KEY=pk_lf_...
 *
 * # Run agent with tracing
 * OTEL_DEBUG=1 node app.js
 * ```
 */

/**
 * GenAI semantic convention reference (checked 2026-10-29; the conventions are still marked
 * development, so pin the version you follow):
 *
 * `gen_ai.system` was replaced by `gen_ai.provider.name`; update any older
 * instrumentation still emitting the former.
 *
 * Agent span (`invoke_agent {gen_ai.agent.name}`):
 * - gen_ai.operation.name: "invoke_agent"
 * - gen_ai.agent.name, gen_ai.agent.id, gen_ai.agent.version
 *
 * Model-call span (`{gen_ai.operation.name} {gen_ai.request.model}`):
 * - gen_ai.operation.name: required, e.g. "chat", "text_completion", "embeddings"
 * - gen_ai.provider.name: required, e.g. "anthropic", "openai", "gcp.gemini"
 * - gen_ai.request.model: conditionally required
 * - gen_ai.request.max_tokens, gen_ai.request.temperature: optional request parameters
 *   (record temperature only for models that accept one)
 * - gen_ai.response.model, gen_ai.response.finish_reasons, error.type
 * - gen_ai.usage.input_tokens, gen_ai.usage.output_tokens
 * - gen_ai.input.messages / gen_ai.output.messages: opt-in, structured messages with
 *   `role` and `parts`
 * - gen_ai.system_instructions: opt-in, structured content (not a hash or summary)
 * - gen_ai.data_source.id: RAG corpus ID if applicable
 *
 * Tool span (`execute_tool {gen_ai.tool.name}`, child of the agent span):
 * - gen_ai.operation.name: "execute_tool"
 * - gen_ai.tool.name: required
 * - gen_ai.tool.call.id: conditionally required
 * - gen_ai.tool.call.arguments / gen_ai.tool.call.result: opt-in
 *
 * See: https://github.com/open-telemetry/semantic-conventions-genai
 */
