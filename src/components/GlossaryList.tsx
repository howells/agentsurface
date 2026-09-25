import { glossaryTerms } from "@/data/glossary";
import type { GlossaryTerm } from "@/data/glossary";
import Link from "next/link";

function letterOf(term: GlossaryTerm): string {
  const first = term.name[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(first) ? first : "#";
}

/** The docs glossary: A to Z jump links, then one ruled row per term, anchored by its id. */
export function GlossaryList() {
  const sorted = glossaryTerms.toSorted((a, b) => a.name.localeCompare(b.name));
  const groups = new Map<string, GlossaryTerm[]>();
  for (const term of sorted) {
    const letter = letterOf(term);
    groups.set(letter, [...(groups.get(letter) ?? []), term]);
  }

  return (
    <div className="not-prose mt-8">
      <nav aria-label="Glossary letters" className="flex flex-wrap gap-x-1 gap-y-1">
        {[...groups.keys()].map((letter) => (
          <a
            key={letter}
            href={`#letter-${letter}`}
            className="grid size-8 place-items-center rounded-md type-small tabular-nums text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground focus-ring"
          >
            {letter}
          </a>
        ))}
      </nav>

      {[...groups.entries()].map(([letter, terms]) => (
        <section key={letter} aria-labelledby={`letter-${letter}`} className="mt-10">
          <h2
            id={`letter-${letter}`}
            className="scroll-mt-24 pb-3 type-small tabular-nums text-fd-muted-foreground"
          >
            {letter}
          </h2>
          {terms.map((term) => (
            <div
              key={term.id}
              id={term.id}
              className="grid scroll-mt-24 gap-2 border-t border-fd-border py-5 sm:grid-cols-[12rem_1fr] sm:gap-8"
            >
              <div>
                <h3 className="type-body text-fd-foreground">{term.name}</h3>
                {term.acronym !== term.name && (
                  <p className="type-small text-fd-muted-foreground">{term.acronym}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <p className="type-body text-fd-foreground">{term.definition}</p>
                <p className="type-body text-fd-muted-foreground">{term.detail}</p>
                {term.href && (
                  <Link
                    href={term.href}
                    aria-label={`Read the guide on ${term.name}`}
                    className="w-fit type-small text-fd-foreground underline underline-offset-4 focus-ring"
                  >
                    Read the guide
                  </Link>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
