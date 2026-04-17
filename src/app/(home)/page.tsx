import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-6xl">
        Agentify
      </h1>
      <p className="mb-6 max-w-xl text-xl text-fd-muted-foreground">
        The comprehensive reference for making any codebase agent-ready.
      </p>
      <p className="mb-10 max-w-2xl text-fd-muted-foreground">
        Covering MCP servers, API design, CLI design, discovery, AEO,
        protocols, authentication, error handling, testing, and multi-agent
        patterns — everything you need to make your software optimally
        consumable by AI agents.
      </p>
      <Link
        href="/docs"
        className="inline-flex items-center rounded-full bg-fd-primary px-8 py-3 text-lg font-semibold text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
      >
        Read the Docs
      </Link>
    </main>
  );
}
