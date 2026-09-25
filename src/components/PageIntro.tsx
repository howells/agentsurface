import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IntroTextProps {
  eyebrow: ReactNode;
  title: ReactNode;
  /** The one-paragraph summary under the title. */
  children: ReactNode;
  /** A quiet line under the summary, such as when the page was last checked. */
  meta?: ReactNode;
  /** Buttons or links rendered under the summary. */
  actions?: ReactNode;
  className?: string;
}

/** Accent eyebrow, display title, muted summary, then optional meta and actions. The caller places it. */
export function IntroText({ eyebrow, title, children, meta, actions, className }: IntroTextProps) {
  return (
    <header className={className}>
      <p className="type-body text-fd-accent-foreground">{eyebrow}</p>
      <h1 className="mt-4 max-w-3xl type-display">{title}</h1>
      <p className="mt-6 max-w-2xl type-body text-fd-muted-foreground">{children}</p>
      {meta && <p className="mt-3 type-small text-fd-muted-foreground">{meta}</p>}
      {actions && (
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 type-body">{actions}</div>
      )}
    </header>
  );
}

/** Page opener in the site column. Vertical padding belongs to the page. */
export function PageIntro({ className, ...props }: IntroTextProps) {
  return (
    <section className={cn("mx-auto w-full max-w-5xl px-6 sm:px-10", className)}>
      <IntroText {...props} />
    </section>
  );
}
