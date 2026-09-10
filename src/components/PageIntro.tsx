import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageIntroProps {
  eyebrow: string;
  title: ReactNode;
  /** The one-paragraph summary under the title. */
  children: ReactNode;
  /** Buttons or links rendered under the summary. */
  actions?: ReactNode;
  /** Vertical padding belongs to the page; the component owns the column. */
  className?: string;
}

/** Page opener: accent eyebrow, display title, muted summary, optional actions. */
export function PageIntro({ eyebrow, title, children, actions, className }: PageIntroProps) {
  return (
    <section className={cn("mx-auto w-full max-w-5xl px-6 sm:px-10", className)}>
      <p className="type-body text-fd-accent-foreground">{eyebrow}</p>
      <h1 className="mt-4 max-w-3xl type-display">{title}</h1>
      <p className="mt-6 max-w-2xl type-body text-fd-muted-foreground">{children}</p>
      {actions && (
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 type-body">{actions}</div>
      )}
    </section>
  );
}
