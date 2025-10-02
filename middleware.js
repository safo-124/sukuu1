// middleware.js
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

  // Reserved root-level path segments that are NOT tenant subdomains
  const reservedRootSegments = new Set([
    '', 'api', '_next', 'static', 'favicon.ico', 'assets', 'images', 'fonts',
    // Auth-related root paths must NOT be misinterpreted as tenant subdomains
    'login', 'teacher-login', 'auth'
  ]);

  // If on main domain, detect path-based tenant: /{subdomain}/...
  let pathSubdomain = null;
  if (isMainDomainRequest) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0 && !reservedRootSegments.has(parts[0])) {
      pathSubdomain = parts[0];
    }
  }

  // If on main domain and path-based tenant detected, enforce role-based routing for tenant paths
  if (isMainDomainRequest && pathSubdomain) {
    try {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      const tenant = pathSubdomain;
      const tenantRelativePath = '/' + pathname.split('/').filter(Boolean).slice(1).join('/'); // strip the first segment (tenant)
      const lowerTenantPath = tenantRelativePath.toLowerCase() || '/';

      const isLoginPath = lowerTenantPath === '/login' || lowerTenantPath === '/teacher-login';
  const isTeacherLogin = lowerTenantPath === '/teacher-login';
      const isTeacherDashboard = lowerTenantPath.startsWith('/dashboard/teacher');
  const isSettingsPath = lowerTenantPath.startsWith('/settings');

      const teacherAllowedPrefixes = [
        '/dashboard/teacher',
        // Teacher academics live under /teacher/academics/*
        '/teacher/academics',
        // Canonical teacher students route
        '/teacher/students',
        // Teacher-specific people routes
        '/teacher/people',
        // Explicit teacher staff directory path
        '/teacher/people/teachers',
        // Backwards-compat (legacy teacher access under people/*)
        '/people/students',
        '/people/teachers',
        '/attendance/students',
        '/attendance/staff',
        // Allow teachers to manage/view hostel resources
        '/resources/hostel',
        '/communication/announcements',
        '/hr/payroll',
        '/teacher-login',
      ];
      const studentAllowedPrefixes = [
        '/dashboard',
        '/student/dashboard',
        '/academics/assignments',
        '/academics/grades',
        '/academics/timetable',
        '/academics/examinations',
        '/academics/subjects',
        '/attendance/students',
        '/finance/invoices',
        '/finance/payments',
        '/resources/library',
        '/resources/hostel',
        '/communication/announcements',
        '/login'
      ];
      const startsWithAny = (p, arr) => arr.some(a => p === a || p.startsWith(a + '/'));

      const buildTenantPath = (p) => `/${tenant}${p}`;

      if (!token) {
        if (isLoginPath) {
          // allow
        } else if (isTeacherDashboard) {
          url.pathname = buildTenantPath('/teacher-login');
          return NextResponse.redirect(url);
        }
      } else {
        const tokenSub = (token.schoolSubdomain || token.subdomain || '').toLowerCase();
        if (tokenSub && tokenSub !== tenant.toLowerCase()) {
          const alreadyError = url.searchParams.get('error') === 'UnauthorizedSchool';
          const isLoginLike = (lowerTenantPath === '/login' || lowerTenantPath === '/teacher-login');
          // If currently on ANY login variant, just append error param once and allow pass-through (no redirect)
          if (isLoginLike) {
            if (!alreadyError) {
              url.searchParams.set('error', 'UnauthorizedSchool');
              return NextResponse.redirect(url);
            }
            // Allow staying on the same login page
          } else if (!alreadyError) {
            // Not on login page yet: send to login with error param
            url.pathname = buildTenantPath(token.role === 'TEACHER' ? '/teacher-login' : '/login');
            url.searchParams.set('error', 'UnauthorizedSchool');
            return NextResponse.redirect(url);
          }
          // If alreadyError and not on login, we intentionally do NOT bounce again to avoid loops; allow next handler to maybe redirect based on role logic.
        }
        const role = token.role;
        if (isLoginPath) {
          url.pathname = buildTenantPath(role === 'TEACHER' ? '/dashboard/teacher' : '/dashboard');
          return NextResponse.redirect(url);
        }
  if (role === 'TEACHER') {
          if (lowerTenantPath === '/dashboard') {
            url.pathname = buildTenantPath('/dashboard/teacher');
            return NextResponse.redirect(url);
          }
          // Redirect legacy /academics/* to /teacher/academics/* for teachers
          if (lowerTenantPath.startsWith('/academics/')) {
            url.pathname = buildTenantPath('/teacher' + lowerTenantPath);
            return NextResponse.redirect(url);
          }
          const isAllowed = startsWithAny(lowerTenantPath, teacherAllowedPrefixes);
          if (!isAllowed) {
            url.pathname = buildTenantPath('/dashboard/teacher');
            return NextResponse.redirect(url);
          }
        } else if (role === 'STUDENT') {
          // Students redirected away from teacher or admin-only areas
          if (lowerTenantPath.startsWith('/dashboard/teacher')) {
            url.pathname = buildTenantPath('/dashboard');
            return NextResponse.redirect(url);
          }
          const isAllowed = startsWithAny(lowerTenantPath, studentAllowedPrefixes);
          if (!isAllowed) {
            url.pathname = buildTenantPath('/dashboard');
            return NextResponse.redirect(url);
          }
        } else {
          if (isTeacherDashboard) {
            url.pathname = buildTenantPath('/dashboard');
            return NextResponse.redirect(url);
          }
          if (isTeacherLogin) {
            url.pathname = buildTenantPath('/login');
            return NextResponse.redirect(url);
          }
          // Only SCHOOL_ADMIN may access School Settings
          if (isSettingsPath && role !== 'SCHOOL_ADMIN') {
            url.pathname = buildTenantPath('/dashboard');
            return NextResponse.redirect(url);
          }
        }
      }
    } catch (e) {
      console.warn('Middleware path-tenant token handling error:', e);
    }
    // For path-based tenants, do not rewrite; continue to route as-is
    return NextResponse.next();
  }

  if (isMainDomainRequest) {
    // Allow Next.js to handle routing for the main domain when no tenant path is detected.
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

  // Server-side role enforcement for subdomain tenant routing
  // We do this BEFORE rewriting the pathname so redirects go to clean, tenant-relative paths
  if (subdomain && subdomain !== 'www') {
    try {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

      const lowerPath = pathname.toLowerCase();
      const isLoginPath = lowerPath === '/login' || lowerPath === '/teacher-login';
      const isTeacherLogin = lowerPath === '/teacher-login';
  const isTeacherDashboard = lowerPath.startsWith('/dashboard/teacher');
  const isSettingsPath = lowerPath.startsWith('/settings');

      // Teacher allowed prefixes (tenant-relative – no subdomain prefix here)
      const teacherAllowedPrefixes = [
        '/dashboard/teacher',
        '/teacher/academics',
        // Canonical teacher students route
        '/teacher/students',
        '/teacher/people',
        '/teacher/people/teachers',
        '/people/students',
        '/people/teachers',
        '/attendance/students',
        '/attendance/staff',
        // Allow teachers to manage/view hostel resources
        '/resources/hostel',
        '/communication/announcements',
        '/hr/payroll',
        '/teacher-login',
      ];
      const studentAllowedPrefixes = [
        '/dashboard',
        '/student/dashboard',
        '/academics/assignments',
        '/academics/grades',
        '/academics/timetable',
        '/academics/examinations',
        '/academics/subjects',
        '/attendance/students',
        '/finance/invoices',
        '/finance/payments',
        '/resources/library',
        '/resources/hostel',
        '/communication/announcements',
        '/login'
      ];

      const startsWithAny = (p, arr) => arr.some(a => p === a || p.startsWith(a + '/'));

      // If unauthenticated and requesting protected areas, route to role-appropriate login
      if (!token) {
        // Allow reaching the login pages unauthenticated
        if (isLoginPath) {
          // Continue to rewrite at the end
        } else if (isTeacherDashboard) {
          // Teacher dashboard requires teacher login
          url.pathname = '/teacher-login';
          return NextResponse.redirect(url);
        }
        // Otherwise, let it fall through; client-side layout will handle most cases
      } else {
        // If token exists but belongs to a different school subdomain, force logout flow
        const tokenSubdomain = (token.schoolSubdomain || token.subdomain || '').toLowerCase();
        if (tokenSubdomain && tokenSubdomain !== subdomain.toLowerCase()) {
          const alreadyError = url.searchParams.get('error') === 'UnauthorizedSchool';
          const isLoginLike = (lowerPath === '/login' || lowerPath === '/teacher-login');
          if (isLoginLike) {
            if (!alreadyError) {
              url.searchParams.set('error', 'UnauthorizedSchool');
              return NextResponse.redirect(url);
            }
            // Allow remaining on login page without further redirects.
          } else if (!alreadyError) {
            url.pathname = token.role === 'TEACHER' ? '/teacher-login' : '/login';
            url.searchParams.set('error', 'UnauthorizedSchool');
            return NextResponse.redirect(url);
          }
          // If alreadyError and not on login, do not force another redirect; avoid loop.
        }

        const role = token.role;

        // If authenticated users land on login pages, send them to their dashboards
        if (isLoginPath) {
          url.pathname = role === 'TEACHER' ? '/dashboard/teacher' : '/dashboard';
          return NextResponse.redirect(url);
        }

  if (role === 'TEACHER') {
          // Teachers redirected away from generic admin dashboard
          if (lowerPath === '/dashboard') {
            url.pathname = '/dashboard/teacher';
            return NextResponse.redirect(url);
          }
          // Redirect legacy /academics/* to /teacher/academics/*
          if (lowerPath.startsWith('/academics/')) {
            url.pathname = '/teacher' + lowerPath;
            return NextResponse.redirect(url);
          }
          // Enforce allowlist for teachers to avoid admin-only sections
          const isAllowed = startsWithAny(lowerPath, teacherAllowedPrefixes);
          if (!isAllowed) {
            url.pathname = '/dashboard/teacher';
            return NextResponse.redirect(url);
          }
        } else if (role === 'STUDENT') {
          if (lowerPath.startsWith('/dashboard/teacher')) {
            url.pathname = '/dashboard';
            return NextResponse.redirect(url);
          }
          const isAllowed = startsWithAny(lowerPath, studentAllowedPrefixes);
            if (!isAllowed) {
              url.pathname = '/dashboard';
              return NextResponse.redirect(url);
            }
        } else {
          // Non-teachers going to teacher-only academics should go to admin academics
          if (lowerPath.startsWith('/teacher/academics')) {
            url.pathname = lowerPath.replace('/teacher/academics', '/academics');
            return NextResponse.redirect(url);
          }
          // Non-teachers: redirect away from teacher-only pages
          if (isTeacherDashboard) {
            url.pathname = '/dashboard';
            return NextResponse.redirect(url);
          }
          if (isTeacherLogin) {
            url.pathname = '/login';
            return NextResponse.redirect(url);
          }
          // Only SCHOOL_ADMIN may access School Settings
          if (isSettingsPath && role !== 'SCHOOL_ADMIN') {
            url.pathname = '/dashboard';
            return NextResponse.redirect(url);
          }
        }
      }
    } catch (err) {
      // In case of any token decode errors, proceed to rewrite (defense in depth still on client side)
      console.warn('Middleware token handling error:', err);
    }
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