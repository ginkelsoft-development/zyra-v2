import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect routes
 * Redirects to /login if not authenticated
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/api/auth/register/options',
    '/api/auth/register/verify',
    '/api/auth/login/options',
    '/api/auth/login/verify',
  ];

  // Check if route is public
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if user has valid session
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    // Redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify session with database (optional - adds latency but more secure)
  // For better performance, you can skip this and rely on the cookie
  // The API routes will verify the session anyway

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.svg (favicon files)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
};
