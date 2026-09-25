import type { MDXComponents } from "mdx/types";
import { Term } from "@/components/Term";

/**
 * MDX tag overrides for the /guide/<area> essays: plain Markdown rendered in the
 * site's `type-*` roles, not the docs shell's `.prose` styling (see AGENTS.md - the
 * essay layout matches the homepage, not the docs shell).
 */
export const guideMdxComponents: MDXComponents = {
  h2: ({ children, ...props }) => (
    <h2 className="mt-12 type-heading text-fd-foreground first:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mt-8 type-body text-fd-foreground" {...props}>
      {children}
    </h3>
  ),
  p: (props) => <p className="mt-5 type-body text-fd-muted-foreground" {...props} />,
  ul: (props) => (
    <ul className="mt-5 list-disc space-y-2 pl-5 type-body text-fd-muted-foreground" {...props} />
  ),
  ol: (props) => (
    <ol
      className="mt-5 list-decimal space-y-2 pl-5 type-body text-fd-muted-foreground"
      {...props}
    />
  ),
  li: (props) => <li className="pl-1 marker:text-fd-muted-foreground" {...props} />,
  a: ({ children, ...props }) => (
    <a
      className="text-fd-foreground underline underline-offset-4 hover:no-underline focus-ring"
      {...props}
    >
      {children}
    </a>
  ),
  blockquote: (props) => (
    <blockquote
      className="mt-5 border-l-2 border-fd-border pl-4 type-body text-fd-muted-foreground"
      {...props}
    />
  ),
  code: (props) => (
    <code className="rounded-sm bg-fd-muted px-1 py-0.5 type-small font-mono" {...props} />
  ),
  pre: (props) => (
    <pre
      className="mt-5 overflow-x-auto rounded-lg border border-fd-border bg-fd-muted/40 p-4 type-small font-mono"
      {...props}
    />
  ),
  hr: () => <hr className="mt-10 border-fd-border" />,
  Term,
};
