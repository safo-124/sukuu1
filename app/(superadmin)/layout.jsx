// app/(superadmin)/layout.jsx
"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // App Router
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/superadmin/Header'; // Adjust path
import { Sidebar } from '@/components/superadmin/Sidebar'; // Adjust path
import { Toaster } from 'sonner';

export default function SuperAdminLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Edge hover open handler
  const handleEdgeEnter = useCallback(() => setIsSidebarOpen(true), []);
  const handleSidebarClose = useCallback(() => setIsSidebarOpen(false), []);

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

  // Open sidebar by default on large screens for discoverability
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    }
  }, []);

  // Show a loading state or null while determining auth status or if redirecting
  if (status === 'loading' || !session || session.user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-950 dark:to-zinc-900">
        <p className="text-xl text-slate-700 dark:text-zinc-200">Loading or Access Denied...</p>
        {/* You could put a more sophisticated loader here */}
      </div>
    );
  }

  // If session exists and user is SUPER_ADMIN, render the layout with children
  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-slate-100/70 to-slate-200/70 dark:from-zinc-950/90 dark:to-zinc-900/90">
      {/* Background pattern overlay (subtle) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(1000px_600px_at_0%_0%,rgba(14,165,233,0.08),transparent),radial-gradient(800px_500px_at_100%_100%,rgba(99,102,241,0.06),transparent)]" />

      <Header />

      {/* Edge hover zone: opens sidebar on hover */}
      <div
        className="fixed left-0 top-0 z-50 h-screen w-2 md:w-2 lg:w-3 xl:w-4"
        onMouseEnter={handleEdgeEnter}
      />

      <div className="relative flex flex-1 pt-16"> {/* pt-16 for header height */}
        <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />

        {/* Main content area with glass card effect wrapper */}
        <main className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="rounded-xl border border-white/20 bg-white/40 p-4 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/40">
            {children}
          </div>
        </main>
        <Toaster richColors theme="system" closeButton position="top-right" />
      </div>
    </div>
  );
}