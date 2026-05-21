import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function GET() {
  const content = readFileSync(join(process.cwd(), 'AGENTS.md'), 'utf-8');

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'x-markdown-tokens': String(estimateTokens(content)),
      'Content-Signal': 'search=yes, ai-input=yes, ai-train=no',
    },
  });
}
