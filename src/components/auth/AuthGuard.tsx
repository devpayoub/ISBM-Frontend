'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { getRequiredRoles } from '@/lib/auth/routes';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Every route's allowed roles are declared once in lib/auth/routes.ts (the
  // same source the sidebar uses to decide what to show). The sidebar only
  // hides a link — it doesn't stop a direct URL/bookmark from reaching a
  // page a role shouldn't see, so enforce it here too.
  const requiredRoles = pathname ? getRequiredRoles(pathname) : null;
  const isAllowed = !requiredRoles || (user?.role && requiredRoles.includes(user.role));

  useEffect(() => {
    if (hasHydrated && isAuthenticated && !isAllowed) {
      // A supplier's only guaranteed page is /support; every other role is
      // guaranteed access to "/" (the dashboard route allows all five
      // internal roles) — redirecting there can never bounce right back.
      router.replace(user?.role === 'SUPPLIER' ? '/support' : '/');
    }
  }, [hasHydrated, isAuthenticated, isAllowed, user?.role, router]);

  if (!hasHydrated || !isAuthenticated) {
    return null;
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
