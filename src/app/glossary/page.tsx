import { glossaryCategories, glossaryTerms } from "@/data/glossary";
import { GlossaryGrid } from "@/components/GlossaryGrid";
import { PageIntro } from "@/components/PageIntro";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";

export const metadata = {
  alternates: { canonical: "/glossary" },
  description: `Plain-language definitions of ${glossaryTerms.length} terms covering AI agents, APIs, discovery, identity, reliability, and payments.`,
  title: "Agentic Glossary",
};

export default function GlossaryPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col items-center bg-fd-background text-fd-foreground">
        <PageIntro
          className="pt-14 pb-12"
          eyebrow="Agentic glossary"
          title={
            <>
              The language of
              <br />
              intelligent software.
            </>
          }
        >
          {glossaryTerms.length} terms for product, business and engineering teams, in{" "}
          {glossaryCategories.length} categories. Pick a card for its full definition.
        </PageIntro>

        {/* Terms */}
        <section className="w-full border-t border-fd-border">
          <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
            <GlossaryGrid terms={glossaryTerms} layout="grid" showFilters />
          </div>
        </section>

        {/* Footer note */}
        <section className="w-full border-t border-fd-border">
          <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
            <p className="type-body text-fd-muted-foreground max-w-lg">
              The same definitions, grouped by category with links to the guide for each term, are
              in the{" "}
              <Link
                href="/docs/glossary"
                className="text-fd-foreground underline underline-offset-4 hover:no-underline"
              >
                docs glossary
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
