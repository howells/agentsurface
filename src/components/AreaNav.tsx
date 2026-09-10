"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface AreaLink {
  count: number;
  id: string;
  name: string;
}

/** Strip of area links that sticks under the site header and marks the area in view. */
export function AreaNav({ areas }: { areas: AreaLink[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-120px 0px -65% 0px" },
    );
    for (const area of areas) {
      const element = document.querySelector(`#${CSS.escape(area.id)}`);
      if (element) {
        observer.observe(element);
      }
    }
    return () => {
      observer.disconnect();
    };
  }, [areas]);

  return (
    <nav
      aria-label="Areas"
      className="z-20 border-b border-fd-border bg-fd-background/85 backdrop-blur-lg md:sticky md:top-12"
    >
      <ul className="mx-auto flex max-w-5xl overflow-x-auto px-3 [scrollbar-width:none] sm:px-7">
        {areas.map((area) => {
          const active = area.id === activeId;
          return (
            <li key={area.id} className="shrink-0">
              <a
                href={`#${area.id}`}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "relative flex h-11 items-center gap-2 px-3 type-body transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fd-ring",
                  active
                    ? "text-fd-foreground"
                    : "text-fd-muted-foreground hover:text-fd-foreground",
                )}
              >
                {area.name}
                <span className="type-small tabular-nums opacity-60">{area.count}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3 -bottom-px h-px bg-fd-foreground transition-opacity duration-150",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
