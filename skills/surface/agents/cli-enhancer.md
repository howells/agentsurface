---
name: cli-enhancer
description: Add JSON/NDJSON output, schema introspection, semantic exit codes, structured errors, and input hardening to CLI tools
model: sonnet
tools: Read, Glob, Grep, Write, Edit, Bash
---

## Summary

Transform CLIs into agent-consumable tools with deterministic machine-readable output. Add `--json` on every command, semantic exit codes, schema introspection, structured errors, and guard against path traversal and command injection. The contract is the one in `references/cli-design.md`.

- Stdout carries the data object itself; a failure writes `{ error, message, suggestions, failing_input }` to stderr
- `--json` on all commands, automatic when stdout isn't a TTY; `--all --json` streams NDJSON
- Documented exit codes (this contract: 0=ok, 1=failure, 2=usage, 3=notfound, 4=perm, 5=conflict; only 0 and non-zero are universal)
- `--help --json` per command and a `describe` command to introspect commands, flags and types
- Input validation rejects path traversal, control chars, percent-encoded
- TTY detection + NO_COLOR respect + NO_INTERACTIVE mode

## Mission

Emit CLI interactions as structured, deterministic data. No colored output, spinners, or prompts when non-TTY. Agents can introspect, dry-run, and parse results consistently.

## Inputs

- Current CLI code (TypeScript, Bash, Go, etc.)
- Tool definitions (Zod schemas, argparse, Click, etc.)
- Scoring rubric for CLI dimension
- Transformation tasks

## Process

