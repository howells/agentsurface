/**
 * CLI NDJSON Streaming Helper — For long-running CLI commands with event progress
 *
 * **What it is:** Newline Delimited JSON (NDJSON) streaming helpers for emitting ordered events.
 * Each line is one event: `{ts, level, kind, ...payload}`. Typed event kinds: `progress`,
 * `tool_call`, `tool_result`, `log`, `final`.
 *
 * **When to use:**
 * - Long-running commands (> 5s) that need progress feedback
 * - Multi-step workflows where agents need intermediate results
 * - Log tailing, streaming search results, bulk operations
 *
 * **Canonical URL:** https://jsonlines.org
 *
 * **Customisation checklist:**
 * - [ ] Add domain-specific event kinds to EventKind enum
 * - [ ] Tune flush frequency for your latency budget
 * - [ ] Add request tracing (trace_id) to event payloads
 * - [ ] Implement backpressure handling for high-volume streams
 * - [ ] Test StreamParser with agent JSON consumers
 *
 * **References:**
 * - NDJSON spec: https://jsonlines.org
 * - NDJSON GitHub: https://github.com/ndjson/ndjson-spec
 * - CLI design guide: https://code.claude.com/docs/en/cli-reference
 */

import { z } from "zod";
import type { WriteStream } from "node:fs";
import { createWriteStream } from "node:fs";
import { createInterface } from "node:readline";

// Event schema
const NDJSONEventSchema = z.object({
  duration_ms: z.number().optional(),
  kind: z.enum(["progress", "tool_call", "tool_result", "log", "final"]),
  level: z.enum(["debug", "info", "warn", "error"]).default("info"),
  payload: z.record(z.string(), z.unknown()),
  trace_id: z.string().optional(),
  ts: z.string().datetime(), // ISO 8601,
});

export type NDJSONEvent = z.infer<typeof NDJSONEventSchema>;

export class NDJSONStream {
  private stream: WriteStream;
  private buffer: NDJSONEvent[] = [];
  private bufferSize = 50; // Flush after N events
  private traceId: string;

  constructor(output?: string, traceId?: string) {
    this.stream = output ? createWriteStream(output, { flags: "a" }) : process.stdout;
    this.traceId = traceId || this.generateTraceId();
  }

  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(7)}`;
  }

  /**
   * Emit a progress event
   */
  progress(message: string, current: number, total: number, metadata?: Record<string, unknown>) {
    const event: NDJSONEvent = {
      kind: "progress",
      level: "info",
      payload: {
        current,
        message,
        percent: Math.round((current / total) * 100),
        total,
        ...metadata,
      },
      trace_id: this.traceId,
      ts: new Date().toISOString(),
    };
    this.emit(event);
  }

  /**
   * Emit a tool invocation event
   */
  toolCall(toolName: string, callId: string, args: Record<string, unknown>) {
    const event: NDJSONEvent = {
      kind: "tool_call",
      level: "debug",
      payload: {
        arguments: args,
        call_id: callId,
        tool_name: toolName,
      },
      trace_id: this.traceId,
      ts: new Date().toISOString(),
    };
    this.emit(event);
  }

  /**
   * Emit a tool result event
   */
  toolResult(callId: string, result: unknown, durationMs?: number) {
    const event: NDJSONEvent = {
      duration_ms: durationMs,
      kind: "tool_result",
      level: "debug",
      payload: {
        call_id: callId,
        result,
      },
      trace_id: this.traceId,
      ts: new Date().toISOString(),
    };
    this.emit(event);
  }

  /**
   * Emit a log event
   */
  log(
    message: string,
    level: "debug" | "info" | "warn" | "error" = "info",
    details?: Record<string, unknown>,
  ) {
    const event: NDJSONEvent = {
      kind: "log",
      level,
      payload: {
        message,
        ...details,
      },
      trace_id: this.traceId,
      ts: new Date().toISOString(),
    };
    this.emit(event);
  }

  /**
   * Emit the final event (success or failure)
   */
  final(success: boolean, data?: unknown, error?: string) {
    const event: NDJSONEvent = {
      kind: "final",
      level: success ? "info" : "error",
      payload: {
        data,
        error,
        success,
      },
      trace_id: this.traceId,
      ts: new Date().toISOString(),
    };
    this.emit(event);
  }

  /**
   * Internal: emit event to buffer, flush if threshold reached
   */
  private emit(event: NDJSONEvent) {
    this.buffer.push(event);
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  /**
   * Flush buffered events to stream
   */
  flush() {
    for (const event of this.buffer) {
      this.stream.write(`${JSON.stringify(event)}\n`);
    }
    this.buffer = [];
  }

  /**
   * Close stream and flush remaining events
   */
  close() {
    this.flush();
    if (this.stream !== process.stdout) {
      this.stream.end();
    }
  }
}

/**
 * Client-side parser for consuming NDJSON streams
 */
export class StreamParser {
  async *parseStream(input: NodeJS.ReadableStream): AsyncGenerator<NDJSONEvent> {
    const rl = createInterface({
      crlfDelay: Infinity,
      input,
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          const event = NDJSONEventSchema.parse(JSON.parse(line));
          yield event;
        } catch (error) {
          console.error(`Failed to parse NDJSON line: ${line}`, error);
        }
      }
    }
  }

  /**
   * Collect events until 'final' event
   */
  async collectUntilFinal(input: NodeJS.ReadableStream): Promise<NDJSONEvent[]> {
    const events: NDJSONEvent[] = [];
    for await (const event of this.parseStream(input)) {
      events.push(event);
      if (event.kind === "final") {
        break;
      }
    }
    return events;
  }
}

/**
 * Example usage:
 *
 * ```typescript
 * const stream = new NDJSONStream(undefined, 'trace-123');
 *
 * stream.progress('Downloading files', 0, 100);
 * stream.toolCall('download_file', 'call-1', { url: 'https://example.com/file.zip' });
 *
 * for (let i = 1; i <= 100; i++) {
 *   // ... do work ...
 *   stream.progress('Downloading files', i, 100);
 * }
 *
 * stream.toolResult('call-1', { size_bytes: 51200 }, 2000);
 * stream.final(true, { total_downloaded: 51200 });
 * stream.close();
 * ```
 *
 * Client-side consumption:
 *
 * ```bash
 * my-cli download --ndjson | jq -r 'select(.kind=="progress") | "\(.payload.percent)%"'
 * # Output: 10%, 20%, ... 100%
 * ```
 */
