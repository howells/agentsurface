import Link from "next/link";

/* ── Data ──────────────────────────────────────── */

const dimensions = [
  {
    num: "01",
    name: "API Surface",
    desc: "Machine-readable contracts and tool definitions",
    href: "/docs/api-surface",
  },
  {
    num: "02",
    name: "CLI Design",
    desc: "Predictable commands with structured output",
    href: "/docs/cli-design",
  },
  {
    num: "03",
    name: "MCP Servers",
    desc: "Protocol-native tool exposure",
    href: "/docs/mcp-servers",
  },
  {
    num: "04",
    name: "Discovery & AEO",
    desc: "Agent-findable capabilities and metadata",
    href: "/docs/discovery",
  },
  {
    num: "05",
    name: "Authentication",
    desc: "Machine-to-machine access and token flows",
    href: "/docs/authentication",
  },
  {
    num: "06",
    name: "Error Handling",
    desc: "Structured errors with recovery paths",
    href: "/docs/error-handling",
  },
  {
    num: "07",
    name: "Tool Design",
    desc: "Narrow, typed, idempotent operations",
    href: "/docs/tool-design",
  },
  {
    num: "08",
    name: "Context Files",
    desc: "AGENTS.md, CLAUDE.md, and boundary definitions",
    href: "/docs/context-files",
  },
  {
    num: "09",
    name: "Retrievability",
    desc: "Searchable, retrievable knowledge access",
    href: "/docs/data-retrievability",
  },
  {
    num: "10",
    name: "Multi-Agent",
    desc: "Coordination, delegation, and orchestration",
    href: "/docs/multi-agent",
  },
  {
    num: "11",
    name: "Testing & Evals",
    desc: "Metrics, red-team suites, and observability",
    href: "/docs/testing",
  },
];

const scorecardPreview = [
  { name: "API Surface", score: 2 },
  { name: "CLI Design", score: 1 },
  { name: "MCP Servers", score: 3 },
  { name: "Discovery", score: 2 },
  { name: "Auth", score: 1 },
];

const resources = [
  {
    title: "Approaches",
    desc: "Reusable patterns for agent-friendly software without rebuilding around a framework",
    href: "/docs/cookbook",
  },
  {
    title: "Protocols & Standards",
    desc: "MCP, A2A, ACP, and the agent communication landscape",
    href: "/docs/protocols",
  },
  {
    title: "Scoring Framework",
    desc: "The 0–3 rubric and calibration guidance behind each dimension",
    href: "/docs/scoring",
  },
  {
    title: "Tooling Catalog",
    desc: "Curated AI and agent infrastructure worth knowing about",
    href: "/docs/tooling-catalog",
  },
  {
    title: "Reference Links",
    desc: "Canonical standards, specs, and official documentation",
    href: "/docs/reference-links",
  },
];

/* ── Page ──────────────────────────────────────── */

export default function HomePage() {
  return (
    <main className="flex flex-col items-center bg-fd-background text-fd-foreground">
      {/* ── Hero ──────────────────────────────────── */}
      <section className="w-full max-w-5xl px-6 pt-24 pb-16 sm:px-10">
        <p className="text-xs font-medium uppercase tracking-widest text-fd-muted-foreground">
          Agent Surface
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
          Make software
          <br />
          legible to agents.
        </h1>
        <p className="mt-6 max-w-2xl text-[0.9375rem] leading-7 text-fd-muted-foreground">
          A practical resource for the surfaces AI agents depend on — APIs,
          CLIs, tools, MCP servers, docs, errors, auth, retrieval, and the
          skill that ties them together. Part field guide, part scoring model,
          part workflow.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/docs"
            className="inline-flex h-10 items-center rounded-md bg-fd-primary px-5 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
          >
            Read the docs
          </Link>
          <Link
            href="#skill"
            className="inline-flex h-10 items-center rounded-md border border-fd-border px-5 text-sm font-medium text-fd-muted-foreground transition-colors hover:border-fd-ring hover:text-fd-foreground"
          >
            Install the skill
          </Link>
        </div>

        {/* Scorecard preview — shows what surface produces */}
        <div
          aria-hidden="true"
          className="mt-12 max-w-xs overflow-hidden rounded-lg border border-fd-border font-mono text-xs"
        >
          <div className="border-b border-fd-border bg-fd-muted/40 px-4 py-2 text-fd-muted-foreground">
            surface score
          </div>
          <div className="space-y-2 px-4 py-3">
            {scorecardPreview.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-fd-muted-foreground">
                  {item.name}
                </span>
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`block h-1.5 w-3 rounded-sm ${
                        i < item.score
                          ? "bg-fd-foreground/70"
                          : "bg-fd-border"
                      }`}
                    />
                  ))}
                </span>
                <span className="text-fd-muted-foreground">
                  {item.score}/3
                </span>
              </div>
            ))}
            <span className="block text-fd-muted-foreground/60">…</span>
          </div>
        </div>
      </section>

      {/* ── 11 Surfaces ──────────────────────────── */}
      <section className="w-full border-t border-fd-border">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold text-fd-foreground">
              The 11 surfaces
            </h2>
            <span className="text-xs text-fd-muted-foreground">
              scored 0–3 each · 33 total
            </span>
          </div>
          <p className="mt-2 max-w-lg text-sm leading-6 text-fd-muted-foreground">
            Every dimension an agent touches when it operates inside your
            codebase. Each one has a reference guide, scoring rubric, and
            transformation path.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dimensions.map((d) => (
              <Link
                key={d.num}
                href={d.href}
                className="group rounded-lg border border-fd-border p-4 transition-colors hover:border-fd-ring hover:bg-fd-accent"
              >
                <span className="font-mono text-[0.6875rem] text-fd-muted-foreground">
                  {d.num}
                </span>
                <p className="mt-1 text-sm font-medium text-fd-foreground group-hover:text-fd-accent-foreground">
                  {d.name}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-fd-muted-foreground">
                  {d.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Skill ────────────────────────────────── */}
      <section id="skill" className="w-full border-t border-fd-border">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
          <div className="grid gap-8 sm:grid-cols-[1fr_1fr]">
            <div>
              <div className="flex items-baseline gap-3">
                <h2 className="font-mono text-lg font-semibold text-fd-foreground">
                  /surface
                </h2>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-6 text-fd-muted-foreground">
                One skill that routes to the right workflow — audit your
                codebase, scaffold agent infrastructure, generate MCP servers,
                write context files, or fix specific gaps. It reads your project
                and asks what you need.
              </p>
              <p className="mt-4 text-xs text-fd-muted-foreground">
                Works with Claude Code, Codex, Cursor, and any agent that reads
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

      {/* ── Resources ────────────────────────────── */}
      <section className="w-full border-t border-fd-border">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
          <h2 className="text-lg font-semibold text-fd-foreground">
            Also in the docs
          </h2>
          <div className="mt-4">
            {resources.map((r) => (
              <Link
                key={r.title}
                href={r.href}
                className="grid gap-1 border-b border-fd-border py-4 transition-colors hover:text-fd-foreground sm:grid-cols-[11rem_1fr] sm:gap-2"
              >
                <span className="text-sm font-medium text-fd-foreground">
                  {r.title}
                </span>
                <span className="text-sm leading-6 text-fd-muted-foreground">
                  {r.desc}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────── */}
      <footer className="w-full border-t border-fd-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8 sm:px-10">
          <span className="text-xs text-fd-muted-foreground">
            Agent Surface
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
