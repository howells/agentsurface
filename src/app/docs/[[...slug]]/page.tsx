import { DocsPager } from "@/components/DocsPager";
import { GlossaryList } from "@/components/GlossaryList";
import { IntroText } from "@/components/PageIntro";
import { Term } from "@/components/Term";
import { TextGridList } from "@/components/TextGrid";
import { glossaryCategories } from "@/data/glossary";
import { source } from "@/lib/source";
import { getBreadcrumbItems } from "fumadocs-core/breadcrumb";
import { findNeighbour } from "fumadocs-core/page-tree";
import { DocsBody, DocsPage } from "fumadocs-ui/page";
import { MarkdownCopyButton, ViewOptionsPopover } from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import Link from "next/link";
import { notFound } from "next/navigation";

const BASE_URL = "https://agentsurface.dev";
const GITHUB_REPO = "howells/agentsurface";

/** The nearest section above the page, or the part it sits in when the page is the section's own index. */
function sectionOf(url: string, title: string) {
  const items = getBreadcrumbItems(url, source.pageTree, { includeSeparator: true });
  return items.findLast((item) => item.name !== title);
}

/** BreadcrumbList items: a "Documentation" root, then each ancestor section, then the page itself. */
function breadcrumbListItems(url: string) {
  const items: { name: string; url?: string }[] = [
    { name: "Documentation", url: "/docs" },
    ...getBreadcrumbItems(url, source.pageTree, { includePage: true }).map((item) => ({
      name: typeof item.name === "string" ? item.name : String(item.name),
      url: item.url,
    })),
  ];
  return items.filter((item, index) => index === 0 || item.url !== items[index - 1]?.url);
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    notFound();
  }

  const MDX = page.data.body;
  const lastVerified = page.data.lastVerified;
  const section = sectionOf(page.url, page.data.title);
  const markdownUrl = `${page.url}.md`;
  const githubUrl = `https://github.com/${GITHUB_REPO}/blob/main/src/content/docs/${page.path}`;

  const crumbs = breadcrumbListItems(page.url);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        headline: page.data.title,
        description: page.data.description,
        url: `${BASE_URL}${page.url}`,
        ...(page.data.lastModified
          ? { dateModified: new Date(page.data.lastModified).toISOString() }
          : {}),
        author: { "@type": "Person", name: "Daniel Howells", url: "https://github.com/howells" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          ...(item.url ? { item: `${BASE_URL}${item.url}` } : {}),
        })),
      },
    ],
  };

  // The glossary's sections come from data rather than MDX headings, so add them to the TOC here.
  const toc =
    page.url === "/docs/glossary"
      ? [
          ...page.data.toc,
          ...glossaryCategories.map((category) => ({
            depth: 2,
            title: category.name,
            url: `#${category.id}`,
          })),
        ]
      : page.data.toc;

  return (
    <DocsPage toc={toc} breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <IntroText
        className="mb-4"
        eyebrow={
          section?.url && section.url !== page.url ? (
            <Link href={section.url} className="hover:underline underline-offset-4 focus-ring">
              {section.name}
            </Link>
          ) : (
            (section?.name ?? "Documentation")
          )
        }
        title={page.data.title}
        meta={lastVerified ? `Last verified ${lastVerified}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <MarkdownCopyButton markdownUrl={markdownUrl} />
            <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
          </div>
        }
      >
        {page.data.description}
      </IntroText>
      <DocsBody>
        <MDX
          components={{
            ...defaultMdxComponents,
            TextGrid: TextGridList,
            Term,
            Glossary: GlossaryList,
          }}
        />
      </DocsBody>
      <DocsPager {...findNeighbour(source.pageTree, page.url)} />
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
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
