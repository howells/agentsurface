import { guideStages } from "@/data/homepage-guide";
import type { GuideCard, GuideStage } from "@/data/homepage-guide";
import { estimateTokens } from "@/lib/markdown";
import { NextResponse } from "next/server";

export const revalidate = false;

const SITE_ORIGIN = "https://agentsurface.dev";
const TITLE = "Agent Surface";
const DESCRIPTION =
  "A dense guide to agent-readable software, production agent systems, protocols, tooling, retrieval, evaluation, and the surface skill.";

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

function renderStage(stage: GuideStage): string {
  return [
    `## ${stage.name}: ${stage.question}`,
    "",
    stage.description,
    "",
    stage.cards.map(renderCard).join("\n\n"),
  ].join("\n");
}

function buildContent(): string {
  const frontmatter = [
    `title: ${JSON.stringify(TITLE)}`,
    `description: ${JSON.stringify(DESCRIPTION)}`,
    `url: ${JSON.stringify(`${SITE_ORIGIN}/`)}`,
  ].join("\n");

  const body = [
    `# ${TITLE}`,
    "",
    DESCRIPTION,
    "",
    guideStages.map(renderStage).join("\n\n"),
    "",
    "## Read more",
    "",
    `- [Documentation](${SITE_ORIGIN}/docs)`,
    `- [llms.txt](${SITE_ORIGIN}/llms.txt)`,
    `- [llms-full.txt](${SITE_ORIGIN}/llms-full.txt)`,
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
