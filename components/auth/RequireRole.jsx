'use client';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RequireRole({ role, children, fallback = null }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      const sd = params?.subdomain ? `/${params.subdomain}/login` : '/login';
      router.replace(sd);
      return;
    }
    if (role && session.user.role !== role) {
      // Redirect by role to the correct entry point
      const sd = params?.subdomain ? `/${params.subdomain}` : '';
      if (session.user.role === 'TEACHER') router.replace(`${sd}/dashboard/teacher`);
      else router.replace(`${sd}/dashboard`);
    }
  }, [status, session?.user, role, router, params?.subdomain]);

  if (status === 'loading') return fallback;
  if (!session?.user) return fallback;
  if (role && session.user.role !== role) return fallback;
  return children;
}
