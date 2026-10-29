import { markdownHeaders } from "@/lib/markdown";

export const dynamic = "force-static";

export function GET() {
  const content = `# Agent Surface: public coding-agent context

Use this context when contributing to https://github.com/howells/agentsurface. For reading the guide, start at https://agentsurface.dev/llms.txt instead.

## Commands

Use pnpm with the lockfile. Run these from the repository root:

- Install: \`CI=true pnpm install --frozen-lockfile\`
- Develop: \`pnpm dev\`
- Typecheck: \`pnpm typecheck\`
- Lint and formatting: \`pnpm lint\`
- Integrity and runtime contract tests: \`pnpm test\`
- Full local gate: \`pnpm prepush\`
- Production build: \`pnpm build\`

## Boundaries

Read the checkout's AGENTS.md before editing. Preserve existing work and keep one writer per checkout. Read the installed Next.js guides in node_modules/next/dist/docs before changing routing or framework code. Request interception lives in src/proxy.ts.

The published guidance is in src/content/docs. Keep APIs, schemas, discovery files and tests consistent. Use British English and spaced hyphens in prose. Do not invent authentication, commerce or other protocols just to satisfy a scanner. Public documentation, search and MCP are read-only and require no credentials.

Internal project decisions are maintained separately; this public context does not grant access to them. Do not copy private issue content, credentials or internal operating rules into public files. Do not push, merge, publish or deploy without explicit maintainer authorisation. Submit changes and test evidence for review.
`;
  return new Response(content, { headers: markdownHeaders(content) });
}
