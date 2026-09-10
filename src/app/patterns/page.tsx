import type { Metadata } from "next";
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
        <section className="mx-auto max-w-5xl px-6 pb-8 pt-14 sm:px-10">
          <p className="text-sm font-medium text-fd-accent-foreground">Pattern studio</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Line fields, after Bridget Riley.
          </h1>
          <p className="mt-6 max-w-xl text-[0.9375rem] leading-7 text-fd-muted-foreground">
            One curve, repeated. Change how it grows across the field, how it travels from line to
            line, and how it tightens along its length. The result is the artwork on the area cards,
            and you can download any variation as SVG.
          </p>
        </section>
        <section className="mx-auto max-w-5xl px-6 pb-20 sm:px-10">
          <PatternStudio initial={initial} />
        </section>
      </main>
    </>
  );
}
