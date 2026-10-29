import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import { setTimeout } from "node:timers/promises";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { createDocsMcpServer } from "../src/lib/docs-mcp.ts";

async function test(name, run) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    process.exitCode = 1;
    console.error(`FAIL ${name}`, error);
  }
}

function normalise(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&(?:amp|quot|apos|nbsp);/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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
    process.argv.includes("--built") ? "start" : "dev",
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
    if (server.exitCode !== null) {
      throw new Error(logs);
    }
    await setTimeout(250);
  }
  assert.ok(ready, logs);
  await test("negotiated representations retain Accept, Next Vary keys and discovery links", async () => {
    for (const path of ["/", "/docs/discovery/content-negotiation"]) {
      for (const accept of ["text/html", "text/markdown", "text/markdown", "text/html"]) {
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
    const listed = await rpc("tools/call", "list_pages", { limit: 2, section: "discovery" });
    assert.equal(listed.structuredContent.pages.length, 2);
    assert.equal(listed.structuredContent.next_offset, 2);
    const next = await rpc("tools/call", "list_pages", {
      limit: 2,
      offset: 2,
      section: "discovery",
    });
    assert.ok(
      next.structuredContent.pages.every(
        (page) => !listed.structuredContent.pages.some((previous) => previous.id === page.id),
      ),
    );
    const invalid = await rpc("tools/call", "search", { query: "content", limit: 21 });
    assert.equal(invalid.isError, true);
    const missing = await rpc("tools/call", "get_page", { url: "/docs/contract-missing" });
    assert.equal(missing.isError, true);
    assert.match(JSON.stringify(missing), /llms.txt/);
    const found = await rpc("tools/call", "get_page", { url: rest.results[0].url });
    assert.ok(found.structuredContent.markdown.includes("llms.txt"));
    assert.equal(found.isError, undefined);
    const empty = await (await get("/api/docs/search?query=zzzznonexistentcontract")).json();
    assert.deepEqual(empty.results, []);
    assert.equal(empty.has_more, false);
    const unknownSection = await (
      await get("/api/docs/search?query=content&section=contractunknown")
    ).json();
    assert.deepEqual(unknownSection.results, []);
    assert.equal(unknownSection.has_more, false);
  });
  await test("in-memory MCP executes real retrieval, an error and recovery", async () => {
    const live = await (await get("/api/docs/search?query=content%20negotiation&limit=2")).json();
    const pages = live.results.map((page) => ({
      url: new URL(page.url).pathname,
      slugs: page.slug.split("/"),
      data: { title: page.title, description: page.description, lastModified: page.updated_at },
    }));
    const mcp = createDocsMcpServer(
      {
        pages: () => pages,
        search: async (input) => {
          const params = new URLSearchParams({ query: input.query, limit: String(input.limit) });
          if (input.section) {
            params.set("section", input.section);
          }
          const response = await get(`/api/docs/search?${params}`);
          assert.equal(response.status, 200);
          return response.json();
        },
        markdown: async (page) => {
          const response = await get(`/api/md/${page.slugs.join("/")}`);
          assert.equal(response.status, 200);
          return response.text();
        },
      },
      "contract-test",
    );
    const [client, transport] = InMemoryTransport.createLinkedPair();
    await mcp.connect(transport);
    await client.start();
    let nextId = 0;
    async function call(name, args) {
      nextId += 1;
      const id = nextId;
      const reply = new Promise((resolve, reject) => {
        Object.assign(client, {
          onmessage: (message) => {
            if (message.id === id) {
              if (message.error) {
                reject(new Error(JSON.stringify(message.error)));
              } else {
                resolve(message.result);
              }
            }
          },
        });
      });
      await client.send({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: {
          name,
          arguments: args,
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientCapabilities": {},
            "io.modelcontextprotocol/clientInfo": { name: "in-memory-contract", version: "1" },
          },
        },
      });
      return reply;
    }
    try {
      const searched = await call("search", { query: "content negotiation", limit: 2 });
      assert.deepEqual(searched.structuredContent, live);
      const missing = await call("get_page", { url: "/docs/contract-missing" });
      assert.equal(missing.isError, true);
      assert.match(JSON.stringify(missing), /llms.txt/);
      const recovered = await call("get_page", { url: live.results[0].url });
      assert.ok(recovered.structuredContent.markdown.length > 100);
    } finally {
      await client.close();
      await mcp.close();
    }
  });
  await test("problem documents explain safe recovery", async () => {
    for (const path of [
      "/contract-missing",
      "/docs/contract-missing",
      "/api/contract-missing",
      "/api/docs/search?query=x",
      "/api/docs/search?query=content&limit=0",
      "/api/docs/search?query=content&limit=21",
      "/api/docs/search?query=content&limit=1.5",
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
      ]) {
        assert.ok(field in problem, field);
      }
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
      assert.match(twin.headers.get("link"), /rel="describedby"/);
      assert.equal(await twin.text(), body);
      assert.ok(body.length > 200);
    }
    const missing = await get("/contract-missing.md");
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get("content-type"), /text\/markdown/);
    const missingHtml = await get("/contract-missing", "text/html");
    assert.equal(missingHtml.status, 404);
    assert.match(missingHtml.headers.get("content-type"), /text\/html/);
  });
  await test("informational Markdown keeps the published primary content", async () => {
    for (const path of ["/about", "/contact", "/privacy"]) {
      const html = await (await get(path, "text/html")).text();
      const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html)[1];
      const text = normalise(main.replace(/<[^>]*>/g, " "));
      const markdown = await (await get(`${path}.md`)).text();
      const paragraphs = markdown
        .split("\n\n")
        .filter((part) => !part.startsWith("#") && !part.startsWith("Source:") && part.length > 40);
      for (const paragraph of paragraphs) {
        const plain = paragraph
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .replace(/POST \/mcp/g, "/mcp");
        assert.ok(text.includes(normalise(plain)), `${path}: ${plain}`);
      }
    }
  });
  await test("indexes fit their budget and discovery artefacts match", async () => {
    for (const path of ["/llms.txt", "/docs/llms.txt"]) {
      const response = await get(path);
      assert.ok(Number(response.headers.get("x-markdown-tokens")) < 5000);
      const body = await response.text();
      console.log(`${path}: ${response.headers.get("x-markdown-tokens")} estimated tokens`);
      assert.doesNotMatch(body, /\]\(https:\/\/agentsurface.dev\/mcp\)/);
      for (const match of body.matchAll(/\]\((https:\/\/agentsurface.dev[^)]+)\)/g)) {
        const target = await get(new URL(match[1]).pathname);
        assert.equal(target.status, 200, match[1]);
        if (match[1].endsWith(".md")) {
          assert.match(target.headers.get("content-type"), /text\/markdown/, match[1]);
          assert.ok((await target.text()).length > 100);
        }
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
  await test("metadata, public context and portable Markdown preserve source meaning", async () => {
    const html = await (await get("/docs/discovery/content-negotiation", "text/html")).text();
    const graphs = [
      ...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g),
    ].flatMap((match) => JSON.parse(match[1])["@graph"] ?? []);
    const app = graphs.find((item) => item["@type"] === "SoftwareApplication");
    assert.deepEqual(app.sameAs, ["https://github.com/howells/agentsurface"]);
    assert.ok(app.author.sameAs.includes("https://danielhowells.com"));
    const crumbs = graphs.find((item) => item["@type"] === "BreadcrumbList").itemListElement;
    assert.ok(crumbs.every((item) => item.item?.startsWith("https://agentsurface.dev/")));
    assert.ok(crumbs.some((item) => item.item === "https://agentsurface.dev/docs/discovery"));
    assert.match(html, /<aside[^>]*data-markdown-ignore/);
    assert.match(html, /rel="describedby"[^>]*href="\/llms.txt"/);
    const sitemap = await (await get("/sitemap.xml")).text();
    assert.doesNotMatch(sitemap, /<loc>https:\/\/agentsurface.dev\/about<\/loc>\s*<lastmod>/);
    assert.match(sitemap, /<lastmod>2026-/);
    const context = await (await get("/AGENTS.md")).text();
    assert.match(context, /pnpm prepush/);
    assert.match(context, /pnpm build/);
    assert.doesNotMatch(context, /linear.app/);
    const markdown = await (await get("/docs/discovery/aeo-checklist.md")).text();
    assert.ok(markdown.indexOf("https://agentsurface.dev/llms.txt") < 500);
    const prose = markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
    assert.doesNotMatch(prose, /\]\((?:\.\.?\/|\/docs\/)/);
    assert.match(markdown, /https:\/\/agentsurface.dev\/docs\/discovery\/well-known-endpoints/);
    const target = await get("/docs/discovery/well-known-endpoints", "text/markdown");
    assert.equal(target.status, 200);
    assert.match(target.headers.get("content-type"), /text\/markdown/);
    for (const path of ["/docs/contract-missing.md", "/docsish-missing.md"]) {
      const response = await get(path);
      assert.equal(response.status, 404);
      assert.match(response.headers.get("content-type"), /text\/markdown/);
    }
  });
} finally {
  server.kill("SIGTERM");
  await once(server, "exit");
}
