# CLI Design

Dimension 2: whether an agent can drive the CLI without a human at the
keyboard.

## Contents

- Rubric
- Evidence to gather
- Build: output, exit codes, streams, non-interactive runs, mutations, input,
  context budgets, schema, hardening, knowledge packaging
- Templates

## Rubric

- **0**: Human-only output (tables, colour, prose), interactive prompts with no
  bypass, no machine-readable path.
- **1**: `--json` on some commands, with shapes that differ between commands.
  Non-zero exit codes without distinct meanings.
- **2**: One consistent JSON shape on every command; structured errors; a documented
  exit-code contract with distinct codes; `--dry-run` on every mutation; TTY
  detection; no prompts when flags are given.
- **3**: Level 2, plus NDJSON streaming for large or paginated results, a
  `--help --json` or `describe` output listing parameters, types and required flags,
  input hardening, and a shipped SKILL.md or AGENTS.md. Also required: raw
  payload input (`--payload` or stdin JSON using the API's field names), context
  discipline (`--fields` on reads, default projections smaller than the full
  record, cursor and `has_more` metadata) and safety rails
  (`confirmation_required` without `--yes`, dry-run previews with counts and side
  effects). Streaming, schema and hardening alone don't earn a 3.

For a CLI-centred product, also score the seven axes of the 0-21 Agent DX CLI
Scale (https://agentsurface.dev/docs/cli-design/cli-scale): output, raw payload
input, schema introspection, context discipline, input hardening, safety rails,
knowledge packaging. Report the weakest axes as findings.

N/A when the project neither is nor ships a CLI.

## Evidence to gather

Run it. Read the `bin` field and the framework (commander, yargs, oclif, citty,
click, typer, cobra, clap), then:

```bash
<cli> --help                         # list commands; look for --json, --dry-run, --yes
<cli> <cmd> --json                   # every command, dry-run for mutations
<cli> bad-command; echo $?           # usage error code
<cli> list | cat                     # piped: no ANSI codes or spinner frames
<cli> describe; <cli> <cmd> --help --json
<cli> list --all --json | head -3    # one JSON value per line in the raw output
```

Piping `--json` through `jq -c` proves nothing about NDJSON support.

## Build

Each part is done when the command under **Evidence to gather** that exercises
it shows the stated behaviour on every command, not a sample.

**Output.** `--json` on every command, and the same JSON automatically when
stdout isn't a TTY. Stdout carries the data object itself, the one the API would
return, with no wrapper: optional fields present as `null`, empty collections as
`[]`. `--all --json` streams one record per line (NDJSON), each written as soon
as it is fetched: records only, no array and no summary line. A stream that
fails part-way keeps the lines already written, writes the error to stderr and
exits non-zero, so consumers check the exit code. A failure writes nothing more
to stdout and one object to stderr:

```ts
{ error: string;            // stable snake_case code to branch on
  message: string;          // may change between releases
  suggestions: string[];    // runnable next commands, most likely first
  failing_input?: object;   // the values that caused the failure
  invalid_args?: { arg: string; reason: string; received?: string; expected?: string }[];
  trace_id?: string }       // unhandled failures only, never a stack trace
```

Canonical: https://agentsurface.dev/docs/cli-design/machine-readable-output and
https://agentsurface.dev/docs/error-handling/cli-errors.

**Exit codes.** Only 0 (success) and non-zero (failure) are universal. `gh`
uses 2 for cancellation and 4 for auth; BSD `sysexits.h` (64 usage, 66 no
input, 69 unavailable, 77 no permission) is a convention some tools borrow. So
each CLI must publish its own contract in its `describe` output and skill file.
The house contract:

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 0    | Success                              |
| 1    | Failure; read the structured error   |
| 2    | Usage error; fix the input and retry |
| 3    | Not found                            |
| 4    | Permission denied                    |
| 5    | Conflict (exists, or state changed)  |

Pair every non-zero exit with a structured error on stderr, including the
argument parser's own usage errors (unknown command or flag, missing argument).
Exit 0 on failure is a critical finding.

**Streams.** Data goes to stdout, progress and logs to stderr. Disable colour
under `--json`, when stdout isn't a TTY, and when `NO_COLOR` is set to any
non-empty value. Gate spinners on `isatty`. A reader that closes the pipe early
(`| head -1`) ends the stream with exit 0, not a crash.

**Non-interactive runs.** Decide output from stdout's TTY state and prompting
from stdin's, separately. With every required flag given, never prompt. With
flags missing and no terminal on stdin, fail with exit 2 and an error whose
`failing_input` lists the missing flags and whose `suggestions` hold the
complete command.

**Mutations.** `--dry-run` on every create, update and delete returns the same
shape as the real run plus `"dry_run": true`, with the affected records, total
count, cascades and warnings. Without `--yes`, a destructive command fails with
`confirmation_required` and that preview; never a countdown or a prompt. A
confirmation token, where used, is bound server-side to the previewed parameters
and resolved targets and re-checked on execution.

**Input.** Mutating commands accept `--payload <json>` and piped JSON on stdin
(`-` as the explicit marker), using the API's field names unchanged and every
API field, including ones with no convenience flag. One documented precedence
rule: flags override payload fields. Invalid JSON is a usage error (exit 2); a
type mismatch is a per-argument error, never a silent coercion. Secrets come
from stdin or environment variables listed in `--help`
(`--token <value>  API token (or set $API_TOKEN)`); argv shows up in process
listings and shell history.

**Context budgets.** List, get and search take `--fields` with dot notation,
default to a projection smaller than the full record, and offer `--full`.
Paginated output carries `total` (or `total_estimate`), a cursor and `has_more`;
`--all` pages automatically within a documented cap. The schema output lists
default and available fields.

**Schema.** `<cmd> --help --json` prints one command as
`{ command, description, flags: [{ name, type, required, default?, enum?, description }], args, returns }`,
with flag names as typed (`dry-run`, not the parser's `dryRun`). `<cli> describe`
prints the whole tree with groups nested under `commands`, plus `name`,
`version` and the exit-code contract. Put the result's JSON Schema in `returns`:
Zod 4's `z.toJSONSchema()` produces it natively; `zod-to-json-schema` is
unmaintained and Zod 3 only. Add required scopes and a destructive flag where
the CLI knows them. Canonical:
https://agentsurface.dev/docs/cli-design/schema-introspection.

**Hardening**, per field, matched to what the field holds. Resolve paths with
`fs.realpath` (on the nearest existing ancestor) against the allowed root;
string checks for `..` miss symlinks. In identifiers and paths reject encoded
separators (`%2e`, `%2f`, `%5c`, `%00`), UNC paths, control characters (`\0`,
`\n`, `\r`, `\x1b`), and `?` or `#` in resource IDs; decode until the value
stops changing before validating, so double encoding can't pass. Free-text and
JSON fields may hold tabs and newlines. Report each rejection in `invalid_args`.
`--` ends option parsing but doesn't stop shell expansion, so agents should call
with an argv array or stdin JSON. Treat strings that came from the API as
untrusted where they reach an agent's context; sanitising is not a guarantee, so
authorisation stays in the CLI and the server.

**Knowledge packaging.** A versioned SKILL.md or AGENTS.md beside the CLI lists
installation, authentication, exact invocations, the exit-code contract,
required environment variables, permission boundaries and the invariants to
always use (`--json`, `--fields`, `--dry-run`). The schema output points at it
and the release pipeline updates it.

## Templates

- `templates/cli-and-evals/cli-envelope.ts` (output, structured errors, exit
  codes, usage errors from the parser)
- `templates/cli-and-evals/cli-ndjson.ts` (streaming, early pipe close)
- `templates/cli-and-evals/cli-schema.ts` (`describe` and `--help --json`)
