// app/[subdomain]/(school_app)/academics/exams/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GraduationCap } from 'lucide-react';

function fmtDate(d) {
  try { const x = new Date(d); return x.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); } catch { return '—'; }
}

export default function StudentExamsPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [grades, setGrades] = useState([]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!school?.id || session?.user?.role !== 'STUDENT') { setLoading(false); return; }
      try {
        const res = await fetch(`/api/schools/${school.id}/students/me/exams`);
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Failed to load exams');
        if (!ignore) { setSchedules(d.schedules || []); setGrades(d.grades || []); }
      } catch (e) { if (!ignore) setError(e.message); }
      finally { if (!ignore) setLoading(false); }
    };
    run();
    return () => { ignore = true; };
  }, [school?.id, session?.user?.role]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-sky-600" />
        <h1 className="text-2xl font-bold">My Exams</h1>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}
      {!loading && error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {!loading && !error && (
        <>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-4 py-3 text-sm font-medium">Upcoming/Planned Schedule</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No schedules available.</TableCell></TableRow>
                ) : schedules.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{fmtDate(s.date)}</TableCell>
                    <TableCell>{s.startTime} - {s.endTime}</TableCell>
                    <TableCell>{s.exam?.name || '—'}</TableCell>
                    <TableCell>{s.subject?.name || '—'}</TableCell>
                    <TableCell className="text-right">{s.maxMarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-4 py-3 text-sm font-medium">Published Results</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                  <TableHead>Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No published exam grades yet.</TableCell></TableRow>
                ) : grades.map(g => (
                  <TableRow key={g.id}>
                    <TableCell>{g.examName || '—'}</TableCell>
                    <TableCell>{g.subject?.name || '—'}</TableCell>
                    <TableCell className="text-right">{g.marksObtained ?? '—'}</TableCell>
                    <TableCell className="text-right">{g.maxMarks ?? '—'}</TableCell>
                    <TableCell>{g.createdAt ? new Date(g.createdAt).toLocaleDateString() : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
