import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { PageIntro } from "@/components/PageIntro";
import { GlossaryGrid } from "@/components/GlossaryGrid";
import { RecommendationList } from "@/components/RecommendationList";
import { SiteFooter } from "@/components/SiteFooter";
import { TextGrid } from "@/components/TextGrid";
import { glossaryTerms } from "@/data/glossary";
import { guideStages } from "@/data/homepage-guide";
import { guideSource, readingMinutes } from "@/lib/guide-source";

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

/** Spell out a small count, e.g. for "the eight areas". Falls back to the digit past ten. */
function numberWord(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

export const metadata: Metadata = {
  alternates: { canonical: "/", types: { "text/markdown": "/index.md" } },
  title: "Make your website and app work with AI agents",
  description:
    "A practical guide to agent-ready websites and apps. Explore discovery, understanding, connections, permissions, usability, reliability, payments, and measurement, with clear recommendations and detailed implementation docs.",
};

function AreaOverview() {
  return (
    <TextGrid
      numbered
      items={guideStages.map((stage) => ({
        eyebrow: stage.name,
        href: `#${stage.id}`,
        meta: (
          <>
            {stage.cards.length} recommendations
            <ArrowDown
              aria-hidden="true"
              className="size-3.5 transition-transform duration-150 group-hover:translate-y-0.5 motion-reduce:transition-none"
            />
          </>
        ),
        title: stage.question,
      }))}
    />
  );
}

export default async function HomePage() {
  const total = guideStages.reduce((count, stage) => count + stage.cards.length, 0);
  const readingTimes = new Map(
    await Promise.all(
      guideSource
        .getPages()
        .map(async (page) => [page.slugs[0], await readingMinutes(page)] as const),
    ),
  );

  return (
    <>
      <main id="main" className="bg-fd-background text-fd-foreground">
        <PageIntro
          className="pb-14 pt-16 sm:pt-20"
          eyebrow="A practical guide to agent-ready products"
          title="Make your website and app work with AI agents."
          actions={
            <>
              <a
                href="#guide-map"
                className="inline-flex items-center gap-2 rounded-md bg-fd-primary px-4 py-2.5 text-fd-primary-foreground focus-ring"
              >
                See the {numberWord(guideStages.length)} areas{" "}
                <ArrowDown aria-hidden="true" className="size-4" />
              </a>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 underline-offset-4 hover:underline focus-ring"
              >
                Technical documentation <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </>
          }
        >
          Help agents find your product, understand what it offers, and use it on a customer’s
          behalf. Here’s what to consider, why it matters, and where to start.
        </PageIntro>

        <section
          id="guide-map"
          aria-labelledby="map-heading"
          className="page-column scroll-mt-20 pb-20"
        >
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="map-heading" className="type-body">
              The {numberWord(guideStages.length)} things to get right
            </h2>
            <p className="type-small text-fd-muted-foreground">{total} recommendations</p>
          </div>
          <AreaOverview />
        </section>

        {guideStages.map((stage, index) => {
          const essay = guideSource.getPage([stage.id]);
          return (
            <section
              key={stage.id}
              id={stage.id}
              aria-labelledby={`${stage.id}-heading`}
              className="scroll-mt-12 border-t border-fd-border"
            >
              <div className="page-column grid gap-8 py-14 lg:grid-cols-12 lg:gap-10 lg:py-20">
                <header className="lg:sticky lg:top-20 lg:col-span-4 lg:self-start">
                  <p className="type-body text-fd-accent-foreground">
                    <span className="mr-3 tabular-nums text-fd-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {stage.name}
                  </p>
                  <h2 id={`${stage.id}-heading`} className="mt-3 max-w-md type-heading">
                    {stage.question}
                  </h2>
                  <p className="mt-4 max-w-md type-body text-fd-muted-foreground">
                    {stage.description}
                  </p>
                  {essay && (
                    <Link
                      href={essay.url}
                      className="group mt-8 block max-w-md border-t border-fd-border pt-4 focus-ring"
                    >
                      <span className="type-small text-fd-muted-foreground">Why it matters</span>
                      <span className="mt-1 block type-body text-fd-foreground transition-colors duration-150 group-hover:text-fd-accent-foreground motion-reduce:transition-none">
                        {essay.data.title}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1.5 type-small text-fd-muted-foreground transition-colors duration-150 group-hover:text-fd-foreground motion-reduce:transition-none">
                        {readingTimes.get(stage.id)} min read
                        <ArrowRight aria-hidden="true" className="size-3.5" />
                      </span>
                    </Link>
                  )}
                </header>
                <div className="min-w-0 lg:col-span-8">
                  <RecommendationList stage={stage} />
                </div>
              </div>
            </section>
          );
        })}

        <section
          id="glossary"
          aria-labelledby="glossary-heading"
          className="scroll-mt-20 border-t border-fd-border"
          style={{ overflowX: "clip" }}
        >
          <div className="page-column py-14">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h2 id="glossary-heading" className="type-heading">
                  The language of agents
                </h2>
                <p className="mt-2 type-body text-fd-muted-foreground">
                  Plain-language definitions of the terms in this guide. Choose a card to learn
                  more.
                </p>
              </div>
              <Link href="/glossary" className="type-body underline underline-offset-4 focus-ring">
                View all {glossaryTerms.length} terms
              </Link>
            </div>
            <GlossaryGrid terms={glossaryTerms} showFilters={false} />
          </div>
        </section>

        <section className="border-t border-fd-border" aria-labelledby="next-heading">
          <div className="page-column py-14">
            <div className="grid gap-10 md:grid-cols-2 md:gap-16">
              <div>
                <h2 id="next-heading" className="type-heading">
                  Put the guide to work
                </h2>
                <p className="mt-3 type-body text-fd-muted-foreground">
                  Choose a task a customer wants to complete and follow it from discovery to the
                  final result. Use the docs for implementation detail, examples, and the tradeoffs
                  behind each recommendation.
                </p>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 type-body">
                  <Link
                    href="/docs/scoring/product-journeys"
                    className="underline underline-offset-4 focus-ring"
                  >
                    Evaluate a customer task
                  </Link>
                  <Link href="/docs" className="underline underline-offset-4 focus-ring">
                    Browse the docs
                  </Link>
                  <Link href="/glossary" className="underline underline-offset-4 focus-ring">
                    Explore the glossary
                  </Link>
                </div>
                <p className="mt-5 type-small text-fd-muted-foreground">
                  This guide covers making your product work for agents. Building your own agents
                  instead?{" "}
                  <Link href="/docs/agents" className="underline underline-offset-4 focus-ring">
                    See the agent-building guide
                  </Link>
                  .
                </p>
              </div>
              <div id="skill" className="min-w-0 scroll-mt-20">
                <h3 className="type-body">Work through it with your coding agent</h3>
                <p className="mt-3 type-body text-fd-muted-foreground">
                  Install the Surface skill to apply this guidance to your codebase: explain a
                  topic, assess what exists, or turn the findings into an implementation plan.
                </p>
                <pre className="mt-5 overflow-x-auto rounded-lg border border-fd-border bg-fd-muted/40 p-4 type-small font-mono">
                  <code>npx skills add https://github.com/howells/agentsurface</code>
                </pre>
                <p className="mt-3 type-small text-fd-muted-foreground">
                  For Codex, Claude Code, Cursor, and other agents that support skills.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
