import { glossaryMarkdown } from "@/lib/glossary-markdown";

export const siteMarkdown: Record<string, string> = {
  about: `# About Agent Surface

Agent Surface explains how to make a website, app, API or CLI work with AI agents, and how to build agents of your own. Daniel Howells writes and maintains it.

## What it covers

The guide has two parts. [Make your product agent-ready](https://agentsurface.dev/docs) covers discovery, context files, APIs, tools, CLIs, MCP servers, authentication, errors, retrieval, agentic UI and agentic commerce. [Build agents](https://agentsurface.dev/docs/agents) is a current inventory of the frameworks, protocols and tools for teams building agents of their own.

## What you can use

Everything here is free to read and reuse under the MIT licence: the docs, the Surface skill for coding agents, the starter templates, and the scorecard used to audit a codebase.

Agents can read the site too. Every page is available as Markdown, the whole site is indexed in [llms.txt](https://agentsurface.dev/llms.txt), and an MCP server at POST /mcp searches and reads the docs. The server is listed in the [official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers/dev.agentsurface%2Fdocs/versions/latest) as dev.agentsurface/docs. None of it needs an account or a key.

## How it's kept current

Pages about fast-moving tools carry a last-verified date, and a page that goes 120 days without a check is flagged to be verified again against primary sources. Model names in examples are checked against a single allowlist during the build, and each entry on it is verified against the provider's own documentation.

The site itself is tested with the public agent-readiness checkers from Google Lighthouse, Cloudflare, Ora and Vercel, and the [scanner guide](https://agentsurface.dev/docs/scoring/public-scanners) explains what each one measures.

## Who makes it

Agent Surface is made by Daniel Howells. More about him at [danielhowells.com](https://danielhowells.com). The source is public on [GitHub](https://github.com/howells/agentsurface).

## Corrections

If something is wrong or out of date, [get in touch](https://agentsurface.dev/contact) or open an issue on GitHub with the page and a link to the source that shows the correct answer.`,
  contact: `# Contact

Corrections, suggestions and questions are all welcome. Most of them are best raised on GitHub, where anyone can see the fix.

## Report a mistake

[Open an issue](https://github.com/howells/agentsurface/issues/new) with the page address and what's wrong. A link to a primary source, such as a specification, changelog or vendor document, makes it quicker to check and fix.

## Suggest a change

Pull requests are welcome on the [repository](https://github.com/howells/agentsurface). Every docs page links to its source file, so you can go straight from the page you're reading to the file that needs changing.

## Email

For anything you'd rather not post in public, email Daniel Howells at [daniel@danielhowells.com](mailto:daniel@danielhowells.com).

## For agents

Agents don't need to contact anyone to use the site. Search and read the docs through the MCP server at POST /mcp (listed in the [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers/dev.agentsurface%2Fdocs/versions/latest)), the API described in [openapi.json](https://agentsurface.dev/openapi.json), or the index in [llms.txt](https://agentsurface.dev/llms.txt). None of them need an account or a key.`,
  privacy: `# Privacy

Last updated 25 September 2026.

Very little. There are no accounts, no analytics and no advertising. The only record of a visit is the request log kept by the company that hosts the site.

## What we collect

Nothing about you directly. The site has no sign-in, no forms, no analytics scripts, no tracking pixels and no advertising.

## Cookies and storage

The site sets no cookies. If you pick a light or dark theme, your browser remembers the choice in its own local storage, which stays on your device.

## Hosting and logs

The site runs on Vercel. Like any web host, Vercel handles each request, including your IP address, your browser's user agent and the address you asked for, and keeps logs to run and secure the service. It does so under [its own privacy policy](https://vercel.com/legal/privacy-notice).

## Search, API and MCP

Search queries, API calls and MCP requests are handled on the server to return a result. We don't store them or link them to anyone, beyond the host's request logs described above.

## Fonts and links

Fonts are served from this site, so reading a page sends nothing to a font service. Links to other sites take you to services with their own privacy policies.

## Questions

Email [daniel@danielhowells.com](mailto:daniel@danielhowells.com).`,
  patterns: `# Pattern studio

Line fields, after Bridget Riley. One curve, repeated. Change how it grows across the field, how it travels from line to line, and how it tightens along its length. The result is the artwork on the glossary cards, and you can download any variation as SVG.

The [interactive studio](https://agentsurface.dev/patterns) lets a human adjust progression, drift and ribbon, preview the line field and download the resulting SVG. This text describes the tool; it cannot reproduce the interactive controls. The artwork is decorative and does not encode documentation facts.

See the [glossary](https://agentsurface.dev/glossary) for the terms illustrated by these patterns.`,
};

export function sitePageMarkdown(slug: string): string | undefined {
  const body =
    slug === "glossary"
      ? `# Agentic glossary\n\nPlain-language definitions for product, business and engineering teams. The interactive cards and filters have the same definitions as the docs glossary.\n\n${glossaryMarkdown()}`
      : siteMarkdown[slug];
  return body
    ? `Source: https://agentsurface.dev/${slug}\nIndex: https://agentsurface.dev/llms.txt\n\n${body}\n`
    : undefined;
}
