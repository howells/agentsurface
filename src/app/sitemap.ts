import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

const BASE_URL = "https://agentsurface.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = source.getPages().map((page) => ({
    lastModified: new Date(),
    url: `${BASE_URL}${page.url}`,
  }));

  return [{ lastModified: new Date(), url: BASE_URL }, ...docs];
}
