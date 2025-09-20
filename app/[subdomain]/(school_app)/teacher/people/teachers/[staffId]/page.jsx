'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSchool } from '../../../layout';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TeacherStaffProfilePage() {
  const { data: session } = useSession();
  const school = useSchool();
  const params = useParams();
  const staffId = params?.staffId;

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!school?.id || !staffId) return;
      setLoading(true); setError('');
      try {
        const res = await fetch(`/api/schools/${school.id}/people/teachers/${staffId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load staff');
        setTeacher(data.teacher || null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [school?.id, staffId]);

  const titleTextClasses = 'text-black dark:text-white';
  const descriptionTextClasses = 'text-zinc-600 dark:text-zinc-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-semibold ${titleTextClasses}`}>Staff Profile</h1>
        <Link href={`/${school?.subdomain}/teacher/people/teachers`}><Button variant="outline">Back to Directory</Button></Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/40 p-3 text-sm">
          <div className="font-medium text-red-700 dark:text-red-300">Error</div>
          <div className="text-red-600 dark:text-red-400">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-4 w-72" />
        </div>
      ) : teacher ? (
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden" />
            <div>
              <div className={`text-xl font-semibold ${titleTextClasses}`}>{teacher.user?.firstName} {teacher.user?.lastName}</div>
              <div className={`text-sm ${descriptionTextClasses}`}>{teacher.jobTitle || '—'} {teacher.department?.name ? `• ${teacher.department.name}` : ''}</div>
              <div className="text-sm text-muted-foreground">{teacher.user?.email || '—'}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`text-sm ${descriptionTextClasses}`}>No details found.</div>
      )}
    </div>
  );
}
