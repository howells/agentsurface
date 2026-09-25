import { NextResponse } from "next/server";

export const revalidate = false;

const SITE_ORIGIN = "https://agentsurface.dev";

// The owner allows every crawler, including AI training crawlers: search, agent
// (user-initiated) and training use are all permitted. Named entries below document
// that decision explicitly for the crawlers Ora's scan checks; they're already covered
// by the wildcard `Allow: /`.
const NAMED_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Googlebot",
  "Applebot-Extended",
  "Applebot",
  "Meta-ExternalAgent",
  "cohere-ai",
];

export function GET() {
  const lines = [
    "User-agent: *",
    "Allow: /",
    // https://contentsignals.org/ - search, agent grounding, and model training are
    // all permitted uses of this public documentation.
    "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
    "",
    ...NAMED_CRAWLERS.flatMap((agent) => [`User-agent: ${agent}`, "Allow: /", ""]),
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    // Agentic Resource Discovery: https://agenticresourcediscovery.org/spec/
    `Agentmap: ${SITE_ORIGIN}/.well-known/ard.json`,
    "",
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
