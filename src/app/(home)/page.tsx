import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen } from "lucide-react";
import authIdentityArt from "@/assets/areas/auth-identity.png";
import connectionsArt from "@/assets/areas/connections.png";
import discoverabilityArt from "@/assets/areas/discoverability.png";
import paymentsArt from "@/assets/areas/payments.png";
import understandabilityArt from "@/assets/areas/understandability.png";
import usabilityArt from "@/assets/areas/usability.png";
import { AreaMark } from "@/components/AreaMark";
import { AreaNav } from "@/components/AreaNav";
import { GlossaryGrid } from "@/components/GlossaryGrid";
import { RecommendationList } from "@/components/RecommendationList";
import { glossaryTerms } from "@/data/glossary";
import { guideStages } from "@/data/homepage-guide";
import { cn } from "@/lib/utils";

// One motif series of engraved line-pattern crops on white. Each runs off the top and sides of
// its square and fades to white across the bottom third, so the card heading can rise into it.
const ILLUSTRATIONS: Record<string, StaticImageData> = {
  "auth-identity": authIdentityArt,
  connections: connectionsArt,
  discoverability: discoverabilityArt,
  payments: paymentsArt,
  understandability: understandabilityArt,
  usability: usabilityArt,
};

export const metadata: Metadata = {
  title: "Make your website and app work with AI agents",
  description:
    "A practical guide to agent-ready websites and apps. Explore discovery, understanding, connections, sign-in, usability, and payments, with clear recommendations and detailed implementation docs.",
};

const focusStyle =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fd-ring";

