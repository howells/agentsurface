import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const repoRoot = process.cwd();
const docsRoot = path.join(repoRoot, "src/content/docs");
const referencesRoot = path.join(repoRoot, "skills/surface/references");
const templatesRoot = path.join(repoRoot, "templates");
const skillsRoot = path.join(repoRoot, "skills/surface");
const publishedSkillsRoot = path.join(repoRoot, "skills");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(fullPath));
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

const allFiles = walk(docsRoot);
const mdxFiles = allFiles.filter((file) => file.endsWith(".mdx"));
const metaFiles = allFiles.filter((file) => file.endsWith("meta.json"));

const validRoutes = new Set(["/docs"]);
for (const file of mdxFiles) {
  const rel = path.relative(docsRoot, file).replaceAll(path.sep, "/");
  const route = `/docs/${rel.replace(/\/index\.mdx$/, "").replace(/\.mdx$/, "")}`;
  validRoutes.add(route);
}

function stripCode(content) {
  return content.replaceAll(/```[\s\S]*?```/g, "").replaceAll(/`[^`\n]+`/g, "");
}

function resolveRelativeRoute(fromFile, target) {
  const relFile = path.relative(docsRoot, fromFile);
  const fromDir = path.dirname(relFile);
  const joined = path.normalize(path.join("/", fromDir, target)).replaceAll(path.sep, "/");
  const withoutExt = joined.replace(/\.mdx$/, "");
  const withoutIndex = withoutExt === "/index" ? "" : withoutExt.replace(/\/index$/, "");
  return `/docs${withoutIndex}`;
}

const linkIssues = [];
for (const file of mdxFiles) {
  const source = stripCode(fs.readFileSync(file, "utf-8"));
  const matches = [...source.matchAll(/\]\(([^)]+)\)/g), ...source.matchAll(/href="([^"]+)"/g)];

  for (const match of matches) {
    const raw = match[1].trim();
    if (
      raw === "" ||
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("mailto:") ||
      raw.startsWith("#")
    ) {
      continue;
    }

    const target = raw.split("#")[0];
    let route = null;
    if (target.startsWith("/docs")) {
      route = target.replace(/\/$/, "") || "/docs";
    } else if (target.startsWith("./") || target.startsWith("../")) {
      route = resolveRelativeRoute(file, target);
    } else if (target.startsWith("/")) {
      continue;
    }

    if (route !== null && !validRoutes.has(route)) {
      linkIssues.push(`${path.relative(repoRoot, file)} -> ${raw} (resolved ${route})`);
    }
  }
}

const metaIssues = [];
const docsDirs = fs
  .readdirSync(docsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(docsRoot, entry.name));

for (const dir of docsDirs) {
  const metaPath = path.join(dir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    metaIssues.push(`${path.relative(repoRoot, dir)} is missing meta.json`);
  }
}

for (const metaFile of metaFiles) {
  const dir = path.dirname(metaFile);
  const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
  const entries = (meta.pages ?? []).filter((page) => page !== "---");
  const siblings = fs.readdirSync(dir, { withFileTypes: true });
  const expected = new Set();

  for (const sibling of siblings) {
    if (sibling.name === "meta.json") {
      continue;
    }
    if (sibling.isFile() && sibling.name.endsWith(".mdx")) {
      expected.add(sibling.name.replace(/\.mdx$/, ""));
    }
    if (sibling.isDirectory()) {
      expected.add(sibling.name);
    }
  }

  for (const entry of entries) {
    if (!expected.has(entry)) {
      metaIssues.push(`${path.relative(repoRoot, metaFile)} references missing page "${entry}"`);
    }
  }

  for (const slug of [...expected].toSorted()) {
    if (!entries.includes(slug)) {
      metaIssues.push(`${path.relative(repoRoot, metaFile)} is missing page "${slug}"`);
    }
  }
}

// Template-citation existence check.
//
// Scans docs MDX and skill reference markdown for citations of template files
// (e.g. `templates/foo.ts` or `/templates/errors-and-auth/jwt-validate.ts`) and
// verifies each cited path resolves to a real file under the repo's templates/
// directory. Citations inside fenced code blocks are still real citations, so we
// scan raw content here (no stripCode).
const TEMPLATE_CITATION = /\btemplates\/[A-Za-z0-9._/-]+\.(?:ts|tsx|yaml|json|md|txt|mdc)\b/gi;

function collectFiles(root, extensions) {
  if (!fs.existsSync(root)) {
    return [];
  }
  return walk(root).filter((file) => extensions.some((ext) => file.endsWith(ext)));
}

const templateSourceFiles = [
  ...collectFiles(docsRoot, [".mdx"]),
  ...collectFiles(referencesRoot, [".md"]),
];

const templateIssues = [];
for (const file of templateSourceFiles) {
  const content = fs.readFileSync(file, "utf-8");
  for (const match of content.matchAll(TEMPLATE_CITATION)) {
    // Only treat as a citation if the segment starts with "templates/", optionally
    // preceded by a leading slash. Reject continuations like "sub-templates/foo.ts".
    const before = content[match.index - 1];
    if (before !== undefined && before !== "/" && /[A-Za-z0-9._-]/.test(before)) {
      continue;
    }

    const citedPath = match[0];
    const resolved = path.join(templatesRoot, citedPath.replace(/^templates\//, ""));
    if (!fs.existsSync(resolved)) {
      const line = content.slice(0, match.index).split("\n").length;
      templateIssues.push(
        `${path.relative(repoRoot, file)}:${line} — cited path does not exist: ${citedPath}`,
      );
    }
  }
}

// Model-ID canonical-list check.
//
// reference-links/models.mdx is the single source of truth for model IDs used
// in examples. Its code-formatted IDs (table cells + the anti-pattern allowlist
// section) are parsed into an allowlist; every model-ID-shaped string elsewhere
// in the docs MDX and the template kits must appear on it, or it is flagged as
// drift. models.mdx itself is exempt (it defines the list).
//
// Calibration notes:
// - Candidates are matched by provider-prefix shape, then filtered: a candidate
//   that is not on the allowlist is only flagged when it contains a digit (a
//   version marker). This excludes product/prose tokens that share a prefix but
//   are not model IDs — claude-code, claude-md, claude-desktop, claude-agent-sdk,
//   Claude-SearchBot / Claude-User (bot user-agents), Claude-specific/-native,
//   gemini-api, gemini-pro, and bare claude-opus / claude-haiku family words.
// - The o-series alternative (o1/o3/o4) inherently carries a digit, so it is
//   flagged whenever present (the o-series is deprecated; none appear today).
const MODEL_ID =
  /\b(?:claude-[a-z0-9.-]+|gpt-[a-z0-9.-]+|gemini-[a-z0-9.-]+|voyage-[a-z0-9.-]+|text-embedding-[a-z0-9.-]+|o[134][a-z0-9-]*)\b/gi;

const modelsDocPath = path.join(docsRoot, "reference-links/models.mdx");

// Build the allowlist from code-formatted IDs in models.mdx only (inline `code`
// spans and fenced ```code``` blocks), so prose mentions of retired IDs do not
// silently allowlist them.
const modelAllowlist = new Set();
if (fs.existsSync(modelsDocPath)) {
  const modelsDoc = fs.readFileSync(modelsDocPath, "utf-8");
  const codeSpans = [
    ...modelsDoc.matchAll(/```[\s\S]*?```/g),
    ...modelsDoc.matchAll(/`([^`\n]+)`/g),
  ].map((match) => match[0]);
  for (const span of codeSpans) {
    for (const idMatch of span.matchAll(MODEL_ID)) {
      modelAllowlist.add(idMatch[0].toLowerCase());
    }
  }
}

