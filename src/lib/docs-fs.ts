import { readFileSync } from "node:fs";
import { join } from "node:path";

const DOCS_ROOT = join(process.cwd(), "src", "content", "docs");

function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.codePointAt(i);
    if (code !== undefined && (code <= 0x1f || code === 0x7f)) {
      return true;
    }
  }
  return false;
}

/**
 * Normalizes a doc slug for safe filesystem lookups. Rejects control
 * characters, backslashes, and "." / ".." path segments that could escape
 * `DOCS_ROOT` once decoded, closing the path-traversal gap a raw
 * `path.join(docsRoot, slug)` would otherwise leave open. Returns `null`
 * for anything invalid, `"index"` for the empty/root slug.
 */
export function normalizeSlug(slug: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return null;
  }

  if (hasControlChar(decoded) || decoded.includes("\\")) {
    return null;
  }

  const normalized = decoded.replace(/^\/+/, "").replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);

  if (segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }

  return segments.join("/") || "index";
}

/**
 * Reads the raw MDX source for a docs page given an already-normalized
 * slug (see `normalizeSlug`), trying `<slug>.mdx` and `<slug>/index.mdx`
 * in turn. Returns `null` when no candidate file exists.
 */
export function readDocsFile(normalizedSlug: string): string | null {
  const candidates =
    normalizedSlug === "index"
      ? [join(DOCS_ROOT, "index.mdx")]
      : [join(DOCS_ROOT, `${normalizedSlug}.mdx`), join(DOCS_ROOT, normalizedSlug, "index.mdx")];

  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, "utf-8");
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}
