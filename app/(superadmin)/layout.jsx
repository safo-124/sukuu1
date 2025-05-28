// app/(superadmin)/layout.jsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // App Router
import { useEffect } from 'react';
import { Header } from '@/components/superadmin/Header'; // Adjust path
import { Sidebar } from '@/components/superadmin/Sidebar'; // Adjust path
import { Toaster } from 'sonner';

export default function SuperAdminLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Don't do anything while session is loading
    if (!session) {
      router.replace('/login'); // Redirect to login if not authenticated
    } else if (session.user?.role !== 'SUPER_ADMIN') {
      // If logged in but not SUPER_ADMIN, deny access or redirect
      // This could be a generic '/unauthorized' page or back to login with an error
      console.warn("Access denied: User is not a SUPER_ADMIN");
      router.replace('/login?error=UnauthorizedRole');
    }
  }, [session, status, router]);

  // Show a loading state or null while determining auth status or if redirecting
  if (status === 'loading' || !session || session.user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl card-title-bw">Loading or Access Denied...</p>
        {/* You could put a more sophisticated loader here */}
      </div>
    );
  }

  // If session exists and user is SUPER_ADMIN, render the layout with children
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1 pt-16"> {/* pt-16 for header height */}
        <Sidebar />
        <main className="flex-1 p-4 sm:ml-64 overflow-y-auto"> {/* sm:ml-64 for sidebar width */}
          {children}
        </main>
        <Toaster richColors theme="system" closeButton position="top-right" />
      </div>
    </div>
  );
}