const modelScanFiles = [
  ...collectFiles(docsRoot, [".mdx"]).filter((file) => file !== modelsDocPath),
  ...collectFiles(templatesRoot, [".ts", ".tsx", ".yaml", ".yml", ".json", ".md", ".mdc", ".txt"]),
  ...collectFiles(skillsRoot, [".md"]),
];

const modelIssues = [];
for (const file of modelScanFiles) {
  const content = fs.readFileSync(file, "utf-8");
  for (const match of content.matchAll(MODEL_ID)) {
    const token = match[0].toLowerCase();
    if (modelAllowlist.has(token)) {
      continue;
    }
    // Only flag tokens that carry a version digit; prefix-sharing prose and
    // product names (claude-code, gemini-api, …) have none.
    if (!/\d/.test(token)) {
      continue;
    }
    const line = content.slice(0, match.index).split("\n").length;
    modelIssues.push(
      `${path.relative(repoRoot, file)}:${line} — model ID not in canonical list: ${match[0]}`,
    );
  }
}

// lastVerified freshness check.
//
// Docs carry an optional `lastVerified: YYYY-MM-DD` frontmatter stamp. Two rules:
//   (a) STALE — any page with a stamp older than STALE_AFTER_DAYS is flagged so
//       the content gets re-checked against upstream reality.
//   (b) FAST_DECAY — pages whose subject matter changes quickly (models, MCP
//       server patterns, discovery/retrieval mechanics, protocols, the tooling
//       catalog) are REQUIRED to carry a stamp. A missing stamp is flagged.
const STALE_AFTER_DAYS = 120;

