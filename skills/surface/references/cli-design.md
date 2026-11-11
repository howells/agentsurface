# CLI Design

Dimension 2: whether an agent can drive the CLI without a human at the
keyboard.

## Score

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

## The house way

**Output.** `--json` on every command, and the same JSON automatically when
stdout isn't a TTY. Stdout carries the data object itself, the one the API would
return, with no wrapper: optional fields present as `null`, empty collections as
`[]`. `--all --json` streams one record per line (NDJSON): records only, no
array and no summary line, so a failed stream is known by its exit code. A failure writes
nothing to stdout and one object to stderr:

```ts
{ error: string;            // stable snake_case code to branch on
  message: string;
  suggestions: string[];    // runnable next commands, most likely first
  failing_input?: object;
  invalid_args?: { arg: string; reason: string; received?: string; expected?: string }[];
  trace_id?: string }       // unhandled failures only
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

Pair every non-zero exit with a structured error on stderr. Exit 0 on failure is
a critical finding.

**Streams.** Data goes to stdout, progress and logs to stderr. Disable colour
under `--json`, when stdout isn't a TTY, and when `NO_COLOR` is set to any
non-empty value. Gate spinners on `isatty`.

**Mutations.** `--dry-run` returns a structured preview (action, target,
cascade counts). Without `--yes`, a destructive command fails with
`confirmation_required` and the preview in `details`; never a countdown or a
prompt.

**Input.** Accept stdin JSON for complex or sensitive input; argv shows up in
process listings and shell history. Secrets come from environment variables
listed in `--help` (`--token <value>  API token (or set $API_TOKEN)`).

**Schema.** `<cmd> --help --json` prints one command as
`{ command, description, flags: [{ name, type, required, default?, description }], args }`;
`<cli> describe` prints the whole tree with groups nested under `commands`. Put
the result's JSON Schema in `returns`: Zod 4's `z.toJSONSchema()` produces it
natively; `zod-to-json-schema` is unmaintained and Zod 3 only. Canonical:
https://agentsurface.dev/docs/cli-design/schema-introspection.

**Hardening.** Resolve paths with `fs.realpath` against the allowed root;
string checks for `..` miss symlinks. Reject encoded separators (`%2e`, `%2f`,
`%5c`), UNC paths and control characters (`\0`, `\n`, `\r`, `\x1b`). `--` ends
option parsing but doesn't stop shell expansion, so agents should call with an
argv array or stdin JSON.

**Knowledge packaging.** A SKILL.md or AGENTS.md beside the CLI lists exact
invocations, the exit-code contract, required environment variables and
boundaries.

## Templates

- `templates/cli-and-evals/cli-envelope.ts`
- `templates/cli-and-evals/cli-ndjson.ts`
- `templates/cli-and-evals/cli-schema.ts`
