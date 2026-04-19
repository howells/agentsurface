import { readFileSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const relativePath = slug.join('/');
  const filePath = join(process.cwd(), 'src', 'content', 'docs', `${relativePath}.mdx`);

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': 'Accept',
      'Content-Signal': 'search=yes, ai-input=yes, ai-train=no',
    },
  });
}
