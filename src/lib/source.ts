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

  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}

/** Fumadocs' Markdown-for-LLMs renderer: backs `llms.txt`, `llms-full.txt`, and per-page `.md` routes. */
export const docsLlms = llms(source, { renderPage });
