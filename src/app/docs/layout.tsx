import { EmptyNavTitle } from "@/components/EmptyNavTitle";
import { SiteHeader } from "@/components/SiteHeader";
import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { FullSearchTrigger } from "fumadocs-ui/layouts/shared/slots/search-trigger";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader wide />
      <DocsLayout
        tree={source.pageTree}
        nav={{ children: <FullSearchTrigger className="w-full min-w-0 flex-1" /> }}
        searchToggle={{ enabled: false }}
        themeSwitch={{ enabled: false }}
        slots={{ navTitle: EmptyNavTitle }}
      >
        {children}
      </DocsLayout>
    </>
  );
}
