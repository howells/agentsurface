import { glossaryByCategory } from "@/data/glossary";
import Link from "next/link";

/** The docs glossary: one section per category (in the page's table of contents), a ruled row per term, anchored by its id. */
export function GlossaryList() {
  return (
    <div className="not-prose mt-8">
      {glossaryByCategory().map((category) => (
        <section key={category.id} aria-labelledby={category.id} className="mt-12 first:mt-0">
          <h2 id={category.id} className="scroll-mt-24 type-heading text-fd-foreground">
            {category.name}
          </h2>
          <p className="mt-2 mb-5 type-body text-fd-muted-foreground">
            {category.description}{" "}
            <span className="tabular-nums">{category.terms.length} terms.</span>
          </p>
          {category.terms.map((term) => (
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
