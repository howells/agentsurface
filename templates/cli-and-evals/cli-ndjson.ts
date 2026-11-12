/**
 * CLI NDJSON Streaming - One record per line for `--all --json`
 *
 * **What it is:** Helpers for the streaming half of the output contract in the Agent Surface
 * CLI guide. A list command run with `--all --json` (or `--all` when piped) writes one JSON
 * record per line to stdout, each as soon as it is fetched. The lines are the records
 * themselves: no array, no wrapper and no trailing summary line, so `wc -l` counts records
 * and `jq -c` filters them. Progress goes to stderr.
 *
 * A stream that fails part-way keeps the lines already written, then reports the failure the
 * same way as any other command: a structured error on stderr and a non-zero exit code
 * (see `cli-envelope.ts`). A consumer must check the exit code before trusting the count.
 *
 * **When to use:**
 * - List and search commands over large or paginated result sets
 * - Log tailing and bulk reads an agent may stop consuming early
 *
 * **Canonical URLs:**
 * - https://agentsurface.dev/docs/cli-design/machine-readable-output
 * - https://agentsurface.dev/docs/cli-design/context-window-discipline
 *
 * **Customisation checklist:**
 * - [ ] Replace the page fetcher in the example with your API's cursor pagination
 * - [ ] Apply `--fields` to each record before writing it
 * - [ ] Document a cap on `--all` and say so in `--help`
 *
 * **References:**
 * - NDJSON: https://github.com/ndjson/ndjson-spec
 */

import { once } from "node:events";
import { createInterface } from "node:readline";

/**
 * Write each record as one line of JSON the moment it arrives. Nothing is buffered, so a
 * consumer sees records live and a crash cannot lose records held in memory. Waits for
 * `drain` when the consumer is slower than the producer. A consumer that closes the pipe
 * early (`| head -1`) ends the stream without an error. Returns the number written.
 */
export async function writeNdjson<T>(
  records: AsyncIterable<T> | Iterable<T>,
  output: NodeJS.WritableStream = process.stdout,
): Promise<number> {
  let count = 0;
  const failure: { error?: NodeJS.ErrnoException } = {};
  const onError = (error: NodeJS.ErrnoException): void => {
    failure.error = error;
  };
  output.on("error", onError);
  try {
    for await (const record of records) {
      if (!output.write(`${JSON.stringify(record)}\n`) && !failure.error) {
        // Rejects if the stream errors while waiting; `onError` has recorded why.
        await once(output, "drain").catch(() => {});
      }
      if (failure.error) {
        break;
      }
      count += 1;
    }
  } finally {
    output.off("error", onError);
  }
  // EPIPE means the reader stopped reading, which is its right; anything else is a failure.
  if (failure.error && failure.error.code !== "EPIPE") {
    throw failure.error;
  }
  return count;
}

/** Walk every page of a cursor-paginated endpoint, yielding one record at a time. */
export async function* allPages<T>(
  fetchPage: (cursor: string | null) => Promise<{ items: T[]; next_cursor: string | null }>,
): AsyncGenerator<T> {
  let cursor: string | null = null;
  do {
    const page = await fetchPage(cursor);
    yield* page.items;
    cursor = page.next_cursor;
  } while (cursor);
}

/**
 * Read an NDJSON stream one record at a time. A line that is not valid JSON throws:
 * skipping it would hide a broken stream.
 */
export async function* readNdjson(input: NodeJS.ReadableStream): AsyncGenerator {
  const lines = createInterface({ crlfDelay: Infinity, input });
  for await (const line of lines) {
    if (line.trim()) {
      yield JSON.parse(line) as unknown;
    }
  }
}

/**
 * Example usage:
 *
 * ```typescript
 * import { runCommand, wantsJson, writeProgress, writeResult } from './cli-envelope';
 *
 * program
 *   .command('users-list')
 *   .option('--json', 'Output JSON (automatic when piped)')
 *   .option('--all', 'Fetch every page')
 *   .action((opts) =>
 *     runCommand(opts.json, async () => {
 *       if (opts.all && wantsJson(opts.json)) {
 *         writeProgress('Fetching all users...'); // stderr
 *         await writeNdjson(allPages((cursor) => api.listUsers({ cursor, limit: 100 })));
 *         return;
 *       }
 *       // First page only: one JSON document carrying the pagination metadata.
 *       const page = await api.listUsers({ cursor: null, limit: 20 });
 *       await writeResult(page, { json: opts.json, printHuman: renderUsersTable });
 *     }),
 *   );
 * ```
 *
 * Consumption:
 *
 * ```bash
 * mytool users-list --all --json | wc -l
 * mytool users-list --all --json | jq -c 'select(.status == "active")'
 * ```
 */
