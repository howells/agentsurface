/**
 * CLI Schema Introspection - `--help --json` and a `describe` command
 *
 * **What it is:** `commander` helpers that let an agent ask the installed CLI what it
 * accepts, in the shapes the Agent Surface CLI guide documents:
 * - `<cli> <command> --help --json` prints one command:
 *   `{command, description, flags: [{name, type, required, default?, description}], args}`.
 * - `<cli> describe` prints the whole tree: `{name, version, commands: [...], exit_codes}`,
 *   with command groups nested under `commands`.
 * Both write JSON to stdout and exit 0.
 *
 * `exit_codes` is the contract from `cli-envelope.ts`. Exit-code meanings beyond 0 and
 * non-zero are per-CLI, so the CLI publishes its own here.
 *
 * **When to use:**
 * - When you want agents to discover CLI capabilities without pre-loaded docs
 * - When flags change between versions and docs can go stale
 *
 * **Canonical URL:** https://agentsurface.dev/docs/cli-design/schema-introspection
 *
 * **Customisation checklist:**
 * - [ ] Give every flag and argument a description
 * - [ ] Add `enum`, `format` and `returns` (a JSON Schema for the result on stdout) where
 *       commander cannot know them: pass them through `extras`
 * - [ ] Use placeholders that state the type: `--limit <int>`, `--ratio <number>`
 * - [ ] Point your SKILL.md or AGENTS.md at `describe`
 *
 * **References:**
 * - Zod 4 JSON Schema (`z.toJSONSchema()`), for `returns`: https://zod.dev/json-schema
 * - JSON Schema 2020-12: https://json-schema.org/
 */

import type { Command, Option } from "commander";

export interface FlagSchema {
  name: string;
  type: "boolean" | "integer" | "number" | "string";
  required: boolean;
  description: string;
  default?: unknown;
  enum?: string[];
  format?: string;
}

export interface ArgSchema {
  name: string;
  type: "string";
  required: boolean;
  description: string;
}

/** What commander cannot infer for a command, keyed by its full name ("user create"). */
export type CommandExtras = Record<
  string,
  {
    /** Per-flag additions such as `enum` or `format`, keyed by flag name. */
    flags?: Record<string, Partial<FlagSchema>>;
    /** JSON Schema of the data the command writes to stdout. */
    returns?: Record<string, unknown>;
  }
>;

/** One command, as printed by `<command> --help --json`. */
export interface CommandSchema {
  command: string;
  description: string;
  flags: FlagSchema[];
  args: ArgSchema[];
  returns?: Record<string, unknown>;
}

/** A node in the `describe` tree: a command, or a group with nested commands. */
export interface CommandNode {
  name: string;
  description: string;
  flags: FlagSchema[];
  args: ArgSchema[];
  returns?: Record<string, unknown>;
  commands?: CommandNode[];
}

export interface CliSchema {
  name: string;
  version: string;
  commands: CommandNode[];
  exit_codes: Record<string, string>;
}

/** The contract from cli-envelope.ts, published so agents need not guess it. */
const EXIT_CODES: Record<string, string> = {
  "0": "Success",
  "1": "Failure; read the structured error on stderr",
  "2": "Usage error; fix the input and retry",
  "3": "Not found",
  "4": "Permission denied",
  "5": "Conflict with current state",
};

/**
 * Infer a type from the flag's placeholder, the only type hint commander keeps:
 * `--limit <int>`. No placeholder (`--verbose`, `-q, --quiet`, `--no-color`) is a boolean.
 */
function inferType(opt: Option): FlagSchema["type"] {
  const placeholder = /[<[]([^>\]]+)[>\]]/.exec(opt.flags)?.[1]?.replace(/\.\.\.$/, "");
  if (placeholder === undefined) {
    return "boolean";
  }
  if (placeholder === "int" || placeholder === "integer" || placeholder === "n") {
    return "integer";
  }
  if (placeholder === "number" || placeholder === "float") {
    return "number";
  }
  // <CUSTOMISE>: any other placeholder is reported as a string.
  return "string";
}

/** Path of a command below the program: "user create". */
function commandPath(cmd: Command): string {
  const names: string[] = [];
  for (let current: Command | null = cmd; current?.parent; current = current.parent) {
    names.unshift(current.name());
  }
  return names.join(" ");
}

function describeFlags(cmd: Command, extras: CommandExtras): FlagSchema[] {
  const overrides = extras[commandPath(cmd)]?.flags ?? {};
  return cmd.options.map((opt) => {
    const name = opt.attributeName();
    return {
      name,
      type: inferType(opt),
      // `opt.required` only means "this flag takes a value". `opt.mandatory` is what
      // `requiredOption()` sets when the flag itself must be supplied.
      required: opt.mandatory,
      description: opt.description,
      ...(opt.defaultValue === undefined ? {} : { default: opt.defaultValue }),
      ...overrides[name],
    };
  });
}

