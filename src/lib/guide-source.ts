import { guide } from "@/.source/server";
import { guideStages } from "@/data/homepage-guide";
import { loader } from "fumadocs-core/source";

const SITE_ORIGIN = "https://agentsurface.dev";

/**
 * One editorial essay per homepage area (see src/data/homepage-guide.ts). Flat
 * collection, so `getPage([areaId])` and `generateParams()` are all this needs -
 * no page tree or sidebar.
 */
export const guideSource = loader({
  baseUrl: "/guide",
  source: guide.toFumadocsSource(),
});

type GuidePage = ReturnType<typeof guideSource.getPages>[number];

/** Whole minutes to read a guide page at an average 230 words a minute. */
export async function readingMinutes(page: GuidePage): Promise<number> {
  const words = (await page.data.getText("processed")).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

/** Frontmatter + processed Markdown body + the area's recommendations, as served at /guide/<area>.md. */
export async function renderGuidePage(page: GuidePage): Promise<string> {
  const { data } = page;
  const stage = guideStages.find((candidate) => candidate.id === data.area);
  const lines = [
    `title: ${JSON.stringify(data.title)}`,
    `description: ${JSON.stringify(data.description ?? "")}`,
    `url: ${JSON.stringify(`${SITE_ORIGIN}${page.url}`)}`,
  ];
  if (data.lastModified) {
    lines.push(`lastModified: ${new Date(data.lastModified).toISOString()}`);
  }

  const body = await data.getText("processed");
  const recommendations = stage
    ? [
        "",
        "## Recommendations",
        "",
        stage.cards
          .map((card) => `- [${card.title}](${SITE_ORIGIN}${card.href}): ${card.what}`)
          .join("\n"),
      ].join("\n")
    : "";

  return `---\n${lines.join("\n")}\n---\n\n${body}${recommendations}\n`;
}
