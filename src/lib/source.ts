import { docs } from "@/.source/server";
import { glossaryMarkdown } from "@/lib/glossary-markdown";
import { llms, loader } from "fumadocs-core/source";

const SITE_ORIGIN = "https://agentsurface.dev";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

type SourcePage = ReturnType<typeof source.getPages>[number];

/** YAML-ish scalar, quoted only when it needs to be. */
function yamlString(value: string): string {
  return JSON.stringify(value);
}

/** Frontmatter block (title, description, canonical url, freshness) + the processed Markdown body. */
async function renderPage(page: SourcePage): Promise<string> {
  const { data } = page;
  const lines = [
    `title: ${yamlString(data.title)}`,
    `description: ${yamlString(data.description ?? "")}`,
    `url: ${yamlString(`${SITE_ORIGIN}${page.url}`)}`,
    `index: ${SITE_ORIGIN}/llms.txt`,
  ];
  if (data.lastVerified) {
    lines.push(`lastVerified: ${data.lastVerified}`);
  }
  if (data.lastModified) {
    lines.push(`lastModified: ${new Date(data.lastModified).toISOString()}`);
  }

  // The glossary page renders its body from src/data/glossary.ts, not prose
  // MDX, so its agent Markdown comes from the same data via glossaryMarkdown()
  // rather than the processed-MDX snapshot (which would just show a blank
  // `<Glossary />` element).
  const body = page.url === "/docs/glossary" ? glossaryMarkdown() : await data.getText("processed");

  return `---\n${lines.join("\n")}\n---\n\n${portableMarkdown(body, `${SITE_ORIGIN}${page.url}`)}`;
}

const CALLOUT_LABELS: Record<string, string> = { info: "Note", warn: "Warning" };

/**
 * `<Callout>` survives into the processed MDX as raw JSX. CommonMark reads that as an
 * HTML block, so Markdown inside it (links, emphasis, code) is never parsed. Rewrite
 * each callout as a labelled blockquote, which every Markdown reader understands.
 */
function calloutsAsBlockquotes(body: string): string {
  const output: string[] = [];
  let fenced = false;
  let callout: { label: string; lines: string[]; raw: string } | null = null;
  for (const line of body.split("\n")) {
    if (!callout && /^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
    }
    const open = fenced ? null : /^\s*<Callout(?:\s+type="(\w+)")?\s*>\s*$/.exec(line);
    if (!callout && open) {
      callout = { label: CALLOUT_LABELS[open[1] ?? "info"] ?? "Note", lines: [], raw: line };
    } else if (callout && /^\s*<\/Callout>\s*$/.test(line)) {
      const indent = Math.min(
        ...callout.lines
          .filter((text) => text.trim())
          .map((text) => /^\s*/.exec(text)?.[0].length ?? 0),
      );
      output.push(`> **${callout.label}:**`, ">");
      for (const text of callout.lines) {
        output.push(text.trim() ? `> ${text.slice(Number.isFinite(indent) ? indent : 0)}` : ">");
      }
      callout = null;
    } else if (callout) {
      callout.lines.push(line);
    } else {
      output.push(line);
    }
  }
  if (callout) {
    // Unclosed: keep the original text rather than drop it.
    output.push(callout.raw, ...callout.lines);
  }
  return output.join("\n");
}

/**
 * Make processed MDX portable: callouts become blockquotes, and prose links resolve
 * against the page URL, without changing examples in fenced code blocks or inline code.
 */
export function portableMarkdown(body: string, canonical: string): string {
  let fenced = false;
  return calloutsAsBlockquotes(body)
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced;
        return line;
      }
      if (fenced) {
        return line;
      }
      return line
        .split(/(`+[^`]*`+)/)
        .map((part, index) =>
          index % 2
            ? part
            : part
                .replace(
                  /(\]\()([^\s)]+)(\))/g,
                  (_match, before: string, target: string, after: string) =>
                    `${before}${new URL(target, canonical).href}${after}`,
                )
                .replace(
                  /^(\s*\[[^\]]+\]:\s*)([^\s]+)/,
                  (_match, before: string, target: string) =>
                    `${before}${new URL(target, canonical).href}`,
                ),
        )
        .join("");
    })
    .join("\n");
}

/** Fumadocs' Markdown-for-LLMs renderer: backs `llms.txt`, `llms-full.txt`, and per-page `.md` routes. */
export const docsLlms = llms(source, { renderPage });
