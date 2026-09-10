import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { guideStages } from "../src/data/homepage-guide.ts";

// This research check is opt-in and never fetches a vendor catalog during builds.
const snapshot = JSON.parse(
  fs.readFileSync(
    new URL("../docs/research/homepage-coverage-2026-09-10.json", import.meta.url),
    "utf-8",
  ),
);
const root = path.resolve(import.meta.dirname, "..");
const cards = guideStages.flatMap((stage) => stage.cards);
const cardsById = new Map(cards.map((card) => [card.id, card]));
const issues = [];

function canonical(value) {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .toSorted()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function fingerprint(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

function checkRoute(route) {
  const pathname = route.split("#")[0];
  const local = path.join(root, "src/content", pathname);
  if (!fs.existsSync(`${local}.mdx`) && !fs.existsSync(path.join(local, "index.mdx"))) {
    issues.push(`Missing documentation: ${route}`);
  }
}

if (cardsById.size !== cards.length) {
  issues.push("Duplicate homepage card IDs");
}
const checkIds = new Set(snapshot.checks.map((check) => check.id));
if (checkIds.size !== snapshot.checks.length) {
  issues.push("Duplicate source check IDs");
}
for (const card of cards) {
  checkRoute(card.href);
}
for (const check of snapshot.checks) {
  if (!cardsById.has(check.cardId)) {
    issues.push(`${check.id}: missing card ${check.cardId}`);
  }
  if (!check.note || !["covered", "adapted"].includes(check.treatment)) {
    issues.push(`${check.id}: missing editorial decision`);
  }
  checkRoute(check.reference);
}

if (process.argv.includes("--live")) {
  const response = await fetch(snapshot.source, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Catalog fetch failed: ${response.status}`);
  }
  const live = await response.json();
  if (live.contractVersion !== snapshot.contractVersion) {
    issues.push(`Catalog version changed: ${snapshot.contractVersion} → ${live.contractVersion}`);
  }
  const saved = new Map(snapshot.checks.map((check) => [check.id, check]));
  const liveIds = new Set(live.checks.map((check) => check.id));
  for (const check of live.checks) {
    const prior = saved.get(check.id);
    if (!prior) {
      issues.push(`New check needs review: ${check.id}`);
    } else if (fingerprint(check) !== prior.definitionSha256) {
      issues.push(`Check definition changed; review coverage: ${check.id}`);
    }
  }
  for (const id of checkIds) {
    if (!liveIds.has(id)) {
      issues.push(`Check removed from source: ${id}`);
    }
  }
  console.log(
    `Fetched Ora ${live.contractVersion}: ${live.checks.length} checks at ${new Date().toISOString()}`,
  );
}

if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `${snapshot.checks.length} checks mapped; ${cards.length} cards across ${guideStages.length} areas; all documentation targets exist.`,
  );
  console.log(
    "This verifies mapping integrity and optional source freshness, not the correctness of the editorial judgments.",
  );
}
