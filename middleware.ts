import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Content-Signal on all responses
  response.headers.set('Content-Signal', 'search=yes, ai-input=yes, ai-train=no');

  // Content negotiation for docs pages
  if (request.nextUrl.pathname.startsWith('/docs/')) {
    response.headers.set('Vary', 'Accept');
    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/markdown')) {
      const slug = request.nextUrl.pathname.replace('/docs/', '');
      return NextResponse.rewrite(new URL(`/api/md/${slug}`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