function AreaOverview() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {guideStages.map((stage) => {
        const foundations = stage.cards.filter((card) => card.applies === "Start here");
        const highlights = foundations.length > 0 ? foundations : stage.cards;
        const illustration = ILLUSTRATIONS[stage.id];
        return (
          <li key={stage.id}>
            <a
              href={`#${stage.id}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-fd-border bg-fd-card shadow-sm transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fd-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className="relative block aspect-square w-full">
                {illustration ? (
                  <Image
                    src={illustration}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw"
                    className="origin-top object-cover mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none dark:opacity-85 dark:mix-blend-screen dark:invert"
                  />
                ) : (
                  <span className="grid h-2/3 place-items-center">
                    <AreaMark area={stage.id} />
                  </span>
                )}
              </span>
              {/* Percentage margins resolve against width, so this rises 30% into the square. */}
              <span className="relative -mt-[30%] flex flex-1 flex-col px-5 pb-5">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-medium leading-6">{stage.name}</span>
                  <span className="flex items-center gap-1.5 text-sm tabular-nums text-fd-muted-foreground">
                    {stage.cards.length}
                    <span className="sr-only"> recommendations</span>
                    <ArrowDown
                      aria-hidden="true"
                      className="size-3.5 transition-transform duration-150 group-hover:translate-y-0.5 motion-reduce:transition-none"
                    />
                  </span>
                </span>
                <span className="mt-1 text-sm leading-5 text-fd-muted-foreground">
                  {stage.question}
                </span>
                <span className="mt-auto pt-5 text-[0.8125rem] leading-5">
                  <span className="block font-medium text-fd-foreground">
                    {foundations.length > 0 ? "Start with" : "Choose from"}
                  </span>
                  <span className="text-fd-muted-foreground">
                    {highlights.map((card) => card.feature).join(" · ")}
                  </span>
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export default function HomePage() {
  const total = guideStages.reduce((count, stage) => count + stage.cards.length, 0);
  const areas = guideStages.map((stage) => ({
    count: stage.cards.length,
    id: stage.id,
    name: stage.name,
  }));

  return (
    <main id="main" className="bg-fd-background text-fd-foreground">
      <section className="mx-auto max-w-5xl px-6 pb-14 pt-16 sm:px-10 sm:pt-20">
        <p className="mb-5 text-sm font-medium text-fd-accent-foreground">
          A practical guide to agent-ready products
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
          Make your website and app work with AI agents.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-fd-muted-foreground">
          Help agents find your product, understand what it offers, and use it on a customer’s
          behalf. Here’s what to consider, why it matters, and where to start.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 text-sm">
          <a
            href="#guide-map"
            className={`inline-flex items-center gap-2 rounded-md bg-fd-primary px-4 py-2.5 font-medium text-fd-primary-foreground ${focusStyle}`}
          >
            See the six areas <ArrowDown aria-hidden="true" className="size-4" />
          </a>
          <Link
            href="/docs"
            className={`inline-flex items-center gap-2 underline-offset-4 hover:underline ${focusStyle}`}
          >
            Technical documentation <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>

      <section
        id="guide-map"
        aria-labelledby="map-heading"
        className="mx-auto max-w-5xl scroll-mt-20 px-6 pb-20 sm:px-10"
      >
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="map-heading" className="text-base font-medium">
            The six things to get right
          </h2>
          <p className="text-sm text-fd-muted-foreground">{total} recommendations</p>
        </div>
        <AreaOverview />
      </section>

      <div>
        <AreaNav areas={areas} />
        {guideStages.map((stage) => (
          <section
            key={stage.id}
            id={stage.id}
            aria-labelledby={`${stage.id}-heading`}
            className="scroll-mt-24"
          >
            <div className="mx-auto max-w-5xl px-6 pb-4 pt-14 sm:px-10 sm:pt-16">
              <div className="mb-7 grid gap-4 md:grid-cols-[1fr_1.15fr] md:gap-12">
                <div>
                  <div className="mb-4 flex items-center gap-2.5 text-sm font-medium text-fd-accent-foreground">
                    <AreaMark area={stage.id} size="sm" />
                    {stage.name}
                  </div>
                  <h2
                    id={`${stage.id}-heading`}
                    className="text-3xl font-semibold leading-tight tracking-tight"
                  >
                    {stage.question}
                  </h2>
                </div>
                <p className="self-end text-base leading-7 text-fd-muted-foreground">
                  {stage.description}
                </p>
              </div>
              <RecommendationList stage={stage} />
            </div>
          </section>
        ))}
        <div className="h-16" aria-hidden="true" />
      </div>

      <section
        id="glossary"
        aria-labelledby="glossary-heading"
        className="scroll-mt-20 border-t border-fd-border"
        style={{ overflowX: "clip" }}
      >
        <div className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 id="glossary-heading" className="text-2xl font-semibold tracking-tight">
                The language of agents
              </h2>
              <p className="mt-2 text-sm leading-6 text-fd-muted-foreground">
                Plain-language definitions of the terms in this guide. Choose a card to learn more.
              </p>
            </div>
            <Link
              href="/glossary"
              className={`text-sm font-medium underline underline-offset-4 ${focusStyle}`}
            >
              View all {glossaryTerms.length} terms
            </Link>
          </div>
          <GlossaryGrid terms={glossaryTerms} showFilters={false} />
        </div>
      </section>

      <section className="border-t border-fd-border" aria-labelledby="next-heading">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
          <div className="grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <BookOpen aria-hidden="true" className="mb-4 size-5 text-fd-accent-foreground" />
              <h2 id="next-heading" className="text-2xl font-semibold tracking-tight">
                Put the guide to work
              </h2>
              <p className="mt-3 text-sm leading-6 text-fd-muted-foreground">
                Choose a task a customer wants to complete and follow it from discovery to the final
                result. Use the docs for implementation detail, examples, and the tradeoffs behind
                each recommendation.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium">
                <Link
                  href="/docs/scoring/product-journeys"
                  className={`underline underline-offset-4 ${focusStyle}`}
                >
                  Evaluate a customer task
                </Link>
                <Link href="/docs" className={`underline underline-offset-4 ${focusStyle}`}>
                  Browse the docs
                </Link>
                <Link href="/glossary" className={`underline underline-offset-4 ${focusStyle}`}>
                  Explore the glossary
                </Link>
              </div>
            </div>
            <div id="skill" className="min-w-0 scroll-mt-20">
              <h3 className="text-lg font-medium tracking-tight">
                Work through it with your coding agent
              </h3>
              <p className="mt-3 text-sm leading-6 text-fd-muted-foreground">
                Install the Surface skill to apply this guidance to your codebase: explain a topic,
                assess what exists, or turn the findings into an implementation plan.
              </p>
              <pre className="mt-5 overflow-x-auto rounded-lg border border-fd-border bg-fd-muted/40 p-4 text-xs leading-6">
                <code>npx skills add https://github.com/howells/agentsurface</code>
              </pre>
              <p className="mt-3 text-xs leading-5 text-fd-muted-foreground">
                For Codex, Claude Code, Cursor, and other agents that support skills.
              </p>
            </div>
          </div>
          <p className="mt-12 border-t border-fd-border pt-6 text-xs leading-6 text-fd-muted-foreground">
            This guide brings together Agent Surface’s implementation guidance and practical lessons
            from{" "}
            <a href="https://is-agentic.com/methodology" className="underline underline-offset-4">
              Is Agentic
            </a>
            ,{" "}
            <a href="https://ora.ai/methodology" className="underline underline-offset-4">
              Ora
            </a>
            , and{" "}
            <a href="https://isitagentready.com/" className="underline underline-offset-4">
              Cloudflare Agent Readiness
            </a>
            . Priorities reflect the task and product; the{" "}
            <Link
              href="/docs/tooling-catalog/evaluation-and-observability"
              className="underline underline-offset-4"
            >
              reference docs
            </Link>{" "}
            explain how external assessments fit into an evaluation.
          </p>
        </div>
      </section>

      <footer className="border-t border-fd-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-8 text-xs text-fd-muted-foreground sm:px-10">
          <span>
            Agent Surface by{" "}
            <a href="https://danielhowells.com" className="hover:text-fd-foreground">
              Daniel Howells
            </a>
          </span>
          <a href="https://github.com/howells/agentsurface" className="hover:text-fd-foreground">
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
