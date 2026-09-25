import { source } from "@/lib/source";
import type { MetadataRoute } from "next";

const BASE_URL = "https://agentsurface.dev";

// Built by another writer; list them here regardless of whether their pages exist yet
// so the sitemap doesn't need another pass once they ship.
const STATIC_PAGES = ["/glossary", "/patterns", "/about", "/contact", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = source.getPages().map((page) => ({
    lastModified: page.data.lastModified ? new Date(page.data.lastModified) : new Date(),
    url: `${BASE_URL}${page.url}`,
  }));

  const staticPages = STATIC_PAGES.map((path) => ({
    lastModified: new Date(),
    url: `${BASE_URL}${path}`,
  }));

  return [{ lastModified: new Date(), url: BASE_URL }, ...staticPages, ...docs];
}
