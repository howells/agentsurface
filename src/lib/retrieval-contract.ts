import { z } from "zod";

export const ranking =
  "Distinct pages in Fumadocs full-text relevance order (ZBSearch page groups); rank is a 1-based position within this result set, not a confidence score.";
export const searchInput = z.object({
  query: z
    .string()
    .trim()
    .min(2)
    .max(500)
    .describe(
      "Keywords to find in documentation titles, descriptions, headings and body; 2 to 500 characters.",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe("Maximum pages to return, from 1 to 20; defaults to 5."),
  section: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .describe(
      "Optional top-level docs section, for example discovery, mcp-servers or retrievability. Unknown sections return no matches.",
    ),
});
export const pageSummary = z.object({
  id: z.string().describe("Stable documentation path, independent of rank."),
  title: z.string().describe("Published page title."),
  description: z.string().describe("Published page summary."),
  url: z.string().url().describe("Canonical source URL; pass this to get_page."),
  slug: z
    .string()
    .describe("Slash-separated docs slug for /api/md; index identifies the docs home."),
  updated_at: z
    .string()
    .optional()
    .describe(
      "Content revision time, or last verification date where a revision time is unavailable.",
    ),
});
export const searchOutput = z.object({
  results: z
    .array(
      pageSummary.extend({
        snippet: z
          .string()
          .max(600)
          .describe("Matching body or heading excerpt, at most 600 characters."),
        rank: z
          .number()
          .int()
          .min(1)
          .max(20)
          .describe(
            "1-based position within this result set, lower is earlier; not confidence and not comparable across queries.",
          ),
      }),
    )
    .max(20)
    .describe("Distinct matching documentation pages, bounded by the caller limit."),
  has_more: z
    .boolean()
    .describe(
      "More matching pages exist beyond this limit. Narrow query or section, increase limit up to 20, or browse list_pages.",
    ),
  ranking: z.string().describe("Explanation of the relevance ordering and rank semantics."),
});
