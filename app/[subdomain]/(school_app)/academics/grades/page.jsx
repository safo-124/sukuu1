// app/[subdomain]/(school_app)/academics/grades/page.jsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function TeacherGradesPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [selected, setSelected] = useState({ subjectId: '', sectionId: '', examScheduleId: '' });
  const [marks, setMarks] = useState({});
  const [termYear, setTermYear] = useState({ termId: '', academicYearId: '' });
  const [testLabel, setTestLabel] = useState('');
  const [me, setMe] = useState(null);
  const isTeacher = session?.user?.role === 'TEACHER';

  const loadContext = useCallback(async () => {
    if (!school?.id || !session) return;
    try {
      const mine = isTeacher ? '1' : '0';
      const [meRes, subjectsRes, sectionsRes, examsRes, yearsRes] = await Promise.all([
        fetch(`/api/schools/${school.id}/staff/me`),
        fetch(`/api/schools/${school.id}/academics/subjects?mine=${mine}`),
        fetch(`/api/schools/${school.id}/academics/sections`),
        fetch(`/api/schools/${school.id}/academics/exam-schedules`),
        fetch(`/api/schools/${school.id}/academic-years`),
      ]);
      let meData = null;
      if (meRes.ok) {
        meData = await meRes.json();
        setMe(meData);
      }
      if (subjectsRes.ok) { const d = await subjectsRes.json(); setSubjects(d.subjects || []); }
      if (sectionsRes.ok) { const d = await sectionsRes.json(); setSections(d.sections || []); }
      // If teacher, prefer their class-teacher sections and taught subjects when available
      if (isTeacher && meData) {
        if (Array.isArray(meData.classTeacherSections) && meData.classTeacherSections.length) {
          setSections(meData.classTeacherSections);
        }
        if (Array.isArray(meData.taughtSubjects) && meData.taughtSubjects.length) {
          setSubjects(meData.taughtSubjects);
        }
      }
      let flat = [];
      if (examsRes.ok) { const d = await examsRes.json();
        flat = (d.examSchedules || []).map(es => ({ id: es.id, label: `${es.exam?.term?.academicYear?.name || ''} ${es.exam?.name || ''} - ${es.subject?.name || ''} (${es.class?.name || ''})`, subjectId: es.subjectId, classId: es.classId, termId: es.exam?.termId, academicYearId: es.exam?.term?.academicYear?.id }));
        setExamSchedules(flat);
      }
      if (yearsRes.ok) { const d = await yearsRes.json();
        const current = (d.academicYears || []).find(y => y.isCurrent) || d.academicYears?.[0];
        if (current) {
          const defaultTerm = current.terms?.[0];
          setTermYear({ termId: defaultTerm?.id || '', academicYearId: current.id });
        }
      }
      if ((flat || []).length) {
        setSelected(s => ({ ...s, examScheduleId: flat[0].id }));
        setTermYear({ termId: flat[0].termId, academicYearId: flat[0].academicYearId });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load grading context');
    }
  }, [school?.id, session, isTeacher]);

  useEffect(() => { loadContext(); }, [loadContext]);

  const loadStudents = useCallback(async () => {
    if (!school?.id || !selected.sectionId) return;
    // For teachers: require subject selection unless class teacher for the section
    if (isTeacher) {
      const isClassTeacherForSelected = (me?.classTeacherSections || []).some(sec => sec.id === selected.sectionId);
      if (!isClassTeacherForSelected && !selected.subjectId) {
        return; // need subject to authorize fetch for non-class teacher
      }
    }
    try {
      const url = `/api/schools/${school.id}/academics/grades/students?sectionId=${selected.sectionId}${selected.subjectId ? `&subjectId=${selected.subjectId}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        let msg = 'Failed to load students';
        try { const err = await res.json(); if (err?.error) msg = err.error; } catch {}
        throw new Error(msg);
      }
      const d = await res.json();
      setStudents(d.students || []);
      setMarks({});
    } catch (e) { toast.error(e.message); }
  }, [school?.id, selected.sectionId, selected.subjectId, isTeacher, me?.classTeacherSections]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const onChangeMark = (studentId, value) => setMarks(prev => ({ ...prev, [studentId]: value }));

  const submitExamGrades = async () => {
    if (!school?.id || !selected.examScheduleId || !selected.sectionId) return;
    const es = examSchedules.find(e => e.id === selected.examScheduleId);
    const payload = {
      examScheduleId: selected.examScheduleId,
      termId: es?.termId || termYear.termId,
      academicYearId: es?.academicYearId || termYear.academicYearId,
      subjectId: es?.subjectId || selected.subjectId,
      sectionId: selected.sectionId,
      grades: students.map(s => ({ studentId: s.id, marksObtained: marks[s.id] ? Number(marks[s.id]) : null })),
    };
    const res = await fetch(`/api/schools/${school.id}/academics/grades/exams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || 'Failed to save exam grades');
    toast.success('Exam grades saved');
  };

  const [assignmentId, setAssignmentId] = useState('');
  const submitAssignmentGrades = async () => {
    if (!school?.id || !assignmentId || !selected.sectionId || !selected.subjectId) return;
    const payload = {
      assignmentId,
      termId: termYear.termId,
      academicYearId: termYear.academicYearId,
      subjectId: selected.subjectId,
      sectionId: selected.sectionId,
      grades: students.map(s => ({ studentId: s.id, marksObtained: marks[s.id] ? Number(marks[s.id]) : null })),
    };
    const res = await fetch(`/api/schools/${school.id}/academics/grades/assignments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || 'Failed to save assignment grades');
    toast.success('Assignment grades saved');
  };

  const submitTestGrades = async () => {
    if (!school?.id || !selected.subjectId || !selected.sectionId || !termYear.termId || !termYear.academicYearId || !testLabel) {
      return toast.error('Select subject, section, term/year and enter test label');
    }
    const payload = {
      label: testLabel,
      termId: termYear.termId,
      academicYearId: termYear.academicYearId,
      subjectId: selected.subjectId,
      sectionId: selected.sectionId,
      grades: students.map(s => ({ studentId: s.id, marksObtained: marks[s.id] ? Number(marks[s.id]) : null })),
    };
    const res = await fetch(`/api/schools/${school.id}/academics/grades/tests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || 'Failed to save test grades');
    toast.success('Test grades saved');
  };

  const availableSections = useMemo(() => sections, [sections]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Enter Grades</h1>
      {selected.sectionId && isTeacher && !(me?.classTeacherSections || []).some(sec => sec.id === selected.sectionId) && !selected.subjectId ? (
        <p className="text-sm text-muted-foreground">Select a subject to load students for a section where you're not the class teacher.</p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm mb-1">Subject</label>
          <Select value={selected.subjectId} onValueChange={(v) => setSelected(s => ({ ...s, subjectId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map(s => (<SelectItem value={s.id} key={s.id}>{s.name}</SelectItem>))}
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
          <label className="block text-sm mb-1">Exam Schedule</label>
          <Select value={selected.examScheduleId} onValueChange={(v) => setSelected(s => ({ ...s, examScheduleId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
            <SelectContent>
              {examSchedules.map(es => (<SelectItem value={es.id} key={es.id}>{es.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Assignment ID</label>
          <Input value={assignmentId} onChange={e => setAssignmentId(e.target.value)} placeholder="Paste assignment ID" />
        </div>
        <div>
          <label className="block text-sm mb-1">Test Label</label>
          <Input value={testLabel} onChange={e => setTestLabel(e.target.value)} placeholder="e.g., Class Test 1" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Student</th>
              <th className="py-2">Marks</th>
            </tr>
          </thead>
          <tbody>
            {students.map(st => (
              <tr key={st.id} className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <td className="py-2 pr-4">{st.lastName}, {st.firstName}</td>
                <td className="py-2"><Input type="number" value={marks[st.id] ?? ''} onChange={(e) => onChangeMark(st.id, e.target.value)} placeholder="e.g., 78" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button onClick={submitExamGrades} disabled={!selected.examScheduleId || !selected.sectionId}>Save Exam Grades</Button>
        <Button variant="outline" onClick={submitAssignmentGrades} disabled={!assignmentId || !selected.subjectId || !selected.sectionId}>Save Assignment Grades</Button>
        <Button variant="secondary" onClick={submitTestGrades} disabled={!testLabel || !selected.subjectId || !selected.sectionId}>Save Test Grades</Button>
      </div>
    </div>
  );
}

