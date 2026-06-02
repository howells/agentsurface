import Link from "next/link";
import { GlossaryGrid } from "@/components/GlossaryGrid";
import { glossaryTerms } from "@/data/glossary";

const paths = [
  {
    title: "Understand agent systems",
    desc: "Design principles, runtime choices, browser access, and protocol boundaries.",
    href: "/docs/agents",
  },
  {
    title: "Build production agents",
    desc: "Framework selection, orchestration, retrieval, memory, UI, testing, and deployment patterns.",
    href: "/docs/getting-started",
  },
  {
    title: "Expose software to agents",
    desc: "APIs, CLIs, MCP servers, discovery files, auth, errors, and tool definitions.",
    href: "/docs/api-surface",
  },
  {
    title: "Evaluate readiness",
    desc: "Score a surface, collect evidence, group fixes, and track before-and-after deltas.",
    href: "/docs/scoring",
  },
  {
    title: "Choose standards and tools",
    desc: "Compare protocols, runtimes, model providers, retrieval systems, eval tools, and sandboxes.",
    href: "/docs/tooling-catalog",
  },
];

const systemTopics = [
  {
    title: "Agent systems",
    desc: "Architecture, scaffolding, browser access, and platform tradeoffs.",
    href: "/docs/agents",
  },
  {
    title: "Runtime boundaries",
    desc: "Where logic, tools, state, approvals, and persistence should live.",
    href: "/docs/runtime-boundaries",
  },
  {
    title: "Agentic UI",
    desc: "Interfaces for steering agents, reviewing work, and keeping users in control.",
    href: "/docs/agentic-ui",
  },
  {
    title: "Multi-agent",
    desc: "Supervisors, swarms, councils, delegation, memory, and tool sprawl.",
    href: "/docs/multi-agent",
  },
  {
    title: "Data retrievability",
    desc: "RAG patterns, embeddings, retrieval pipelines, vector stores, and knowledge graphs.",
    href: "/docs/data-retrievability",
  },
  {
    title: "Testing and evals",
    desc: "Metrics, judges, red teams, traces, CI checks, and workflow harnesses.",
    href: "/docs/testing",
  },
];

const surfaces = [
  {
    title: "API Surface",
    desc: "HTTP contracts, OpenAPI, Arazzo workflows, versions, and events.",
    href: "/docs/api-surface",
  },
  {
    title: "Tool Design",
    desc: "Names, descriptions, schemas, safety, portability, curation, and token budgets.",
    href: "/docs/tool-design",
  },
  {
    title: "CLI Design",
    desc: "Structured output, predictable commands, stdin payloads, schemas, and safety rails.",
    href: "/docs/cli-design",
  },
  {
    title: "MCP Servers",
    desc: "Tools, resources, prompts, transports, auth, annotations, and server tests.",
    href: "/docs/mcp-servers",
  },
  {
    title: "Discovery",
    desc: "llms.txt, AGENTS.md, structured data, content negotiation, robots, and endpoints.",
    href: "/docs/discovery",
  },
  {
    title: "Context Files",
    desc: "Repository instructions for Codex, Claude Code, Cursor, Copilot, and monorepos.",
    href: "/docs/context-files",
  },
  {
    title: "Authentication",
    desc: "Agent identity, OAuth, token exchange, DPoP, protected resources, and replay safety.",
    href: "/docs/authentication",
  },
  {
    title: "Error Handling",
    desc: "Problem Details, recovery hints, retries, idempotency, trace IDs, and CLI errors.",
    href: "/docs/error-handling",
  },
];

const references = [
  {
    title: "Scoring framework",
    desc: "The 0-3 rubric, scorecard format, evidence rules, clustering, and calibration.",
    href: "/docs/scoring",
  },
  {
    title: "Protocols",
    desc: "MCP, A2A, ACP, Arazzo, discovery specs, and adjacent standards.",
    href: "/docs/protocols",
  },
  {
    title: "Tooling catalog",
    desc: "Frameworks, providers, gateways, retrieval systems, eval tools, browsers, and sandboxes.",
    href: "/docs/tooling-catalog",
  },
  {
    title: "Cookbook",
    desc: "Reusable production patterns for loops, approvals, background agents, routing, and MCP.",
    href: "/docs/cookbook",
  },
  {
    title: "Reference links",
    desc: "Canonical specs, vendor docs, research notes, and source material.",
    href: "/docs/reference-links",
  },
];

