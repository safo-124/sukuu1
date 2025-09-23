'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSchool } from '../../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function GradeSummaryPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const [years, setYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [selected, setSelected] = useState({ academicYearId: '', termId: '', subjectId: '', sectionId: '', examScheduleId: '' });
  const [rows, setRows] = useState([]);
  const [weights, setWeights] = useState(null);
  const isTeacher = session?.user?.role === 'TEACHER';

  // Load filters
  useEffect(() => {
    const run = async () => {
      if (!school?.id) return;
      try {
        const mine = isTeacher ? '1' : '0';
        const [yearsRes, subjectsRes, sectionsRes, examsRes] = await Promise.all([
          fetch(`/api/schools/${school.id}/academic-years`),
          fetch(`/api/schools/${school.id}/academics/subjects?mine=${mine}`),
          fetch(`/api/schools/${school.id}/academics/sections`),
          fetch(`/api/schools/${school.id}/academics/exam-schedules`),
        ]);
        if (yearsRes.ok) {
          const d = await yearsRes.json();
          const yr = d.academicYears || [];
          setYears(yr);
          const current = yr.find(y => y.isCurrent) || yr[0];
          if (current) setSelected(s => ({ ...s, academicYearId: current.id, termId: current.terms?.[0]?.id || '' }));
        }
        if (subjectsRes.ok) { const d = await subjectsRes.json(); setSubjects(d.subjects || []); }
        if (sectionsRes.ok) { const d = await sectionsRes.json(); setSections(d.sections || []); }
        if (examsRes.ok) {
          const d = await examsRes.json();
          const flat = (d.examSchedules || []).map(es => ({ id: es.id, label: `${es.exam?.term?.academicYear?.name || ''} ${es.exam?.name || ''} - ${es.subject?.name || ''} (${es.class?.name || ''})`, subjectId: es.subjectId, classId: es.classId, termId: es.exam?.termId, academicYearId: es.exam?.term?.academicYear?.id }));
          setExamSchedules(flat);
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to load summary filters');
      }
    };
    run();
  }, [school?.id, isTeacher]);

  const canQuery = useMemo(() => selected.academicYearId && selected.termId && selected.subjectId && selected.sectionId, [selected]);

  const loadSummary = async () => {
    if (!school?.id || !canQuery) return;
    try {
      const qs = new URLSearchParams({
        academicYearId: selected.academicYearId,
        termId: selected.termId,
        subjectId: selected.subjectId,
        sectionId: selected.sectionId,
      });
      if (selected.examScheduleId) qs.set('examScheduleId', selected.examScheduleId);
      const res = await fetch(`/api/schools/${school.id}/academics/grades/summary?` + qs.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load summary');
      setRows(data.results || []);
      setWeights(data.weights || null);
    } catch (e) {
      toast.error(e.message);
    }
  };

  useEffect(() => { loadSummary(); }, [selected.academicYearId, selected.termId, selected.subjectId, selected.sectionId, selected.examScheduleId]);

  const exportCSV = () => {
    const header = ['Student','Assignment Avg','Test Avg','Exam','Total','Grade','Rank'];
    const lines = [header.join(',')].concat(rows.map(r => [r.name, r.assignmentAvg, r.testAvg, r.examScore, r.total, r.gradeLetter ?? '', r.rank ?? ''].join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'grade-summary.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Grade Summary</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm mb-1">Academic Year</label>
          <Select value={selected.academicYearId} onValueChange={(v) => setSelected(s => ({ ...s, academicYearId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {years.map(y => (<SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Term</label>
          <Select value={selected.termId} onValueChange={(v) => setSelected(s => ({ ...s, termId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
            <SelectContent>
              {(years.find(y => y.id === selected.academicYearId)?.terms || []).map(t => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Subject</label>
          <Select value={selected.subjectId} onValueChange={(v) => setSelected(s => ({ ...s, subjectId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map(su => (<SelectItem key={su.id} value={su.id}>{su.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Section</label>
          <Select value={selected.sectionId} onValueChange={(v) => setSelected(s => ({ ...s, sectionId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              {sections.map(sec => (<SelectItem key={sec.id} value={sec.id}>{sec.class?.name} - {sec.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Exam Schedule (optional)</label>
          <Select
            value={selected.examScheduleId || '__ALL__'}
            onValueChange={(v) => setSelected(s => ({ ...s, examScheduleId: v === '__ALL__' ? '' : v }))}
          >
            <SelectTrigger><SelectValue placeholder="All exams" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">All exams</SelectItem>
              {examSchedules.map(es => (<SelectItem key={es.id} value={es.id}>{es.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {weights ? `Weights — Exam: ${weights.exam}%, Tests: ${weights.classwork}%, Assignments: ${weights.assignment}%` : 'Weights not set'}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadSummary()} disabled={!canQuery}>Refresh</Button>
          <Button onClick={exportCSV} disabled={!rows.length}>Export CSV</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Assignment Avg</TableHead>
              <TableHead>Test Avg</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Rank</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.studentId}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.assignmentAvg?.toFixed?.(2) ?? '-'}</TableCell>
                <TableCell>{r.testAvg?.toFixed?.(2) ?? '-'}</TableCell>
                <TableCell>{r.examScore?.toFixed?.(2) ?? '-'}</TableCell>
                <TableCell>{r.total?.toFixed?.(2) ?? '-'}</TableCell>
                <TableCell>{r.gradeLetter ?? '-'}</TableCell>
                <TableCell>{r.rank ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
