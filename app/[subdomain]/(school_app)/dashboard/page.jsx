// app/[subdomain]/(school_app)/dashboard/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Users, UserCog, Building, CalendarDays, BellPlus, DollarSign, BarChart3, PieChart, ListChecks, Receipt, Clock3 } from 'lucide-react';

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
  const params = useParams();
  const subdomain = params?.subdomain;
  const router = useRouter();

  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0, 
    totalTeachers: 0, 
    totalClasses: 0, // Added totalClasses
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [studentPerformance, setStudentPerformance] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [studentCounts, setStudentCounts] = useState({ pendingAssignments: 0, unpaidInvoices: 0, nextExam: null });
  const [loadingStudentCounts, setLoadingStudentCounts] = useState(false);

  // Tailwind class constants
  const pageTitleClasses = "text-zinc-900 dark:text-zinc-50";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/70 border border-zinc-200/80 dark:bg-zinc-900/70 dark:border-zinc-700/80`;
  const sectionTitleClasses = `text-xl font-semibold ${pageTitleClasses}`;
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  // Redirect procurement officers to their dedicated dashboard
  useEffect(() => {
    if (session?.user?.role === 'PROCUREMENT_OFFICER' && subdomain) {
      router.replace(`/${subdomain}/dashboard/procurement`);
    }
  }, [session?.user?.role, subdomain, router]);



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
    if (schoolData?.id && session?.user?.role !== 'STUDENT') {
      fetchDashboardStats();
    }
  }, [schoolData, fetchDashboardStats, session?.user?.role]);

  // Load student performance if student
  useEffect(() => {
    if (!schoolData?.id || session?.user?.role !== 'STUDENT') return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingPerformance(true);
        const res = await fetch(`/api/schools/${schoolData.id}/students/me/performance`);
        if (!cancelled && res.ok) {
          setStudentPerformance(await res.json());
        }
      } catch (e) {
        console.error('Performance load error', e);
      } finally {
        if (!cancelled) setLoadingPerformance(false);
      }
    })();
    return () => { cancelled = true; };
  }, [schoolData?.id, session?.user?.role]);

  // Load student quick counts (assignments, invoices, next exam)
  useEffect(() => {
    if (!schoolData?.id || session?.user?.role !== 'STUDENT') return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingStudentCounts(true);
        const [assRes, invRes] = await Promise.all([
          fetch(`/api/schools/${schoolData.id}/students/me/assignments`),
          fetch(`/api/schools/${schoolData.id}/students/me/invoices`),
        ]);
        let pendingAssignments = 0;
        if (assRes.ok) {
          const d = await assRes.json();
          const now = new Date();
          pendingAssignments = (d.assignments || []).filter(a => !a.submittedAt && (!a.dueDate || new Date(a.dueDate) >= now)).length;
        }
        let unpaidInvoices = 0;
        if (invRes.ok) {
          const d = await invRes.json();
          unpaidInvoices = (d.invoices || []).filter(inv => (inv.due ?? (inv.total - inv.paid)) > 0).length;
        }
        if (!cancelled) setStudentCounts({ pendingAssignments, unpaidInvoices, nextExam: null });
      } catch (e) {
        console.error('Student quick counts error', e);
        if (!cancelled) setStudentCounts({ pendingAssignments: 0, unpaidInvoices: 0, nextExam: null });
      } finally {
        if (!cancelled) setLoadingStudentCounts(false);
      }
    })();
    return () => { cancelled = true; };
  }, [schoolData?.id, session?.user?.role]);

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


  // Student dashboard variant
  if (session?.user?.role === 'STUDENT') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className={`text-3xl font-bold ${pageTitleClasses}`}>My Dashboard</h1>
          <p className={descriptionTextClasses}>Overview of your academic performance and recent metrics.</p>
        </div>
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Pending Assignments"
            value={studentCounts.pendingAssignments}
            icon={<ListChecks className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingStudentCounts}
            description="Assignments not yet submitted"
            linkTo={`/${subdomain}/academics/assignments`}
          />
          <StatCard
            title="Unpaid Invoices"
            value={studentCounts.unpaidInvoices}
            icon={<Receipt className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingStudentCounts}
            description="Invoices with balance due"
            linkTo={`/${subdomain}/finance/invoices`}
          />
          <StatCard
            title="Overall Average"
            value={studentPerformance?.overallAverage != null ? studentPerformance.overallAverage.toFixed(1) : '-'}
            icon={<PieChart className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingPerformance}
            description="Cumulative published grades"
          />
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Subjects Graded"
            value={studentPerformance?.subjects?.length || 0}
            icon={<BarChart3 className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingPerformance}
            description="Subjects with published marks"
          />
          <StatCard
            title="Terms Counted"
            value={studentPerformance?.terms?.length || 0}
            icon={<CalendarDays className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingPerformance}
            description="Terms contributing to average"
          />
          <StatCard
            title="Next Exam"
            value={studentCounts.nextExam?.date ? new Date(studentCounts.nextExam.date).toLocaleDateString() : '—'}
            icon={<Clock3 className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingStudentCounts}
            description={studentCounts.nextExam?.name || 'Upcoming exam schedule'}
          />
        </section>
        <section className="space-y-4">
          <h2 className={`text-xl font-semibold ${pageTitleClasses}`}>Subject Averages</h2>
          {loadingPerformance && <Skeleton className="h-24 w-full" />}
          {!loadingPerformance && (!studentPerformance?.subjects?.length) && <p className="text-sm text-muted-foreground">No published grades yet.</p>}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {studentPerformance?.subjects?.map(s => (
              <div key={s.subjectId} className={glassCardClasses}>
                <div className="p-4 space-y-1">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-2xl font-bold">{s.average.toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">Assessments: {s.count}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-4">
          <h2 className={`text-xl font-semibold ${pageTitleClasses}`}>Term Averages</h2>
          {loadingPerformance && <Skeleton className="h-20 w-full" />}
          <div className="grid gap-4 md:grid-cols-3">
            {studentPerformance?.terms?.map(t => (
              <div key={t.termId} className={glassCardClasses}>
                <div className="p-4 space-y-1">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xl font-bold">{t.average.toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">Grades: {t.count}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
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
          linkTo={`/${subdomain}/people/students`}
          description="View all students"
        />
        <StatCard 
          title="Total Teachers" 
          value={dashboardStats.totalTeachers} 
          icon={<UserCog className={`h-5 w-5 ${descriptionTextClasses}`} />} 
          isLoading={isLoadingStats}
          linkTo={`/${subdomain}/people/teachers`}
          description="Manage teaching staff"
        />
        <StatCard 
          title="Total Classes" // Updated title
          value={dashboardStats.totalClasses} // Use new stat
          icon={<Building className={`h-5 w-5 ${descriptionTextClasses}`} />} 
          isLoading={isLoadingStats}
          linkTo={`/${subdomain}/academics/classes`}
          description="View all classes"
        />
      </section>

      {/* Quick Actions & Other Sections */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className={`lg:col-span-2 ${glassCardClasses}`}>
          <h2 className={`${sectionTitleClasses} mb-4 border-none pb-0`}>Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button asChild className={`${primaryButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${subdomain}/people/students/add`}> 
                <Users className="mr-2 h-4 w-4" /> Add New Student
              </Link>
            </Button>
            <Button asChild className={`${primaryButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${subdomain}/people/teachers/add`}>
                <UserCog className="mr-2 h-4 w-4" /> Add New Teacher
              </Link>
            </Button>
            <Button asChild className={`${primaryButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${subdomain}/academics/timetable`}>
                <CalendarDays className="mr-2 h-4 w-4" /> View Timetable
              </Link>
            </Button>
            <Button asChild className={`${primaryButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${subdomain}/communication/announcements/create`}>
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