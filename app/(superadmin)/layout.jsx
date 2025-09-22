// app/(superadmin)/layout.jsx
"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/superadmin/Header';
import { Sidebar } from '@/components/superadmin/Sidebar';
import { Toaster } from 'sonner';

export default function SuperAdminLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleEdgeEnter = useCallback(() => setIsSidebarOpen(true), []);
  const handleSidebarClose = useCallback(() => setIsSidebarOpen(false), []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/login');
    } else if (session.user?.role !== 'SUPER_ADMIN') {
      console.warn("Access denied: User is not a SUPER_ADMIN");
      router.replace('/login?error=UnauthorizedRole');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    }
  }, []);

  if (status === 'loading' || !session || session.user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
        </div>
        
        <div className="relative z-10 text-center">
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/25">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
          <p className="text-xl text-white">Verifying access...</p>
          <p className="text-gray-400 mt-2">Please wait while we authenticate your session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950">
      {/* Background pattern overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%236366f1' fill-opacity='0.05'%3e%3ccircle cx='30' cy='30' r='1'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")`,
        }}></div>
      </div>

      {/* Animated floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-32 right-20 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl animate-pulse" style={{animationDelay: '3s'}}></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl animate-pulse" style={{animationDelay: '6s'}}></div>
      </div>

      <Header />

      {/* Edge hover zone */}
      <div
        className="fixed left-0 top-0 z-50 h-screen w-2 md:w-3"
        onMouseEnter={handleEdgeEnter}
      />

      <div className="relative flex flex-1 pt-20">
        <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />

        {/* Main content area */}
        <main className="relative z-10 flex-1 overflow-y-auto p-6 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
              <div className="p-8">
                {children}
              </div>
            </div>
          </div>
        </main>
        
        <Toaster 
          richColors 
          theme="system" 
          closeButton 
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            },
          }}
        />
      </div>
    </div>
  );
}