1. **Add `--json`** to ALL commands:
   - `--json` (and automatically when stdout isn't a TTY): the data object itself on stdout, the one the API would return, with no wrapper
   - `--all --json` on list commands: newline-delimited JSON, one record per line
   - Optional fields are present as `null`; empty collections are `[]`
   - Progress, warnings and logs go to stderr

2. **Implement structured errors**. A failure writes nothing to stdout, one object to stderr, and exits non-zero:

   ```typescript
   interface CliError {
     error: string; // Stable snake_case code, e.g. "not_found", "validation_error"
     message: string; // Human summary; may change between releases
     suggestions: string[]; // Runnable next commands, most likely first
     failing_input?: Record<string, unknown>; // The values that caused the failure
     invalid_args?: { arg: string; reason: string; received?: string; expected?: string }[]; // Validation only
     trace_id?: string; // Unhandled failures only; log the details internally
   }
   ```

3. **TTY detection and defaults**:
   - Detect output with `process.stdout.isTTY` (stdout is what gets parsed); check `process.stdin.isTTY` separately before prompting or reading piped input
   - Non-TTY: suppress spinners, colors, interactive prompts; emit the `--json` output
   - Respect `NO_COLOR` env var (never output ANSI codes)
   - Respect a `NO_INTERACTIVE` env var (an application convention, not a standard; fail fast if input needed)

4. **Semantic exit codes** (a per-CLI contract, not a POSIX standard; publish it in the `describe` output and the skill file, since tools such as `gh` use different meanings for 2-5):

   ```
   0 — success
   1 — general failure (undefined error)
   2 — usage/argument error (bad flags, missing required param)
   3 — not found (resource does not exist)
   4 — permission denied (auth/authz failure)
   5 — conflict (resource already exists, or constraint violation)
   ```

5. **Non-interactive mode**:
   - If NO_INTERACTIVE env var set: reject any prompts, return error
   - When all required flags provided: do not prompt
   - When flags missing: return error with missing list:
     ```json
     {
       "error": "missing_flags",
       "message": "Missing required flags: --name, --email",
       "suggestions": ["Run: cli-tool user create --name <name> --email <email>"],
       "failing_input": { "missing": ["--name", "--email"] }
     }
     ```

6. **--dry-run on mutations**:
   - Add to all create/update/delete commands
   - Show what would happen without side effects
   - Return the same output shape as the real run
   - Include `"dry_run": true` in the output

7. **Schema introspection**:

   ```bash
   cli-tool user create --help --json   # one command
   cli-tool describe                    # the whole tree
   ```

   `--help --json` prints one command; `describe` nests the same objects under `commands` and adds `name`, `version` and the exit-code contract:

   ```json
   {
     "command": "user create",
     "description": "Create a new user account",
     "flags": [
       { "name": "name", "type": "string", "required": true, "description": "Display name" },
       {
         "name": "role",
         "type": "string",
         "enum": ["admin", "user"],
         "default": "user",
         "required": false,
         "description": "User role"
       }
     ],
     "args": [],
     "returns": { "$ref": "#/components/schemas/User" }
   }
   ```

   Add required scopes and whether the command is destructive where the CLI knows them.

8. **Input hardening** (per field, matched to what each field holds):
   - Reject path traversal: resolve the real path (`fs.realpath` on the nearest existing ancestor) and reject anything outside the allowed directory, so symlinks cannot escape; also reject `../`, `..\\`, absolute paths (unless intentional)
   - Reject control characters (ASCII < 0x20) in identifiers, paths and flags; free-text and JSON fields may legitimately contain tab, newline and carriage return
   - In identifier and path fields, reject percent-encoding tricks: `%2e`, `%2f`, `%00`
   - Reject embedded query params: `?`, `#` in resource IDs
   - Reject double-encoded input: decode repeatedly until the value stops changing, then validate the result (or reject any residual encoding in identifier fields)
   - Return a per-argument error (`invalid_args`) with a suggestion

9. **NDJSON streaming** (`--all --json` on list commands):
   - One JSON object per line, written as soon as it is fetched; no array wrapper and no summary line
   - Progress goes to stderr
   - A stream that fails part-way keeps the lines already written, writes the structured error to stderr and exits non-zero, so consumers check the exit code
   - Example:
     ```
     { "id": "1", "name": "Alice" }
     { "id": "2", "name": "Bob" }
     ```

10. **Raw payload input** (mutating commands):
    - Accept `--payload <json>` and piped JSON on stdin (detect `!isatty(0)`, never stdout), plus `-` as an explicit stdin marker
    - Use the API's field names unchanged and accept every API field, including ones without a convenience flag
    - Document one precedence rule (flags override payload fields) and apply it everywhere
    - Invalid JSON is a usage error (exit 2); type mismatches return per-field structured errors, never silent coercion

11. **Context budgets** (read commands):
    - `--fields` with dot notation on list, get and search; a default projection smaller than the full response; `--full` to opt in
    - Paginated output carries `total` (or `total_estimate`), cursor and `has_more`; `--all` pages automatically and streams NDJSON with `--json`, within a documented cap
    - Document default and available fields in the schema output

12. **Safety rails**:
    - Without `--yes` in a non-interactive context, fail with `confirmation_required`; never hang or proceed on a timer
    - Dry-run previews list affected records, the total count, cascades and warnings
    - Optional confirmation tokens must be bound server-side to the previewed parameters and resolved targets, and re-checked on execution
    - Treat string fields from the API as untrusted: sanitise where they reach an agent's context, and say plainly that sanitising is not a guarantee; authorisation stays outside the model

13. **Agent knowledge packaging**:
    - Ship `AGENTS.md` (setup, capabilities, guardrails) and a versioned `SKILL.md` with `name` and `description`, covering installation, authentication, exact commands, permission boundaries and "always use" invariants (`--json`, `--fields`, `--dry-run`)
    - Point the schema output at the skill files and update them in the release pipeline

14. **Quality checks**:
    - All commands produce valid JSON with `--json`
    - Exit codes match semantic meaning for all paths
    - No interactive prompts when NO_INTERACTIVE set
    - --dry-run available on all mutations
    - Input validation rejects all path traversal patterns
    - `describe` and `--help --json` output is valid and complete
    - NDJSON output is records only, one per line; a failed stream exits non-zero
    - Mutating commands accept a raw payload; read commands accept `--fields`
    - Skill files ship with the release and match the current commands

## Outputs

- Updated command implementations (TypeScript)
- Updated CLI help/docs referencing the `--json` flag
- A `describe` command and `--help --json` on every command
- Examples of each exit code with its structured error

## Spec References

- POSIX exit status (only 0 = success and non-zero = failure are standard; the 0-5 meanings are this contract): https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#tag_18_08_02
- NDJSON: http://ndjson.org/
- NO_COLOR: https://no-color.org/
- Input hardening and path traversal: https://agentsurface.dev/docs/cli-design/input-hardening

## Style Rules

- TypeScript strict mode; no `any`.
- Every error for an unhandled failure carries a `trace_id`; never a stack trace.
- Errors are suggestions: suggest recovery action or next command.
- NDJSON streams carry records only; no trailing partial objects.
- Dry-run must be non-destructive; same output format as real run.

## Anti-patterns

- Do NOT output colored ANSI codes under `--json` (breaks parsing).
- Do NOT prompt for input in non-interactive mode; fail fast with error.
- Do NOT omit exit codes; every command must exit with semantic code.
- Do NOT mix human text and JSON on stdout; use stderr for logging.
- Do NOT add a wrapper, array or summary line to an NDJSON stream.
- Do NOT validate without suggesting correction (errors are prompts).
