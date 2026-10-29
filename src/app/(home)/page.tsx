import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { PageIntro } from "@/components/PageIntro";
import { GlossaryGrid } from "@/components/GlossaryGrid";
import { RecommendationList } from "@/components/RecommendationList";
import { SiteFooter } from "@/components/SiteFooter";
import { TextGrid } from "@/components/TextGrid";
import { glossaryTerms } from "@/data/glossary";
import { homepageCopy, numberWord } from "@/data/homepage-copy";
import { guideStages } from "@/data/homepage-guide";
import { guideSource, readingMinutes } from "@/lib/guide-source";

export const metadata: Metadata = {
  alternates: { canonical: "/", types: { "text/markdown": "/index.md" } },
  title: "Make your website and app work with AI agents",
  description: homepageCopy.description,
};

function AreaOverview() {
  // A jump list to the sections below, so it is navigation, not content.
  return (
    <nav aria-label="Areas">
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
    </nav>
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
          eyebrow={homepageCopy.eyebrow}
          title={homepageCopy.title}
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
          {homepageCopy.intro}
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
                  {homepageCopy.glossary.heading}
                </h2>
                <p className="mt-2 type-body text-fd-muted-foreground">
                  {homepageCopy.glossary.intro}{" "}
                  <span data-markdown-ignore>Choose a card to learn more.</span>
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
                  {homepageCopy.next.heading}
                </h2>
                <p className="mt-3 type-body text-fd-muted-foreground">{homepageCopy.next.body}</p>
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-3 type-body">
                  {homepageCopy.next.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="underline underline-offset-4 focus-ring">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 type-small text-fd-muted-foreground">
                  {homepageCopy.next.builders.before}
                  <Link
                    href={homepageCopy.next.builders.href}
                    className="underline underline-offset-4 focus-ring"
                  >
                    {homepageCopy.next.builders.link}
                  </Link>
                  {homepageCopy.next.builders.after}
                </p>
              </div>
              <div id="skill" className="min-w-0 scroll-mt-20">
                <h3 className="type-body">{homepageCopy.skill.heading}</h3>
                <p className="mt-3 type-body text-fd-muted-foreground">{homepageCopy.skill.body}</p>
                <pre className="mt-5 overflow-x-auto rounded-lg border border-fd-border bg-fd-muted/40 p-4 type-small font-mono">
                  <code>{homepageCopy.skill.command}</code>
                </pre>
                <p className="mt-3 type-small text-fd-muted-foreground">
                  {homepageCopy.skill.note}
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
