"use client";

import { glossaryTermIndex } from "@/data/glossary-index";
import { Popover, PopoverContent, PopoverTrigger } from "fumadocs-ui/components/ui/popover";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

/** Auto-inserted by the rehype glossary plugin (source.config.ts) around the first prose occurrence of a term's alias; can also be hand-written in MDX. */
export function Term({ id, children }: { id: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const entry = glossaryTermIndex[id];

  if (!entry) {
    return <>{children}</>;
  }

  // The term and its arrow stay on one line so the arrow never wraps on its own.
  return (
    <span className="whitespace-nowrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-describedby={popoverId}
            className="inline cursor-help rounded-sm border-0 bg-transparent p-0 font-inherit text-inherit underline decoration-dotted decoration-fd-muted-foreground/60 underline-offset-4 focus-ring"
            onMouseEnter={() => {
              setOpen(true);
            }}
            onMouseLeave={() => {
              setOpen(false);
            }}
            onFocus={() => {
              setOpen(true);
            }}
            onBlur={() => {
              setOpen(false);
            }}
            onClick={() => {
              setOpen((value) => !value);
            }}
          >
            {children}
          </button>
        </PopoverTrigger>
        <PopoverContent
          id={popoverId}
          role="tooltip"
          align="start"
          className="w-72 text-left"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
        >
          <p className="type-small font-medium text-fd-foreground">{entry.name}</p>
          <p className="mt-1 type-small text-fd-muted-foreground">{entry.definition}</p>
        </PopoverContent>
      </Popover>
      {entry.href && (
        <Link
          href={entry.href}
          aria-label={`Read about ${entry.name}`}
          className="ml-0.5 inline-block align-[-0.15em] rounded-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground focus-ring"
        >
          <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      )}
    </span>
  );
}
