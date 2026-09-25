import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsPager } from "@/components/DocsPager";
import { guideMdxComponents } from "@/components/GuideProse";
import { PageIntro } from "@/components/PageIntro";
import { SiteFooter } from "@/components/SiteFooter";
import { TextGrid } from "@/components/TextGrid";
import { guideStages } from "@/data/homepage-guide";
import { guideSource } from "@/lib/guide-source";

const BASE_URL = "https://agentsurface.dev";

function stageForArea(area: string) {
  return guideStages.find((stage) => stage.id === area);
}

/** Neighbouring stage's pager entry, only when that stage's essay is actually published. */
function neighbourItem(stage: (typeof guideStages)[number] | undefined) {
  if (!stage || !guideSource.getPage([stage.id])) {
    return;
  }
  return { name: stage.name, type: "page" as const, url: `/guide/${stage.id}` };
}

export function generateStaticParams() {
  const published = new Set(guideSource.getPages().map((page) => page.slugs[0]));
  return guideStages
    .filter((stage) => published.has(stage.id))
    .map((stage) => ({ area: stage.id }));
}

export async function generateMetadata(props: { params: Promise<{ area: string }> }) {
  const { area } = await props.params;
  const page = guideSource.getPage([area]);
  if (!page) {
    notFound();
  }

  const ogImage = `/og/${encodeURIComponent(page.data.title)}`;

  return {
    alternates: {
      canonical: `${BASE_URL}${page.url}`,
      types: { "text/markdown": `${page.url}.md` },
    },
    description: page.data.description,
    openGraph: {
      description: page.data.description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      title: page.data.title,
    },
    title: page.data.title,
    twitter: {
      card: "summary_large_image",
      description: page.data.description,
      images: [ogImage],
      title: page.data.title,
    },
  };
}

export default async function GuideAreaPage(props: { params: Promise<{ area: string }> }) {
  const { area } = await props.params;
  const page = guideSource.getPage([area]);
  const stage = stageForArea(area);
  if (!page || !stage) {
    notFound();
  }

  const Body = page.data.body;
  const stageIndex = guideStages.findIndex((candidate) => candidate.id === stage.id);
  const previous = neighbourItem(guideStages[stageIndex - 1]);
  const next = neighbourItem(guideStages[stageIndex + 1]);

  return (
    <>
      <main id="main" className="bg-fd-background text-fd-foreground">
        <PageIntro className="pb-10 pt-16 sm:pt-20" eyebrow={stage.name} title={page.data.title}>
          {page.data.description}
        </PageIntro>

        <article className="mx-auto max-w-5xl px-6 pb-4 sm:px-10">
          <div className="max-w-2xl">
            <Body components={guideMdxComponents} />
          </div>
        </article>

        <section
          aria-labelledby="guide-recommendations-heading"
          className="mx-auto max-w-5xl px-6 pb-4 pt-14 sm:px-10"
        >
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="guide-recommendations-heading" className="type-body">
              Recommendations for {stage.name.toLowerCase()}
            </h2>
            <Link
              href={`/#${stage.id}`}
              className="inline-flex items-center gap-1.5 type-small text-fd-muted-foreground hover:text-fd-foreground focus-ring"
            >
              Open in the full guide
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
          <TextGrid
            size="compact"
            items={stage.cards.map((card) => ({
              description: card.what,
              eyebrow: card.feature,
              href: card.href,
              title: card.title,
            }))}
          />
        </section>

        <div className="mx-auto max-w-5xl px-6 pb-20 sm:px-10">
          <DocsPager previous={previous} next={next} />
          <Link
            href="/"
            className="mt-10 inline-flex items-center gap-1.5 type-small text-fd-muted-foreground hover:text-fd-foreground focus-ring"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Back to the guide
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
