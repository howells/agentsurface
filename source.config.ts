import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { pageSchema as frontmatterSchema } from "fumadocs-core/source/schema";
import { z } from "zod";
import { rehypeGlossaryTerms } from "./src/lib/rehype-glossary-terms";

export const docs = defineDocs({
  dir: "src/content/docs",
  docs: {
    // Expose processed (post-MDX) Markdown per page so `docsLlms` can render
    // real Markdown for agents instead of re-serving raw MDX source.
    postprocess: {
      includeProcessedMarkdown: {
        // Layout wrappers such as <TextGrid> only change presentation, so agents
        // get the list inside without the tag.
        filterElement: (node) => {
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
        },
      },
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

export default defineConfig({
  mdxOptions: {
    // Auto-link the first prose occurrence of each glossary term; see
    // src/lib/rehype-glossary-terms.ts for the skip rules and matching.
    rehypePlugins: (defaults) => [...defaults, rehypeGlossaryTerms],
  },
});
