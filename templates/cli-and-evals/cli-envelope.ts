/**
 * CLI Output Contract - Result on stdout, structured error on stderr
 *
 * **What it is:** Helpers for the output contract in the Agent Surface CLI guide. There is
 * no wrapper object: stdout carries the data itself, the object the API would return.
 * - Success: the data as JSON on stdout under `--json`, and automatically when stdout is
 *   not a TTY. Exit 0.
 * - Failure: nothing on stdout; one object on stderr,
 *   `{error, message, suggestions, failing_input?, invalid_args?, trace_id?}`, and a
 *   non-zero exit code (1 failure, 2 usage, 3 not found, 4 permission denied, 5 conflict).
 * - Progress, spinners, warnings and logs go to stderr, never stdout.
 *
 * The file keeps its name because the guide and the surface skill cite it; "envelope" here
 * means the error object and exit codes, not a wrapper around the data.
 *
 * **When to use:**
 * - Every CLI command that returns data or errors
 * - When agents will consume the CLI output programmatically
 *
 * **Canonical URLs:**
 * - https://agentsurface.dev/docs/cli-design/machine-readable-output
 * - https://agentsurface.dev/docs/error-handling/cli-errors
 *
 * **Customisation checklist:**
 * - [ ] Give every failure a stable, domain-prefixed snake_case code (`invoice_not_found`)
 * - [ ] Make `suggestions` runnable commands, most likely fix first
 * - [ ] Return every field on every run: `null` for an absent optional field, `[]` for an
 *       empty collection, so the shape never changes between calls
 * - [ ] Replace `printHuman` with your table or text rendering
 * - [ ] Send the unhandled-error log line to your logger
 * - [ ] Publish the exit-code contract in `--help --json` and your skill file
 *
 * **References:**
 * - Exit codes: only 0 (success) and non-zero (failure) are universal. The 0-5 meanings
 *   are this guide's contract, so publish them.
 * - NO_COLOR: https://no-color.org
 */

import { randomUUID } from "node:crypto";

/** This CLI's exit-code contract. */
export const ExitCode = {
  SUCCESS: 0,
  FAILURE: 1,
  USAGE_ERROR: 2,
  NOT_FOUND: 3,
  PERMISSION_DENIED: 4,
  CONFLICT: 5,
} as const;
export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

/** One invalid argument in a validation failure. */
export interface InvalidArg {
  arg: string;
  reason: string;
  received?: string;
  expected?: string;
}

/** The object written to stderr on failure. */
export interface CliErrorBody {
  /** Stable snake_case code agents branch on. Never a human-readable phrase. */
  error: string;
  /** Explanation of this occurrence. May change between releases. */
  message: string;
  /** Concrete next steps, most likely fix first. */
  suggestions: string[];
  /** The input values that caused the failure. */
  failing_input?: Record<string, unknown>;
  /** Validation failures only. */
  invalid_args?: InvalidArg[];
  /** Unhandled failures only; the details stay in the log. */
  trace_id?: string;
}

/** Throw this from a command for any failure the CLI understands. */
export class CliError extends Error {
  readonly code: string;
  readonly exitCode: ExitCode;
  readonly suggestions: string[];
  readonly failingInput?: Record<string, unknown>;
  readonly invalidArgs?: InvalidArg[];

  constructor(
    code: string,
    message: string,
    options: {
      exitCode?: ExitCode;
      suggestions?: string[];
      failingInput?: Record<string, unknown>;
      invalidArgs?: InvalidArg[];
    } = {},
  ) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.exitCode = options.exitCode ?? ExitCode.FAILURE;
    this.suggestions = options.suggestions ?? [];
    this.failingInput = options.failingInput;
    this.invalidArgs = options.invalidArgs;
  }

  toBody(): CliErrorBody {
    return {
      error: this.code,
      message: this.message,
      suggestions: this.suggestions,
      ...(this.failingInput ? { failing_input: this.failingInput } : {}),
      ...(this.invalidArgs ? { invalid_args: this.invalidArgs } : {}),
    };
  }
}

/** JSON mode: `--json` was passed, or stdout is not a terminal. */
export function wantsJson(jsonFlag: boolean | undefined): boolean {
  return Boolean(jsonFlag) || !process.stdout.isTTY;
}

/**
 * Colour only for a terminal, never under `--json`, and never when NO_COLOR is set to
 * any non-empty value. Pass `process.stderr` when colouring error text.
 */
