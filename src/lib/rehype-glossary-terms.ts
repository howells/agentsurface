import path from "node:path";
import { glossaryTerms } from "@/data/glossary";
import type { GlossaryTerm } from "@/data/glossary";

// ── Auto-linking: wraps the first prose occurrence of each glossary term's
// alias in a `<Term id="...">` element, so hover/focus definitions and the
// jump-to-page arrow (see src/components/Term.tsx) show up without any
// per-page authoring. Registered as a rehype plugin (source.config.ts) so it
// runs after the processed-Markdown snapshot is captured — the agent-facing
// Markdown never sees Term markup.

const SKIP_ELEMENT_TAGS = new Set(["pre", "code", "h1", "h2", "h3", "h4", "h5", "h6", "a"]);
const DOCS_ROOT_MARKER = `${path.sep}src${path.sep}content${path.sep}docs${path.sep}`;

interface HastNode {
  type: string;
  tagName?: string;
  name?: string | null;
  value?: string;
  children?: HastNode[];
  attributes?: unknown[];
  [key: string]: unknown;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "/docs/mcp-servers/authentication" (or null when the file isn't under src/content/docs). */
function routeForFile(filePath: string): string | null {
  const index = filePath.indexOf(DOCS_ROOT_MARKER);
  if (index === -1) {
    return null;
  }
  const rel = filePath.slice(index + DOCS_ROOT_MARKER.length).replaceAll(path.sep, "/");
  const withoutExt = rel.replace(/\.mdx?$/, "");
  const withoutIndex = withoutExt === "index" ? "" : withoutExt.replace(/\/index$/, "");
  return `/docs${withoutIndex ? `/${withoutIndex}` : ""}`;
}

/** Every (alias, term) pair eligible on this page — excludes the page the term's href points to — longest alias first. */
function buildAliasIndex(
  terms: GlossaryTerm[],
  currentRoute: string | null,
): { alias: string; term: GlossaryTerm }[] {
  const entries: { alias: string; term: GlossaryTerm }[] = [];
  for (const term of terms) {
    const targetRoute = term.href?.split("#")[0];
    if (targetRoute && currentRoute && targetRoute === currentRoute) {
      continue;
    }
    for (const alias of term.aliases) {
      entries.push({ alias, term });
    }
  }
  return entries.toSorted((a, b) => b.alias.length - a.alias.length);
}

function shouldSkip(node: HastNode): boolean {
  if (
    node.type === "element" &&
    node.tagName !== undefined &&
    SKIP_ELEMENT_TAGS.has(node.tagName)
  ) {
    return true;
  }
  if (
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    node.name === "Term"
  ) {
    return true;
  }
  return false;
}

export function rehypeGlossaryTerms() {
  return (tree: HastNode, file: { path?: string; history?: string[] }) => {
    const filePath = file.path ?? file.history?.[0];
    if (!filePath) {
      return;
    }
    const currentRoute = routeForFile(filePath);
    if (currentRoute === "/docs/glossary") {
      // The glossary page renders definitions from data directly, not prose.
      return;
    }

    const entries = buildAliasIndex(glossaryTerms, currentRoute);
    if (entries.length === 0) {
      return;
    }

    const alternation = entries.map((entry) => escapeRegExp(entry.alias)).join("|");
    // Hyphens and slashes count as part of a word, so "token" doesn't match inside
    // "token-efficient". A trailing full stop is fine, but ".txt" isn't a boundary.
    const pattern = new RegExp(
      `(?<![A-Za-z0-9_\\-/.])(${alternation})(?![A-Za-z0-9_\\-/]|\\.[A-Za-z0-9])`,
      "g",
    );
    const aliasToTerm = new Map(entries.map((entry) => [entry.alias, entry.term]));
    const used = new Set<string>();

    function processTextNode(node: HastNode): HastNode[] | null {
      const text = node.value ?? "";
      if (!text.trim()) {
        return null;
      }
      pattern.lastIndex = 0;
      const parts: HastNode[] = [];
      let cursor = 0;
      let changed = false;
      let match: RegExpExecArray | null = pattern.exec(text);
      while (match !== null) {
        const alias = match[1] ?? "";
        const term = aliasToTerm.get(alias);
        if (term && !used.has(term.id)) {
          used.add(term.id);
          changed = true;
          if (match.index > cursor) {
            parts.push({ type: "text", value: text.slice(cursor, match.index) });
          }
          parts.push({
            type: "mdxJsxTextElement",
            name: "Term",
            attributes: [{ type: "mdxJsxAttribute", name: "id", value: term.id }],
            children: [{ type: "text", value: alias }],
          });
          cursor = match.index + alias.length;
        }
        match = pattern.exec(text);
      }
      if (!changed) {
        return null;
      }
      if (cursor < text.length) {
        parts.push({ type: "text", value: text.slice(cursor) });
      }
      return parts;
    }

    function walk(node: HastNode) {
      const children = node.children;
      if (!children) {
        return;
      }
      const nextChildren: HastNode[] = [];
      for (const child of children) {
        if (child.type === "text") {
          const replacement = processTextNode(child);
          if (replacement) {
            nextChildren.push(...replacement);
            continue;
          }
          nextChildren.push(child);
          continue;
        }
        if (!shouldSkip(child)) {
          walk(child);
        }
        nextChildren.push(child);
      }
      node.children = nextChildren;
    }

    walk(tree);
  };
}
