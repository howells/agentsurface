import { spawn } from "node:child_process";

const DEADLINE_MS = 7 * 60 * 1000;
const CLEANUP_MS = 45 * 1000;
const SCOPE = "danielhowells";
const startedAt = Date.now();
let deploymentId;
let deploymentUrl;
let child;
let terminating = false;
class TimeoutError extends Error {}
const remaining = () => Math.max(0, DEADLINE_MS - (Date.now() - startedAt));
const run = async (args, timeoutMs, relay = false) =>
  new Promise((resolve, reject) => {
    const command = spawn("vercel", ["--scope", SCOPE, ...args], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child = command;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      command.kill("SIGTERM");
      setTimeout(() => command.kill("SIGKILL"), 3000).unref();
    }, timeoutMs);
    command.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (relay) {
        process.stdout.write(chunk);
      }
    });
    command.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (relay) {
        process.stderr.write(chunk);
      }
    });
    command.on("error", reject);
    command.on("close", (code) => {
      clearTimeout(timer);
      if (child === command) {
        child = undefined;
      }
      if (timedOut) {
        reject(new TimeoutError(`vercel ${args[0]} exceeded its deadline`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`vercel ${args[0]} failed: ${stderr.trim()}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
const json = (source, label) => {
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${label} did not return JSON: ${error.message}`, { cause: error });
  }
};
const remove = async (reason) => {
  if (!deploymentId && deploymentUrl) {
    const inspected = json(
      (await run(["inspect", deploymentUrl, "--json", "--no-color"], CLEANUP_MS)).stdout,
      "cleanup inspection",
    );
    if (typeof inspected.id === "string" && inspected.id.startsWith("dpl_")) {
      deploymentId = inspected.id;
    }
  }
  if (!deploymentId) {
    process.stderr.write(`${reason}; no exact deployment exists to remove\n`);
    return;
  }
  const exactId = deploymentId;
  process.stderr.write(`${reason}; removing exact deployment ${exactId}\n`);
  await run(["remove", exactId, "--safe", "--yes", "--no-color"], CLEANUP_MS, true);
  deploymentId = undefined;
};
const stop = async (signal) => {
  if (terminating) {
    return;
  }
  terminating = true;
  child?.kill("SIGTERM");
  try {
    await remove(`received ${signal}`);
  } finally {
    process.exit(1);
  }
};
process.on("SIGINT", () => void stop("SIGINT"));
process.on("SIGTERM", () => void stop("SIGTERM"));

try {
  const submitted = await run(
    ["deploy", "--prebuilt", "--prod", "--skip-domain", "--yes", "--no-wait", "--no-color"],
    remaining(),
    true,
  );
  deploymentUrl = /https:\/\/[a-z0-9-]+\.vercel\.app\b/iu.exec(
    `${submitted.stdout}\n${submitted.stderr}`,
  )?.[0];
  if (!deploymentUrl) {
    throw new Error("Vercel did not report the immutable deployment URL");
  }
  const initial = json(
    (await run(["inspect", deploymentUrl, "--json", "--no-color"], remaining())).stdout,
    "initial inspection",
  );
  if (typeof initial.id !== "string" || !initial.id.startsWith("dpl_")) {
    throw new Error("Vercel did not report an exact deployment id");
  }
  deploymentId = initial.id;
  const ready = json(
    (
      await run(
        [
          "inspect",
          deploymentId,
          "--wait",
          "--timeout",
          `${Math.floor(remaining() / 1000)}s`,
          "--json",
          "--no-color",
        ],
        remaining(),
      )
    ).stdout,
    "final inspection",
  );
  if (ready.id !== deploymentId || ready.readyState !== "READY") {
    throw new Error(`${deploymentId} finished in ${JSON.stringify(ready.readyState)}`);
  }
  const expectedSha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (!expectedSha) {
    throw new Error("runtime verification requires a Git SHA");
  }
  const version = json(
    (
      await run(
        [
          "curl",
          "--deployment",
          deploymentId,
          `/api/internal/version?expected=${expectedSha}`,
          "--",
          "--fail-with-body",
          "--silent",
          "--show-error",
        ],
        remaining(),
      )
    ).stdout,
    "version probe",
  );
  if (version.sha !== expectedSha) {
    throw new Error(
      `${deploymentId} reports ${JSON.stringify(version.sha)}, expected ${expectedSha}`,
    );
  }
  const homepage = (
    await run(
      [
        "curl",
        "--deployment",
        deploymentId,
        "/",
        "--",
        "--fail-with-body",
        "--silent",
        "--show-error",
      ],
      remaining(),
    )
  ).stdout;
  if (!homepage.includes("Agent Surface")) {
    throw new Error(`${deploymentId} failed the Agent Surface homepage probe`);
  }
  const promotionSeconds = Math.floor(remaining() / 1000);
  if (promotionSeconds < 1) {
    throw new TimeoutError("deadline reached before promotion");
  }
  await run(
    ["promote", deploymentId, "--yes", "--timeout", `${promotionSeconds}s`, "--no-color"],
    remaining(),
    true,
  );
  process.stdout.write(
    `${deploymentId} READY, runtime-verified, and promoted (${deploymentUrl})\n`,
  );
} catch (error) {
  if (deploymentUrl || deploymentId) {
    await remove(
      error instanceof TimeoutError || remaining() === 0
        ? "seven-minute deadline reached"
        : "publish failed before promotion completed",
    );
  }
  throw error;
}