export function shouldUseColor(
  jsonFlag: boolean | undefined,
  stream: NodeJS.WriteStream = process.stdout,
): boolean {
  return !jsonFlag && Boolean(stream.isTTY) && !process.env.NO_COLOR;
}

/**
 * Write a command's result to stdout. In JSON mode this is the data itself on one line,
 * with no wrapper. Resolves once the write has flushed.
 */
export async function writeResult<T>(
  data: T,
  options: { json?: boolean; printHuman: (data: T) => string },
): Promise<void> {
  const text = wantsJson(options.json) ? JSON.stringify(data) : options.printHuman(data);
  await new Promise<void>((resolve, reject) => {
    process.stdout.write(`${text}\n`, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/** Progress, warnings and logs: stderr only, so they never mix with the data on stdout. */
export function writeProgress(message: string): void {
  process.stderr.write(`${message}\n`);
}

/**
 * Write a failure to stderr and exit with its code. Structured JSON under `--json` or when
 * stderr is not a terminal; readable text otherwise. Exits from the write callback, because
 * exiting straight after a write to a pipe can cut the output short.
 */
export function exitWithError(error: CliError, jsonFlag?: boolean): void {
  writeErrorAndExit(error.toBody(), error.exitCode, jsonFlag);
}

function writeErrorAndExit(body: CliErrorBody, exitCode: ExitCode, jsonFlag?: boolean): void {
  let text: string;
  if (jsonFlag || !process.stderr.isTTY) {
    text = JSON.stringify(body);
  } else {
    const label = shouldUseColor(jsonFlag, process.stderr) ? "\u001B[31mError:\u001B[0m" : "Error:";
    text = [`${label} ${body.message}`, ...body.suggestions.map((s) => `  → ${s}`)].join("\n");
  }
  process.stderr.write(`${text}\n`, () => {
    process.exit(exitCode);
  });
}

/**
 * Run a command and apply the contract to whatever it throws. A `CliError` is reported as
 * thrown. Anything else is an unhandled failure: the exception is logged with a trace ID
 * and the caller gets a generic `internal_error` carrying only that ID, never a stack trace.
 */
export async function runCommand(
  jsonFlag: boolean | undefined,
  command: () => Promise<void>,
): Promise<void> {
  try {
    await command();
  } catch (error) {
    if (error instanceof CliError) {
      exitWithError(error, jsonFlag);
      return;
    }
    const traceId = randomUUID();
    // <CUSTOMISE>: send this line to your logger instead of stderr.
    process.stderr.write(
      `${JSON.stringify({ level: "error", message: "Unhandled CLI error", trace_id: traceId, cause: String(error) })}\n`,
    );
    writeErrorAndExit(
      {
        error: "internal_error",
        message: "An unexpected error occurred.",
        suggestions: [
          "Check the command syntax and try again",
          `Contact support with trace ID: ${traceId}`,
        ],
        trace_id: traceId,
      },
      ExitCode.FAILURE,
      jsonFlag,
    );
  }
}

/**
 * Example commander integration
 *
 * ```typescript
 * import { Command } from 'commander';
 *
 * const program = new Command('mytool');
 *
 * program
 *   .command('invoice-send <id>')
 *   .option('--json', 'Output JSON (automatic when piped)')
 *   .action((id, opts) =>
 *     runCommand(opts.json, async () => {
 *       const invoice = await api.getInvoice(id);
 *       if (!invoice) {
 *         throw new CliError('invoice_not_found', `Invoice ${id} does not exist.`, {
 *           exitCode: ExitCode.NOT_FOUND,
 *           suggestions: ['Run: mytool invoice-list'],
 *           failingInput: { invoice_id: id },
 *         });
 *       }
 *       if (invoice.status !== 'finalized') {
 *         throw new CliError('invoice_not_finalized', `Invoice ${id} is in '${invoice.status}' status.`, {
 *           exitCode: ExitCode.CONFLICT,
 *           suggestions: [`Run: mytool invoice-finalize ${id}`, `Then retry: mytool invoice-send ${id}`],
 *           failingInput: { invoice_id: id, current_status: invoice.status, required_status: 'finalized' },
 *         });
 *       }
 *       const sent = await api.sendInvoice(id);
 *       // stdout: {"id":"inv_01HV","status":"sent","sent_at":"2026-09-25T10:22:01Z"}
 *       await writeResult(sent, { json: opts.json, printHuman: (i) => `Sent ${i.id}` });
 *     }),
 *   );
 *
 * await program.parseAsync(process.argv);
 * ```
 */
