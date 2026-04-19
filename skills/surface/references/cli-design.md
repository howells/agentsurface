# CLI Design

## Summary

Dimension 2 scores machine-readability of CLI output and automation capability. Baseline is consistent JSON output across all commands with semantic exit codes (0–5 for success/failure/usage/notfound/permission/conflict). Frontier includes NDJSON streaming for pagination, full schema introspection (--schema returns params/types/required), and input hardening (path traversal, control character rejection). The Agent DX CLI Scale frames progression from human-only (tables, color) to fully agent-native (streaming, introspection, hardening).

- **0**: Human-only output, no structured format, interactive prompts (blocker)
- **1**: JSON exists but inconsistent across commands
- **2**: JSON everywhere, semantic exit codes, --dry-run on mutations
- **3**: NDJSON streaming, --schema introspection, input hardening, SKILL.md shipped
- **Evidence**: --json flag, exit code semantics, NDJSON support, schema introspection

---

CLIs designed for AI agents look fundamentally different from human-oriented command-line tools. This dimension measures how well your CLI surfaces its capabilities, output formats, and error states in machine-readable form. The "Agent DX CLI Scale" frames this as a progression: human-only → JSON-somewhere → consistent structured → fully agent-native (with streaming, schema introspection, and input hardening).

## Scoring rubric

| Score | Criteria | Detection |
|-------|----------|-----------|
| **0/3** | Human-only output. Tables, color codes, prose. No structured format. Interactive prompts with no bypass. | CLI exists but: no `--json` flag; no `--output` flag; interactive prompts without `--yes`; no machine-readable output path |
| **1/3** | JSON output exists but inconsistent. Some commands support `--json`, others don't. Errors may not be structured. | `--json` or `--output json` on some commands but not all. Inconsistent JSON shapes across commands. Non-zero exit code but no semantic distinction. |
| **2/3** | Consistent JSON across all commands. Errors return structured JSON. Semantic exit codes (0-5). `--dry-run` on mutations. TTY detection. Non-interactive when flags provided. | All commands produce JSON. Exit codes differentiate success/failure/usage/notfound/permission/conflict. `--dry-run` on all write operations. `isatty()` detection suppresses spinners when piped. |
| **3/3** | NDJSON streaming for paginated results. Full schema introspection (`--schema` dumps params/types/required as JSON). Input hardening (path traversal, control chars, encoded segments). SKILL.md shipped. Agent knowledge packaging. | `--schema` or `--describe` command returns full machine-readable schema. NDJSON streaming. Input validation rejects `../`, `%2e`, control chars. SKILL.md or AGENTS.md ships with the CLI. |

**Key files:** `bin/`, CLI entry points in `package.json`, `commander`/`yargs`/`oclif` configs

**N/A when:** Project has no CLI tool and is not a CLI tool.

---

## Evidence to gather

**Detection command sequences:**

1. **Check for a CLI tool:** Look for `"bin"` field in `package.json` or `bin/` directory.
   ```bash
   jq '.bin' package.json  # or grep -r "bin:" package.json
   ls -la bin/
   ```

2. **Find CLI framework:** Grep dependencies for `commander`, `yargs`, `oclif`, `click`, `typer`, `cobra`, `clap`.
   ```bash
   jq '.dependencies | keys[] | select(. | test("commander|yargs|oclif|click|typer|cobra|clap"))' package.json
   ```

3. **Test `--json` flag existence:**
   ```bash
   <cli> --help | grep -c "\-\-json"
   <cli> --help --json 2>&1 | head -1
   ```

4. **Test `--dry-run` flag existence:**
   ```bash
   <cli> --help | grep -c "\-\-dry-run"
   ```

5. **List all commands and test JSON output:**
   ```bash
   <cli> --help  # Extract command list
   <cli> <command> --json 2>&1  # Test output format (use dry-run if destructive)
   ```

6. **Check exit codes on error scenarios:**
   ```bash
   <cli> invalid-command; echo "Exit code: $?"
   <cli> --invalid-flag; echo "Exit code: $?"
   ```

7. **Test TTY detection (colour suppression when piped):**
   ```bash
   <cli> list | cat  # Should not contain ANSI colour codes
   ```

8. **Check for SKILL.md or AGENTS.md:**
   ```bash
   ls -la SKILL.md AGENTS.md 2>/dev/null
   ```

9. **Test schema introspection:**
   ```bash
   <cli> --schema
   <cli> --describe
   <cli> <command> --schema
   ```

10. **Test NDJSON streaming on list operations:**
    ```bash
    <cli> list --ndjson
    <cli> list --json | jq -c '.' | head -3  # Is each line valid JSON?
    ```

---

## Deep dive: what agent-native CLIs look like

### Structured output: `--json` on every command

