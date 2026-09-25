import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { pageSchema as frontmatterSchema } from "fumadocs-core/source/schema";
import { z } from "zod";
import { rehypeGlossaryTerms } from "./src/lib/rehype-glossary-terms";
import { guideStages } from "./src/data/homepage-guide";

// Layout wrappers such as <TextGrid> only change presentation, so agents get
// the list inside without the tag. Shared by every collection that exposes
// processed Markdown for agents.
const filterPresentationalElements = (node: { type: string; name?: string | null }) => {
  if (node.type === "mdxjsEsm") {
    return false;
  }
  if (
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    (node.name === "TextGrid" || node.name === "Term")
  ) {
    return "children-only";
  }
  return true;
};

export const docs = defineDocs({
  dir: "src/content/docs",
  docs: {
    // Expose processed (post-MDX) Markdown per page so `docsLlms` can render
    // real Markdown for agents instead of re-serving raw MDX source.
    postprocess: {
      includeProcessedMarkdown: { filterElement: filterPresentationalElements },
    },
    // Last-modified date from git history, exposed as `page.data.lastModified`.
    lastModified: true,
    // Extend the default fumadocs frontmatter (title/description/…) with an
    // optional freshness stamp. YAML parses an unquoted `2026-07-06` into a
    // `Date`, so normalize that back to a `YYYY-MM-DD` string before validating.
    schema: frontmatterSchema.extend({
      lastVerified: z
        .preprocess(
          (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
          z.iso.date(),
        )
        .optional(),
    }),
  },
});

const guideStageIds = guideStages.map((stage) => stage.id) as [string, ...string[]];

// One editorial essay per homepage area (src/data/homepage-guide.ts). Flat,
// no nested sections, so no meta.json is required.
export const guide = defineDocs({
  dir: "src/content/guide",
  docs: {
    postprocess: {
      includeProcessedMarkdown: { filterElement: filterPresentationalElements },
    },
    lastModified: true,
    schema: frontmatterSchema.extend({
      // Must match a homepage-guide.ts stage id, so the essay and its
      // recommendations list stay in sync.
      area: z.enum(guideStageIds),
    }),
  },
});

export default defineConfig({
  mdxOptions: {
    // Auto-link the first prose occurrence of each glossary term; see
    // src/lib/rehype-glossary-terms.ts for the skip rules and matching.
    rehypePlugins: (defaults) => [...defaults, rehypeGlossaryTerms],
  },
});
