import { spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { join } from "node:path";

// The Vercel builder adds every .env* file it can see to the function file map,
// but .vercelignore keeps .env out of the upload, so the deploy dies on a missing
// path. Production takes its environment from .vercel/.env.production.local, so
// hide the local .env for the length of the build and put it back afterwards.
const repoRoot = join(import.meta.dirname, "..");
const localEnv = join(repoRoot, ".env");
// Park it under .vercel/, which the builder never scans. Any name starting with
// ".env" at the project root is picked up again, parked or not.
const parked = join(repoRoot, ".vercel", "local-env.parked");
const hide = existsSync(localEnv);
if (hide) {
  if (existsSync(parked)) {
    throw new Error(`${parked} already exists; a previous production build did not finish`);
  }
  renameSync(localEnv, parked);
}
try {
  const build = spawnSync("vercel", ["build", "--prod", "--scope", "danielhowells"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (build.error) {
    throw build.error;
  }
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
} finally {
  if (hide) {
    renameSync(parked, localEnv);
  }
}
