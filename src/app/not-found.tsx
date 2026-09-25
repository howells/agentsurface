import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 bg-fd-background text-fd-foreground">
        <PageIntro
          className="pb-20 pt-16 sm:pt-20"
          eyebrow="404"
          title="There's no page here."
          actions={
            <>
              <Link
                href="/docs"
                className="inline-flex items-center rounded-md bg-fd-primary px-4 py-2.5 text-fd-primary-foreground focus-ring"
              >
                Browse the docs
              </Link>
              <Link href="/" className="underline-offset-4 hover:underline focus-ring">
                Go to the homepage
              </Link>
              <Link
                href="/llms.txt"
                prefetch={false}
                className="underline-offset-4 hover:underline focus-ring"
              >
                See every page in llms.txt
              </Link>
            </>
          }
        >
          The address may be mistyped, or the page may have moved. Press ⌘K or Ctrl+K to search the
          docs, or start from one of these.
        </PageIntro>
      </main>
      <SiteFooter />
    </>
  );
}
