import { source } from '@/lib/source';
import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
  const pages = source.getPages();

  const sections = pages.map((page) => {
    // page.url is like "/docs/discovery/llms-txt"
    // Strip the leading "/docs/" to get the relative path
    const relativePath = page.url.replace(/^\/docs\/?/, '') || 'index';
    const filePath = join(process.cwd(), 'src', 'content', 'docs', `${relativePath}.mdx`);

    let rawContent = '';
    try {
      rawContent = readFileSync(filePath, 'utf-8');
    } catch {
      rawContent = `<!-- content not found at ${filePath} -->`;
    }

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
    },
  });
}
