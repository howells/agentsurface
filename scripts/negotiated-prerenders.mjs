import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

// The proxy serves HTML or Markdown from one URL depending on Accept, and adds
// Vary: Accept. Vercel serves prerendered pages with the Vary stored in their
// prerender config instead, overriding both the proxy and next.config headers(),
// so downstream caches never learn that these URLs negotiate. These are the
// prerenders served at negotiated URLs: the HTML pages and the Markdown they rewrite to.
const NEGOTIATED = [
  /^index(\.md)?$/,
  /^(about|glossary|patterns|contact|privacy)$/,
  /^docs(\/.+)?$/,
  /^guide\/.+$/,
  /^llms\.mdx\/.+$/,
];
const SUFFIX = ".prerender-config.json";

/** Prerender configs, relative to `functionsDir`, whose route negotiates on Accept. */
export function negotiatedPrerenderConfigs(functionsDir) {
  const found = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const filePath = join(directory, entry.name);
      // RSC payloads and segment prefetches are partitioned by the rsc header, not Accept.
      if (entry.isDirectory() && !entry.name.endsWith(".segments")) {
        walk(filePath);
      } else if (entry.name.endsWith(SUFFIX) && !entry.name.endsWith(`.rsc${SUFFIX}`)) {
        const route = relative(functionsDir, filePath)
          .split(sep)
          .join("/")
          .slice(0, -SUFFIX.length);
        if (NEGOTIATED.some((pattern) => pattern.test(route))) {
          found.push(filePath);
        }
      }
    }
  };
  walk(functionsDir);
  return found;
}

export function variesOnAccept(vary) {
  return /(^|,)\s*accept\s*(,|$)/i.test(vary ?? "");
}
