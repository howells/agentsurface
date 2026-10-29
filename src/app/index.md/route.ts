import { homepageCopy, numberWord } from "@/data/homepage-copy";
import { guideStages } from "@/data/homepage-guide";
import type { GuideCard, GuideStage } from "@/data/homepage-guide";
import { guideSource } from "@/lib/guide-source";
import { estimateTokens } from "@/lib/markdown";
import { NextResponse } from "next/server";

export const revalidate = false;

const SITE_ORIGIN = "https://agentsurface.dev";
const TITLE = "Agent Surface";
const START_HERE = "Start here";

function renderCard(card: GuideCard): string {
  return [
    `#### ${card.feature}: ${card.title}`,
    "",
    card.what,
    "",
    `Why it matters: ${card.why}`,
    "",
    `Applies: ${card.applies}. Read more: ${SITE_ORIGIN}${card.href}`,
  ].join("\n");
}

/** Mirrors RecommendationList: a "Start here" group, then the rest, labelled only when both exist. */
function renderCards(cards: GuideCard[]): string {
  const groups = [
    { cards: cards.filter((card) => card.applies === START_HERE), label: START_HERE },
    {
      cards: cards.filter((card) => card.applies !== START_HERE),
      label: "Depending on your product",
    },
  ].filter((group) => group.cards.length > 0);
  if (groups.length < 2) {
    return cards.map(renderCard).join("\n\n");
  }
  return groups
    .map((group) => [`### ${group.label}`, "", group.cards.map(renderCard).join("\n\n")].join("\n"))
    .join("\n\n");
}

function renderStage(stage: GuideStage, index: number): string {
  const essay = guideSource.getPage([stage.id]);
  return [
    `## ${String(index + 1).padStart(2, "0")} ${stage.name}: ${stage.question}`,
    "",
    stage.description,
    "",
    ...(essay ? [`Why it matters: [${essay.data.title}](${SITE_ORIGIN}${essay.url})`, ""] : []),
    renderCards(stage.cards),
  ].join("\n");
}

function buildContent(): string {
  const total = guideStages.reduce((count, stage) => count + stage.cards.length, 0);
  const frontmatter = [
    `title: ${JSON.stringify(TITLE)}`,
    `description: ${JSON.stringify(homepageCopy.description)}`,
    `url: ${JSON.stringify(`${SITE_ORIGIN}/`)}`,
  ].join("\n");
  const { builders } = homepageCopy.next;

  const body = [
    `# ${homepageCopy.title}`,
    "",
    homepageCopy.eyebrow,
    "",
    homepageCopy.intro,
    "",
    `For agents: start at [llms.txt](${SITE_ORIGIN}/llms.txt), add \`.md\` to any docs URL for Markdown, or connect an MCP client to ${SITE_ORIGIN}/mcp to search and read the docs.`,
    "",
    `## The ${numberWord(guideStages.length)} things to get right`,
    "",
    `${total} recommendations across ${numberWord(guideStages.length)} areas:`,
    "",
    guideStages
      .map(
        (stage, index) =>
          `${index + 1}. [${stage.name}](#${stage.id}): ${stage.question} ${stage.cards.length} recommendations.`,
      )
      .join("\n"),
    "",
    guideStages.map(renderStage).join("\n\n"),
    "",
    `## ${homepageCopy.glossary.heading}`,
    "",
    `${homepageCopy.glossary.intro} Read them all at ${SITE_ORIGIN}/glossary.`,
    "",
    `## ${homepageCopy.next.heading}`,
    "",
    homepageCopy.next.body,
    "",
    homepageCopy.next.links
      .map((link) => `- [${link.label}](${SITE_ORIGIN}${link.href})`)
      .join("\n"),
    "",
    `${builders.before}[${builders.link}](${SITE_ORIGIN}${builders.href})${builders.after}`,
    "",
    `### ${homepageCopy.skill.heading}`,
    "",
    homepageCopy.skill.body,
    "",
    "```sh",
    homepageCopy.skill.command,
    "```",
    "",
    homepageCopy.skill.note,
    "",
    "## Read more",
    "",
    `- [Documentation](${SITE_ORIGIN}/docs)`,
    `- [llms.txt](${SITE_ORIGIN}/llms.txt)`,
    `- [llms-full.txt](${SITE_ORIGIN}/llms-full.txt)`,
    `- [MCP endpoint](${SITE_ORIGIN}/mcp)`,
    `- [Glossary](${SITE_ORIGIN}/glossary)`,
    "",
  ].join("\n");

  return `---\n${frontmatter}\n---\n\n${body}`;
}

export function GET() {
  const content = buildContent();

  return new NextResponse(content, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Signal": "search=yes, ai-input=yes, ai-train=yes",
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
      "x-markdown-tokens": String(estimateTokens(content)),
    },
  });
}