// --no-freshness demotes freshness findings to warnings instead of failures.
// The build gate uses it so a page aging past the staleness window can never
// fail an unrelated deploy; the standalone `pnpm docs:check` keeps freshness
// fatal as the re-verification cadence signal.
const freshnessFatal = !process.argv.includes("--no-freshness");

// Directory entries ending in "/*" expand to every .mdx page in that directory.
const FAST_DECAY = [
  "mcp-servers/real-world-examples",
  "mcp-servers/nextjs-integration",
  "discovery/well-known-endpoints",
  "discovery/agent-skills",
  "discovery/structured-data",
  "discovery/robots-txt",
  "discovery/llms-txt",
  "data-retrievability/embeddings",
  "data-retrievability/multimodal-embeddings",
  "data-retrievability/vector-databases",
  "data-retrievability/index",
  "agents/anthropic-platform",
  "agents/runtime-guardrails",
  "agents/sandboxes-and-workspaces",
  "cookbook/code-execution",
  "testing/observability",
  "testing/promptfoo",
  "authentication/auth-md",
  "authentication/agent-identity",
  "reference-links/models",
  "runtime-boundaries/durable-execution",
  "agentic-ui/mcp-apps",
  "agentic-ui/session-control",
  "protocols/*",
  "tooling-catalog/*",
];

function docSlug(file) {
  return path
    .relative(docsRoot, file)
    .replaceAll(path.sep, "/")
    .replace(/\.mdx$/, "");
}

function expandFastDecay(patterns) {
  const slugs = new Set();
  for (const pattern of patterns) {
    if (pattern.endsWith("/*")) {
      const dir = path.join(docsRoot, pattern.slice(0, -2));
      if (!fs.existsSync(dir)) {
        continue;
      }
      for (const entry of fs.readdirSync(dir)) {
        if (entry.endsWith(".mdx")) {
          slugs.add(`${pattern.slice(0, -2)}/${entry.replace(/\.mdx$/, "")}`);
        }
      }
    } else {
      slugs.add(pattern);
    }
  }
  return slugs;
}

function parseLastVerified(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    return null;
  }
  const lineMatch = fmMatch[1].match(/^lastVerified:\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*$/m);
  return lineMatch ? lineMatch[1] : null;
}

const fastDecaySlugs = expandFastDecay(FAST_DECAY);
const stampedSlugs = new Set();
const freshnessIssues = [];
const today = new Date();

for (const file of mdxFiles) {
  const content = fs.readFileSync(file, "utf-8");
  const lastVerified = parseLastVerified(content);
  const slug = docSlug(file);

  if (lastVerified) {
    stampedSlugs.add(slug);
    const ageDays = Math.floor((today - new Date(`${lastVerified}T00:00:00Z`)) / 86_400_000);
    if (ageDays > STALE_AFTER_DAYS) {
      freshnessIssues.push(
        `${path.relative(repoRoot, file)} — stale lastVerified (${lastVerified}, ${ageDays} days)`,
      );
    }
  }
}

