import { glossaryTerms } from "@/data/glossary";
import { GlossaryGrid } from "@/components/GlossaryGrid";
import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";

export const metadata = {
  description: `Plain-language definitions of ${glossaryTerms.length} terms covering AI agents, APIs, discovery, identity, reliability, and payments.`,
  title: "Agentic Glossary",
};

export default function GlossaryPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col items-center bg-fd-background text-fd-foreground">
        {/* Hero */}
        <section className="w-full max-w-5xl px-6 pt-14 pb-12 sm:px-10">
          <p className="text-sm font-medium text-fd-accent-foreground">Agentic glossary</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            The language of
            <br />
            intelligent software.
          </h1>
          <p className="mt-6 max-w-xl text-[0.9375rem] leading-7 text-fd-muted-foreground">
            {glossaryTerms.length} terms for product, business, and engineering teams. Filter by
            category or scroll through all. Click any card to go deeper.
          </p>
        </section>

        {/* Terms */}
        <section className="w-full border-t border-fd-border">
          <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
            <GlossaryGrid terms={glossaryTerms} layout="grid" showFilters />
          </div>
        </section>

        {/* Footer note */}
        <section className="w-full border-t border-fd-border">
          <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
            <p className="text-sm leading-7 text-fd-muted-foreground max-w-lg">
              Definitions are written for product and business audiences. For technical depth, see
              the{" "}
              <Link
                href="/docs"
                className="text-fd-foreground underline underline-offset-4 hover:no-underline"
              >
                full documentation
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
