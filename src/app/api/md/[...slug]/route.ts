import { readFileSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function readDocsMarkdown(relativePath: string): string | null {
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

  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const relativePath = slug.join('/');
  const content = readDocsMarkdown(relativePath);

  if (content === null) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': 'Accept',
      'x-markdown-tokens': String(estimateTokens(content)),
      'Cache-Control': 'public, max-age=3600',
      'Content-Signal': 'search=yes, ai-input=yes, ai-train=no',
    },
  });
}
