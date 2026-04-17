import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="mb-4 text-sm font-medium tracking-wide text-fd-muted-foreground uppercase">
        Agent DX Reference
      </p>
      <h1 className="mb-5 text-4xl font-semibold tracking-tight sm:text-5xl">
        Agentify
      </h1>
      <p className="mb-10 max-w-lg text-fd-muted-foreground leading-relaxed">
        MCP servers, API design, CLI design, discovery, authentication, error
        handling, testing, and multi-agent patterns — everything for making
        software consumable by AI agents.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/docs"
          className="inline-flex items-center rounded-full bg-fd-primary px-6 py-2.5 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
        >
          Read the Docs
        </Link>
        <Link
          href="/docs/cookbook"
          className="inline-flex items-center rounded-full border border-fd-border px-6 py-2.5 text-sm font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground hover:border-fd-ring"
        >
          Cookbook
        </Link>
      </div>
    </main>
  );
}
