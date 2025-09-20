// app/[subdomain]/(school_app)/academics/grades/report-card/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSchool } from '../../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Printer } from 'lucide-react';

const shellCard = 'p-6 md:p-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800';

export default function ReportCardPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const isStudent = session?.user?.role === 'STUDENT';
  const isParent = session?.user?.role === 'PARENT';
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState([]);
  const [children, setChildren] = useState([]); // for parent
  const [studentInfo, setStudentInfo] = useState(null); // for branded header
  const [gradingScales, setGradingScales] = useState([]); // for legend

  const [selected, setSelected] = useState({
    childId: 'me', // for parent; 'me' hidden for student
    academicYearId: 'all',
    termId: 'all',
  });

  useEffect(() => {
    if (!school?.id || (!isStudent && !isParent)) return;
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        if (isStudent) {
          const res = await fetch(`/api/schools/${school.id}/students/me/grades`);
          if (!res.ok) throw new Error('Failed to load grades');
          const d = await res.json();
          if (!cancel) setGrades(d.grades || []);
          // Also get student profile for header
          const profRes = await fetch(`/api/schools/${school.id}/students/me/profile`);
          if (profRes.ok) {
            const prof = await profRes.json();
            if (!cancel) setStudentInfo(prof.student || null);
          }
          // load grading scales
          const gsRes = await fetch(`/api/schools/${school.id}/academics/grading-scales`);
          if (gsRes.ok) {
            const gs = await gsRes.json();
            if (!cancel) setGradingScales(gs.gradingScales || []);
          }
        } else if (isParent) {
          const res = await fetch(`/api/schools/${school.id}/parents/me/children/grades`);
          if (!res.ok) throw new Error('Failed to load children grades');
          const d = await res.json();
          if (!cancel) {
            setChildren(d.children || []);
            // Default to first child
            const first = d.children?.[0];
            if (first) setSelected(sel => ({ ...sel, childId: first.studentId }));
            if (first) setStudentInfo({ fullName: first.name });
          }
          // load grading scales
          const gsRes = await fetch(`/api/schools/${school.id}/academics/grading-scales`);
          if (gsRes.ok) {
            const gs = await gsRes.json();
            if (!cancel) setGradingScales(gs.gradingScales || []);
          }
        }
      } catch (e) {
        if (!cancel) toast.error(e.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [school?.id, isStudent, isParent]);

  // Keep header student name in sync for parent-selected child
  useEffect(() => {
    if (isParent && children?.length) {
      const child = children.find(c => c.studentId === selected.childId) || children[0];
      if (!child) return;
      // Set name immediately
      setStudentInfo(prev => ({ ...(prev || {}), fullName: child.name }));
      // Try to fetch class/section/level for the selected child
      (async () => {
        try {
          if (!school?.id) return;
          const res = await fetch(`/api/schools/${school.id}/students/${child.studentId}`);
          if (!res.ok) return;
          const d = await res.json();
          const s = d.student;
          if (s) {
            const className = s.currentClassDisplay || s.className || null;
            // currentClassDisplay may be like "Class - Section"; split opportunistically
            let extractedClassName = null;
            let sectionName = null;
            if (typeof className === 'string' && className.includes(' - ')) {
              const [cls, sec] = className.split(' - ');
              extractedClassName = cls || null;
              sectionName = sec || null;
            } else if (typeof className === 'string') {
              extractedClassName = className;
            }
            setStudentInfo(prev => ({ ...(prev || {}), className: extractedClassName, sectionName }));
          }
        } catch {}
      })();
    }
  }, [isParent, children, selected.childId, school?.id]);

  const workingGrades = useMemo(() => {
    if (isStudent) return grades;
    const child = children.find(c => c.studentId === selected.childId);
    return child?.grades || [];
  }, [isStudent, grades, isParent, children, selected.childId]);

  // Filter by AY/Term
  const ayOptions = useMemo(() => {
    const map = new Map();
    workingGrades.forEach(g => { if (g.academicYear) map.set(g.academicYear.id, g.academicYear.name); });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [workingGrades]);
  const termOptions = useMemo(() => {
    const map = new Map();
    workingGrades.forEach(g => { if (g.term) map.set(g.term.id, g.term.name); });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [workingGrades]);

  const filtered = useMemo(() => workingGrades.filter(g =>
    (selected.academicYearId === 'all' || g.academicYear?.id === selected.academicYearId) &&
    (selected.termId === 'all' || g.term?.id === selected.termId)
  ), [workingGrades, selected.academicYearId, selected.termId]);

  // Group by subject
  const bySubject = useMemo(() => {
    const map = new Map();
    filtered.forEach(g => {
      const sid = g.subject?.id || 'unknown';
      if (!map.has(sid)) map.set(sid, { subject: g.subject?.name || 'Subject', rows: [] });
      map.get(sid).rows.push(g);
    });
    return Array.from(map.values());
  }, [filtered]);

  // Summary stats (marks + GPA if present)
  const summary = useMemo(() => {
    const marks = filtered.map(g => typeof g.marksObtained === 'number' ? g.marksObtained : null).filter(v => v !== null);
    const gpas = filtered.map(g => typeof g.gpa === 'number' ? g.gpa : null).filter(v => v !== null);
    const count = filtered.length;
    const avg = marks.length ? (marks.reduce((a,b) => a + b, 0) / marks.length) : null;
    const min = marks.length ? Math.min(...marks) : null;
    const max = marks.length ? Math.max(...marks) : null;
    const avgGpa = gpas.length ? (gpas.reduce((a,b) => a + b, 0) / gpas.length) : null;
    return { count, avg, min, max, avgGpa };
  }, [filtered]);

  const handlePrint = () => { window.print(); };

  if (!isStudent && !isParent) {
    return <div className="p-6 text-sm text-red-600 dark:text-red-400">You are not authorized to view report cards.</div>;
  }

  return (
    <div className="space-y-6 relative z-10">
      {/* Print watermark */}
      {school?.logoUrl && (
        <img
          src={school.logoUrl}
          alt="School watermark"
          aria-hidden
          className="hidden print:block fixed inset-0 m-auto w-[60%] opacity-5 pointer-events-none select-none z-0"
        />
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {school?.logoUrl && (
            <img src={school.logoUrl} alt={school?.name || 'School Logo'} className="h-10 w-10 rounded-md border border-zinc-200 dark:border-zinc-800 object-cover" />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold truncate">{school?.name || 'School'} Report Card</h1>
            <p className="text-sm text-muted-foreground truncate">{studentInfo?.fullName || ''}{studentInfo?.className ? ` • Class ${studentInfo.className}` : ''}{studentInfo?.sectionName ? ` • Section ${studentInfo.sectionName}` : ''}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handlePrint} className="print:hidden"><Printer className="h-4 w-4 mr-2" /> Print</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 print:hidden">
        {isParent && !loading && (
          <div className={shellCard + ' print:shadow-none print:border-zinc-300'}>
            <Select value={selected.childId} onValueChange={(v) => setSelected(s => ({ ...s, childId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select child" /></SelectTrigger>
              <SelectContent>
                {children.map(c => <SelectItem key={c.studentId} value={c.studentId}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <label className="block text-xs mb-1">Academic Year</label>
          <Select value={selected.academicYearId} onValueChange={(v) => setSelected(s => ({ ...s, academicYearId: v }))}>
            <SelectTrigger><SelectValue placeholder="All years" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {ayOptions.map(ay => <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs mb-1">Term</label>
          <Select value={selected.termId} onValueChange={(v) => setSelected(s => ({ ...s, termId: v }))}>
            <SelectTrigger><SelectValue placeholder="All terms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {termOptions.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

              {/* Signature area for print */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 print:mt-16">
                <div>
                  <div className="h-px bg-zinc-300 mb-1" />
                  <p className="text-xs text-zinc-600">Class Teacher Signature</p>
                </div>
                <div>
                  <div className="h-px bg-zinc-300 mb-1" />
                  <p className="text-xs text-zinc-600">Head Teacher Signature</p>
                </div>
                <div>
                  <div className="h-px bg-zinc-300 mb-1" />
                  <p className="text-xs text-zinc-600">Parent/Guardian Signature</p>
                </div>
              </div>
      {loading && <Skeleton className="h-36 w-full" />}

      {!loading && (
        <div className={shellCard + ' print:shadow-none print:border-zinc-300'}>
          {bySubject.length === 0 ? (
            <div className="text-sm text-muted-foreground">No grades match your filters.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 print:break-inside-avoid-page">
                <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3"><div className="text-xs text-zinc-500">Assessments</div><div className="text-lg font-semibold">{summary.count}</div></div>
                <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3"><div className="text-xs text-zinc-500">Average</div><div className="text-lg font-semibold">{summary.avg !== null ? summary.avg.toFixed(1) : '—'}</div></div>
                <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3"><div className="text-xs text-zinc-500">Highest</div><div className="text-lg font-semibold">{summary.max !== null ? summary.max.toFixed(1) : '—'}</div></div>
                <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3"><div className="text-xs text-zinc-500">Average GPA</div><div className="text-lg font-semibold">{summary.avgGpa !== null ? summary.avgGpa.toFixed(2) : '—'}</div></div>
              </div>
              <Table className="[&>tbody>tr]:break-inside-avoid-page">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Subject</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bySubject.map(group => (
                    group.rows.map((g, idx) => (
                      <TableRow key={g.id} className="align-top">
                        <TableCell className="font-medium">{idx === 0 ? group.subject : ''}</TableCell>
                        <TableCell>{g.examSchedule ? (g.examSchedule.name || 'Exam') : '—'}</TableCell>
                        <TableCell>{g.marksObtained ?? '—'}</TableCell>
                        <TableCell>{g.term?.name || '—'}</TableCell>
                        <TableCell>{g.academicYear?.name || '—'}</TableCell>
                        <TableCell className="whitespace-pre-wrap max-w-[600px]">{g.comments || '—'}</TableCell>
                      </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      )}

      {/* Signature area for print - keep at bottom of last page */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 print:mt-16 print:break-inside-avoid-page">
        <div>
          <div className="h-px bg-zinc-300 mb-1" />
          <p className="text-xs text-zinc-600">Class Teacher Signature</p>
        </div>
        <div>
          <div className="h-px bg-zinc-300 mb-1" />
          <p className="text-xs text-zinc-600">Head Teacher Signature</p>
        </div>
        <div>
          <div className="h-px bg-zinc-300 mb-1" />
          <p className="text-xs text-zinc-600">Parent/Guardian Signature</p>
        </div>
      </div>

      {/* Grading Scale Legend */}
      {gradingScales?.length > 0 && (
        <div className={shellCard + ' print:shadow-none print:border-zinc-300 print:break-inside-avoid-page'}>
          <h2 className="text-base font-semibold mb-3">Grading Scale</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gradingScales.map(scale => (
              <div key={scale.id}>
                <div className="font-medium text-sm mb-1">{scale.name}</div>
                {scale.description && (
                  <div className="text-xs text-zinc-600 mb-2 whitespace-pre-wrap">{scale.description}</div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-left text-zinc-600">
                        <th className="py-1 pr-3">Grade</th>
                        <th className="py-1 pr-3">Min %</th>
                        <th className="py-1 pr-3">Max %</th>
                        <th className="py-1">GPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(scale.gradeDetails || []).map((gd) => (
                        <tr key={gd.id} className="border-t border-zinc-200/70">
                          <td className="py-1 pr-3 font-semibold">{gd.grade}</td>
                          <td className="py-1 pr-3">{Math.round(gd.minPercentage)}%</td>
                          <td className="py-1 pr-3">{Math.round(gd.maxPercentage)}%</td>
                          <td className="py-1">{gd.gpaValue ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
