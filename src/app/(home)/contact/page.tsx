import Link from "next/link";
import type { Metadata } from "next";
import { InfoSection } from "@/components/InfoSection";
import { PageIntro } from "@/components/PageIntro";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  description: "How to report a mistake, suggest a change or get in touch about Agent Surface.",
  title: "Contact",
};

export default function ContactPage() {
  return (
    <>
      <main id="main" className="bg-fd-background text-fd-foreground">
        <PageIntro className="pb-12 pt-16 sm:pt-20" eyebrow="Contact" title="Get in touch.">
          Corrections, suggestions and questions are all welcome. Most of them are best raised on
          GitHub, where anyone can see the fix.
        </PageIntro>

        <div className="mx-auto max-w-5xl px-6 pb-16 sm:px-10">
          <InfoSection title="Report a mistake">
            <p>
              <a href="https://github.com/howells/agentsurface/issues/new">Open an issue</a> with
              the page address and what's wrong. A link to a primary source, such as a
              specification, changelog or vendor document, makes it quicker to check and fix.
            </p>
          </InfoSection>

          <InfoSection title="Suggest a change">
            <p>
              Pull requests are welcome on the{" "}
              <a href="https://github.com/howells/agentsurface">repository</a>. Every docs page
              links to its source file, so you can go straight from the page you're reading to the
              file that needs changing.
            </p>
          </InfoSection>

          <InfoSection title="Email">
            <p>
              For anything you'd rather not post in public, email Daniel Howells at{" "}
              <a href="mailto:daniel@danielhowells.com">daniel@danielhowells.com</a>.
            </p>
          </InfoSection>

          <InfoSection title="For agents">
            <p>
              Agents don't need to contact anyone to use the site. Search and read the docs through
              the MCP server at <code>/mcp</code>, the API described in{" "}
              <Link href="/openapi.json" prefetch={false}>
                openapi.json
              </Link>
              , or the index in{" "}
              <Link href="/llms.txt" prefetch={false}>
                llms.txt
              </Link>
              . None of them need an account or a key.
            </p>
          </InfoSection>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