Every command outputs JSON when `--json` is passed. Consistent envelope schema across all commands:

```typescript
interface CLIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    duration_ms: number;
    timestamp: string;
  };
}
```

Example with `commander`:

```typescript
import { Command, Option } from 'commander';
import { createWriteStream } from 'fs';

const program = new Command();

program
  .command('list-users')
  .addOption(new Option('--json', 'Output as JSON').default(false))
  .action(async (opts) => {
    const users = await db.users.list();
    const response: CLIResponse<typeof users> = {
      success: true,
      data: users,
      metadata: { duration_ms: Date.now() % 1000 },
    };
    console.log(JSON.stringify(response, null, opts.json ? 0 : 2));
  });
```

Every JSON object is on a single line (when `--json` is used) so agents can parse it line-by-line.

### Semantic exit codes (BSD sysexits.h conventions)

Not all non-zero codes are equal. Agents need to distinguish:

- **0** — Success. Operation completed as requested.
- **1** — User error. Bad flag, invalid argument, resource not found. Agent should check input and retry with corrections.
- **2** — System error. Permission denied, disk full, service unavailable. Agent should retry with backoff.
- **3** — Reserved for shell builtins (not used in CLI).
- **64** — Command line usage error (EX_USAGE).
- **65** — Data format error (EX_DATAERR).
- **66** — Cannot open input (EX_NOINPUT).
- **67** — Addressee unknown (EX_NOUSER).
- **69** — Service unavailable (EX_UNAVAILABLE).
- **70** — Internal software error (EX_SOFTWARE).
- **77** — Permission denied (EX_NOPERM).

Cite: https://www.freebsd.org/cgi/man.cgi?query=sysexits

Implement exit codes in TypeScript:

```typescript
import { exit } from 'process';

function handleError(error: Error, context: string): void {
  const json = { success: false, error: { message: error.message, context } };
  console.error(JSON.stringify(json));
  
  if (error.message.includes('permission')) exit(77);
  if (error.message.includes('not found')) exit(1);
  if (error.message.includes('validation')) exit(65);
  exit(70); // EX_SOFTWARE
}
```

### Streaming with NDJSON for long-running ops

When a CLI operation returns many results (pagination, bulk operations, log tails), use Newline Delimited JSON (NDJSON). Each line is a complete JSON object.

Spec: https://jsonlines.org and https://github.com/ndjson/ndjson-spec

Example: `list-deployments --ndjson`:

```json
{"id":"deploy-1","status":"running","progress":10}
{"id":"deploy-2","status":"completed","progress":100}
{"id":"deploy-3","status":"running","progress":45}
```

Node.js producer with `for await`:

```typescript
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

async function* generateNDJSON(query: string) {
  const results = await db.query(query);
  for (const row of results) {
    yield JSON.stringify(row);
  }
}

export async function streamResults(query: string, output?: string) {
  const stream = output ? createWriteStream(output) : process.stdout;
  
  for await (const line of generateNDJSON(query)) {
    stream.write(line + '\n');
  }
  
  if (output) stream.end();
}
```

Agents consume NDJSON like this:

```bash
my-cli list-deployments --ndjson | while IFS= read -r line; do
  jq '.id, .status' <<< "$line"
done
```

### Schema introspection: `--schema` or `--describe`

Agents need to know what inputs a command accepts and what it returns, without reading docs.

`--schema` emits JSON Schema for a command's inputs and outputs:

```bash
$ my-cli create-user --schema
{
  "input": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "description": "Full name" },
      "email": { "type": "string", "format": "email" },
      "role": { "enum": ["admin", "user", "guest"] }
    },
    "required": ["name", "email"]
  },
  "output": {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "created_at": { "type": "string", "format": "date-time" }
    }
  }
}
```

Implement with Zod + zod-to-json-schema:

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CreateUserInput = z.object({
  name: z.string().describe('Full name'),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
});

const CreateUserOutput = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
});

program
  .command('create-user')
  .option('--schema', 'Print JSON Schema and exit')
  .action((opts) => {
    if (opts.schema) {
      console.log(JSON.stringify({
        input: zodToJsonSchema(CreateUserInput),
        output: zodToJsonSchema(CreateUserOutput),
      }, null, 2));
      return;
    }
    // ... normal command logic
  });
```

### Input hardening: reject path traversal, control characters, shell metacharacters

Agents often pass user input through CLI arguments. Prevent injection attacks:

- **Path traversal:** Reject `../`, `..\\`, UNC paths (`\\server\share`).
- **URL encoding:** Reject `%2e`, `%2f`, `%5c` (encoded path separators).
- **Control characters:** Reject `\0`, `\n`, `\r`, `\x1b` (ESC).
- **Shell metacharacters:** Warn if input contains `$`, `` ` ``, `|`, `;`, `&` (agents should use `--` or stdin JSON instead).

