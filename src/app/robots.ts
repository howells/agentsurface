import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        allow: "/",
        userAgent: "*",
      },
      // Allow retrieval and search bots to use public docs
      {
        allow: "/",
        userAgent: "OAI-SearchBot",
      },
      {
        allow: "/",
        userAgent: "Claude-SearchBot",
      },
      {
        allow: "/",
        userAgent: "PerplexityBot",
      },
      // Block model-training crawlers
      {
        disallow: "/",
        userAgent: "GPTBot",
      },
      {
        disallow: "/",
        userAgent: "ClaudeBot",
      },
      {
        disallow: "/",
        userAgent: "Google-Extended",
      },
      {
        disallow: "/",
        userAgent: "Meta-ExternalAgent",
      },
    ],
    sitemap: "https://agentsurface.dev/sitemap.xml",
    // Content-Signal: search=yes, ai-input=yes, ai-train=no
    // Public docs may be used for search indexing and agent grounding,
    // but not for model training data.
  };
}
