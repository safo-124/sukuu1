// app/[subdomain]/(school_app)/academics/grades/children/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Printer, Users } from 'lucide-react';

const glassCardClasses = 'p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/70 border border-zinc-200/80 dark:bg-zinc-900/70 dark:border-zinc-700/80';

export default function ParentChildrenGradesPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!school?.id || session?.user?.role !== 'PARENT') return;
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/schools/${school.id}/parents/me/children/grades`);
        if (!res.ok) throw new Error('Failed to load children grades');
        const d = await res.json();
        if (!cancel) setData(d);
      } catch (e) {
        if (!cancel) toast.error(e.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [school?.id, session?.user?.role]);

  const children = data?.children || [];

  const handlePrint = () => { window.print(); };

  if (session?.user?.role && session.user.role !== 'PARENT') {
    return <div className="p-6 text-sm text-red-600 dark:text-red-400">You are not authorized to view this page.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-sky-600" />
          <h1 className="text-xl font-semibold tracking-tight">My Children - Grades</h1>
        </div>
        <button onClick={handlePrint} className="hidden print:hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {loading && <Skeleton className="h-24 w-full" />}

      {!loading && children.length === 0 && (
        <div className="text-sm text-muted-foreground">No published grades yet.</div>
      )}

      {!loading && children.map(c => (
        <div key={c.studentId} className={glassCardClasses}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{c.name}</h2>
          </div>
          <div className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Subject</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.grades.map(g => {
                  const date = g.createdAt ? new Date(g.createdAt) : null;
                  const dateStr = date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
                  const scoreVal = g.marksObtained ?? '—';
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.subject?.name || '—'}</TableCell>
                      <TableCell>{scoreVal}</TableCell>
                      <TableCell>{dateStr}</TableCell>
                      <TableCell>{g.examSchedule ? (g.examSchedule.name || 'Exam') : '—'}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">Published</Badge></TableCell>
                      <TableCell className="max-w-[400px] whitespace-pre-wrap">{g.comments || '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
