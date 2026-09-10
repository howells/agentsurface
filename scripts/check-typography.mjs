// Typography gate: text shape comes from one `type-*` role defined in src/app/global.css.
// Inline sizes, weights, families, tracking, leading and casing are violations on the
// marketing pages and shared components. Run with `pnpm typography:check`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/app/(home)", "src/app/glossary", "src/app/patterns", "src/components"];
const ROLES = "type-display / type-heading / type-body / type-small";
const NAMED_TEXT_SIZE = /^text-(xs|sm|base|lg|xl|[2-9]xl)$/u;
const ARBITRARY_SIZE = /^text-\[(?!#|var\(|rgb|hsl|okl(?:ch|ab)|color[-:(]|currentColor)[^\]]+\]$/u;
const VARIABLE_SIZE = /^text-\(length:--[\w-]+\)$/u;
const FONT_WEIGHT =
  /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/u;
const FONT_FAMILY = /^font-(sans|serif|mono|display|\[[^\]]+\])$/u;
const TRACKING = /^-?tracking-(?:[\w.-]+|\[[^\]]+\]|\(--[\w-]+\))$/u;
const LEADING = /^leading-(?:[\w.-]+|\[[^\]]+\]|\(--[\w-]+\))$/u;
const CASE = /^(uppercase|lowercase)$/u;

function baseUtility(token) {
  const stripped = token.endsWith("!") ? token.slice(0, -1) : token;
  let depth = 0;
  let lastColon = -1;
  let lastSlash = -1;
  for (let i = 0; i < stripped.length; i += 1) {
    const c = stripped[i];
    if (c === "[" || c === "(") {
      depth += 1;
    } else if (c === "]" || c === ")") {
      depth -= 1;
    } else if (depth === 0 && c === ":") {
      lastColon = i;
      lastSlash = -1;
    } else if (depth === 0 && c === "/") {
      lastSlash = i;
    }
  }
  const base = stripped.slice(lastColon + 1, lastSlash === -1 ? undefined : lastSlash);
  return base.startsWith("!") ? base.slice(1) : base;
}

function problem(base) {
  if (NAMED_TEXT_SIZE.test(base) || ARBITRARY_SIZE.test(base) || VARIABLE_SIZE.test(base)) {
    return `inline font size "${base}" - use a role (${ROLES})`;
  }
  if (FONT_WEIGHT.test(base)) {
    return `inline font weight "${base}" - hierarchy is colour, not weight`;
  }
  if (FONT_FAMILY.test(base) && base !== "font-mono") {
    return `inline font family "${base}" - font-mono is the only family modifier`;
  }
  if (TRACKING.test(base)) {
    return `inline tracking "${base}" - the role sets tracking`;
  }
  if (LEADING.test(base)) {
    return `inline line-height "${base}" - the role sets leading`;
  }
  if (CASE.test(base)) {
    return `inline casing "${base}" - casing belongs to a role`;
  }
  return null;
}

// Class strings: className="…", className={`…`}, and string literals inside cn()/clsx() calls.
const CLASS_STRING = /(?:class(?:Name)?\s*=\s*(?:"([^"]*)"|\{`([^`]*)`\})|\bcn\(([\s\S]*?)\))/gu;
const LITERAL = /["'`]([^"'`]*)["'`]/gu;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      yield* files(path);
    } else if (/\.(tsx|jsx)$/u.test(name)) {
      yield path;
    }
  }
}

const violations = [];
for (const root of ROOTS) {
  for (const file of files(root)) {
    const source = readFileSync(file, "utf-8");
    for (const match of source.matchAll(CLASS_STRING)) {
      const chunks = match[3]
        ? [...match[3].matchAll(LITERAL)].map((m) => m[1])
        : [match[1] ?? match[2] ?? ""];
      const line = source.slice(0, match.index).split("\n").length;
      for (const chunk of chunks) {
        for (const token of chunk.split(/\s+/u).filter(Boolean)) {
          const message = problem(baseUtility(token));
          if (message) {
            violations.push(`${relative(process.cwd(), file)}:${line} ${message}`);
          }
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  console.error(`\n${violations.length} typography violation(s).`);
  process.exit(1);
}
console.log(`Typography clean across ${ROOTS.join(", ")}.`);
