import Link from "next/link";

const sections = [
  {
    title: "Documentation",
    text: "A field guide for APIs, CLIs, MCP servers, discovery, auth, errors, retrieval, testing, and multi-agent work.",
    href: "/docs",
  },
  {
    title: "Approaches",
    text: "Reusable patterns for making existing software agent-friendly without rebuilding everything around an agent framework.",
    href: "/docs/cookbook",
  },
  {
    title: "Skill",
    text: "The agentify workflow scores a codebase, explains the evidence, and turns gaps into a transformation plan.",
    href: "/docs/scoring",
  },
  {
    title: "Resources",
    text: "Templates, specialist agents, rubrics, protocols, and a curated catalog of AI tooling worth knowing about.",
    href: "/docs/tooling-catalog",
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 bg-fd-background px-6 py-20 text-fd-foreground sm:px-10">
      <div className="w-full max-w-[900px]">
        <p className="mb-4 text-sm font-medium text-fd-muted-foreground">
          Agent Surface
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-fd-foreground sm:text-5xl">
          Make software legible to agents.
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-fd-muted-foreground">
          A practical resource for designing the surfaces AI agents depend on:
          docs, APIs, CLIs, tools, context, errors, retrieval, workflows, and
          the skills that tie them together.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/docs"
            className="inline-flex h-9 items-center rounded-md bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
          >
            Read the docs
          </Link>
          <Link
            href="/docs/tooling-catalog"
            className="inline-flex h-9 items-center rounded-md border border-fd-border px-4 text-sm font-medium text-fd-muted-foreground transition-colors hover:border-fd-ring hover:text-fd-foreground"
          >
            Tooling catalog
          </Link>
        </div>

        <div className="mt-16 border-t border-fd-border">
          {sections.map((section) => (
            <Link
              key={section.title}
              href={section.href}
              className="grid gap-2 border-b border-fd-border py-5 text-left transition-colors hover:text-fd-foreground sm:grid-cols-[10rem_1fr]"
            >
              <span className="text-sm font-medium text-fd-foreground">
                {section.title}
              </span>
              <span className="max-w-2xl text-sm leading-6 text-fd-muted-foreground">
                {section.text}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