```typescript
function validateInput(value: string, fieldName: string): string {
  // Path traversal
  if (value.includes('..') || value.includes('\\\\')) {
    throw new Error(`${fieldName} contains path traversal attempt`);
  }
  
  // URL encoding
  if (value.match(/%2[ef]|%5c/i)) {
    throw new Error(`${fieldName} contains URL-encoded path separator`);
  }
  
  // Control characters
  if (value.match(/[\x00\n\r\x1b]/)) {
    throw new Error(`${fieldName} contains control characters`);
  }
  
  return value;
}

program
  .command('fetch-file <path>')
  .action((path) => {
    const safePath = validateInput(path, 'path');
    // ... proceed safely
  });
```

### TTY detection (isatty) to suppress spinners/colour when piped

Agents pipe CLI output; spinners and ANSI colour codes corrupt JSON parsing.

```typescript
import { isatty } from 'tty';
import chalk from 'chalk';

function shouldUseColour(): boolean {
  return isatty(process.stdout.fd) && process.env.NO_COLOR !== '1';
}

function logStatus(message: string) {
  if (shouldUseColour()) {
    console.log(chalk.blue(message));
  } else {
    console.log(message);
  }
}
```

When `--json` is used, disable colour unconditionally:

```typescript
program
  .command('status')
  .option('--json', 'JSON output')
  .action((opts) => {
    const useColour = opts.json ? false : shouldUseColour();
    const result = getStatus();
    
    if (opts.json) {
      console.log(JSON.stringify(result));
    } else if (useColour) {
      console.log(chalk.green('✓ All systems nominal'));
    } else {
      console.log('All systems nominal');
    }
  });
```

### `--dry-run` on all mutations with structured preview

Agents must be able to preview what a destructive operation will do before committing:

```bash
$ my-cli delete-user alice@example.com --dry-run --json
{
  "success": true,
  "dry_run": true,
  "preview": {
    "action": "delete",
    "target": "User(alice@example.com, id=12345)",
    "cascade": ["remove from 5 teams", "archive 23 documents"]
  }
}
```

Implementation with `citty`:

```typescript
import { defineCommand, runCommand } from 'citty';

const deleteUserCmd = defineCommand({
  meta: { name: 'delete-user' },
  args: { email: { type: 'string' } },
  flags: {
    dryRun: { alias: 'n', type: 'boolean', description: 'Preview without deleting' },
    yes: { alias: 'y', type: 'boolean', description: 'Skip confirmation' },
    json: { type: 'boolean' },
  },
  async run({ args, flags }) {
    const preview = await previewDeletion(args.email);
    
    if (flags.dryRun) {
      console.log(JSON.stringify({ dry_run: true, preview }));
      return;
    }
    
    if (!flags.yes) {
      console.log(`About to delete ${args.email}. Ctrl+C to cancel.`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    await executeDelete(args.email);
    console.log(JSON.stringify({ success: true, deleted: args.email }));
  },
});
```

### `--yes` / `--force` for destructive ops without prompting

Agents cannot interact with prompts. Provide a flag to bypass confirmation:

```bash
my-cli delete-user alice@example.com --yes
```

### stdin JSON as primary input for agents; env var injection for secrets

For complex or sensitive inputs, agents prefer stdin over command-line arguments (which appear in process listings and shell history).

```bash
cat << EOF | my-cli create-user --from-stdin
{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "password": "secret123"
}
EOF
```

Implementation:

```typescript
program
  .command('create-user')
  .option('--from-stdin', 'Read input from stdin as JSON')
  .action(async (opts) => {
    let input;
    
    if (opts.fromStdin) {
      const stdinData = await readStdin();
      input = JSON.parse(stdinData);
    } else {
      input = parseFlags();
    }
    
    // Validate and process
  });
```

For secrets, prefer environment variables (which agents set programmatically):

```bash
export API_TOKEN=sk-12345...
my-cli sync-data  # picks up $API_TOKEN automatically
```

Document this in `--help`:

```
Options:
  --token <value>    API token (or set $API_TOKEN env var)
```

### SKILL.md / AGENTS.md shipped next to the CLI for agent self-documentation

Include a `SKILL.md` or `AGENTS.md` file in the package root describing:
- What the CLI does
- Available commands (with exact invocation)
- Permission boundaries
- Common workflows
- Integration with other tools

