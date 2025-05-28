// middleware.js
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  const hostname = request.headers.get('host') || '';

  // For local development, mainDomain is localhost:3000
  // For production, set NEXT_PUBLIC_MAIN_DOMAIN in your environment variables
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';

  const isPlatformAssetOrApi =
    pathname.startsWith('/api/') || // Handles all API routes
    pathname.startsWith('/_next/') || // Next.js internals
    pathname.startsWith('/static/') || // Your static assets in /public/static
    pathname.includes('.'); // Excludes file requests like .png, .ico, .css, .js

  if (isPlatformAssetOrApi) {
    return NextResponse.next();
  }

  // Check if accessing via the main domain (localhost:3000 or your production domain)
  // or a common www prefix (less relevant for localhost but good for production).
  const isMainDomainRequest = hostname === mainDomain || hostname === `www.${mainDomain}`;

  if (isMainDomainRequest) {
    // Allow Next.js to handle routing for the main domain.
    // This serves Super Admin pages (e.g., /dashboard, /schools from app/(superadmin)/*)
    // and any marketing/root pages.
    return NextResponse.next();
  }

  // If not the main domain, attempt to extract a subdomain.
  let subdomain;
  if (hostname.includes('localhost')) { // Specifically for local development
    // e.g., 'myschool' from 'myschool.localhost:3000'
    subdomain = hostname.split('.')[0];
  } else if (hostname.endsWith(`.${mainDomain}`)) { // For production/staging
    // e.g., 'myschool' from 'myschool.sukuu.com'
    subdomain = hostname.replace(`.${mainDomain}`, '');
  }

  if (subdomain && subdomain !== 'www') {
    // Rewrite the URL to map to your [subdomain] dynamic route structure
    // e.g., on myschool.localhost:3000/dashboard -> rewrite to /myschool/dashboard
    console.log(`Rewriting for subdomain: ${subdomain} - Original pathname: ${pathname} to /${subdomain}${pathname}`);
    url.pathname = `/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Fallback for any other unexpected hostnames or if subdomain extraction fails.
  // You might want to redirect to your main site or an error page.
  // For now, letting it pass, but consider this an edge case.
  console.warn(`Unhandled hostname: ${hostname}. Letting request pass.`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth (global NextAuth.js routes, ensure these are not rewritten if they are global)
     * Adjust if your other API routes are global or tenant-specific.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};