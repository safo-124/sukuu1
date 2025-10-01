'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSchool } from '../../../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function GradesSummaryPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const isTeacher = session?.user?.role === 'TEACHER';

  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [selected, setSelected] = useState({ subjectId: '', sectionId: '' });
  const [me, setMe] = useState(null);
  const [allowedSubjectsForSection, setAllowedSubjectsForSection] = useState(null);

  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [gradesByAssignment, setGradesByAssignment] = useState({}); // { [assignmentId]: { [studentId]: number|null } }
  const [loading, setLoading] = useState(false);

  // Filters and weights
  const [includeAssignments, setIncludeAssignments] = useState(true);
  const [includeTests, setIncludeTests] = useState(true);
  const [assignWeight, setAssignWeight] = useState(40);
  const [testWeight, setTestWeight] = useState(60);

  // Term filter
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');

  // Load base context
  useEffect(() => {
    const run = async () => {
      if (!school?.id || !session) return;
      try {
        const mine = isTeacher ? '1' : '0';
        const [meRes, subjectsRes, sectionsRes, yearsRes] = await Promise.all([
          fetch(`/api/schools/${school.id}/staff/me`),
          fetch(`/api/schools/${school.id}/academics/subjects?mine=${mine}`),
          fetch(`/api/schools/${school.id}/academics/sections`),
          fetch(`/api/schools/${school.id}/academic-years`),
        ]);
        let meData = null;
        if (meRes.ok) { meData = await meRes.json(); setMe(meData); }
        if (subjectsRes.ok) {
          const d = await subjectsRes.json();
          setSubjects((isTeacher && meData?.taughtSubjects?.length) ? meData.taughtSubjects : (d.subjects || []));
        }
        if (sectionsRes.ok) {
          const d = await sectionsRes.json();
          setSections((isTeacher && meData?.classTeacherSections?.length) ? meData.classTeacherSections : (d.sections || []));
        }
        if (yearsRes.ok) {
          const d = await yearsRes.json();
          const years = d.academicYears || [];
          setAcademicYears(years);
          const currentYear = years.find(y => y.isCurrent) || years[0];
          if (currentYear) {
            setSelectedAcademicYearId(currentYear.id);
            const currentTerm = (currentYear.terms || []).find(t => t.isCurrent) || (currentYear.terms || [])[0];
            if (currentTerm) setSelectedTermId(currentTerm.id);
          }
        }
      } catch (e) {
        console.error(e); toast.error('Failed to load context');
      }
    };
    run();
  }, [school?.id, session, isTeacher]);

  // Restrict subjects when not class teacher of the section
  useEffect(() => {
    const run = async () => {
      if (!isTeacher || !school?.id || !selected.sectionId || !me?.staff?.id) { setAllowedSubjectsForSection(null); return; }
      const isClassTeacherForSelected = (me?.classTeacherSections || []).some(sec => sec.id === selected.sectionId);
      if (isClassTeacherForSelected) { setAllowedSubjectsForSection(null); return; }
      try {
        const res = await fetch(`/api/schools/${school.id}/academics/timetable?sectionId=${selected.sectionId}&staffId=${me.staff.id}`);
        if (!res.ok) { setAllowedSubjectsForSection([]); return; }
        const d = await res.json();
        const map = new Map(); (d.timetableEntries || []).forEach(e => { if (e.subject) map.set(e.subject.id, e.subject); });
        setAllowedSubjectsForSection(Array.from(map.values()));
      } catch { setAllowedSubjectsForSection([]); }
    };
    run();
  }, [isTeacher, school?.id, selected.sectionId, me?.staff?.id]);

  const availableSubjects = useMemo(() => Array.isArray(allowedSubjectsForSection) ? allowedSubjectsForSection : subjects, [allowedSubjectsForSection, subjects]);
  const availableSections = useMemo(() => sections, [sections]);

  // Load students
  const loadStudents = useCallback(async () => {
    if (!school?.id || !selected.sectionId) return setStudents([]);
    if (isTeacher) {
      const isClassTeacherForSelected = (me?.classTeacherSections || []).some(sec => sec.id === selected.sectionId);
      if (!isClassTeacherForSelected && !selected.subjectId) return; // need a subject to scope
    }
    try {
      const url = `/api/schools/${school.id}/academics/grades/students?sectionId=${selected.sectionId}${selected.subjectId ? `&subjectId=${selected.subjectId}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load students');
      const d = await res.json(); setStudents(d.students || []);
    } catch (e) { toast.error(e.message); }
  }, [school?.id, selected.sectionId, selected.subjectId, isTeacher, me?.classTeacherSections]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  // Load assignments (both assignments and tests) for subject/section
  const loadAssignments = useCallback(async () => {
    if (!school?.id || !selected.subjectId) { setAssignments([]); return; }
    const secParam = selected.sectionId ? `&sectionId=${selected.sectionId}` : '';
    try {
      const res = await fetch(`/api/schools/${school.id}/academics/assignments?subjectId=${selected.subjectId}${secParam}`);
      if (!res.ok) throw new Error('Failed to load assignments');
      const d = await res.json();
      let list = d.assignments || [];
      // Filter by selected term's date range if available
      if (selectedAcademicYearId && selectedTermId) {
        const ay = academicYears.find(y => y.id === selectedAcademicYearId);
        const term = (ay?.terms || []).find(t => t.id === selectedTermId);
        const start = term?.startDate ? new Date(term.startDate) : null;
        const end = term?.endDate ? new Date(term.endDate) : null;
        if (start && end) {
          list = list.filter(a => {
            const d = a.dueDate ? new Date(a.dueDate) : null;
            return d ? (d >= start && d <= end) : true;
          });
        }
      }
      setAssignments(list);
    } catch (e) { setAssignments([]); }
  }, [school?.id, selected.subjectId, selected.sectionId, selectedAcademicYearId, selectedTermId, academicYears]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  // Load grades per assignment and build map
  useEffect(() => {
    const run = async () => {
      if (!school?.id || !assignments.length) { setGradesByAssignment({}); return; }
      setLoading(true);
      try {
        const results = await Promise.allSettled(assignments.map(async (a) => {
          const res = await fetch(`/api/schools/${school.id}/academics/grades?assignmentId=${a.id}`);
          if (!res.ok) return { id: a.id, map: {} };
          const d = await res.json();
          const arr = Array.isArray(d.grades) ? d.grades : (d.items || d || []);
          const m = {};
          arr.forEach(g => { if (g.studentId) m[g.studentId] = (g.marksObtained ?? null); });
          return { id: a.id, map: m };
        }));
        const next = {};
        results.forEach(r => { if (r.status === 'fulfilled') next[r.value.id] = r.value.map; });
        setGradesByAssignment(next);
      } catch (e) {
        // ignore and show partial data
      } finally { setLoading(false); }
    };
    run();
  }, [school?.id, assignments]);

  const computed = useMemo(() => {
    const isTest = (a) => !!a.isTest;
    // Decide which categories to include
    const includeTestCat = includeTests;
    const includeAssignCat = includeAssignments;
    // Filter assignments by category toggles
    const filteredAssignments = assignments.filter(a => (isTest(a) && includeTestCat) || (!isTest(a) && includeAssignCat));
    const rows = students.map(st => {
      let assignGot = 0, assignMax = 0, assignMissing = 0;
      let testGot = 0, testMax = 0, testMissing = 0;
      filteredAssignments.forEach(a => {
        const max = a.maxMarks ? Number(a.maxMarks) : 0;
        const mark = gradesByAssignment[a.id]?.[st.id];
        if (isTest(a)) {
          testMax += max;
          if (mark === null || mark === undefined) { testMissing += 1; }
          else { testGot += Number(mark) || 0; }
        } else {
          assignMax += max;
          if (mark === null || mark === undefined) { assignMissing += 1; }
          else { assignGot += Number(mark) || 0; }
        }
      });
      const assignPct = assignMax > 0 ? (assignGot / assignMax) * 100 : null;
      const testPct = testMax > 0 ? (testGot / testMax) * 100 : null;
      // Weighted overall based on category percentages and weights
      let wAssign = includeAssignCat ? Number(assignWeight) || 0 : 0;
      let wTest = includeTestCat ? Number(testWeight) || 0 : 0;
      // If a category has no data, drop its weight from denominator
      if (assignPct == null) wAssign = 0;
      if (testPct == null) wTest = 0;
      const wSum = wAssign + wTest;
      const overallPct = wSum > 0
        ? ((assignPct != null ? assignPct * wAssign : 0) + (testPct != null ? testPct * wTest : 0)) / wSum
        : null;
      const overallGot = assignGot + testGot;
      const overallMax = assignMax + testMax;
      return {
        student: st,
        assign: { got: assignGot, max: assignMax, pct: assignPct, missing: assignMissing },
        tests: { got: testGot, max: testMax, pct: testPct, missing: testMissing },
        overall: { got: overallGot, max: overallMax, pct: overallPct, missing: assignMissing + testMissing },
      };
    });
    return rows;
  }, [students, assignments, gradesByAssignment, includeAssignments, includeTests, assignWeight, testWeight]);

  const exportCSV = () => {
    try {
      const headers = ['Student','Assignments %','Assignments Got','Assignments Max','Tests %','Tests Got','Tests Max','Overall (Weighted) %','Overall Got','Overall Max','Missing'];
      const lines = [headers.join(',')];
      computed.forEach(r => {
        const name = `${r.student.lastName || ''} ${r.student.firstName || ''}`.trim();
        const line = [
          name,
          r.assign.pct != null ? r.assign.pct.toFixed(1) : '', r.assign.got, r.assign.max,
          r.tests.pct != null ? r.tests.pct.toFixed(1) : '', r.tests.got, r.tests.max,
          r.overall.pct != null ? r.overall.pct.toFixed(1) : '', r.overall.got, r.overall.max,
          r.overall.missing,
        ].join(',');
        lines.push(line);
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'grades-summary.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error('Failed to export'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Grades Summary</h1>
      <p className="text-xs text-muted-foreground">View per-student summary across assignments and tests for a class. Overall uses weighted categories.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Subject</label>
          <Select value={selected.subjectId} onValueChange={(v) => setSelected(s => ({ ...s, subjectId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {availableSubjects.map(s => (<SelectItem value={s.id} key={s.id}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Section</label>
          <Select value={selected.sectionId} onValueChange={(v) => setSelected(s => ({ ...s, sectionId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              {availableSections.map(sec => (<SelectItem value={sec.id} key={sec.id}>{sec.class?.name} - {sec.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Academic Year</label>
          <Select value={selectedAcademicYearId} onValueChange={(v) => setSelectedAcademicYearId(v)}>
            <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {academicYears.map(y => (<SelectItem value={y.id} key={y.id}>{y.name || y.label || `Year ${y.id.slice(0,6)}`}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Term</label>
          <Select value={selectedTermId} onValueChange={(v) => setSelectedTermId(v)}>
            <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
            <SelectContent>
              {(academicYears.find(y => y.id === selectedAcademicYearId)?.terms || []).map(t => (
                <SelectItem value={t.id} key={t.id}>{t.name || t.label || `Term ${t.id.slice(0,6)}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={includeAssignments} onChange={e=>setIncludeAssignments(e.target.checked)} /> Assignments
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={includeTests} onChange={e=>setIncludeTests(e.target.checked)} /> Tests
          </label>
        </div>
        <div className="flex items-end">
          <Button onClick={exportCSV} disabled={!selected.subjectId || !selected.sectionId || !computed.length}>Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Assignments Weight (%)</label>
          <Input type="number" min="0" max="100" value={assignWeight} onChange={e=>setAssignWeight(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Tests Weight (%)</label>
          <Input type="number" min="0" max="100" value={testWeight} onChange={e=>setTestWeight(e.target.value)} />
        </div>
        <div className="flex items-end text-xs text-muted-foreground">
          Weights auto-normalize based on available categories and data.
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading && <div className="text-xs text-muted-foreground mb-2">Loading grades…</div>}
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Student</th>
              <th className="py-2 pr-4">Assignments</th>
              <th className="py-2 pr-4">Tests</th>
              <th className="py-2 pr-4">Overall (Weighted)</th>
              <th className="py-2">Missing</th>
            </tr>
          </thead>
          <tbody>
            {computed.map(r => (
              <tr key={r.student.id} className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <td className="py-2 pr-4">{r.student.lastName}, {r.student.firstName}</td>
                <td className="py-2 pr-4">
                  {r.assign.pct != null ? `${r.assign.pct.toFixed(1)}%` : '—'}
                  <span className="text-xs text-muted-foreground ml-1">({r.assign.got}/{r.assign.max})</span>
                </td>
                <td className="py-2 pr-4">
                  {r.tests.pct != null ? `${r.tests.pct.toFixed(1)}%` : '—'}
                  <span className="text-xs text-muted-foreground ml-1">({r.tests.got}/{r.tests.max})</span>
                </td>
                <td className="py-2 pr-4">
                  {r.overall.pct != null ? `${r.overall.pct.toFixed(1)}%` : '—'}
                  <span className="text-xs text-muted-foreground ml-1">({r.overall.got}/{r.overall.max})</span>
                </td>
                <td className="py-2">{r.overall.missing}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!computed.length && (selected.subjectId && selected.sectionId) && (
          <div className="text-sm text-muted-foreground mt-3">No data to summarize yet.</div>
        )}
      </div>
    </div>
  );
}