```yaml
---
name: my-cli
description: Manage deployments and infrastructure
effort: high
when_to_use: Deploy apps, inspect logs, roll back versions
allowed-tools: Read, Bash(my-cli *)
---

## Commands

- `my-cli deploy --help` — Deploy an app
- `my-cli logs <service> --tail 100` — View recent logs
- `my-cli rollback <service> <version>` — Revert to a previous version

## Conventions

- All commands support `--json` for programmatic consumption
- Use `--dry-run` to preview destructive actions
- Set `API_TOKEN` env var for authentication
```

### Progress reporting via stderr to keep stdout structured

If an operation takes time, report progress on stderr so stdout remains valid JSON:

```typescript
console.error('Downloading artifacts... 45%');  // stderr
console.log(JSON.stringify({ status: 'in_progress', progress: 0.45 }));  // stdout
```

Agents ignore stderr; they parse stdout. This pattern lets humans see progress while agents remain unaffected.

---

## Cross-vendor notes

**Anthropic Claude Code CLI** (https://code.claude.com/docs/en/cli-reference) is the gold standard:
- Every command supports `--json` (consistent envelope: `{ ok: true, data }, { ok: false, error }`).
- Semantic exit codes (0 success, non-zero failure).
- `--dry-run` on write operations.
- TTY detection suppresses colours when piped.
- SKILL.md shipped with the CLI.

**OpenAI Codex / API CLI** follows similar patterns with `--json` output and structured errors, though less mature on streaming.

**Gemini CLI** (https://github.com/google-gemini/gemini-cli): Open source, FastMCP integration, supports `--json` and structured output. Less mature on NDJSON streaming.

All three converge on: structured output + semantic exit codes + TTY detection + agent self-documentation.

---

## Anti-patterns

- **Colour codes in stdout.** Breaks JSON parsing. Agents cannot distinguish `\033[32m` from data.
- **Spinners not gated on isatty().** Corrupts piped output; agents see spinner frames mixed with JSON.
- **Interactive prompts with no --yes bypass.** Agents hang waiting for keyboard input that will never come.
- **Inconsistent JSON shapes across commands.** One command returns `{ data: [...] }`, another returns `[...]`. Agents must write command-specific parsers.
- **Exit code 0 on error.** Agents rely on exit codes to decide retry strategy. Using 0 for errors is deceptive.
- **Progress on stdout.** Mixes progress text with data; breaks parsing. Use stderr instead.
- **Relying on env vars without documenting them in --help.** Agents don't know what's required. Always document in help output.
- **No --schema or --describe.** Agents cannot self-serve on input validation or response structure.
- **Requiring browser auth or CAPTCHA.** Agents cannot complete the OAuth flow interactively.

---

## Templates and tooling

**In this repo:**
- `/templates/cli-envelope.ts` — Reusable CLI response type + helpers
- `/templates/cli-ndjson.ts` — NDJSON streaming boilerplate
- `/templates/cli-schema.ts` — Zod-based schema introspection template

**Libraries (TypeScript):**
- `commander` — Most popular. Mature, flexible, actively maintained.
- `citty` — Modern, lightweight. Better for typed CLIs with Zod.
- `oclif` — For large, plugin-able CLIs. Built-in JSON support.
- `yargs` — Legacy but still useful. Good argument parsing.
- `zod` — Runtime validation. Integrates with `zod-to-json-schema` for schema introspection.
- `@clack/prompts` — Terminal prompts (use sparingly; gate with `--yes` flag for agents).

**Testing:**
- `execa` — Execute CLI commands in tests. Captures stdout, stderr, exit code.
- `vitest` — Test runner. Fast, ES modules first.
- Example:
  ```typescript
  import { execa } from 'execa';
  
  it('returns JSON on --json', async () => {
    const { stdout } = await execa('my-cli', ['list-users', '--json']);
    const data = JSON.parse(stdout);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
  ```

**Structured logging (optional):**
- `pino` — Fast JSON logger. Works well with `--json` output.
- `winston` — Flexible. Good for multi-transport setups (file + console).

---

## Citations

- https://code.claude.com/docs/en/cli-reference — Anthropic Claude Code CLI reference (gold standard)
- https://jsonlines.org — NDJSON specification
- https://github.com/ndjson/ndjson-spec — NDJSON spec repository
- https://www.freebsd.org/cgi/man.cgi?query=sysexits — BSD sysexits.h conventions
- https://github.com/google-gemini/gemini-cli — Gemini CLI (open source)
- https://github.com/enquirer/enquirer — Interactive prompts library (for --yes bypass patterns)

---

## See also

- `docs/cli-design` — Full tutorial on agent-native CLI patterns
- `templates/cli-envelope.ts` — Response envelope template
- `templates/cli-ndjson.ts` — NDJSON streaming template
- `templates/cli-schema.ts` — JSON Schema introspection template
- `references/error-handling.md` — Structured error responses work with CLI exit codes
- `references/tool-design.md` — CLI commands are tools; same naming/description principles apply
