/**
 * OpenTelemetry GenAI Instrumentation — Emit semantic conventions for agent tracing
 *
 * **What it is:** Setup that emits OpenTelemetry GenAI semantic conventions:
 * `gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`,
 * `gen_ai.usage.output_tokens`, `gen_ai.operation.name`, tool spans with
 * `gen_ai.tool.name`, `gen_ai.tool.call.id`. Includes decorator for chat operations
 * and Langfuse + OTLP exporters side-by-side.
 *
 * **When to use:**
 * - Tracing agent operations end-to-end (for debugging and eval)
 * - Exporting to observability backends (Langfuse, Arize Phoenix, Datadog)
 * - Measuring token usage and latency per operation
 * - Correlating tool calls with parent agent spans
 *
 * **Canonical URL:** https://opentelemetry.io/docs/specs/semconv/gen-ai/
 *
 * **Customisation checklist:**
 * - [ ] Set OTEL_EXPORTER_OTLP_ENDPOINT (or use auto-detect)
 * - [ ] Configure Langfuse API key (LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY)
 * - [ ] Update MODEL_NAME and PROVIDER to your target model
 * - [ ] Add domain-specific attributes (e.g., user_id, request_id)
 * - [ ] Wire @withGenAISpan decorator into agent functions
 * - [ ] Test tracing with `pnpm test:traces` or export to UI
 *
 * **Environment variables:**
 * - `OTEL_EXPORTER_OTLP_ENDPOINT` — OTLP collector endpoint (default: http://localhost:4318)
 * - `OTEL_EXPORTER_OTLP_HEADERS` — Additional headers
 * - `LANGFUSE_SECRET_KEY` — Langfuse API secret
 * - `LANGFUSE_PUBLIC_KEY` — Langfuse public key
 * - `LANGFUSE_HOST` — Langfuse instance (default: https://cloud.langfuse.com)
 *
 * **References:**
 * - OTEL GenAI semconv: https://opentelemetry.io/docs/specs/semconv/gen-ai/
 * - Langfuse: https://langfuse.com/docs/integrations/opentelemetry
 * - Arize Phoenix: https://docs.arize.com/phoenix
 * - Traceloop SDK: https://www.traceloop.com/docs
 */

import {
  NodeTracerProvider,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-proto';
import { context, trace, Span, SpanStatusCode } from '@opentelemetry/api';
import { z } from 'zod';

// <CUSTOMISE>: Update model, provider, system prompt
const MODEL_NAME = 'claude-opus-4-7';
const PROVIDER = 'anthropic';
const SYSTEM_PROMPT = 'You are a helpful AI agent...';

/**
 * Initialize OpenTelemetry tracing
 */
export function initializeTracing(): NodeTracerProvider {
  const provider = new NodeTracerProvider();

  // Console exporter (for development)
  if (process.env.OTEL_DEBUG === '1') {
    provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  // OTLP exporter (production)
  const otlpExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) : {},
  });
  provider.addSpanProcessor(new BatchSpanProcessor(otlpExporter));

  // Langfuse integration (optional)
  if (process.env.LANGFUSE_SECRET_KEY) {
    const { LangfuseExporter } = require('@langfuse/opentelemetry');
    const langfuseExporter = new LangfuseExporter();
    provider.addSpanProcessor(new SimpleSpanProcessor(langfuseExporter));
  }

  provider.register();
  return provider;
}

/**
 * Tracer instance
 */
const tracer = trace.getTracer('agent-tracer', '1.0.0');

/**
 * Chat operation span
 *
 * Sets GenAI semantic convention attributes:
 * - gen_ai.system = "anthropic" | "openai" | "google"
 * - gen_ai.request.model = model ID
 * - gen_ai.operation.name = "chat"
 * - gen_ai.input.messages = system + user message
 * - gen_ai.output.messages = assistant response
 * - gen_ai.usage.input_tokens
 * - gen_ai.usage.output_tokens
 */
interface ChatSpanInput {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  userId?: string;
  requestId?: string;
}

interface ChatSpanOutput {
  text: string;
  inputTokens: number;
  outputTokens: number;
  stopReason?: string;
}

