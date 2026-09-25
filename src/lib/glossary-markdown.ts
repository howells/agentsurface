import { glossaryTerms } from "@/data/glossary";

/** Markdown body for /docs/glossary.md and llms-full.txt: the same data the docs page and cards render, so nothing drifts. */
export function glossaryMarkdown(): string {
  const sorted = glossaryTerms.toSorted((a, b) => a.name.localeCompare(b.name));

  const entries = sorted.map((term) => {
    const lines = [`## ${term.name} (${term.acronym})`, "", term.definition, "", term.detail];
    if (term.href) {
      lines.push("", `Read more: https://agentsurface.dev${term.href}`);
    }
    return lines.join("\n");
  });

  return entries.join("\n\n");
}
