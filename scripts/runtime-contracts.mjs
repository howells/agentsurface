import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import { setTimeout } from "node:timers/promises";
import test from "node:test";

const socket = createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const { port } = socket.address();
await new Promise((resolve) => socket.close(resolve));
const origin = `http://localhost:${port}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    process.env.CONTRACT_BUILD ? "start" : "dev",
    "--port",
    String(port),
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
server.stdout.on("data", (data) => {
  logs += data;
});
server.stderr.on("data", (data) => {
  logs += data;
});
async function get(path, accept) {
  return fetch(`${origin}${path}`, { headers: accept ? { Accept: accept } : {} });
}
async function rpc(method, name, args) {
  const response = await fetch(`${origin}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2026-07-28",
      "Mcp-Method": method,
      ...(name ? { "Mcp-Name": name } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params: {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientCapabilities": {},
          "io.modelcontextprotocol/clientInfo": { name: "contract-test", version: "1" },
        },
        ...(name ? { name, arguments: args } : {}),
      },
    }),
  });
  const body = await response.text();
  const payload =
    body.startsWith("event:") || body.startsWith("data:")
      ? body
          .split("\n")
          .find((line) => line.startsWith("data:"))
          .slice(5)
      : body;
  const json = JSON.parse(payload);
  assert.equal(json.error, undefined, body);
  return json.result;
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (logs.includes("Ready in")) {
      ready = true;
      break;
    }
    if (server.exitCode !== null) throw new Error(logs);
    await setTimeout(250);
  }
  assert.ok(ready, logs);
  await test("negotiated representations retain Accept, Next Vary keys and discovery links", async () => {
    for (const path of ["/", "/docs/discovery/content-negotiation"]) {
      for (const accept of ["text/html", "text/markdown"]) {
        const response = await get(path, accept);
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), new RegExp(accept));
        assert.match(response.headers.get("vary"), /accept/i);
        assert.match(response.headers.get("link"), /rel="describedby"/);
        if (accept === "text/html") {
          assert.match(response.headers.get("vary"), /rsc/i);
          const html = await response.text();
          assert.match(html, /rel="canonical"/);
          assert.match(html, /type="text\/markdown"/);
        }
      }
    }
  });
  await test("REST and modern MCP share bounded page retrieval and recovery", async () => {
    assert.ok((await rpc("server/discover")).supportedVersions.includes("2026-07-28"));
    const { tools } = await rpc("tools/list");
    for (const tool of tools) {
      assert.equal(tool.annotations.readOnlyHint, true);
      assert.equal(tool.annotations.idempotentHint, true);
      assert.equal(tool.annotations.destructiveHint, false);
      assert.ok(tool.outputSchema);
    }
    const rest = await (
      await get("/api/docs/search?query=content%20negotiation&limit=2&section=discovery")
    ).json();
    const result = await rpc("tools/call", "search", {
      query: "content negotiation",
      limit: 2,
      section: "discovery",
    });
    assert.deepEqual(result.structuredContent, rest);
    assert.ok(rest.results.length > 0 && rest.results.length <= 2);
    assert.equal(new Set(rest.results.map((page) => page.id)).size, rest.results.length);
    assert.equal(typeof rest.has_more, "boolean");
    assert.ok(JSON.stringify(rest).length < 5000);
    for (const page of rest.results) {
      assert.ok(page.url.startsWith("https://agentsurface.dev/docs/discovery/"));
      assert.ok(page.updated_at);
    }
    const missing = await rpc("tools/call", "get_page", { url: "/docs/contract-missing" });
    assert.equal(missing.isError, true);
    assert.match(JSON.stringify(missing), /llms.txt/);
    const found = await rpc("tools/call", "get_page", { url: rest.results[0].url });
    assert.ok(found.structuredContent.markdown.includes("llms.txt"));
    assert.equal(found.isError, undefined);
    const empty = await (await get("/api/docs/search?query=zzzznonexistentcontract")).json();
    assert.deepEqual(empty.results, []);
    assert.equal(empty.has_more, false);
  });
  await test("problem documents explain safe recovery", async () => {
    for (const path of [
      "/contract-missing",
      "/docs/contract-missing",
      "/api/contract-missing",
      "/api/docs/search?query=x",
      "/api/md/contract-missing",
    ]) {
      const response = await get(path, "application/json");
      assert.ok([400, 404].includes(response.status));
      assert.match(response.headers.get("content-type"), /application\/problem\+json/);
      const problem = await response.json();
      for (const field of [
        "type",
        "title",
        "status",
        "detail",
        "instance",
        "is_retriable",
        "suggestions",
        "trace_id",
      ])
        assert.ok(field in problem, field);
      assert.equal(problem.is_retriable, false);
      assert.equal(problem.instance, path);
    }
  });
  await test("informational twins and Markdown missing paths", async () => {
    for (const path of ["/about", "/contact", "/privacy", "/glossary", "/patterns"]) {
      const response = await get(path, "text/markdown");
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/markdown/);
      const body = await response.text();
      const twin = await get(`${path}.md`);
      assert.equal(twin.status, 200);
      assert.equal(await twin.text(), body);
      assert.ok(body.length > 200);
    }
    const missing = await get("/contract-missing.md");
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get("content-type"), /text\/markdown/);
  });
  await test("indexes fit their budget and discovery artefacts match", async () => {
    for (const path of ["/llms.txt", "/docs/llms.txt"]) {
      const response = await get(path);
      assert.ok(Number(response.headers.get("x-markdown-tokens")) < 5000);
      const body = await response.text();
      assert.doesNotMatch(body, /\]\(https:\/\/agentsurface.dev\/mcp\)/);
      for (const match of body.matchAll(/\]\((https:\/\/agentsurface.dev[^)]+)\)/g)) {
        const target = await get(new URL(match[1]).pathname);
        assert.equal(target.status, 200, match[1]);
      }
    }
    const index = await (await get("/.well-known/agent-skills/index.json")).json();
    const skill = await (await get("/skills/surface/SKILL.md")).text();
    assert.ok(JSON.stringify(index).includes(createHash("sha256").update(skill).digest("hex")));
    const catalog = await (await get("/.well-known/ai-catalog.json")).json();
    assert.deepEqual(catalog, await (await get("/.well-known/ard.json")).json());
    for (const entry of catalog.entries) {
      const response = await get(new URL(entry.url).pathname);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type").split(";")[0], entry.type.split(";")[0]);
    }
  });
} finally {
  server.kill("SIGTERM");
  await once(server, "exit");
}
