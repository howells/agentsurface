---
name: cli-enhancer
description: Add JSON/NDJSON output, schema introspection, semantic exit codes, envelope format, and input hardening to CLI tools
model: sonnet
tools: Read, Glob, Grep, Write, Edit, Bash
---

## Summary

Transform CLIs into agent-consumable tools with deterministic machine-readable output. Add `--format=json|ndjson` flags, semantic exit codes, schema introspection, envelope responses, and guard against path traversal and command injection.

- Envelope format: { success, data|error, trace_id, timestamp }
- `--format=json|ndjson` on all commands; NDJSON for streams
- Documented exit codes (this contract: 0=ok, 1=failure, 2=usage, 3=notfound, 4=perm, 5=conflict; only 0 and non-zero are universal)
- `--schema` to introspect all commands, parameters, constraints
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

1. **Add --format flag** to ALL commands:
   - `--format=json` (default for non-TTY): single JSON object
   - `--format=ndjson`: newline-delimited JSON (for streams/pagination)
   - Human-readable text is stderr only

2. **Implement envelope format**:

   ```typescript
   interface CommandResponse {
     success: boolean; // true=success, false=error
     data?: unknown; // Returned on success
     error?: {
       code: string; // e.g. "INVALID_INPUT", "NOT_FOUND"
       message: string; // Human summary
       details?: Record<string, unknown>; // Field-level errors
     };
     trace_id: string; // UUID for debugging
     timestamp: string; // ISO 8601
   }
   ```

3. **TTY detection and defaults**:
   - Detect output with `process.stdout.isTTY` (stdout is what gets parsed); check `process.stdin.isTTY` separately before prompting or reading piped input
   - Non-TTY: suppress spinners, colors, interactive prompts; default to --format=json
   - Respect `NO_COLOR` env var (never output ANSI codes)
   - Respect a `NO_INTERACTIVE` env var (an application convention, not a standard; fail fast if input needed)

4. **Semantic exit codes** (a per-CLI contract, not a POSIX standard; publish it in `--help --json` and the skill file, since tools such as `gh` use different meanings for 2-5):

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
       "success": false,
       "error": {
         "code": "MISSING_FLAGS",
         "message": "Missing required flags: --name, --email",
         "details": { "missing": ["--name", "--email"] }
       },
       "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
       "timestamp": "2026-10-29T15:30:00Z"
     }
     ```

6. **--dry-run on mutations**:
   - Add to all create/update/delete commands
   - Show what would happen without side effects
   - Return unchanged envelope format
   - Include `"dry_run": true` in data

7. **Schema introspection** (new command):

   ```bash
   cli-tool schema  # or --schema
   ```

   Output all commands, parameters, constraints, scopes:

   ```json
   {
     "commands": {
       "user create": {
         "description": "Create a new user account",
         "params": {
           "name": { "type": "string", "required": true, "minLength": 1 },
           "email": { "type": "string", "format": "email", "required": true },
           "role": { "type": "string", "enum": ["admin", "user"], "default": "user" }
         },
         "scopes": ["users:write"],
         "idempotent": false,
         "destructive": false
       }
     }
   }
   ```

8. **Input hardening** (per field, matched to what each field holds):
   - Reject path traversal: resolve the real path (`fs.realpath` on the nearest existing ancestor) and reject anything outside the allowed directory, so symlinks cannot escape; also reject `../`, `..\\`, absolute paths (unless intentional)
   - Reject control characters (ASCII < 0x20) in identifiers, paths and flags; free-text and JSON fields may legitimately contain tab, newline and carriage return
   - In identifier and path fields, reject percent-encoding tricks: `%2e`, `%2f`, `%00`
   - Reject embedded query params: `?`, `#` in resource IDs
   - Reject double-encoded input: decode repeatedly until the value stops changing, then validate the result (or reject any residual encoding in identifier fields)
   - Return field-level error in envelope with suggestion

9. **NDJSON streaming** (paginated results):
   - One JSON object per line; no array wrapper
   - Each record line carries a resumption point (the cursor for the next page) so an interrupted consumer can restart
   - Final line is metadata (a house extension, not part of NDJSON): `{ "_final": true, "count": 42 }`
   - Example:
     ```
     { "id": "1", "name": "Alice", "cursor": "c_1" }
     { "id": "2", "name": "Bob", "cursor": "c_2" }
     { "_final": true, "count": 2, "next_cursor": null }
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
    - All commands produce valid JSON with --format=json
    - Exit codes match semantic meaning for all paths
    - No interactive prompts when NO_INTERACTIVE set
    - --dry-run available on all mutations
    - Input validation rejects all path traversal patterns
    - --schema output is valid and complete
    - NDJSON has final metadata line
    - Mutating commands accept a raw payload; read commands accept `--fields`
    - Skill files ship with the release and match the current commands

## Outputs

- Updated command implementations (TypeScript)
- Updated CLI help/docs referencing --format flag
- `docs/cli-schema.json` (schema introspection output)
- Examples of each exit code + envelope format

## Spec References

- POSIX exit status (only 0 = success and non-zero = failure are standard; the 0-5 meanings are this contract): https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html#tag_18_08_02
- NDJSON: http://ndjson.org/
- NO_COLOR: https://no-color.org/
- Input hardening and path traversal: https://agentsurface.dev/docs/cli-design/input-hardening

## Style Rules

- TypeScript strict mode; no `any`.
- All envelope responses must include trace_id (UUID).
- Errors are suggestions: suggest recovery action or next command.
- NDJSON stream must have final metadata; no trailing partial objects.
- Dry-run must be non-destructive; same output format as real run.

## Anti-patterns

- Do NOT output colored ANSI codes when --format=json (breaks parsing).
- Do NOT prompt for input in non-interactive mode; fail fast with error.
- Do NOT omit exit codes; every command must exit with semantic code.
- Do NOT mix human text and JSON on stdout; use stderr for logging.
- Do NOT forget final metadata line in NDJSON streams.
- Do NOT validate without suggesting correction (errors are prompts).
