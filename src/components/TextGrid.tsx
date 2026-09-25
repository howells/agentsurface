import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { Term } from "@/components/Term";
import { cn } from "@/lib/utils";

export interface TextGridItem {
  href: string;
  title: ReactNode;
  /** Small line above the title, after the number when the grid is numbered. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Small line pinned to the bottom of the cell. */
  meta?: ReactNode;
}

interface TextGridProps {
  items: TextGridItem[];
  /** Prefix each eyebrow with 01, 02, … */
  numbered?: boolean;
  /** `large` for page-level overviews, `compact` for lists inside docs prose. */
  size?: "large" | "compact";
  className?: string;
}

/** A ruled grid of linked entries: number and eyebrow, title, description, then meta. */
export function TextGrid({ items, numbered = false, size = "large", className }: TextGridProps) {
  const large = size === "large";
  return (
    <ol
      className={cn(
        "not-prose grid gap-x-10",
        large ? "sm:grid-cols-2 lg:grid-cols-3" : "my-8 sm:grid-cols-2",
        className,
      )}
    >
      {items.map((item, index) => {
        const number = numbered ? String(index + 1).padStart(2, "0") : undefined;
        // Compact cells without an eyebrow carry the number on the title line.
        const inlineNumber = !large && !item.eyebrow ? number : undefined;
        const eyebrow = item.eyebrow || (number && !inlineNumber);
        return (
          // Several entries can point at the same page, so the position keeps keys unique.
          <li key={`${index}-${item.href}`} className="border-t border-fd-border">
            <Link
              href={item.href}
              className={cn(
                "group flex h-full flex-col focus-ring",
                large ? "pb-8 pt-4 sm:pb-10" : "pb-6 pt-3",
              )}
            >
              {eyebrow && (
                <span className="mb-3 type-small tabular-nums text-fd-muted-foreground">
                  {number && (
                    <span aria-hidden="true" className={item.eyebrow ? "mr-3" : undefined}>
                      {number}
                    </span>
                  )}
                  {item.eyebrow}
                </span>
              )}
              <span
                className={cn(
                  "block text-fd-foreground transition-colors duration-150 group-hover:text-fd-accent-foreground motion-reduce:transition-none",
                  large ? "type-heading" : "type-body",
                )}
              >
                {inlineNumber && (
                  <span aria-hidden="true" className="mr-3 tabular-nums text-fd-muted-foreground">
                    {inlineNumber}
                  </span>
                )}
                {item.title}
              </span>
              {item.description && (
                <span
                  className={cn(
                    "mt-1.5 block text-fd-muted-foreground",
                    large ? "type-body" : "type-small",
                  )}
                >
                  {item.description}
                </span>
              )}
              {item.meta && (
                <span className="mt-auto flex items-center gap-1.5 pt-4 type-small tabular-nums text-fd-muted-foreground">
                  {item.meta}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

type ElementWithChildren = ReactElement<{ children?: ReactNode; href?: string }>;

function elements(node: ReactNode): ElementWithChildren[] {
  return Children.toArray(node).filter((child): child is ElementWithChildren =>
    isValidElement(child),
  );
}

/** Each cell is already a link, so glossary terms inside it render as plain text. */
function unwrapTerms(node: ReactNode): ReactNode {
  return Children.map(node, (child): ReactNode => {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Term) {
      return child.props.children;
    }
    return child;
  });
}

/** Drop the ": " or " - " that separates a list item's link from its description. */
function trimSeparator(nodes: ReactNode[]): ReactNode[] {
  const [first, ...rest] = nodes;
  if (typeof first !== "string") {
    return nodes;
  }
  const trimmed = first.replace(/^\s*(?::|-)\s*/, "");
  return trimmed ? [trimmed, ...rest] : rest;
}

/**
 * MDX wrapper: renders a Markdown list of `- [Title](/href): description` items as a
 * compact TextGrid. The source stays a plain list, so the agent Markdown is unchanged.
 */
export function TextGridList({ children, numbered }: { children: ReactNode; numbered?: boolean }) {
  const list = elements(children)[0];
  const items = elements(list?.props.children).flatMap((listItem): TextGridItem[] => {
    const [link, ...rest] = Children.toArray(listItem.props.children);
    if (!isValidElement<{ children?: ReactNode; href?: string }>(link) || !link.props.href) {
      return [];
    }
    const description = trimSeparator(rest.map(unwrapTerms));
    return [
      {
        description: description.length > 0 ? description : undefined,
        href: link.props.href,
        title: link.props.children,
      },
    ];
  });
  return <TextGrid items={items} numbered={numbered} size="compact" />;
}
