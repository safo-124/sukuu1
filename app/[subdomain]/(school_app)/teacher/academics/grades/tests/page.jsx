'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSchool } from '../../../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function TeacherTestGradesPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const isTeacher = session?.user?.role === 'TEACHER';

  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]); // assignments with isTest
  const [selected, setSelected] = useState({ subjectId: '', sectionId: '', testAssignmentId: '' });
  const [termYear, setTermYear] = useState({ termId: '', academicYearId: '' });
  const [me, setMe] = useState(null);
  const [allowedSubjectsForSection, setAllowedSubjectsForSection] = useState(null);
  const [marks, setMarks] = useState({});
  const [testLabel, setTestLabel] = useState('');

  const inputRefs = useRef({});
  const dirtyIdsRef = useRef(new Set());
  const autosaveTimer = useRef(null);
  const [saving, setSaving] = useState('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const loadContext = useCallback(async () => {
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
      if (subjectsRes.ok) { const d = await subjectsRes.json(); setSubjects((isTeacher && meData?.taughtSubjects?.length) ? meData.taughtSubjects : (d.subjects || [])); }
      if (sectionsRes.ok) { const d = await sectionsRes.json(); setSections((isTeacher && meData?.classTeacherSections?.length) ? meData.classTeacherSections : (d.sections || [])); }
      if (yearsRes.ok) { const d = await yearsRes.json(); const current = (d.academicYears || []).find(y => y.isCurrent) || d.academicYears?.[0]; if (current) setTermYear({ termId: current.terms?.[0]?.id || '', academicYearId: current.id }); }
    } catch (e) { console.error(e); toast.error('Failed to load context'); }
  }, [school?.id, session, isTeacher]);

  useEffect(() => { loadContext(); }, [loadContext]);

  const availableSubjects = useMemo(() => Array.isArray(allowedSubjectsForSection) ? allowedSubjectsForSection : subjects, [allowedSubjectsForSection, subjects]);

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

  const loadStudents = useCallback(async () => {
    if (!school?.id || !selected.sectionId) return;
    if (isTeacher) {
      const isClassTeacherForSelected = (me?.classTeacherSections || []).some(sec => sec.id === selected.sectionId);
      if (!isClassTeacherForSelected && !selected.subjectId) return;
    }
    try {
      const url = `/api/schools/${school.id}/academics/grades/students?sectionId=${selected.sectionId}${selected.subjectId ? `&subjectId=${selected.subjectId}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load students');
      const d = await res.json(); setStudents(d.students || []); setMarks({}); dirtyIdsRef.current.clear();
    } catch (e) { toast.error(e.message); }
  }, [school?.id, selected.sectionId, selected.subjectId, isTeacher, me?.classTeacherSections]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const loadTests = useCallback(async () => {
    if (!school?.id || !selected.subjectId) { setTests([]); return; }
    const secParam = selected.sectionId ? `&sectionId=${selected.sectionId}` : '';
    const mineParam = isTeacher ? `&mine=1` : '';
    const res = await fetch(`/api/schools/${school.id}/academics/assignments?isTest=1&subjectId=${selected.subjectId}${secParam}${mineParam}`);
    if (!res.ok) return setTests([]);
    const d = await res.json(); setTests(d.assignments || []);
  }, [school?.id, selected.subjectId, selected.sectionId, isTeacher]);

  useEffect(() => { loadTests(); }, [loadTests]);

  const toNum = (v) => { if (v === '' || v === null || v === undefined) return null; const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

  const onChangeMark = (studentId, value) => { setMarks(prev => ({ ...prev, [studentId]: value })); dirtyIdsRef.current.add(studentId); setSaving('idle'); };

  const buildAssignmentTestJob = () => {
    const dirtyIds = Array.from(dirtyIdsRef.current); if (!dirtyIds.length) return null;
    if (!selected.testAssignmentId || !selected.subjectId || !selected.sectionId) return null;
    const grades = dirtyIds.map(id => ({ studentId: id, marksObtained: toNum(marks[id]) }));
    return {
      url: `/api/schools/${school.id}/academics/grades/assignments`,
      payload: { assignmentId: selected.testAssignmentId, termId: termYear.termId, academicYearId: termYear.academicYearId, subjectId: selected.subjectId, sectionId: selected.sectionId, grades }
    };
  };

  const buildLabelTestJob = () => {
    const dirtyIds = Array.from(dirtyIdsRef.current); if (!dirtyIds.length) return null;
    if (!testLabel || !selected.subjectId || !selected.sectionId) return null;
    const grades = dirtyIds.map(id => ({ studentId: id, marksObtained: toNum(marks[id]) }));
    return {
      url: `/api/schools/${school.id}/academics/grades/tests`,
      payload: { label: testLabel, termId: termYear.termId, academicYearId: termYear.academicYearId, subjectId: selected.subjectId, sectionId: selected.sectionId, grades }
    };
  };

  // Autosave disabled: teachers must click Save to submit grades

  const submitAssignmentTest = async () => {
    const job = buildAssignmentTestJob(); if (!job) return;
    setSaving('saving');
    const res = await fetch(job.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(job.payload) });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) { setSaving('error'); setSaveMessage(data.error || 'Failed to save'); return toast.error(data.error || 'Failed to save test grades'); }
    const savedIds = new Set(job.payload.grades.map(g => g.studentId));
    dirtyIdsRef.current.forEach(id => { if (savedIds.has(id)) dirtyIdsRef.current.delete(id); });
    setSaving('saved'); setSaveMessage('All changes saved');
    toast.success(data.message || 'Test grades saved');
  };

  const submitLabelTest = async () => {
    const job = buildLabelTestJob(); if (!job) return;
    setSaving('saving');
    const res = await fetch(job.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(job.payload) });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) { setSaving('error'); setSaveMessage(data.error || 'Failed to save'); return toast.error(data.error || 'Failed to save test grades'); }
    const savedIds = new Set(job.payload.grades.map(g => g.studentId));
    dirtyIdsRef.current.forEach(id => { if (savedIds.has(id)) dirtyIdsRef.current.delete(id); });
    setSaving('saved'); setSaveMessage('All changes saved');
    toast.success(data.message || 'Test grades saved');
  };

  const availableSections = useMemo(() => sections, [sections]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Enter Test Grades</h1>
      <p className="text-xs text-muted-foreground">Test grades are auto-published as soon as they are saved.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <label className="block text-sm mb-1">Test (optional)</label>
          <Select
            value={selected.testAssignmentId || '__none__'}
            onValueChange={(v) => setSelected(s => ({ ...s, testAssignmentId: v === '__none__' ? '' : v }))}
          >
            <SelectTrigger><SelectValue placeholder="Pick test (or use label)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Use Test Label —</SelectItem>
              {tests.map(a => {
                const cls = a.section?.class?.name || a.class?.name;
                const sec = a.section?.name;
                const suffix = cls && sec ? ` (${cls} - ${sec})` : cls ? ` (${cls})` : '';
                return (
                  <SelectItem value={a.id} key={a.id}>
                    {a.title}{suffix}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Test Label</label>
          <Input value={testLabel} onChange={e => setTestLabel(e.target.value)} placeholder="e.g., Class Test 1" disabled={!!selected.testAssignmentId} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground">{saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'All changes saved' : saving === 'error' ? saveMessage : 'Changes are not auto-saved. Use the Save button.'}</div>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Student</th>
              <th className="py-2">Marks</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st, idx) => (
              <tr key={st.id} className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <td className="py-2 pr-4">{st.lastName}, {st.firstName}</td>
                <td className="py-2">
                  <Input
                    ref={(el) => { if (el) inputRefs.current[st.id] = el; }}
                    type="number"
                    value={marks[st.id] ?? ''}
                    onChange={(e) => onChangeMark(st.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); const n = students[idx + 1]; if (n && inputRefs.current[n.id]) inputRefs.current[n.id].focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); const p = students[idx - 1]; if (p && inputRefs.current[p.id]) inputRefs.current[p.id].focus(); } }}
                    placeholder="e.g., 10"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button onClick={submitAssignmentTest} disabled={!selected.testAssignmentId || !selected.subjectId || !selected.sectionId}>Save & Publish Test Grades (Selected Test)</Button>
        <Button variant="secondary" onClick={submitLabelTest} disabled={!testLabel || !!selected.testAssignmentId || !selected.subjectId || !selected.sectionId}>Save & Publish Test Grades (Label)</Button>
      </div>
    </div>
  );
}
