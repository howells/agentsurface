import { glossaryTerms } from "@/data/glossary";

/** Slim per-term data for the client-side Term popover: no `detail`, `aliases`, or `category`. */
export interface GlossaryTermSummary {
  name: string;
  definition: string;
  href?: string;
}

export const glossaryTermIndex: Record<string, GlossaryTermSummary> = Object.fromEntries(
  glossaryTerms.map((term) => [
    term.id,
    { name: term.name, definition: term.definition, href: term.href },
  ]),
);