for (const slug of [...fastDecaySlugs].toSorted()) {
  if (!stampedSlugs.has(slug)) {
    freshnessIssues.push(`${slug}.mdx — missing lastVerified (required fast-decay page)`);
  }
}

// Release version parity check.
//
// The package, distributable skill, Claude plugin, and public MCP metadata are
// one release surface. Keep their versions aligned so installs and discovery
// never advertise different releases.
const packageJsonPath = path.join(repoRoot, "package.json");
const serverCardPath = path.join(repoRoot, "public/.well-known/mcp/server-card.json");
const skillManifestPath = path.join(repoRoot, ".skill.yaml");
const pluginManifestPath = path.join(repoRoot, ".claude-plugin/plugin.json");

const versionIssues = [];
if (fs.existsSync(packageJsonPath)) {
  const packageVersion = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")).version;

  if (fs.existsSync(serverCardPath)) {
    const serverCard = JSON.parse(fs.readFileSync(serverCardPath, "utf-8"));
    for (const [field, value] of [
      ["version", serverCard.version],
      ["serverInfo.version", serverCard.serverInfo?.version],
    ]) {
      if (packageVersion !== value) {
        versionIssues.push(
          `public/.well-known/mcp/server-card.json ${field} (${value}) does not match package.json version (${packageVersion})`,
        );
      }
    }
  }

  if (fs.existsSync(skillManifestPath)) {
    const skillManifest = fs.readFileSync(skillManifestPath, "utf-8");
    const skillVersion = /^version:\s*([^\s#]+)\s*$/m.exec(skillManifest)?.[1];
    if (packageVersion !== skillVersion) {
      versionIssues.push(
        `.skill.yaml version (${skillVersion}) does not match package.json version (${packageVersion})`,
      );
    }
  }

  if (fs.existsSync(pluginManifestPath)) {
    const pluginVersion = JSON.parse(fs.readFileSync(pluginManifestPath, "utf-8")).version;
    if (packageVersion !== pluginVersion) {
      versionIssues.push(
        `.claude-plugin/plugin.json version (${pluginVersion}) does not match package.json version (${packageVersion})`,
      );
    }
  }
}

// Agent Skills discovery integrity check.
//
// The public v0.2 index is useful only when its digest identifies the exact
// SKILL.md bytes served by this repository. Validate the required discovery
// fields and map local agentsurface.dev skill URLs back to their source files.
const agentSkillsIndexPath = path.join(repoRoot, "public/.well-known/agent-skills/index.json");
const agentSkillsIssues = [];
const agentSkillsSchema = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

if (fs.existsSync(agentSkillsIndexPath)) {
  try {
    const index = JSON.parse(fs.readFileSync(agentSkillsIndexPath, "utf-8"));
    if (index.$schema !== agentSkillsSchema) {
      agentSkillsIssues.push(
        `public/.well-known/agent-skills/index.json must declare ${agentSkillsSchema}`,
      );
    }

    if (!Array.isArray(index.skills) || index.skills.length === 0) {
      agentSkillsIssues.push(
        "public/.well-known/agent-skills/index.json must contain at least one skill",
      );
    } else {
      const seenNames = new Set();
      const seenUrls = new Set();

      for (const [position, skill] of index.skills.entries()) {
        const label = `public/.well-known/agent-skills/index.json skills[${position}]`;
        if (typeof skill.name !== "string" || skill.name.trim() === "") {
          agentSkillsIssues.push(`${label} requires a non-empty name`);
        } else if (seenNames.has(skill.name)) {
          agentSkillsIssues.push(`${label} duplicates skill name ${skill.name}`);
        } else {
          seenNames.add(skill.name);
        }

        if (skill.type !== "skill-md") {
          agentSkillsIssues.push(`${label} must use type "skill-md"`);
        }
        if (typeof skill.description !== "string" || !/\buse when\b/i.test(skill.description)) {
          agentSkillsIssues.push(`${label} description must explain when to use the skill`);
        }
        if (typeof skill.url !== "string") {
          agentSkillsIssues.push(`${label} requires a canonical URL`);
          continue;
        }
        if (seenUrls.has(skill.url)) {
          agentSkillsIssues.push(`${label} duplicates skill URL ${skill.url}`);
        } else {
          seenUrls.add(skill.url);
        }
        if (!/^sha256:[a-f0-9]{64}$/.test(skill.digest ?? "")) {
          agentSkillsIssues.push(`${label} requires a lowercase sha256 digest`);
          continue;
        }

        let skillUrl;
        try {
          skillUrl = new URL(skill.url);
        } catch {
          agentSkillsIssues.push(`${label} has an invalid URL: ${skill.url}`);
          continue;
        }
        if (skillUrl.origin !== "https://agentsurface.dev") {
          continue;
        }

        const localMatch = /^\/skills\/(.+)\/SKILL\.md$/.exec(skillUrl.pathname);
        if (!localMatch) {
          agentSkillsIssues.push(`${label} URL does not map to a local skill: ${skill.url}`);
          continue;
        }
        const skillPath = path.resolve(publishedSkillsRoot, localMatch[1], "SKILL.md");
        if (
          !skillPath.startsWith(`${publishedSkillsRoot}${path.sep}`) ||
          !fs.existsSync(skillPath)
        ) {
          agentSkillsIssues.push(`${label} points to a missing local skill: ${skill.url}`);
          continue;
        }

        const actualDigest = `sha256:${createHash("sha256")
          .update(fs.readFileSync(skillPath))
          .digest("hex")}`;
        if (actualDigest !== skill.digest) {
          agentSkillsIssues.push(
            `${label} digest (${skill.digest}) does not match ${path.relative(repoRoot, skillPath)} (${actualDigest})`,
          );
        }
      }
    }
  } catch (error) {
    agentSkillsIssues.push(
      `public/.well-known/agent-skills/index.json is not valid JSON: ${error.message}`,
    );
  }
}

if (
  linkIssues.length === 0 &&
  metaIssues.length === 0 &&
  templateIssues.length === 0 &&
  modelIssues.length === 0 &&
  (freshnessIssues.length === 0 || !freshnessFatal) &&
  versionIssues.length === 0 &&
  agentSkillsIssues.length === 0
) {
  if (freshnessIssues.length > 0) {
    console.warn("Freshness warnings (non-fatal in --no-freshness mode):");
    for (const issue of freshnessIssues) {
      console.warn(`- ${issue}`);
    }
  }
  console.log("docs integrity check passed");
  process.exit(0);
}

if (linkIssues.length > 0) {
  console.error("Broken internal docs links:");
  for (const issue of linkIssues) {
    console.error(`- ${issue}`);
  }
}

if (metaIssues.length > 0) {
  console.error("Docs metadata integrity issues:");
  for (const issue of metaIssues) {
    console.error(`- ${issue}`);
  }
}

if (templateIssues.length > 0) {
  console.error("Broken template citations:");
  for (const issue of templateIssues) {
    console.error(`- ${issue}`);
  }
}

if (modelIssues.length > 0) {
  console.error("Model IDs not in canonical list (reference-links/models.mdx):");
  for (const issue of modelIssues) {
    console.error(`- ${issue}`);
  }
}

if (freshnessIssues.length > 0) {
  console.error("Docs freshness (lastVerified) issues:");
  for (const issue of freshnessIssues) {
    console.error(`- ${issue}`);
  }
}

if (versionIssues.length > 0) {
  console.error("Release version mismatch:");
  for (const issue of versionIssues) {
    console.error(`- ${issue}`);
  }
}

if (agentSkillsIssues.length > 0) {
  console.error("Agent Skills discovery integrity issues:");
  for (const issue of agentSkillsIssues) {
    console.error(`- ${issue}`);
  }
}

process.exit(1);
