import type { Item } from "fumadocs-core/page-tree";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DocsPagerProps {
  previous?: Item;
  next?: Item;
}

function PagerLink({ item, direction }: { item: Item; direction: "previous" | "next" }) {
  const Arrow = direction === "previous" ? ArrowLeft : ArrowRight;
  return (
    <Link
      href={item.url}
      className={cn(
        "group flex flex-col border-t border-fd-border pb-2 pt-4 focus-ring",
        direction === "next" && "items-end text-end sm:col-start-2",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 type-small text-fd-muted-foreground",
          direction === "next" && "flex-row-reverse",
        )}
      >
        <Arrow
          aria-hidden="true"
          className={cn(
            "size-3.5 transition-transform duration-150 motion-reduce:transition-none",
            direction === "previous"
              ? "group-hover:-translate-x-0.5"
              : "group-hover:translate-x-0.5",
          )}
        />
        {direction === "previous" ? "Previous" : "Next"}
      </span>
      <span className="mt-2 type-body text-fd-foreground transition-colors duration-150 group-hover:text-fd-accent-foreground motion-reduce:transition-none">
        {item.name}
      </span>
    </Link>
  );
}

/** Previous and next pages as a ruled pair, matching the homepage index. */
export function DocsPager({ previous, next }: DocsPagerProps) {
  if (!previous && !next) {
    return null;
  }
  return (
    <nav
      aria-label="Previous and next pages"
      className="mt-16 grid gap-x-10 gap-y-2 sm:grid-cols-2"
    >
      {previous && <PagerLink item={previous} direction="previous" />}
      {next && <PagerLink item={next} direction="next" />}
    </nav>
  );
}
