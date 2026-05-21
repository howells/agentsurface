import { source } from '@/lib/source';
import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function readDocsPage(relativePath: string): string {
  const docsRoot = join(process.cwd(), 'src', 'content', 'docs');
  const candidates =
    relativePath === '' || relativePath === 'index'
      ? [join(docsRoot, 'index.mdx')]
      : [
          join(docsRoot, `${relativePath}.mdx`),
          join(docsRoot, relativePath, 'index.mdx'),
        ];

  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, 'utf-8');
    } catch {
      // Try the next candidate.
    }
  }

  return `<!-- content not found for ${relativePath} -->`;
}

export function GET() {
  const pages = source.getPages();

  const sections = pages.map((page) => {
    // page.url is like "/docs/discovery/llms-txt"
    // Strip the leading "/docs/" to get the relative path
    const relativePath = page.url.replace(/^\/docs\/?/, '') || 'index';
    const rawContent = readDocsPage(relativePath);

    const fullUrl = `https://agentsurface.dev${page.url}`;
    return `## ${page.data.title}\nURL: ${fullUrl}\n\n${rawContent}`;
  });

  const header = `# Agent Surface — Full Documentation\n\n<!-- llms-full.txt generated from ${pages.length} pages -->\n\n`;
  const body = sections.join('\n---\n');
  const content = header + body;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'x-markdown-tokens': String(estimateTokens(content)),
      'Content-Signal': 'search=yes, ai-input=yes, ai-train=no',
    },
  });
}
