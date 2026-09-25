import type { Metadata } from "next";
import { InfoSection } from "@/components/InfoSection";
import { PageIntro } from "@/components/PageIntro";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  description:
    "What Agent Surface collects: no accounts, no analytics, no cookies, and only the request logs its host keeps.",
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <>
      <main id="main" className="bg-fd-background text-fd-foreground">
        <PageIntro
          className="pb-12 pt-16 sm:pt-20"
          eyebrow="Privacy"
          title="What this site collects."
          meta="Last updated 25 September 2026"
        >
          Very little. There are no accounts, no analytics and no advertising. The only record of a
          visit is the request log kept by the company that hosts the site.
        </PageIntro>

        <div className="mx-auto max-w-5xl px-6 pb-16 sm:px-10">
          <InfoSection title="What we collect">
            <p>
              Nothing about you directly. The site has no sign-in, no forms, no analytics scripts,
              no tracking pixels and no advertising.
            </p>
          </InfoSection>

          <InfoSection title="Cookies and storage">
            <p>
              The site sets no cookies. If you pick a light or dark theme, your browser remembers
              the choice in its own local storage, which stays on your device.
            </p>
          </InfoSection>

          <InfoSection title="Hosting and logs">
            <p>
              The site runs on Vercel. Like any web host, Vercel handles each request, including
              your IP address, your browser's user agent and the address you asked for, and keeps
              logs to run and secure the service. It does so under{" "}
              <a href="https://vercel.com/legal/privacy-policy">its own privacy policy</a>.
            </p>
          </InfoSection>

          <InfoSection title="Search, API and MCP">
            <p>
              Search queries, API calls and MCP requests are handled on the server to return a
              result. We don't store them or link them to anyone, beyond the host's request logs
              described above.
            </p>
          </InfoSection>

          <InfoSection title="Fonts and links">
            <p>
              Fonts are served from this site, so reading a page sends nothing to a font service.
              Links to other sites take you to services with their own privacy policies.
            </p>
          </InfoSection>

          <InfoSection title="Questions">
            <p>
              Email <a href="mailto:daniel@danielhowells.com">daniel@danielhowells.com</a>.
            </p>
          </InfoSection>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