function describeArgs(cmd: Command): ArgSchema[] {
  return cmd.registeredArguments.map((arg) => ({
    name: arg.name(),
    type: "string",
    required: arg.required,
    description: arg.description,
  }));
}

/** Schema for one command: the `--help --json` output. */
export function describeCommand(cmd: Command, extras: CommandExtras = {}): CommandSchema {
  const returns = extras[commandPath(cmd)]?.returns;
  return {
    command: commandPath(cmd),
    description: cmd.description(),
    flags: describeFlags(cmd, extras),
    args: describeArgs(cmd),
    ...(returns ? { returns } : {}),
  };
}

function describeNode(cmd: Command, extras: CommandExtras): CommandNode {
  const returns = extras[commandPath(cmd)]?.returns;
  return {
    name: cmd.name(),
    description: cmd.description(),
    flags: describeFlags(cmd, extras),
    args: describeArgs(cmd),
    ...(returns ? { returns } : {}),
    ...(cmd.commands.length > 0
      ? { commands: cmd.commands.map((sub) => describeNode(sub, extras)) }
      : {}),
  };
}

/** Schema for the whole CLI: the `describe` output. */
export function describeProgram(program: Command, extras: CommandExtras = {}): CliSchema {
  const version = program.version();
  if (!version) {
    throw new Error("Set program.version() before describing the CLI");
  }
  return {
    name: program.name(),
    version,
    commands: program.commands.map((cmd) => describeNode(cmd, extras)),
    exit_codes: EXIT_CODES,
  };
}

/** Write JSON to stdout and exit 0 once it has flushed. */
function printAndExit(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`, () => {
    process.exit(0);
  });
}

/** Register `<cli> describe`. */
export function addDescribeCommand(program: Command, extras: CommandExtras = {}): void {
  program
    .command("describe")
    .description("Print every command, flag and type as JSON")
    .action(() => {
      printAndExit(describeProgram(program, extras));
    });
}

/**
 * Answer `--help --json` before commander prints its text help. Call this ahead of
 * `program.parseAsync(argv)`; it returns true when it has handled the request.
 * With no command named, it prints the whole tree.
 */
export function handleJsonHelp(
  program: Command,
  argv: string[] = process.argv.slice(2),
  extras: CommandExtras = {},
): boolean {
  if (!argv.includes("--json") || !(argv.includes("--help") || argv.includes("-h"))) {
    return false;
  }
  let target = program;
  for (const word of argv) {
    const next = target.commands.find((cmd) => cmd.name() === word);
    if (next) {
      target = next;
    }
  }
  printAndExit(
    target === program ? describeProgram(program, extras) : describeCommand(target, extras),
  );
  return true;
}

/**
 * Example:
 *
 * ```typescript
 * import { Command } from 'commander';
 * import { z } from 'zod';
 * import { addDescribeCommand, handleJsonHelp } from './cli-schema';
 *
 * const User = z.object({ id: z.string(), name: z.string(), email: z.email().nullable() });
 *
 * const program = new Command('mytool').version('2.4.1');
 * const user = program.command('user').description('Manage user accounts');
 * user
 *   .command('create')
 *   .description('Create a new user account')
 *   .requiredOption('--name <string>', 'Display name for the user')
 *   .requiredOption('--email <string>', 'Email address')
 *   .option('--role <string>', 'User role', 'member')
 *   .option('--json', 'Output JSON (automatic when piped)');
 *
 * const extras = {
 *   'user create': {
 *     flags: { email: { format: 'email' }, role: { enum: ['admin', 'member', 'viewer'] } },
 *     returns: z.toJSONSchema(User),
 *   },
 * };
 *
 * addDescribeCommand(program, extras);
 * if (!handleJsonHelp(program, process.argv.slice(2), extras)) {
 *   await program.parseAsync(process.argv);
 * }
 * ```
 *
 * ```bash
 * $ mytool user create --help --json
 * {"command":"user create","description":"Create a new user account","flags":[{"name":"name","type":"string","required":true,"description":"Display name for the user"}, ...],"args":[],"returns":{...}}
 *
 * $ mytool describe
 * {"name":"mytool","version":"2.4.1","commands":[{"name":"user","description":"Manage user accounts","flags":[],"args":[],"commands":[...]}],"exit_codes":{...}}
 * ```
 */