function LinkList({
  items,
}: {
  items: Array<{ title: string; desc: string; href: string }>;
}) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.title}
          href={item.href}
          className="group rounded-lg border border-fd-border p-4 transition-colors hover:border-fd-ring hover:bg-fd-accent"
        >
          <h3 className="text-sm font-medium text-fd-foreground group-hover:text-fd-accent-foreground">
            {item.title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-fd-muted-foreground">
            {item.desc}
          </p>
        </Link>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-col items-center bg-fd-background text-fd-foreground">
      <section className="w-full max-w-5xl px-6 pb-14 pt-16 sm:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-fd-muted-foreground">
          Agent-readable software
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
          A field guide for software that agents can use.
        </h1>
        <p className="mt-6 max-w-2xl text-[0.9375rem] leading-7 text-fd-muted-foreground">
          Agent Surface explains how agents read context, call tools, retrieve
          knowledge, handle errors, ask for approval, and coordinate work. Use
          it to design agent systems, expose existing products to agents, score
          readiness, and choose protocols or tools with the engineering detail
          intact.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/docs"
            className="inline-flex h-10 items-center rounded-md bg-fd-primary px-5 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
          >
            Start the guide
          </Link>
          <Link
            href="/docs/getting-started"
            className="inline-flex h-10 items-center rounded-md border border-fd-border px-5 text-sm font-medium text-fd-muted-foreground transition-colors hover:border-fd-ring hover:text-fd-foreground"
          >
            Choose a path
          </Link>
        </div>
      </section>

      <section className="w-full border-t border-fd-border">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold text-fd-foreground">
              Start with the job
            </h2>
            <span className="text-xs text-fd-muted-foreground">
              five routes through the same dense guide
            </span>
          </div>
          <LinkList items={paths} />
        </div>
      </section>

      <section className="w-full border-t border-fd-border">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
          <h2 className="text-lg font-semibold text-fd-foreground">
            Agent systems
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-fd-muted-foreground">
            These chapters cover the product and system design questions behind
            agents: where they run, how they use tools, what memory they need,
            how people supervise them, and how to prove they work.
          </p>
          <LinkList items={systemTopics} />
        </div>
      </section>

      <section className="w-full border-t border-fd-border">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
          <h2 className="text-lg font-semibold text-fd-foreground">
            Agent-readable surfaces
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-fd-muted-foreground">
            These chapters make existing software easier for agents to inspect,
            call, recover from, and keep within permission boundaries.
          </p>
          <LinkList items={surfaces} />
        </div>
      </section>

      <section className="w-full border-t border-fd-border">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
          <h2 className="text-lg font-semibold text-fd-foreground">
            Evaluation and reference
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-fd-muted-foreground">
            Use these sections when you need to compare maturity, select a
            standard, pick infrastructure, or turn a pattern into an
            implementation plan.
          </p>
          <LinkList items={references} />
        </div>
      </section>

      <section id="skill" className="w-full border-t border-fd-border">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
          <div className="grid gap-8 sm:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-mono text-lg font-semibold text-fd-foreground">
                surface
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-fd-muted-foreground">
                The surface skill turns the guide into work on a repository.
                It can explain a topic, audit readiness, write a transformation
                plan, scaffold agent infrastructure, or delegate focused fixes
                to specialist prompts.
              </p>
              <p className="mt-4 text-xs text-fd-muted-foreground">
                Works with Codex, Claude Code, Cursor, and any agent that reads
                markdown skill files.
              </p>
            </div>
            <div className="flex flex-col justify-center">
              <div className="overflow-hidden rounded-lg border border-fd-border bg-fd-muted/30">
                <pre className="overflow-x-auto p-4 text-xs leading-7 text-fd-foreground">
                  <code>
                    <span className="select-none text-fd-muted-foreground">
                      ${" "}
                    </span>
                    npx skills add https://github.com/howells/agentsurface
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="w-full border-t border-fd-border"
        style={{ overflowX: "clip" }}
      >
        <div className="mx-auto max-w-5xl px-6 py-14 sm:px-10">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold text-fd-foreground">
              The language of agents
            </h2>
            <span className="text-xs text-fd-muted-foreground">
              plain-language definitions for product and engineering teams
            </span>
          </div>
          <div className="mt-8">
            <GlossaryGrid terms={glossaryTerms} showFilters={false} />
          </div>
          <div className="mt-6">
            <Link
              href="/glossary"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-fd-foreground transition-colors hover:text-fd-muted-foreground"
            >
              View all 24 terms
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-fd-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8 sm:px-10">
          <span className="text-xs text-fd-muted-foreground">
            Agent Surface by{" "}
            <a
              href="https://danielhowells.com"
              className="transition-colors hover:text-fd-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              Daniel Howells
            </a>
          </span>
          <a
            href="https://github.com/howells/agentsurface"
            className="text-xs text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
