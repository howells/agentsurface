# CLI Design

## Summary

Dimension 2 scores machine-readability of CLI output and automation capability. Baseline is consistent JSON output across all commands with documented, distinct exit codes (this guide proposes 0-5 for success/failure/usage/notfound/permission/conflict as one contract; only 0 and non-zero are universal). Frontier includes NDJSON streaming for pagination, full schema introspection (--schema returns params/types/required), and input hardening (path traversal, control character rejection). The Agent DX CLI Scale frames progression from human-only (tables, color) to fully agent-native (streaming, introspection, hardening).

- **0**: Human-only output, no structured format, interactive prompts (blocker)
- **1**: JSON exists but inconsistent across commands
- **2**: JSON everywhere, semantic exit codes, --dry-run on mutations
- **3**: NDJSON streaming, --schema introspection, input hardening, SKILL.md shipped
- **Evidence**: --json flag, exit code semantics, NDJSON support, schema introspection

---

CLIs designed for AI agents look fundamentally different from human-oriented command-line tools. This dimension measures how well your CLI surfaces its capabilities, output formats, and error states in machine-readable form. The "Agent DX CLI Scale" frames this as a progression: human-only → JSON-somewhere → consistent structured → fully agent-native (with streaming, schema introspection, and input hardening).

## Scoring rubric

| Score   | Criteria                                                                                                                                                                                                                            | Detection                                                                                                                                                                                         |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0/3** | Human-only output. Tables, color codes, prose. No structured format. Interactive prompts with no bypass.                                                                                                                            | CLI exists but: no `--json` flag; no `--output` flag; interactive prompts without `--yes`; no machine-readable output path                                                                        |
| **1/3** | JSON output exists but inconsistent. Some commands support `--json`, others don't. Errors may not be structured.                                                                                                                    | `--json` or `--output json` on some commands but not all. Inconsistent JSON shapes across commands. Non-zero exit code but no semantic distinction.                                               |
| **2/3** | Consistent JSON across all commands. Errors return structured JSON. Documented, distinct exit codes (e.g. the 0-5 contract proposed here). `--dry-run` on mutations. TTY detection. Non-interactive when flags provided.            | All commands produce JSON. Exit codes differentiate success/failure/usage/notfound/permission/conflict. `--dry-run` on all write operations. `isatty()` detection suppresses spinners when piped. |
| **3/3** | NDJSON streaming for paginated results. Full schema introspection (`--schema` dumps params/types/required as JSON). Input hardening (path traversal, control chars, encoded segments). SKILL.md shipped. Agent knowledge packaging. | `--schema` or `--describe` command returns full machine-readable schema. NDJSON streaming. Input validation rejects `../`, `%2e`, control chars. SKILL.md or AGENTS.md ships with the CLI.        |

**Level 3 also requires** raw payload input (`--payload` or piped stdin, API field names unchanged), context discipline (`--fields` on reads, default projections smaller than the full response, cursor/`has_more` metadata) and safety rails (`confirmation_required` without `--yes`, dry-run previews with counts and side effects). Do not award 3 on streaming, schema and hardening alone.

