import { glossaryByCategory } from "@/data/glossary";

/** Markdown body for /docs/glossary.md and llms-full.txt: the same data the docs page and cards render, so nothing drifts. */
export function glossaryMarkdown(): string {
  return glossaryByCategory()
    .map((category) => {
      const entries = category.terms.map((term) => {
        const title = term.acronym === term.name ? term.name : `${term.name} (${term.acronym})`;
        const lines = [`### ${title}`, "", term.definition, "", term.detail];
        if (term.href) {
          lines.push("", `Read more: https://agentsurface.dev${term.href}`);
        }
        return lines.join("\n");
      });
      return [`## ${category.name}`, "", category.description, "", ...entries].join("\n\n");
    })
    .join("\n\n");
}
