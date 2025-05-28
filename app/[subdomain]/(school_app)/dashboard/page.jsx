// app/[subdomain]/(school_app)/dashboard/page.jsx
'use client';

import { useSession } from 'next-auth/react';
import { useSchool } from '../layout'; // Assuming layout exports useSchool context hook
import { Skeleton } from '@/components/ui/skeleton'; // For content loading

export default function SchoolAdminDashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const schoolData = useSchool(); // Consume school data from context

  // Tailwind class constants
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;


  // You would fetch dashboard-specific data here
  // For now, just display welcome message and school info from context/session

  if (sessionStatus === 'loading' || !schoolData) {
    return (
      <div className="space-y-6">
        <Skeleton className={`h-10 w-3/4 mb-2 ${titleTextClasses} bg-zinc-200 dark:bg-zinc-800`} />
        <Skeleton className={`h-6 w-1/2 ${descriptionTextClasses} bg-zinc-200 dark:bg-zinc-800`} />
        <div className={glassCardClasses}>
            <Skeleton className={`h-8 w-1/3 mb-4 ${titleTextClasses} bg-zinc-200 dark:bg-zinc-800`} />
            <Skeleton className={`h-20 w-full ${descriptionTextClasses} bg-zinc-200 dark:bg-zinc-800`} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold ${titleTextClasses}`}>
          Welcome to {schoolData?.name || 'Your School'} Dashboard
        </h1>
        <p className={descriptionTextClasses}>
          Hello, {session?.user?.name || 'Administrator'}! Manage your school efficiently.
        </p>
      </div>

      <div className={glassCardClasses}>
        <h2 className={`text-xl font-semibold mb-4 ${titleTextClasses}`}>School Overview</h2>
        <p className={descriptionTextClasses}>
          This is where school-specific statistics and quick actions will appear.
        </p>
        <p className={`${descriptionTextClasses} mt-2`}>Subdomain: {schoolData?.subdomain}</p>
        <p className={`${descriptionTextClasses} mt-2`}>School ID from Session: {session?.user?.schoolId}</p>
        <p className={`${descriptionTextClasses} mt-2`}>School ID from Context: {schoolData?.id}</p>
        {/* Add more dashboard widgets here */}
      </div>
      
      {/* Example: Placeholder for more content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={glassCardClasses}>
          <h3 className={`text-lg font-semibold mb-2 ${titleTextClasses}`}>Students</h3>
          <p className={descriptionTextClasses}>Quick student stats and management links.</p>
        </div>
        <div className={glassCardClasses}>
          <h3 className={`text-lg font-semibold mb-2 ${titleTextClasses}`}>Teachers</h3>
          <p className={descriptionTextClasses}>Teacher management and performance.</p>
        </div>
      </div>
    </div>
  );
}