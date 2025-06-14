// app/[subdomain]/(school_app)/dashboard/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSchool } from '../layout'; // Consume school data from context
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from "@/components/ui/card"; // Using parts of Shadcn Card for structure
import Link from 'next/link';
import { toast } from 'sonner';
import { Users, UserCog, Building, CalendarDays, BellPlus, DollarSign, PresentationChart, PieChart } from 'lucide-react';

// --- Helper: StatCard Component (Ensure it's robust for undefined values during loading) ---
const StatCard = ({ title, value, icon, description, isLoading, linkTo }) => {
  const titleTextClasses = "text-zinc-900 dark:text-zinc-50";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  // Using Tailwind classes for glassmorphism directly on this component's root
  const glassCardClasses = `
    p-1 min-h-[130px] flex flex-col justify-between rounded-xl 
    backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl 
    bg-white/70 border border-zinc-200/80 
    dark:bg-zinc-900/70 dark:border-zinc-700/80
    ${linkTo ? 'hover:shadow-lg dark:hover:shadow-sky-500/20 transition-shadow' : ''}
  `;
  const StatCardWrapper = linkTo ? Link : 'div';


  if (isLoading) {
    return (
      <div className={`${glassCardClasses} p-5`}> {/* Add padding for skeleton */}
        <div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
            <Skeleton className="h-5 w-3/4 bg-zinc-300 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-6 w-6 bg-zinc-300 dark:bg-zinc-700 rounded-sm" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <Skeleton className="h-8 w-1/2 mb-1 bg-zinc-400 dark:bg-zinc-600 rounded" />
          </CardContent>
        </div>
        <Skeleton className="h-4 w-full bg-zinc-300 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  return (
    <StatCardWrapper href={linkTo || undefined} className={glassCardClasses}>
      <div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-5 pt-5">
          <CardTitle className={`text-sm font-medium ${titleTextClasses}`}>{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent className="pb-2 px-5">
          <div className={`text-3xl font-bold ${titleTextClasses}`}>{value !== undefined && value !== null ? value : '-'}</div>
        </CardContent>
      </div>
      {description && <p className={`text-xs px-6 pb-4 ${descriptionTextClasses}`}>{description}</p>}
    </StatCardWrapper>
  );
};


export default function SchoolAdminDashboardPage() {
  const { data: session } = useSession();
  const schoolData = useSchool(); // from SchoolAppLayout context

  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0, 
    totalTeachers: 0, 
    totalClasses: 0, // Added totalClasses
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Tailwind class constants
  const pageTitleClasses = "text-zinc-900 dark:text-zinc-50";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/70 border border-zinc-200/80 dark:bg-zinc-900/70 dark:border-zinc-700/80`;
  const sectionTitleClasses = `text-xl font-semibold ${pageTitleClasses}`;
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";


  const fetchDashboardStats = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingStats(true);
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/dashboard-stats`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch dashboard stats (${response.status})`);
      }
      const data = await response.json();
      setDashboardStats({ // Ensure all expected fields are set, defaulting if not present
          totalStudents: data.totalStudents || 0,
          totalTeachers: data.totalTeachers || 0,
          totalClasses: data.totalClasses || 0, // Use new field
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      toast.error("Could not load dashboard statistics", { description: error.message });
      setDashboardStats({ totalStudents: 0, totalTeachers: 0, totalClasses: 0 }); // Reset on error
    } finally {
      setIsLoadingStats(false);
    }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id) {
      fetchDashboardStats();
    }
  }, [schoolData, fetchDashboardStats]);

  // Skeleton for the entire page if schoolData isn't available from context yet
  if (!schoolData && isLoadingStats) { 
    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <Skeleton className={`h-10 w-3/4 mb-2 bg-zinc-200 dark:bg-zinc-800 rounded-md`} />
        <Skeleton className={`h-6 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-md`} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className={`h-[130px] w-full ${glassCardClasses} bg-zinc-200 dark:bg-zinc-800`} />)}
        </div>
        <Skeleton className={`h-40 w-full ${glassCardClasses} bg-zinc-200 dark:bg-zinc-800`} />
      </div>
    );
  }
  
  if (!schoolData) {
      return <div className={`text-xl p-4 md:p-6 lg:p-8 ${pageTitleClasses}`}>Loading school information or school not found...</div>;
  }


  return (
    <div className="space-y-8">
      <div>
        <h1 className={`text-3xl font-bold ${pageTitleClasses}`}>
          {schoolData?.name} Dashboard
        </h1>
        <p className={descriptionTextClasses}>
          Welcome back, {session?.user?.name || 'Administrator'}! Here's an overview of your school.
        </p>
      </div>

      {/* Stats Cards Section */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Total Students" 
          value={dashboardStats.totalStudents} 
          icon={<Users className={`h-5 w-5 ${descriptionTextClasses}`} />} 
          isLoading={isLoadingStats}
          linkTo={`/${schoolData.subdomain}/people/students`}
          description="View all students"
        />
        <StatCard 
          title="Total Teachers" 
          value={dashboardStats.totalTeachers} 
          icon={<UserCog className={`h-5 w-5 ${descriptionTextClasses}`} />} 
          isLoading={isLoadingStats}
          linkTo={`/${schoolData.subdomain}/people/teachers`}
          description="Manage teaching staff"
        />
        <StatCard 
          title="Total Classes" // Updated title
          value={dashboardStats.totalClasses} // Use new stat
          icon={<Building className={`h-5 w-5 ${descriptionTextClasses}`} />} 
          isLoading={isLoadingStats}
          linkTo={`/${schoolData.subdomain}/academics/classes`}
          description="View all classes"
        />
      </section>

      {/* Quick Actions & Other Sections */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className={`lg:col-span-2 ${glassCardClasses}`}>
          <h2 className={`${sectionTitleClasses} mb-4 border-none pb-0`}>Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button asChild className={`${primaryButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${schoolData.subdomain}/people/students/add`}> 
                <Users className="mr-2 h-4 w-4" /> Add New Student
              </Link>
            </Button>
            <Button asChild className={`${primaryButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${schoolData.subdomain}/people/teachers/add`}>
                <UserCog className="mr-2 h-4 w-4" /> Add New Teacher
              </Link>
            </Button>
            <Button asChild className={`${primaryButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${schoolData.subdomain}/academics/timetable`}>
                <CalendarDays className="mr-2 h-4 w-4" /> View Timetable
              </Link>
            </Button>
            <Button asChild className={`${primaryButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${schoolData.subdomain}/communication/announcements/create`}>
                <BellPlus className="mr-2 h-4 w-4" /> Send Announcement
              </Link>
            </Button>
          </div>
        </div>

        <div className={glassCardClasses}>
          <h2 className={`${sectionTitleClasses} mb-4 border-none pb-0`}>Upcoming Events</h2>
          <div className={`text-center py-8 ${descriptionTextClasses}`}>
            <CalendarDays className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2 text-sm">No upcoming events scheduled yet.</p>
            {/* <p className="text-xs">Events module coming soon!</p> */}
          </div>
        </div>
      </section>
      
      <section className={glassCardClasses}>
        <h2 className={`${sectionTitleClasses} mb-4 border-none pb-0 flex items-center`}>
            <DollarSign className={`mr-2 h-5 w-5 ${descriptionTextClasses}`}/>
            Financial Snapshot
        </h2>
        <div className={`text-center py-8 ${descriptionTextClasses}`}>
            <PieChart className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2 text-sm">Financial overview will be displayed here.</p>
            {/* <p className="text-xs">Finance module integration coming soon!</p> */}
        </div>
      </section>
    </div>
  );
}