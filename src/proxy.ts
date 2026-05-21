import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('Content-Signal', 'search=yes, ai-input=yes, ai-train=no');

  if (
    request.nextUrl.pathname === '/docs' ||
    request.nextUrl.pathname.startsWith('/docs/')
  ) {
    response.headers.set('Vary', 'Accept');

    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/markdown')) {
      const slug = request.nextUrl.pathname.replace(/^\/docs\/?/, '') || 'index';
      const rewrite = NextResponse.rewrite(
        new URL(`/api/md/${slug}`, request.url)
      );

      rewrite.headers.set(
        'Content-Signal',
        'search=yes, ai-input=yes, ai-train=no'
      );
      rewrite.headers.set('Vary', 'Accept');
      return rewrite;
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
