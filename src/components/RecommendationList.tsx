"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { GuideCard, GuideStage } from "@/data/homepage-guide";
import { cn } from "@/lib/utils";

const START_HERE = "Start here";

const SPRING = { damping: 36, stiffness: 400, type: "spring" as const };

/** "Emerging · for browser agents" leads with the status word in the accent colour. */
function Condition({ text }: { text: string }) {
  const [status, rest] = text.split(" · ");
  if (!rest) {
    return text;
  }
  return (
    <>
      <span className="text-fd-accent-foreground">{status}</span> {rest}
    </>
  );
}

function Row({
  card,
  heading: Heading,
  onToggle,
  open,
  showCondition,
}: {
  card: GuideCard;
  heading: "h3" | "h4";
  onToggle: () => void;
  open: boolean;
  showCondition: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const panelId = `${card.id}-details`;

  return (
    <li
      id={card.id}
      className={cn(
        "scroll-mt-32",
        open && "shadow-[inset_2px_0_0_var(--color-fd-accent-foreground)]",
      )}
    >
      <Heading>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            "grid min-h-14 w-full grid-cols-[minmax(0,1fr)_1rem] items-center gap-x-6 px-5 py-3 text-left transition-colors duration-150 hover:bg-fd-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fd-ring lg:min-h-12",
            showCondition && "lg:grid-cols-[minmax(0,1fr)_15rem_1rem]",
            open && "bg-fd-muted/60",
          )}
        >
          <span className="min-w-0">
            <span className="type-body text-fd-foreground">{card.title}</span>
            <span className="ml-2.5 type-body text-fd-muted-foreground max-lg:hidden">
              {card.feature}
            </span>
            <span className="mt-0.5 block type-small text-fd-muted-foreground lg:hidden">
              {card.feature}
              {showCondition && (
                <>
                  {" · "}
                  <Condition text={card.applies} />
                </>
              )}
            </span>
          </span>
          {showCondition && (
            <span className="type-body text-fd-muted-foreground max-lg:hidden">
              <Condition text={card.applies} />
            </span>
          )}
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "size-4 text-fd-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-90 text-fd-accent-foreground",
            )}
          />
        </button>
      </Heading>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="details"
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduceMotion
                ? { height: { duration: 0 }, opacity: { duration: 0.1 } }
                : { height: SPRING, opacity: { duration: 0.16 } }
            }
            className="overflow-hidden bg-fd-muted/60"
          >
            <div className="grid gap-5 px-5 pb-6 pt-1 md:grid-cols-2 md:gap-x-10">
              <div>
                <p className="type-small text-fd-foreground">What to do</p>
                <p className="mt-1.5 type-body text-fd-muted-foreground">{card.what}</p>
              </div>
              <div>
                <p className="type-small text-fd-foreground">Why it matters</p>
                <p className="mt-1.5 type-body text-fd-muted-foreground">{card.why}</p>
              </div>
              <Link
                href={card.href}
                className="inline-flex w-fit items-center gap-1.5 rounded-sm type-body text-fd-foreground underline decoration-fd-ring/50 underline-offset-4 hover:decoration-fd-ring focus-ring md:col-span-2"
              >
                Read the guide<span className="sr-only">: {card.feature}</span>
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function RecommendationList({ stage }: { stage: GuideStage }) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  // A link to #card-id opens that recommendation.
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (stage.cards.some((card) => card.id === id)) {
        setOpenIds((previous) => new Set(previous).add(id));
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
    };
  }, [stage.cards]);

  const toggle = (id: string) => {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const groups = [
    {
      cards: stage.cards.filter((card) => card.applies === START_HERE),
      key: "start",
      label: "Start here",
      showCondition: false,
    },
    {
      cards: stage.cards.filter((card) => card.applies !== START_HERE),
      key: "depends",
      label: "Depending on your product",
      showCondition: true,
    },
  ].filter((group) => group.cards.length > 0);
  const labelled = groups.length > 1;

  return (
    <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card">
      {groups.map((group, index) => {
        const headingId = `${stage.id}-${group.key}`;
        return (
          <div key={group.key} className={cn(index > 0 && "border-t border-fd-border")}>
            {labelled && (
              <h3
                id={headingId}
                className="flex items-center gap-2 border-b border-fd-border bg-fd-muted/40 px-5 py-2.5 type-small text-fd-muted-foreground"
              >
                {group.key === "start" && (
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-fd-accent-foreground"
                  />
                )}
                {group.label}
                <span className="tabular-nums opacity-70">{group.cards.length}</span>
              </h3>
            )}
            <ul className="divide-y divide-fd-border">
              {group.cards.map((card) => (
                <Row
                  key={card.id}
                  card={card}
                  heading={labelled ? "h4" : "h3"}
                  open={openIds.has(card.id)}
                  onToggle={() => {
                    toggle(card.id);
                  }}
                  showCondition={group.showCondition}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
