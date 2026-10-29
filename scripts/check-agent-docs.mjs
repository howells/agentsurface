import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { setTimeout } from "node:timers/promises";
import { promisify } from "node:util";

// Run the Agent-Friendly Documentation Spec's page-level checks (AFDocs) against a
// local production build of every sitemap page, before it is deployed. These catch
// what a browser hides: words lost inside buttons, navigation read before content,
// Markdown twins that drift from the page, and a missing llms.txt pointer.
// Requires a completed `next build` (deploy:prod:build runs one).
const REQUIRED = [
  "markdown-url-support",
  "content-negotiation",
  "llms-txt-directive-html",
  "llms-txt-directive-md",
  "content-start-position",
  "markdown-content-parity",
  "markdown-link-portability",
];
const SITE_ORIGIN = "https://agentsurface.dev";

if (!existsSync(".next/BUILD_ID")) {
  throw new Error("no production build in .next; run pnpm build or pnpm deploy:prod:build first");
}

const socket = createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const { port } = socket.address();
await new Promise((resolve) => socket.close(resolve));
const origin = `http://localhost:${port}`;

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
server.stdout.on("data", (data) => {
  logs += data;
});
server.stderr.on("data", (data) => {
  logs += data;
});

try {
  let sitemap = "";
  for (let attempt = 0; attempt < 120 && !sitemap; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(logs);
    }
    try {
      const response = await fetch(`${origin}/sitemap.xml`);
      if (response.ok) {
        sitemap = await response.text();
      }
    } catch {
      await setTimeout(250);
    }
  }
  if (!sitemap) {
    throw new Error(`next start did not serve /sitemap.xml\n${logs}`);
  }

  const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) =>
    url.replace(SITE_ORIGIN, origin),
  );
  if (pages.length === 0) {
    throw new Error("sitemap lists no pages");
  }

  const { stdout } = await promisify(execFile)(
    "node_modules/.bin/afdocs",
    [
      "check",
      origin,
      "--urls",
      pages.join(","),
      "--checks",
      REQUIRED.join(","),
      "--format",
      "json",
    ],
    // afdocs exits non-zero when any check fails; the JSON is still complete.
    { maxBuffer: 64 * 1024 * 1024 },
  ).catch((error) => {
    if (error.stdout) {
      return error;
    }
    throw error;
  });

  const { results } = JSON.parse(stdout);
  const failing = REQUIRED.map((id) => results.find((result) => result.id === id)).filter(
    (result) => !result || result.status !== "pass",
  );
  for (const result of results) {
    process.stdout.write(
      `${result.status === "pass" ? "PASS" : "FAIL"} ${result.id}: ${result.message}\n`,
    );
  }
  if (failing.length > 0) {
    for (const result of failing.filter(Boolean)) {
      const pagesWithIssues = (result.details?.pageResults ?? []).filter(
        (page) => page.status && page.status !== "pass",
      );
      for (const page of pagesWithIssues.slice(0, 10)) {
        process.stdout.write(`  ${result.id} ${page.status} ${page.url}\n`);
      }
    }
    process.exitCode = 1;
  } else {
    process.stdout.write(`AFDocs page checks pass on ${pages.length} pages\n`);
  }
} finally {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
}