export function withGenAISpan<T extends any[], R extends ChatSpanOutput>(
  operationName: string = 'chat'
) {
  return function decorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      const span = tracer.startSpan(operationName);

      try {
        // Extract input from first argument (assumed to be ChatSpanInput)
        const input = args[0] as ChatSpanInput;

        // Set semantic convention attributes
        span.setAttributes({
          'gen_ai.system': PROVIDER,
          'gen_ai.request.model': input.model || MODEL_NAME,
          'gen_ai.operation.name': operationName,
          'gen_ai.input.messages': JSON.stringify([
            { role: 'system', content: input.systemPrompt || SYSTEM_PROMPT },
            { role: 'user', content: input.prompt },
          ]),
        });

        // Optional: user context
        if (input.userId) {
          span.setAttribute('user.id', input.userId);
        }
        if (input.requestId) {
          span.setAttribute('request.id', input.requestId);
        }

        // Run the original method
        const result = await originalMethod.apply(this, args) as R;

        // Record output
        span.setAttributes({
          'gen_ai.output.messages': JSON.stringify([
            { role: 'assistant', content: result.text },
          ]),
          'gen_ai.usage.input_tokens': result.inputTokens,
          'gen_ai.usage.output_tokens': result.outputTokens,
        });

        if (result.stopReason) {
          span.setAttribute('gen_ai.stop_reason', result.stopReason);
        }

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}

/**
 * Tool call span
 *
 * Child span for each tool invocation:
 * - Span name: `tool.{tool_name}`
 * - gen_ai.tool.name = tool_name
 * - gen_ai.tool.call.id = call_id
 */
export async function withToolSpan<T>(
  toolName: string,
  callId: string,
  fn: () => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(`tool.${toolName}`);

  try {
    span.setAttributes({
      'gen_ai.tool.name': toolName,
      'gen_ai.tool.call.id': callId,
    });

    const result = await context.with(trace.setSpan(context.active(), span), () => fn());

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Example: Agent function with instrumentation
 */
interface AgentRequest {
  prompt: string;
  userId?: string;
}

interface AgentResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export class InstrumentedAgent {
  @withGenAISpan('chat')
  async chat(input: AgentRequest & ChatSpanInput): Promise<AgentResponse> {
    // Call your actual agent SDK here
    // This is a stub:

    // Simulate tool calls
    const toolName = 'search_docs';
    const callId = `call-${Date.now()}`;

    const toolResult = await withToolSpan(toolName, callId, async () => {
      // Call actual tool
      return { docs: 'example documentation' };
    });

    return {
      text: `Found documentation: ${JSON.stringify(toolResult)}`,
      inputTokens: 100,
      outputTokens: 150,
    };
  }
}

/**
 * Helper: Log span context (for manual tracing)
 */
export function logSpanContext(): void {
  const span = trace.getActiveSpan();
  if (span) {
    const context = span.spanContext();
    console.log(`Trace ID: ${context.traceId}, Span ID: ${context.spanId}`);
  }
}

/**
 * Example usage:
 *
 * ```typescript
 * import { initializeTracing, InstrumentedAgent } from './otel-genai-instrument';
 *
 * // Initialize at startup
 * initializeTracing();
 *
 * const agent = new InstrumentedAgent();
 *
 * // Spans are automatically created and exported
 * const response = await agent.chat({
 *   prompt: 'Find documentation on MCP',
 *   userId: 'user-123',
 *   requestId: 'req-456',
 * });
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
 *
 * Querying traces via Langfuse:
 * - Navigate to https://cloud.langfuse.com
 * - View traces, spans, and metrics
 * - Query by trace_id, span_name, or attributes
 */

/**
 * GenAI semantic convention reference (April 2026):
 *
 * Root span (chat operation):
 * - gen_ai.system: "anthropic" | "openai" | "google"
 * - gen_ai.request.model: e.g., "claude-opus-4-7"
 * - gen_ai.request.max_tokens: integer
 * - gen_ai.request.temperature: 0-2
 * - gen_ai.input.messages: JSON array of messages
 * - gen_ai.output.messages: JSON array of responses
 * - gen_ai.usage.input_tokens: integer
 * - gen_ai.usage.output_tokens: integer
 * - gen_ai.system_instructions: hash or summary of system prompt
 * - gen_ai.data_source.id: RAG corpus ID if applicable
 * - gen_ai.operation.name: e.g., "chat", "completion", "embedding"
 * - gen_ai.stop_reason: e.g., "end_turn", "max_tokens"
 *
 * Tool span (child of root):
 * - Span name: tool.{tool_name}
 * - gen_ai.tool.name: tool name
 * - gen_ai.tool.call.id: unique call ID
 *
 * See: https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */
