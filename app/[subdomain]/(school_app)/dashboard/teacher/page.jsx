// app/[subdomain]/(school_app)/dashboard/teacher/page.jsx
'use client';

import { useSession } from 'next-auth/react';
import { useSchool } from '../../layout';
import { BookOpen, Users, ClipboardList, CheckSquare, CalendarDays, BarChart4 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

export default function TeacherDashboardPage() {
  const { data: session } = useSession();
  const schoolData = useSchool();
  const subdomain = schoolData?.subdomain;

  const [stats, setStats] = useState({ subjectsCount: 0, assignmentsCount: 0, todayLessons: [], nextLesson: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wardenHostel, setWardenHostel] = useState(null);

  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const featureCardClasses = `flex flex-col items-center justify-center text-center p-6 rounded-lg bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg`;

  if (!session || session.user?.role !== 'TEACHER') {
    // This page should only be accessible by TEACHER role,
    // layout.jsx handles redirection, but a client-side check is good too.
    return (
      <div className="flex items-center justify-center h-full">
        <p className={descriptionTextClasses}>Access Denied. Only teachers can view this dashboard.</p>
      </div>
    );
  }

  useEffect(() => {
    const load = async () => {
      if (!schoolData?.id) return;
      setLoading(true); setError('');
      try {
        const res = await fetch(`/api/schools/${schoolData.id}/dashboard/teacher`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load metrics');
        setStats({
          subjectsCount: data.subjectsCount || 0,
          assignmentsCount: data.assignmentsCount || 0,
          todayLessons: Array.isArray(data.todayLessons) ? data.todayLessons : [],
          nextLesson: data.nextLesson || null,
        });
        // Also check if this teacher is assigned as a hostel warden (API limits for teacher already)
        const hRes = await fetch(`/api/schools/${schoolData.id}/resources/hostels`);
        const hData = await hRes.json().catch(() => ({ hostels: [] }));
        if (hRes.ok && Array.isArray(hData.hostels) && hData.hostels.length > 0) {
          setWardenHostel(hData.hostels[0]);
        } else {
          setWardenHostel(null);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [schoolData?.id]);

  return (
    <div className="space-y-8">
      <h1 className={`text-3xl font-bold ${titleTextClasses}`}>
        Welcome, {session.user?.name || 'Teacher'}!
      </h1>
      <p className={descriptionTextClasses}>
        This is your personalized dashboard for {schoolData?.name || 'your school'}.
        Here you can manage your classes, assignments, and student progress.
      </p>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${descriptionTextClasses}`}>My Subjects</span>
            <BookOpen className="h-4 w-4 opacity-70" />
          </div>
          <div className={`mt-2 text-3xl font-bold ${titleTextClasses}`}>{loading ? '…' : stats.subjectsCount}</div>
        </div>
        <div className={`rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${descriptionTextClasses}`}>Assignments</span>
            <CheckSquare className="h-4 w-4 opacity-70" />
          </div>
          <div className={`mt-2 text-3xl font-bold ${titleTextClasses}`}>{loading ? '…' : stats.assignmentsCount}</div>
        </div>
        <div className={`rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${descriptionTextClasses}`}>Today’s Lessons</span>
            <CalendarDays className="h-4 w-4 opacity-70" />
          </div>
          <div className={`mt-2 text-3xl font-bold ${titleTextClasses}`}>{loading ? '…' : stats.todayLessons.length}</div>
        </div>
        <div className={`rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${descriptionTextClasses}`}>Next Lesson</span>
            <BarChart4 className="h-4 w-4 opacity-70" />
          </div>
          <div className={`mt-2 text-base ${titleTextClasses}`}>
            {loading ? '…' : stats.nextLesson ? `${stats.nextLesson.subject?.name || ''} • ${stats.nextLesson.section?.class?.name || ''}-${stats.nextLesson.section?.name || ''} • ${stats.nextLesson.startTime}-${stats.nextLesson.endTime}` : 'No upcoming'}
          </div>
        </div>
      </div>

      {/* Quick Actions / Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wardenHostel && (
          <Link href={`/${subdomain}/resources/hostel`} passHref>
            <div className={`${featureCardClasses}`}>
              <Users className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mb-3" />
              <h2 className={`text-xl font-semibold ${titleTextClasses} mb-1`}>My Hostel</h2>
              <p className={`text-sm ${descriptionTextClasses}`}>Manage hostel "{wardenHostel.name}" as assigned warden.</p>
            </div>
          </Link>
        )}
        <Link href={`/${subdomain}/academics/assignments`} passHref>
          <div className={`${featureCardClasses}`}>
            <CheckSquare className="h-12 w-12 text-sky-600 dark:text-sky-400 mb-3" />
            <h2 className={`text-xl font-semibold ${titleTextClasses} mb-1`}>Manage Assignments</h2>
            <p className={`text-sm ${descriptionTextClasses}`}>Create, view, and grade assignments for your students.</p>
          </div>
        </Link>

        <Link href={`/${subdomain}/academics/grades`} passHref>
          <div className={`${featureCardClasses}`}>
            <BarChart4 className="h-12 w-12 text-green-600 dark:text-green-400 mb-3" />
            <h2 className={`text-xl font-semibold ${titleTextClasses} mb-1`}>Enter & View Grades</h2>
            <p className={`text-sm ${descriptionTextClasses}`}>Record student grades and review performance reports.</p>
          </div>
        </Link>

        <Link href={`/${subdomain}/academics/timetable`} passHref>
          <div className={`${featureCardClasses}`}>
            <CalendarDays className="h-12 w-12 text-purple-600 dark:text-purple-400 mb-3" />
            <h2 className={`text-xl font-semibold ${titleTextClasses} mb-1`}>My Timetable</h2>
            <p className={`text-sm ${descriptionTextClasses}`}>View your class schedule for the week.</p>
          </div>
        </Link>

        <Link href={`/${subdomain}/teacher/students`} passHref>
          <div className={`${featureCardClasses}`}>
            <Users className="h-12 w-12 text-orange-600 dark:text-orange-400 mb-3" />
            <h2 className={`text-xl font-semibold ${titleTextClasses} mb-1`}>My Students</h2>
            <p className={`text-sm ${descriptionTextClasses}`}>Access student profiles and enrollment details.</p>
          </div>
        </Link>

        <Link href={`/${subdomain}/academics/subjects`} passHref>
          <div className={`${featureCardClasses}`}>
            <BookOpen className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mb-3" />
            <h2 className={`text-xl font-semibold ${titleTextClasses} mb-1`}>My Subjects</h2>
            <p className={`text-sm ${descriptionTextClasses}`}>View subjects you are assigned to teach.</p>
          </div>
        </Link>

        <Link href={`/${subdomain}/attendance/students`} passHref>
          <div className={`${featureCardClasses}`}>
            <ClipboardList className="h-12 w-12 text-red-600 dark:text-red-400 mb-3" />
            <h2 className={`text-xl font-semibold ${titleTextClasses} mb-1`}>Take Student Attendance</h2>
            <p className={`text-sm ${descriptionTextClasses}`}>Record daily attendance for your classes.</p>
          </div>
        </Link>
      </div>

      {/* Optional: Recent Activity / Announcements */}
      <div className={`${glassCardClasses}`}>
        <h2 className={`text-xl font-bold ${titleTextClasses} mb-4`}>Recent Announcements</h2>
        <p className={descriptionTextClasses}>No recent announcements for teachers. Check back soon!</p>
        {/* You would fetch and display recent announcements here */}
      </div>
    </div>
  );
}