This dimension score compresses the seven-axis, 0-21 [Agent DX CLI Scale](https://agentsurface.dev/docs/cli-design/cli-scale) (machine-readable output, raw payload input, schema introspection, context window discipline, input hardening, safety rails, agent knowledge packaging). For a CLI-centred product, score the seven axes too and report the weakest ones as findings.

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
    <cli> list --ndjson | head -3 | while IFS= read -r line; do printf '%s\n' "$line" | jq -e . >/dev/null || echo "not NDJSON: $line"; done
    # Check the raw output: several records, one JSON value per line. Piping --json through jq -c proves nothing.
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
import { Command, Option } from "commander";
const program = new Command();

program
  .command("list-users")
  .addOption(new Option("--json", "Output as JSON").default(false))
  .action(async (opts) => {
    const started = performance.now();
    const users = await db.users.list();
    const response: CLIResponse<typeof users> = {
      success: true,
      data: users,
      metadata: {
        duration_ms: Math.round(performance.now() - started),
        timestamp: new Date().toISOString(),
      },
    };
    console.log(JSON.stringify(response, null, opts.json ? 0 : 2));
  });
```

Every JSON object is on a single line (when `--json` is used) so agents can parse it line-by-line.

### Semantic exit codes

Only two exit codes are universal: 0 is success and non-zero is failure. There is no shared meaning for the rest. GitHub CLI, for example, uses 2 for cancellation and 4 for authentication and tells callers to check each command's documentation ([gh exit codes](https://cli.github.com/manual/gh_help_exit-codes)). So an agent must read the contract of the CLI in front of it, and your CLI must publish its own in `--help --json` and its skill file. This guide proposes one contract:

- **0** - Success. Operation completed as requested.
- **1** - General failure. Agent should read the structured error.
- **2** - Usage error. Bad flag or invalid argument. Fix the input and retry.
- **3** - Not found.
- **4** - Permission denied.
- **5** - Conflict (resource exists or state changed).

BSD `sysexits.h` (64 usage, 65 data error, 66 no input, 69 unavailable, 70 software error, 77 no permission) is an older vocabulary some tools borrow; it is a convention, not a standard that agents can assume ([sysexits](https://man.freebsd.org/cgi/man.cgi?query=sysexits)). Either works if you pick one and use it consistently. Pair the exit code with a structured error body; neither replaces the other.

Implement exit codes in TypeScript:

```typescript
import { exit } from "process";

const EXIT = { ok: 0, failure: 1, usage: 2, notFound: 3, permission: 4, conflict: 5 } as const;

function handleError(error: CliError, context: string): never {
  console.error(
    JSON.stringify({
      success: false,
      error: { code: error.code, message: error.message, context },
    }),
  );
  exit(EXIT[error.kind] ?? EXIT.failure);
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
import { createWriteStream } from "node:fs";
import { once } from "node:events";

async function* generateNDJSON(query: string) {
  const results = await db.query(query);
  for (const row of results) {
    yield JSON.stringify(row);
  }
}

export async function streamResults(query: string, output?: string) {
  const stream = output ? createWriteStream(output) : process.stdout;

  for await (const line of generateNDJSON(query)) {
    // Respect backpressure on large outputs
    if (!stream.write(line + "\n")) await once(stream, "drain");
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

Implement with Zod 4's native `z.toJSONSchema()`:

```typescript
import { z } from "zod";

const CreateUserInput = z.object({
  name: z.string().describe("Full name"),
  email: z.string().email(),
  role: z.enum(["admin", "user", "guest"]),
});

const CreateUserOutput = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
});

program
  .command("create-user")
  .option("--schema", "Print JSON Schema and exit")
  .action((opts) => {
    if (opts.schema) {
      console.log(
        JSON.stringify(
          {
            input: z.toJSONSchema(CreateUserInput),
            output: z.toJSONSchema(CreateUserOutput),
          },
          null,
          2,
        ),
      );
      return;
    }
    // ... normal command logic
  });
```

### Input hardening: reject path traversal, control characters, shell metacharacters

Agents often pass user input through CLI arguments. Prevent injection attacks:

- **Path traversal:** Resolve the real path (`fs.realpath`) and reject anything outside the allowed directory; also reject `../`, `..\\` and UNC paths (`\\server\share`) early for a clear error.
- **URL encoding:** Reject `%2e`, `%2f`, `%5c` (encoded path separators).
- **Control characters:** Reject `\0`, `\n`, `\r`, `\x1b` (ESC).
- **Shell metacharacters:** Warn if input contains `$`, `` ` ``, `|`, `;`, `&` (`--` only ends option parsing; it does not stop the shell expanding these. Agents should pass arguments without a shell, such as an argv array, quote correctly, or send stdin JSON).

```typescript
function validateInput(value: string, fieldName: string): string {
  // URL encoding
  if (/%2[ef]|%5c/i.test(value)) {
    throw new Error(`${fieldName} contains URL-encoded path separator`);
  }

  // Control characters
  if (/[\x00\n\r\x1b]/.test(value)) {
    throw new Error(`${fieldName} contains control characters`);
  }

  return value;
}

// Do not rely on string checks like value.includes("..") for paths: a symlink inside the
// allowed directory can still lead outside it. Resolve the real path of the nearest existing
// ancestor with fs.promises.realpath and compare it to the real working directory.
// See the Input Hardening docs page for a full sandboxOutputPath() example.

program.command("fetch-file <path>").action(async (path) => {
  const safePath = await sandboxOutputPath(validateInput(path, "path"));
  // ... proceed safely
});
```

### TTY detection (isatty) to suppress spinners/colour when piped

Agents pipe CLI output; spinners and ANSI colour codes corrupt JSON parsing.

```typescript
import { isatty } from "tty";
import chalk from "chalk";

function shouldUseColour(): boolean {
  return isatty(process.stdout.fd) && !process.env.NO_COLOR; // any non-empty NO_COLOR disables colour
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
  .command("status")
  .option("--json", "JSON output")
  .action((opts) => {
    const useColour = opts.json ? false : shouldUseColour();
    const result = getStatus();

    if (opts.json) {
      console.log(JSON.stringify(result));
    } else if (useColour) {
      console.log(chalk.green("✓ All systems nominal"));
    } else {
      console.log("All systems nominal");
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
import { defineCommand, runCommand } from "citty";

const deleteUserCmd = defineCommand({
  meta: { name: "delete-user" },
  // citty declares flags under args too
  args: {
    email: { type: "positional", required: true },
    "dry-run": { alias: "n", type: "boolean", description: "Preview without deleting" },
    yes: { alias: "y", type: "boolean", description: "Confirm the deletion" },
    json: { type: "boolean" },
  },
  async run({ args }) {
    const preview = await previewDeletion(args.email);

    if (args["dry-run"]) {
      console.log(JSON.stringify({ dry_run: true, preview }));
      return;
    }

    // No timer-based "confirmation": without --yes, fail with a structured error
    if (!args.yes) {
      console.error(
        JSON.stringify({
          success: false,
          error: {
            code: "confirmation_required",
            message: `Deleting ${args.email} needs --yes. Run with --dry-run to preview.`,
            details: { preview },
          },
        }),
      );
      process.exit(2); // usage error in the 0-5 contract
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
  .command("create-user")
  .option("--from-stdin", "Read input from stdin as JSON")
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
console.error("Downloading artifacts... 45%"); // stderr
console.log(JSON.stringify({ status: "in_progress", progress: 0.45 })); // stdout
```

Agents parse stdout as data, and many harnesses capture stderr separately or show it only on failure. This pattern keeps stdout valid JSON while humans still see progress.

---

## Cross-vendor notes

Coding-agent CLIs show the pattern but differ in detail, so read each one's reference rather than assuming a shared contract:

- **Claude Code** ([CLI reference](https://code.claude.com/docs/en/cli-reference)) has a non-interactive print mode (`-p`) with selectable output formats for scripts and agents.
- **OpenAI Codex** and **Gemini CLI** ([repo](https://github.com/google-gemini/gemini-cli)) document their own non-interactive modes and JSON output options (Gemini CLI: `-p` with `--output-format json` or `stream-json`). Verify flags against the installed version.

What carries over is the shape: structured output, a documented exit-code contract, TTY detection, and agent self-documentation (a skill file or schema command). Per-CLI claims such as "every command supports `--json`" or "`--dry-run` on every write" are not established by these references; test your own CLI against the checklist above.

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

- `/templates/cli-and-evals/cli-envelope.ts` - Reusable CLI response type + helpers
- `/templates/cli-and-evals/cli-ndjson.ts` - NDJSON streaming boilerplate
- `/templates/cli-and-evals/cli-schema.ts` - Zod-based schema introspection template

**Libraries (TypeScript):**

- `commander` - Mature, flexible, actively maintained; subcommands, options and generated help.
- `citty` - Lightweight, typed command definitions (`defineCommand`) from the UnJS ecosystem.
- `oclif` - For large, plugin-able CLIs. Built-in JSON support.
- `yargs` - Legacy but still useful. Good argument parsing.
- `zod` - Runtime validation. Zod 4 converts to JSON Schema natively with `z.toJSONSchema()`; the third-party `zod-to-json-schema` is no longer actively maintained and only supports Zod 3.
- `@clack/prompts` - Terminal prompts (use sparingly; gate with `--yes` flag for agents).

**Testing:**

- `execa` - Execute CLI commands in tests. Captures stdout, stderr, exit code.
- `vitest` - Test runner. Fast, ES modules first.
- Example:

  ```typescript
  import { execa } from "execa";

  it("returns JSON on --json", async () => {
    const { stdout } = await execa("my-cli", ["list-users", "--json"]);
    const data = JSON.parse(stdout);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
  ```

**Structured logging (optional):**

- `pino` - Fast JSON logger. Works well with `--json` output.
- `winston` - Flexible. Good for multi-transport setups (file + console).

---

## Citations

- https://code.claude.com/docs/en/cli-reference - Anthropic Claude Code CLI reference (gold standard)
- https://jsonlines.org - NDJSON specification
- https://github.com/ndjson/ndjson-spec - NDJSON spec repository
- https://man.freebsd.org/cgi/man.cgi?query=sysexits - BSD sysexits.h conventions (optional vocabulary)
- https://cli.github.com/manual/gh_help_exit-codes - GitHub CLI exit codes (example of a per-CLI contract)
- https://github.com/google-gemini/gemini-cli - Gemini CLI (open source)
- https://github.com/enquirer/enquirer - Interactive prompts library (for --yes bypass patterns)

---

## See also

- `docs/cli-design` - Full tutorial on agent-native CLI patterns
- `templates/cli-and-evals/cli-envelope.ts` - Response envelope template
- `templates/cli-and-evals/cli-ndjson.ts` - NDJSON streaming template
- `templates/cli-and-evals/cli-schema.ts` - JSON Schema introspection template
- `references/error-handling.md` - Structured error responses work with CLI exit codes
- `references/tool-design.md` - CLI commands are tools; same naming/description principles apply
