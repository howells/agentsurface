/**
 * CLI Response Envelope — Standard envelope for agent-consumable CLI output
 *
 * **What it is:** Reusable TS helpers for emitting structured JSON responses from CLI commands.
 * Shape: `{version, ok, data?, error?, meta: {trace_id, took_ms, command}}`.
 * Includes pretty-print + JSON modes, exit-code mapping (0 ok, 1 error, 2 usage, 3 auth).
 *
 * **When to use:**
 * - Every CLI command that returns data or errors
 * - When you need consistent response shapes across multiple commands
 * - When agents will consume the CLI output programmatically
 *
 * **Canonical URL:** https://code.claude.com/docs/en/cli-reference
 *
 * **Customisation checklist:**
 * - [ ] Update envelope version if schema changes
 * - [ ] Add domain-specific error codes to ExitCode enum
 * - [ ] Integrate with your logger (pino, winston, etc.)
 * - [ ] Add request/response middleware to commander hooks
 * - [ ] Test with `--json` and pretty modes
 *
 * **References:**
 * - Exit codes: https://www.freebsd.org/cgi/man.cgi?query=sysexits
 * - RFC 9457 Problem+JSON: https://www.rfc-editor.org/rfc/rfc9457.html
 */

import { z } from 'zod';
import { exit } from 'process';
import { isatty } from 'tty';

// Schema: Base envelope structure
const CLIEnvelopeSchema = z.object({
  version: z.literal('1.0').default('1.0'),
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  meta: z.object({
    trace_id: z.string(),
    took_ms: z.number(),
    command: z.string(),
  }),
});

export type CLIEnvelope<T = unknown> = z.infer<typeof CLIEnvelopeSchema> & {
  data?: T;
};

// Exit codes (BSD sysexits conventions)
export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  USAGE_ERROR = 2,
  AUTH_ERROR = 3,
  NOT_FOUND = 4,
  PERMISSION_DENIED = 77,
  TEMP_FAILURE = 69,
  SOFTWARE_ERROR = 70,
}

// Builder for responses
export class CLIResponse {
  private startTime = Date.now();
  private traceId: string;
  private command: string;
  private useJson: boolean;

  constructor(command: string, useJson: boolean = false) {
    this.command = command;
    this.useJson = useJson;
    this.traceId = this.generateTraceId();
  }

  private generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private getTookMs(): number {
    return Date.now() - this.startTime;
  }

  private format(envelope: CLIEnvelope): string {
    if (this.useJson) {
      return JSON.stringify(envelope);
    }
    return JSON.stringify(envelope, null, 2);
  }

  /**
   * Emit success response with optional data
   */
  success<T>(data?: T): string {
    const envelope: CLIEnvelope<T> = {
      version: '1.0',
      ok: true,
      data,
      meta: {
        trace_id: this.traceId,
        took_ms: this.getTookMs(),
        command: this.command,
      },
    };
    return this.format(envelope);
  }

  /**
   * Emit error response
   */
  error(code: string, message: string, details?: Record<string, unknown>): string {
    const envelope: CLIEnvelope = {
      version: '1.0',
      ok: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        trace_id: this.traceId,
        took_ms: this.getTookMs(),
        command: this.command,
      },
    };
    return this.format(envelope);
  }
}

/**
 * Helper: Output and exit with code
 */
export function outputAndExit(message: string, exitCode: ExitCode = ExitCode.SUCCESS): never {
  if (exitCode === ExitCode.SUCCESS) {
    console.log(message);
  } else {
    console.error(message);
  }
  exit(exitCode);
}

/**
 * Helper: Validate envelope before output (optional, for strict mode)
 */
export function validateEnvelope(data: unknown): CLIEnvelope {
  return CLIEnvelopeSchema.parse(data);
}

/**
 * Example: Integration with commander
 */
export function setupCLIWithEnvelope(program: any, opts: { json?: boolean; command: string }) {
  const response = new CLIResponse(opts.command, opts.json);

  return {
    response,
    exitSuccess: (data?: unknown) => {
      outputAndExit(response.success(data), ExitCode.SUCCESS);
    },
    exitError: (code: string, message: string, details?: Record<string, unknown>, exitCode: ExitCode = ExitCode.GENERAL_ERROR) => {
      outputAndExit(response.error(code, message, details), exitCode);
    },
  };
}

/**
 * Helper: Suppress color when not a TTY or when --json is set
 */
export function shouldUseColor(jsonMode: boolean): boolean {
  return !jsonMode && isatty(process.stdout.fd) && process.env.NO_COLOR !== '1';
}

/**
 * Example commander integration
 *
 * ```typescript
 * import { Command } from 'commander';
 *
 * const program = new Command();
 *
 * program
 *   .command('list-users')
 *   .option('--json', 'Output as JSON')
 *   .action((opts) => {
 *     const { response, exitSuccess, exitError } = setupCLIWithEnvelope(program, {
 *       json: opts.json,
 *       command: 'list-users',
 *     });
 *
 *     try {
 *       const users = await db.users.list();
 *       exitSuccess(users);
 *     } catch (err) {
 *       exitError(
 *         'DB_ERROR',
 *         (err as Error).message,
 *         { stack: (err as Error).stack },
 *         ExitCode.TEMP_FAILURE
 *       );
 *     }
 *   });
 *
 * program.parse(process.argv);
 * ```
 */
