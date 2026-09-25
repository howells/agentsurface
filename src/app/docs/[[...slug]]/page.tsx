import { DocsPager } from "@/components/DocsPager";
import { IntroText } from "@/components/PageIntro";
import { source } from "@/lib/source";
import { getBreadcrumbItems } from "fumadocs-core/breadcrumb";
import { findNeighbour } from "fumadocs-core/page-tree";
import { DocsBody, DocsPage } from "fumadocs-ui/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import Link from "next/link";
import { notFound } from "next/navigation";

/** The nearest section above the page, or the part it sits in when the page is the section's own index. */
function sectionOf(url: string, title: string) {
  const items = getBreadcrumbItems(url, source.pageTree, { includeSeparator: true });
  return items.findLast((item) => item.name !== title);
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

  return (
    <DocsPage toc={page.data.toc} breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
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
      >
        {page.data.description}
      </IntroText>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents }} />
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
