import type { Metadata } from "next";
import Link from "next/link";
import { InfoSection } from "@/components/InfoSection";
import { PageIntro } from "@/components/PageIntro";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  description:
    "What Agent Surface is, what it covers, who makes it, and how the guide is kept current.",
  title: "About",
};

export default function AboutPage() {
  return (
    <>
      <main id="main" className="bg-fd-background text-fd-foreground">
        <PageIntro
          className="pb-12 pt-16 sm:pt-20"
          eyebrow="About"
          title="A practical guide to agent-ready software."
        >
          Agent Surface explains how to make a website, app, API or CLI work with AI agents, and how
          to build agents of your own. Daniel Howells writes and maintains it.
        </PageIntro>

        <div className="mx-auto max-w-5xl px-6 pb-16 sm:px-10">
          <InfoSection title="What it covers">
            <p>
              The guide has two parts. <Link href="/docs">Make your product agent-ready</Link>{" "}
              covers discovery, context files, APIs, tools, CLIs, MCP servers, authentication,
              errors, retrieval, agentic UI and agentic commerce.{" "}
              <Link href="/docs/agents">Build agents</Link> is a current inventory of the
              frameworks, protocols and tools for teams building agents of their own.
            </p>
          </InfoSection>

          <InfoSection title="What you can use">
            <p>
              Everything here is free to read and reuse under the MIT licence: the docs, the Surface
              skill for coding agents, the starter templates, and the scorecard used to audit a
              codebase.
            </p>
            <p>
              Agents can read the site too. Every page is available as Markdown, the whole site is
              indexed in{" "}
              <Link href="/llms.txt" prefetch={false}>
                llms.txt
              </Link>
              , and an MCP server at <code>/mcp</code> searches and reads the docs. The server is
              listed in the{" "}
              <a href="https://registry.modelcontextprotocol.io/v0/servers/dev.agentsurface%2Fdocs/versions/latest">
                official MCP Registry
              </a>{" "}
              as <code>dev.agentsurface/docs</code>. None of it needs an account or a key.
            </p>
          </InfoSection>

          <InfoSection title="How it's kept current">
            <p>
              Pages about fast-moving tools carry a last-verified date, and a page that goes 120
              days without a check is flagged to be verified again against primary sources. Model
              names in examples come from a single allowlist, so an outdated name fails the build.
            </p>
            <p>
              The site itself is tested with the public agent-readiness checkers from Google
              Lighthouse, Cloudflare, Ora and Vercel, and the{" "}
              <Link href="/docs/scoring/public-scanners">scanner guide</Link> explains what each one
              measures.
            </p>
          </InfoSection>

          <InfoSection title="Who makes it">
            <p>
              Agent Surface is made by Daniel Howells. More about him at{" "}
              <a href="https://danielhowells.com">danielhowells.com</a>. The source is public on{" "}
              <a href="https://github.com/howells/agentsurface">GitHub</a>.
            </p>
          </InfoSection>

          <InfoSection title="Corrections">
            <p>
              If something is wrong or out of date, <Link href="/contact">get in touch</Link> or
              open an issue on GitHub with the page and a link to the source that shows the correct
              answer.
            </p>
          </InfoSection>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
