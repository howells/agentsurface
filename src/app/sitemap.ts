import { SITE_ORIGIN } from "@/lib/site";
import { guideSource } from "@/lib/guide-source";
import { source } from "@/lib/source";
import type { MetadataRoute } from "next";

// Pages outside the docs and guide collections. They carry no lastmod: nothing
// records when their copy last changed.
const STATIC_PAGES = ["/glossary", "/patterns", "/about", "/contact", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = source.getPages().map((page) => ({
    ...(page.data.lastVerified
      ? { lastModified: new Date(page.data.lastVerified) }
      : page.data.lastModified
        ? { lastModified: new Date(page.data.lastModified) }
        : {}),
    url: `${SITE_ORIGIN}${page.url}`,
  }));

  const guide = guideSource.getPages().map((page) => ({
    ...(page.data.lastModified ? { lastModified: new Date(page.data.lastModified) } : {}),
    url: `${SITE_ORIGIN}${page.url}`,
  }));

  const staticPages = STATIC_PAGES.map((path) => ({
    url: `${SITE_ORIGIN}${path}`,
  }));

  return [{ url: SITE_ORIGIN }, ...staticPages, ...guide, ...docs];
}
