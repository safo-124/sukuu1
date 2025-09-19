// app/[subdomain]/(school_app)/student/dashboard/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSchool } from '../../layout';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, BarChart3, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

const glassCardClasses = 'p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/70 border border-zinc-200/80 dark:bg-zinc-900/70 dark:border-zinc-700/80';
const titleTextClasses = 'text-zinc-900 dark:text-zinc-50';
const descriptionTextClasses = 'text-zinc-600 dark:text-zinc-400';

function StatCard({ title, value, icon, description, loading }) {
  return (
    <div className={`${glassCardClasses} flex flex-col justify-between min-h-[130px]`}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">{title}</p>
          {icon}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-1/2 bg-zinc-300 dark:bg-zinc-700" />
        ) : (
          <p className="text-3xl font-bold">{value ?? '-'}</p>
        )}
      </div>
      {description && <p className="text-[11px] text-muted-foreground mt-3">{description}</p>}
    </div>
  );
}

export default function StudentDashboardPage() {
  const { data: session } = useSession();
  const schoolData = useSchool();
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolData?.id || session?.user?.role !== 'STUDENT') return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/schools/${schoolData.id}/students/me/performance`);
        if (!res.ok) throw new Error('Failed to load performance');
        const data = await res.json();
        if (!cancelled) setPerformance(data);
      } catch (e) {
        if (!cancelled) {
          toast.error('Could not load performance metrics', { description: e.message });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [schoolData?.id, session?.user?.role]);

  if (session?.user?.role && session.user.role !== 'STUDENT') {
    return <div className="p-6 text-sm text-red-600 dark:text-red-400">You are not authorized to view the student dashboard.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className={`text-3xl font-bold ${titleTextClasses}`}>My Dashboard</h1>
        <p className={descriptionTextClasses}>Overview of your academic performance and recent metrics.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Overall Average"
          value={performance?.overallAverage != null ? performance.overallAverage.toFixed(1) : null}
          icon={<PieChart className={`h-5 w-5 ${descriptionTextClasses}`} />}
          loading={loading}
          description="Cumulative published grades"
        />
        <StatCard
          title="Subjects Graded"
          value={performance?.subjects?.length || 0}
          icon={<BarChart3 className={`h-5 w-5 ${descriptionTextClasses}`} />}
          loading={loading}
          description="Subjects with published marks"
        />
        <StatCard
          title="Terms Counted"
          value={performance?.terms?.length || 0}
          icon={<CalendarDays className={`h-5 w-5 ${descriptionTextClasses}`} />}
          loading={loading}
          description="Terms contributing to average"
        />
      </section>

      <section className="space-y-4">
        <h2 className={`text-xl font-semibold ${titleTextClasses}`}>Subject Averages</h2>
        {loading && <Skeleton className="h-24 w-full" />}
        {!loading && (!performance?.subjects?.length) && <p className="text-sm text-muted-foreground">No published grades yet.</p>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {performance?.subjects?.map(s => (
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
        <h2 className={`text-xl font-semibold ${titleTextClasses}`}>Term Averages</h2>
        {loading && <Skeleton className="h-20 w-full" />}
        <div className="grid gap-4 md:grid-cols-3">
          {performance?.terms?.map(t => (
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
