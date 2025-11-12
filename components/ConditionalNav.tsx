'use client';

import { usePathname } from 'next/navigation';
import TopNavigation from './TopNavigation';

/**
 * Conditionally render TopNavigation based on current route
 * Hide navigation on public routes like /login
 */
export default function ConditionalNav() {
  const pathname = usePathname();

  // Routes where navigation should be hidden
  const publicRoutes = ['/login'];

  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Don't render navigation on public routes
  if (isPublicRoute) {
    return null;
  }

  return <TopNavigation />;
}
