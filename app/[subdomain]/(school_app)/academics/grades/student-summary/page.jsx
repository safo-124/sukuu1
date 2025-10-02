'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSchool } from '../../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

function pct(marks, max) {
  if (marks == null || max == null || max === 0) return null;
  return (marks / max) * 100;
}

function letterFromScale(percent, scale) {
  if (percent == null || !Array.isArray(scale) || scale.length === 0) return null;
  // Pick the GradeDetail where minPercentage <= percent <= maxPercentage
  for (const g of scale) {
    if (percent >= g.minPercentage && percent <= g.maxPercentage) return g.grade;
  }
  return null;
}

export default function StudentGradesSummaryPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [scale, setScale] = useState([]);

  useEffect(() => {
    const run = async () => {
      if (!school?.id) return;
      setLoading(true);
      try {
        const [gradesRes, scaleRes] = await Promise.all([
          fetch(`/api/schools/${school.id}/students/me/grades`),
          fetch(`/api/schools/${school.id}/academics/grading-scale/default`)
        ]);
        if (!gradesRes.ok) throw new Error('Failed to load grades');
        const g = await gradesRes.json();
        let sc = [];
        if (scaleRes.ok) {
          const data = await scaleRes.json();
          sc = data?.details || [];
        }
        setScale(sc);
        // Normalize each grade: find its maxMarks from assignment or exam
        const normalized = (g.grades || []).map(gr => {
          const max = gr.assignment?.maxMarks ?? gr.examSchedule?.maxMarks ?? null;
          const percent = max != null ? pct(gr.marksObtained ?? null, max) : null;
          const gradeLetter = percent != null ? letterFromScale(percent, sc) : (gr.gradeLetter ?? null);
          return {
            id: gr.id,
            subjectId: gr.subject?.id || null,
            subjectName: gr.subject?.name || 'Subject',
            marksObtained: gr.marksObtained,
            maxMarks: max,
            percent,
            gradeLetter,
            termName: gr.term?.name || '',
            yearName: gr.academicYear?.name || '',
            type: gr.assignment ? (gr.assignment.isTest ? 'Test' : 'Assignment') : (gr.examSchedule ? 'Exam' : 'Other'),
            title: gr.assignment?.title || gr.examSchedule?.name || ''
          };
        });
        setRows(normalized);
      } catch (e) {
        console.error(e);
        toast.error(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [school?.id]);

  // Optionally filter by subjectId from query params
  const filteredRows = useMemo(() => {
    const filterSubjectId = searchParams?.get('subjectId');
    if (!filterSubjectId) return rows;
    return rows.filter(r => String(r.subjectId) === String(filterSubjectId));
  }, [rows, searchParams]);

  // Group by subject
  const bySubject = useMemo(() => {
    const map = new Map();
    for (const r of filteredRows) {
      const key = r.subjectName;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return Array.from(map.entries()).map(([subjectName, items]) => ({ subjectName, items }));
  }, [filteredRows]);

  const activeFilterSubjectName = useMemo(() => {
    const filterSubjectId = searchParams?.get('subjectId');
    if (!filterSubjectId) return null;
    const first = filteredRows[0];
    return first?.subjectName || null;
  }, [filteredRows, searchParams]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Grades Summary</h1>
      <p className="text-sm text-muted-foreground">Subject-wise published grades with percentages and grade letters.</p>

      {activeFilterSubjectName && (
        <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 p-3 text-sm flex items-center justify-between">
          <span>Filtered by subject: <span className="font-medium">{activeFilterSubjectName}</span></span>
          <Link href={pathname} className="text-sky-700 hover:underline dark:text-sky-400">Clear filter</Link>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        bySubject.length === 0 ? (
          <div className="text-sm text-muted-foreground">No published grades yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {bySubject.map(group => (
              <Card key={group.subjectName}>
                <CardHeader>
                  <CardTitle>{group.subjectName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">Grade</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Year</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.type}</TableCell>
                          <TableCell>{item.title || '—'}</TableCell>
                          <TableCell className="text-right">{item.marksObtained != null && item.maxMarks != null ? `${item.marksObtained} / ${item.maxMarks}` : (item.marksObtained != null ? item.marksObtained : '—')}</TableCell>
                          <TableCell className="text-right">{item.percent != null ? item.percent.toFixed(1) + '%' : '—'}</TableCell>
                          <TableCell className="text-right">{item.gradeLetter || '—'}</TableCell>
                          <TableCell>{item.termName}</TableCell>
                          <TableCell>{item.yearName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
