import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Compass,
  FileText,
  MousePointer2,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { GlossaryGrid } from "@/components/GlossaryGrid";
import { glossaryTerms } from "@/data/glossary";
import type { GuideCard } from "@/data/homepage-guide";
import { guideStages } from "@/data/homepage-guide";

export const metadata: Metadata = {
  title: "Make your website and app work with AI agents",
  description:
    "A practical guide to agent-ready websites and apps. Explore discovery, understanding, identity, usability, and payments, with clear recommendations and detailed implementation docs.",
};

const stageIcons = [Compass, FileText, ShieldCheck, MousePointer2, CreditCard];
const focusStyle =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fd-ring";

function RecommendationCard({ card }: { card: GuideCard }) {
  return (
    <li id={card.id} className="scroll-mt-20">
      <Link
        href={card.href}
        className={`group flex h-full flex-col rounded-xl border border-fd-border bg-fd-card p-6 transition-colors hover:border-fd-ring ${focusStyle}`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-fd-accent-foreground">{card.feature}</p>
          <ArrowRight
            aria-hidden="true"
            className="size-4 shrink-0 text-fd-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </div>
        <h3 className="mt-3 text-lg font-medium leading-snug tracking-tight">{card.title}</h3>
        <p className="mt-3 text-sm leading-6 text-fd-muted-foreground">{card.what}</p>
        <p className="mt-3 text-sm leading-6">
          <span className="font-medium">Why it matters. </span>
          <span className="text-fd-muted-foreground">{card.why}</span>
        </p>
        <div className="mt-auto pt-6">
          <p className="border-t border-fd-border pt-3 text-xs leading-5 text-fd-muted-foreground">
            {card.applies}
          </p>
        </div>
      </Link>
    </li>
  );
}

export default function HomePage() {
  const total = guideStages.reduce((count, stage) => count + stage.cards.length, 0);

  return (
    <main id="main" className="bg-fd-background text-fd-foreground">
      <section className="mx-auto max-w-5xl px-6 pb-12 pt-16 sm:px-10 sm:pt-20">
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
            Explore the guide <ArrowDown aria-hidden="true" className="size-4" />
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
        className="mx-auto max-w-5xl scroll-mt-20 px-6 pb-16 sm:px-10"
      >
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-t border-fd-border pt-8">
          <h2 id="map-heading" className="text-base font-medium">
            Five parts of an agent-ready product
          </h2>
          <p className="text-sm text-fd-muted-foreground">{total} recommendations</p>
        </div>
        <nav aria-label="Explore the five areas" className="grid gap-3">
          {guideStages.map((stage, index) => {
            const Icon = stageIcons[index];
            return (
              <div
                key={stage.id}
                className="relative grid gap-5 rounded-xl border border-fd-border bg-fd-muted/40 p-5 md:grid-cols-[13rem_1fr] md:gap-8"
              >
                <div>
                  <div className="mb-3 flex items-center gap-2 text-fd-accent-foreground">
                    <Icon aria-hidden="true" className="size-4" strokeWidth={1.5} />
                    <span className="text-xs tabular-nums">0{index + 1}</span>
                  </div>
                  <a href={`#${stage.id}`} className={`inline-block rounded-sm ${focusStyle}`}>
                    <h3 className="text-lg font-medium tracking-tight">{stage.name}</h3>
                    <p className="mt-1 text-sm text-fd-muted-foreground">{stage.question}</p>
                  </a>
                </div>
                <ul
                  className="flex flex-wrap content-start gap-1.5"
                  aria-label={`${stage.name} features`}
                >
                  {stage.cards.map((card) => (
                    <li key={card.id}>
                      <a
                        href={`#${card.id}`}
                        className={`block rounded-md border border-fd-border bg-fd-background px-2 py-1 text-xs leading-5 text-fd-muted-foreground transition-colors hover:border-fd-ring hover:text-fd-foreground ${focusStyle}`}
                      >
                        {card.feature}
                      </a>
                    </li>
                  ))}
                </ul>
                {index < guideStages.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-3.5 left-7 z-10 rounded-full border border-fd-border bg-fd-background p-1"
                  >
                    <ArrowDown className="size-3" />
                  </span>
                )}
              </div>
            );
          })}
        </nav>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-fd-muted-foreground">
          Start with the foundations at the top of each section, then follow the recommendations
          that fit your product. Labels explain when a feature applies. Every card links to the
          relevant implementation guidance.
        </p>
      </section>

      <section
        id="glossary"
        aria-labelledby="glossary-heading"
        className="scroll-mt-20 border-t border-fd-border"
        style={{ overflowX: "clip" }}
      >
        <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
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

      {guideStages.map((stage, index) => {
        const Icon = stageIcons[index];
        return (
          <section
            key={stage.id}
            id={stage.id}
            aria-labelledby={`${stage.id}-heading`}
            className="scroll-mt-12 border-t border-fd-border"
          >
            <div className="mx-auto max-w-5xl px-6 py-14 sm:px-10 sm:py-16">
              <div className="mb-8 grid gap-4 md:grid-cols-[1fr_1.15fr] md:gap-12">
                <div>
                  <div className="mb-3 flex items-center gap-2.5 text-sm font-medium text-fd-accent-foreground">
                    <Icon aria-hidden="true" className="size-4" />
                    <span>
                      0{index + 1} / {stage.name}
                    </span>
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
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stage.cards.map((card) => (
                  <RecommendationCard key={card.id} card={card} />
                ))}
              </ul>
              <a
                href="#guide-map"
                className={`mt-6 inline-block rounded-sm text-sm text-fd-muted-foreground underline-offset-4 hover:text-fd-foreground hover:underline ${focusStyle}`}
              >
                Back to the overview ↑
              </a>
            </div>
          </section>
        );
      })}

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
            </a>{" "}
            and{" "}
            <a href="https://ora.ai/methodology" className="underline underline-offset-4">
              Ora
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
