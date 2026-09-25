import type { ReactNode } from "react";

interface InfoSectionProps {
  title: string;
  children: ReactNode;
}

/** A ruled row: the heading on the left, the answer on the right. Used by the About, Contact and Privacy pages. */
export function InfoSection({ title, children }: InfoSectionProps) {
  return (
    <section className="grid gap-3 border-t border-fd-border py-8 md:grid-cols-[1fr_2fr] md:gap-12">
      <h2 className="type-body text-fd-foreground">{title}</h2>
      <div className="flex flex-col gap-4 type-body text-fd-muted-foreground [&_a]:text-fd-foreground [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </section>
  );
}
