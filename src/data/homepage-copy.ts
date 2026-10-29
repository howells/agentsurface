/**
 * Homepage prose shared by the HTML page and its Markdown twin (/index.md), so the
 * two representations cannot drift apart.
 */
export const homepageCopy = {
  description:
    "A practical guide to agent-ready websites and apps. Explore discovery, understanding, connections, permissions, usability, reliability, payments, and measurement, with clear recommendations and detailed implementation docs.",
  eyebrow: "A practical guide to agent-ready products",
  glossary: {
    heading: "The language of agents",
    intro: "Plain-language definitions of the terms in this guide.",
  },
  intro:
    "Help agents find your product, understand what it offers, and use it on a customer’s behalf. Here’s what to consider, why it matters, and where to start.",
  next: {
    body: "Choose a task a customer wants to complete and follow it from discovery to the final result. Use the docs for implementation detail, examples, and the tradeoffs behind each recommendation.",
    builders: {
      after: ".",
      before:
        "This guide covers making your product work for agents. Building your own agents instead? ",
      href: "/docs/agents",
      link: "See the agent-building guide",
    },
    heading: "Put the guide to work",
    links: [
      { href: "/docs/scoring/product-journeys", label: "Evaluate a customer task" },
      { href: "/docs", label: "Browse the docs" },
      { href: "/glossary", label: "Explore the glossary" },
    ],
  },
  skill: {
    body: "Install the Surface skill to apply this guidance to your codebase: explain a topic, assess what exists, or turn the findings into an implementation plan.",
    command: "npx skills add https://github.com/howells/agentsurface",
    heading: "Work through it with your coding agent",
    note: "For Codex, Claude Code, Cursor, and other agents that support skills.",
  },
  title: "Make your website and app work with AI agents.",
} as const;

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

/** Spell out a small count, e.g. for "the eight areas". Falls back to the digit past ten. */
export function numberWord(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}
