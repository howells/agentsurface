import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { PatternStudio } from "@/components/PatternStudio";
import { SiteHeader } from "@/components/SiteHeader";
import { RILEY_DEFAULTS, decodeRiley } from "@/lib/riley";

export const metadata: Metadata = {
  description:
    "Draw the line fields used across Agent Surface: one repeated curve, shaped by progression, drift and ribbon. Download the result as SVG.",
  title: "Pattern studio",
};

export default async function PatternsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") {
      query.set(key, value);
    }
  }
  const initial = decodeRiley(query.toString(), RILEY_DEFAULTS);

  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-fd-background text-fd-foreground">
        <PageIntro
          className="pb-8 pt-14"
          eyebrow="Pattern studio"
          title="Line fields, after Bridget Riley."
        >
          One curve, repeated. Change how it grows across the field, how it travels from line to
          line, and how it tightens along its length. The result is the artwork on the glossary
          cards, and you can download any variation as SVG.
        </PageIntro>
        <section className="mx-auto max-w-5xl px-6 pb-20 sm:px-10">
          <PatternStudio initial={initial} />
        </section>
      </main>
    </>
  );
}
