import { source } from '@/lib/source';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || '';
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '10'), 50);

  if (!q || q.length < 2) {
    return Response.json({ results: [], query: q });
  }

  const query = q.toLowerCase();
  const pages = source.getPages();

  const results = pages
    .filter(page => {
      const title = (page.data.title || '').toLowerCase();
      const description = (page.data.description || '').toLowerCase();
      return title.includes(query) || description.includes(query);
    })
    .slice(0, limit)
    .map(page => ({
      title: page.data.title,
      description: page.data.description || '',
      url: `https://agentsurface.dev${page.url}`,
      slug: page.slugs.join('/'),
    }));

  return Response.json(
    { results, query: q, total: results.length },
    { headers: { 'Content-Signal': 'search=yes, ai-input=yes, ai-train=no' } }
  );
}
