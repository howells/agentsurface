/**
 * CLI Schema Generator — Machine-readable CLI introspection
 *
 * **What it is:** `commander` or `yargs` helpers to emit a `--schema` flag that prints the
 * machine-readable command tree as JSON. Names, flags, types, defaults, descriptions.
 * Agents use this to self-serve on input validation.
 *
 * **When to use:**
 * - When you want agents to discover CLI capabilities without reading docs
 * - When you have 5+ commands with complex flags
 * - When you want to generate help text, client libraries, or OpenAPI specs from your CLI
 *
 * **Canonical URL:** https://code.claude.com/docs/en/cli-reference
 *
 * **Customisation checklist:**
 * - [ ] Add `--schema` flag to each command or global
 * - [ ] Provide rich descriptions for every flag/argument
 * - [ ] Test `--schema` output against JSON Schema 2020-12
 * - [ ] Document schema URL in AGENTS.md or SKILL.md
 * - [ ] Version your schema (add `schema_version` field)
 *
 * **References:**
 * - zod-to-json-schema: https://github.com/StefanTerdell/zod-to-json-schema
 * - JSON Schema 2020-12: https://json-schema.org/
 * - OpenAPI 3.1: https://spec.openapis.org/oas/v3.1.0
 */

import { Command, Option } from 'commander';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Describes a single CLI command with input/output schemas
 */
export interface CommandSchema {
  name: string;
  description?: string;
  usage?: string;
  input: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    additionalProperties: boolean;
  };
  output: {
    type: 'object';
    properties: Record<string, any>;
    description?: string;
  };
}

/**
 * Build complete CLI schema from commander program
 */
export function generateCLISchema(program: Command): {
  version: string;
  name: string;
  schema_version: string;
  commands: CommandSchema[];
} {
  const commands: CommandSchema[] = [];

  function traverseCommands(cmd: Command, parentPath: string = '') {
    const cmdName = parentPath ? `${parentPath} ${cmd.name()}` : cmd.name();

    // Extract options/arguments as schema
    const properties: Record<string, any> = {};
    const required: string[] = [];

    cmd.options.forEach((opt: Option) => {
      const propName = opt.attributeName();
      const isRequired = opt.required ?? false;

      properties[propName] = {
        type: inferTypeFromOption(opt),
        description: opt.description || `Option: ${opt.flags}`,
        default: opt.defaultValue,
      };

      if (isRequired) required.push(propName);
    });

    cmd.arguments.forEach((arg) => {
      properties[arg.name()] = {
        type: 'string',
        description: arg.description,
      };

      if (!arg.optional) required.push(arg.name());
    });

    // <CUSTOMISE>: Add output schema based on your domain
    const outputProperties = {
      success: {
        type: 'boolean',
        description: 'Whether the command succeeded',
      },
      data: {
        type: 'object',
        description: 'Command result (varies by command)',
      },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
        },
        description: 'Error details if command failed',
      },
    };

    commands.push({
      name: cmdName,
      description: cmd.description(),
      usage: cmd.usage() || `${cmdName} [options]`,
      input: {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
        additionalProperties: false,
      },
      output: {
        type: 'object',
        properties: outputProperties,
        description: 'Standard CLI response envelope',
      },
    });

    // Recurse into subcommands
    cmd.commands.forEach((subcmd) => traverseCommands(subcmd, cmdName));
  }

  program.commands.forEach((cmd) => traverseCommands(cmd));

  return {
    version: program.version?.() || '1.0.0',
    name: program.name?.() || 'cli',
    schema_version: '1.0',
    commands,
  };
}

/**
 * Infer JSON Schema type from commander Option
 */
function inferTypeFromOption(opt: Option): string {
  const flags = opt.flags;

  // Heuristics
  if (flags.includes('no-')) return 'boolean';
  if (opt.short === undefined && !flags.includes('<')) return 'boolean';

  // <value> pattern: string, int, float
  if (flags.includes('<string>') || flags.includes('<url>') || flags.includes('<path>')) return 'string';
  if (flags.includes('<number>') || flags.includes('<int>')) return 'integer';
  if (flags.includes('<float>')) return 'number';

  // Default to string
  return 'string';
}

/**
 * Build schema from Zod types (alternative approach)
 */
export function generateZodCommandSchema(
  name: string,
  description: string,
  inputSchema: z.ZodType,
  outputSchema: z.ZodType
): CommandSchema {
  return {
    name,
    description,
    input: zodToJsonSchema(inputSchema) as any,
    output: zodToJsonSchema(outputSchema) as any,
  };
}

/**
 * Middleware: Add `--schema` to any command
 */
export function addSchemaFlag(cmd: Command, schema: CommandSchema): void {
  cmd.option('--schema', 'Print command schema as JSON and exit', function (this: Command) {
    console.log(JSON.stringify(schema, null, 2));
    process.exit(0);
  });
}

/**
 * Example: Full integration with commander
 *
 * ```typescript
 * import { Command } from 'commander';
 * import { generateCLISchema, addSchemaFlag } from './cli-schema';
 *
 * const program = new Command('my-cli');
 * program.version('1.0.0');
 *
 * // Global --schema to dump entire CLI schema
 * program.option('--schema', 'Dump full CLI schema', () => {
 *   const schema = generateCLISchema(program);
 *   console.log(JSON.stringify(schema, null, 2));
 *   process.exit(0);
 * });
 *
 * // Per-command schema
 * const createUserCmd = program.command('create-user');
 * createUserCmd
 *   .description('Create a new user')
 *   .requiredOption('--name <string>', 'User name')
 *   .requiredOption('--email <string>', 'User email')
 *   .option('--role <string>', 'User role', 'user');
 *
 * const createUserSchema: CommandSchema = {
 *   name: 'create-user',
 *   description: 'Create a new user',
 *   input: {
 *     type: 'object',
 *     properties: {
 *       name: { type: 'string', description: 'User name' },
 *       email: { type: 'string', format: 'email', description: 'User email' },
 *       role: { type: 'string', enum: ['admin', 'user', 'guest'], default: 'user' },
 *     },
 *     required: ['name', 'email'],
 *     additionalProperties: false,
 *   },
 *   output: {
 *     type: 'object',
 *     properties: {
 *       id: { type: 'string' },
 *       created_at: { type: 'string', format: 'date-time' },
 *     },
 *   },
 * };
 *
 * addSchemaFlag(createUserCmd, createUserSchema);
 *
 * createUserCmd.action((opts) => {
 *   console.log(JSON.stringify({ success: true, data: { id: '123', created_at: new Date().toISOString() } }));
 * });
 *
 * program.parse(process.argv);
 * ```
 *
 * Usage:
 *
 * ```bash
 * $ my-cli --schema
 * {
 *   "version": "1.0.0",
 *   "name": "my-cli",
 *   "schema_version": "1.0",
 *   "commands": [...]
 * }
 *
 * $ my-cli create-user --schema
 * {
 *   "name": "create-user",
 *   "input": {...},
 *   "output": {...}
 * }
 * ```
 */
