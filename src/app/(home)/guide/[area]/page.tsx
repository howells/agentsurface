import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsPager } from "@/components/DocsPager";
import { guideMdxComponents } from "@/components/GuideProse";
import { PageIntro } from "@/components/PageIntro";
import { SiteFooter } from "@/components/SiteFooter";
import { RecommendationList } from "@/components/RecommendationList";
import { guideStages } from "@/data/homepage-guide";
import { guideSource } from "@/lib/guide-source";
import { cn } from "@/lib/utils";

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

        <div className="page-column grid gap-12 pb-16 lg:grid-cols-12 lg:gap-10">
          <article className="max-w-2xl lg:col-span-7">
            <Body components={guideMdxComponents} />
          </article>
          <nav
            aria-label="Areas of the guide"
            className="max-lg:hidden lg:sticky lg:top-20 lg:col-span-3 lg:col-start-10 lg:self-start"
          >
            <p className="type-small text-fd-muted-foreground">The guide</p>
            <ol className="mt-3 border-t border-fd-border">
              {guideStages.map((candidate, index) => {
                const current = candidate.id === stage.id;
                return (
                  <li key={candidate.id} className="border-b border-fd-border">
                    <Link
                      href={`/guide/${candidate.id}`}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex items-baseline gap-3 py-2.5 type-body transition-colors duration-150 focus-ring motion-reduce:transition-none",
                        current
                          ? "text-fd-foreground"
                          : "text-fd-muted-foreground hover:text-fd-foreground",
                      )}
                    >
                      <span className="tabular-nums text-fd-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {candidate.name}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        <section
          id="recommendations"
          aria-labelledby="guide-recommendations-heading"
          className="border-t border-fd-border"
        >
          <div className="page-column grid gap-8 pb-6 pt-14 lg:grid-cols-12 lg:gap-10 lg:pt-20">
            <header className="lg:sticky lg:top-20 lg:col-span-4 lg:self-start">
              <p className="type-body text-fd-accent-foreground">What to do</p>
              <h2 id="guide-recommendations-heading" className="mt-3 max-w-md type-heading">
                {stage.question}
              </h2>
              <p className="mt-4 max-w-md type-body text-fd-muted-foreground">
                {stage.description}
              </p>
            </header>
            <div className="min-w-0 lg:col-span-8">
              <RecommendationList stage={stage} />
            </div>
          </div>
        </section>

        <div className="page-column pb-20">
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
