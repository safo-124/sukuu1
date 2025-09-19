// app/[subdomain]/(school_app)/academics/grades/page.jsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Percent, Filter, Trophy } from 'lucide-react';
import RequireRole from '@/components/auth/RequireRole';

// ---------------- STUDENT LIGHTWEIGHT VIEW ----------------
function StudentGradesLite() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [grades, setGrades] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('all');

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (session?.user?.role !== 'STUDENT' || !session?.user?.schoolId) { setLoading(false); return; }
      try {
        const res = await fetch(`/api/schools/${session.user.schoolId}/students/me/grades`);
        if (!res.ok) throw new Error('Failed to load grades');
        const data = await res.json();
        if (!ignore) setGrades(data.grades || []);
      } catch (e) { if (!ignore) setError(e.message); }
      finally { if (!ignore) setLoading(false); }
    }
    load();
    return () => { ignore = true; };
  }, [session?.user?.role, session?.user?.schoolId]);

  const subjects = useMemo(() => {
    const map = new Map();
    grades.forEach(g => { if (g.subject) map.set(g.subject.id, g.subject.name); });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [grades]);

  const filtered = useMemo(() => grades.filter(g => subjectFilter === 'all' || g.subject?.id === subjectFilter), [grades, subjectFilter]);
  const stats = useMemo(() => {
    if (!filtered.length) return { avg: 0, count: 0, best: null };
    const numeric = filtered.map(g => g.score ?? g.marksObtained ?? g.value ?? 0);
    const avg = numeric.reduce((a,b)=>a+b,0) / numeric.length;
    let bestIdx = 0; for (let i=1;i<numeric.length;i++) if (numeric[i] > numeric[bestIdx]) bestIdx = i;
    return { avg, count: filtered.length, best: filtered[bestIdx] };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-sky-600" />
          <h1 className="text-xl font-semibold tracking-tight">My Grades</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-zinc-500" />
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Filter Subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {stats.count > 0 && (
            <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
              <span>Avg: <strong>{stats.avg.toFixed(1)}</strong></span>
              {stats.best && <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-amber-500" /> {stats.best.subject?.name}: {stats.best.score ?? stats.best.marksObtained ?? stats.best.value}</span>}
            </div>
          )}
        </div>
      </div>
      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          {Array.from({ length: 6 }).map((_,i)=><Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}
      {!loading && error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {!loading && !error && filtered.length === 0 && <div className="text-sm text-muted-foreground">No grades available.</div>}
      {!loading && !error && filtered.length > 0 && (
        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Subject</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(g => {
                const date = g.createdAt ? new Date(g.createdAt) : null;
                const dateStr = date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
                const scoreVal = g.score ?? g.marksObtained ?? g.value ?? '—';
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.subject?.name || '—'}</TableCell>
                    <TableCell>{scoreVal}</TableCell>
                    <TableCell>{dateStr}</TableCell>
                    <TableCell>{g.examSchedule ? (g.examSchedule.name || 'Exam') : '—'}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">Published</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function TeacherGradesPage() {
  const school = useSchool();
  const { data: session } = useSession();
  if (session?.user?.role === 'STUDENT') return (
    <RequireRole role="STUDENT" fallback={null}>
      <StudentGradesLite />
    </RequireRole>
  );
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [selected, setSelected] = useState({ subjectId: '', sectionId: '', examScheduleId: '' });
  const [marks, setMarks] = useState({});
  const [termYear, setTermYear] = useState({ termId: '', academicYearId: '' });
  const [testLabel, setTestLabel] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [me, setMe] = useState(null);
  const [allowedSubjectsForSection, setAllowedSubjectsForSection] = useState(null);
  const isTeacher = session?.user?.role === 'TEACHER';
  // Spreadsheet-like entry helpers
  const [saving, setSaving] = useState('idle'); // idle | saving | saved | error
  const [saveMessage, setSaveMessage] = useState('');
  const dirtyIdsRef = useRef(new Set());
  const inputRefs = useRef({});
  const autosaveTimer = useRef(null);
  const [pendingQueue, setPendingQueue] = useState([]);

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

  // When section changes, if teacher and not class teacher for that section, filter subjects by timetable entries
  useEffect(() => {
    const run = async () => {
      if (!isTeacher || !school?.id || !selected.sectionId || !me?.staff?.id) {
        setAllowedSubjectsForSection(null);
        return;
      }
      const isClassTeacherForSelected = (me?.classTeacherSections || []).some(sec => sec.id === selected.sectionId);
      if (isClassTeacherForSelected) {
        // As class teacher, do not restrict subjects (they can view students without subject)
        setAllowedSubjectsForSection(null);
        return;
      }
      try {
        const res = await fetch(`/api/schools/${school.id}/academics/timetable?sectionId=${selected.sectionId}&staffId=${me.staff.id}`);
        if (!res.ok) {
          setAllowedSubjectsForSection([]);
          return;
        }
        const d = await res.json();
        const entries = d.timetableEntries || [];
        const map = new Map();
        entries.forEach(e => { if (e.subject) map.set(e.subject.id, e.subject); });
        const list = Array.from(map.values());
        setAllowedSubjectsForSection(list);
        // Reset invalid selection or auto-pick when only one option
        if (list.length === 1) {
          setSelected(s => ({ ...s, subjectId: list[0].id }));
        } else if (list.length > 1 && !list.some(sj => sj.id === selected.subjectId)) {
          setSelected(s => ({ ...s, subjectId: '' }));
        }
      } catch {
        setAllowedSubjectsForSection([]);
      }
    };
    run();
  }, [isTeacher, school?.id, selected.sectionId, me?.staff?.id]);

  // Determine active mode for autosave precedence
  const activeMode = useMemo(() => {
    if (selected.examScheduleId && selected.sectionId) return 'exam';
    if (assignmentId && selected.subjectId && selected.sectionId) return 'assignment';
    if (testLabel && selected.subjectId && selected.sectionId) return 'test';
    return null;
  }, [selected.examScheduleId, selected.sectionId, assignmentId, selected.subjectId, testLabel]);

  // Change handler with dirty tracking
  const onChangeMark = (studentId, value) => {
    setMarks(prev => ({ ...prev, [studentId]: value }));
    dirtyIdsRef.current.add(studentId);
    setSaving('idle');
  };

  // Clipboard paste handler (supports id\tvalue or sequential values)
  const handlePaste = (e) => {
    const text = e.clipboardData?.getData('text');
    if (!text) return;
    e.preventDefault();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const hasTabs = lines.some(l => l.includes('\t'));
    setMarks(prev => {
      const next = { ...prev };
      if (hasTabs) {
        lines.forEach(line => {
          const [id, val] = line.split('\t');
          const v = val?.trim();
          if (id && students.some(s => s.id === id)) {
            next[id] = v ?? '';
            dirtyIdsRef.current.add(id);
          }
        });
      } else {
        students.forEach((s, idx) => {
          if (idx < lines.length) {
            const v = lines[idx]?.trim();
            next[s.id] = v ?? '';
            dirtyIdsRef.current.add(s.id);
          }
        });
      }
      return next;
    });
  };

  // Keyboard navigation between inputs
  const handleKeyDown = (e, studentIndex) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = students[studentIndex + 1];
      if (next && inputRefs.current[next.id]) inputRefs.current[next.id].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = students[studentIndex - 1];
      if (prev && inputRefs.current[prev.id]) inputRefs.current[prev.id].focus();
    }
  };

  // Offline queue management
  const loadQueue = () => {
    try {
      const raw = localStorage.getItem('pendingGradeSaves') || '[]';
      setPendingQueue(JSON.parse(raw));
    } catch { setPendingQueue([]); }
  };
  const pushQueue = (item) => {
    try {
      const raw = localStorage.getItem('pendingGradeSaves') || '[]';
      const list = JSON.parse(raw);
      list.push(item);
      localStorage.setItem('pendingGradeSaves', JSON.stringify(list));
      setPendingQueue(list);
    } catch {}
  };
  const flushQueue = async () => {
    loadQueue();
    if (!pendingQueue.length) return;
    const rest = [];
    for (const it of pendingQueue) {
      try {
        const res = await fetch(it.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(it.payload) });
        if (!res.ok) throw new Error('Failed');
      } catch {
        rest.push(it);
      }
    }
    localStorage.setItem('pendingGradeSaves', JSON.stringify(rest));
    setPendingQueue(rest);
    if (rest.length === 0) toast.success('All pending grade saves synced');
  };
  useEffect(() => { loadQueue(); }, []);
  useEffect(() => {
    const onOnline = () => flushQueue();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [pendingQueue]);

  // Build payload for autosave
  const toNum = (v) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  const buildPayload = () => {
    const dirtyIds = Array.from(dirtyIdsRef.current);
    if (!dirtyIds.length) return null;
    const gradesArr = dirtyIds.map(id => ({ studentId: id, marksObtained: toNum(marks[id]) }));
    if (activeMode === 'exam') {
      const es = examSchedules.find(e => e.id === selected.examScheduleId);
      if (!es || !selected.sectionId) return null;
      return {
        url: `/api/schools/${school.id}/academics/grades/exams`,
        payload: {
          examScheduleId: selected.examScheduleId,
          termId: es.termId || termYear.termId,
          academicYearId: es.academicYearId || termYear.academicYearId,
          subjectId: es.subjectId || selected.subjectId,
          sectionId: selected.sectionId,
          grades: gradesArr,
        }
      };
    }
    if (activeMode === 'assignment') {
      if (!assignmentId || !selected.subjectId || !selected.sectionId) return null;
      return {
        url: `/api/schools/${school.id}/academics/grades/assignments`,
        payload: {
          assignmentId,
          termId: termYear.termId,
          academicYearId: termYear.academicYearId,
          subjectId: selected.subjectId,
          sectionId: selected.sectionId,
          grades: gradesArr,
        }
      };
    }
    if (activeMode === 'test') {
      if (!testLabel || !selected.subjectId || !selected.sectionId) return null;
      return {
        url: `/api/schools/${school.id}/academics/grades/tests`,
        payload: {
          label: testLabel,
          termId: termYear.termId,
          academicYearId: termYear.academicYearId,
          subjectId: selected.subjectId,
          sectionId: selected.sectionId,
          grades: gradesArr,
        }
      };
    }
    return null;
  };

  // Debounced autosave when marks change and a target is selected
  useEffect(() => {
    if (!activeMode) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      const job = buildPayload();
      if (!job) return;
      setSaving('saving'); setSaveMessage('Saving changes...');
      try {
        const res = await fetch(job.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(job.payload) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to save');
        }
        const savedIds = new Set(job.payload.grades.map(g => g.studentId));
        dirtyIdsRef.current.forEach(id => { if (savedIds.has(id)) dirtyIdsRef.current.delete(id); });
        setSaving('saved'); setSaveMessage('All changes saved');
      } catch (err) {
        if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
          pushQueue({ url: job.url, payload: job.payload, ts: Date.now() });
          setSaving('error'); setSaveMessage('Offline: changes queued');
        } else {
          setSaving('error'); setSaveMessage(err.message || 'Failed to save');
        }
      }
    }, 800);
    return () => clearTimeout(autosaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks, activeMode, selected.examScheduleId, assignmentId, testLabel, selected.subjectId, selected.sectionId, termYear.termId, termYear.academicYearId]);

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
  const availableSubjects = useMemo(() => {
    if (Array.isArray(allowedSubjectsForSection)) return allowedSubjectsForSection;
    return subjects;
  }, [allowedSubjectsForSection, subjects]);

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
        {Array.isArray(allowedSubjectsForSection) && allowedSubjectsForSection.length === 0 && isTeacher && !((me?.classTeacherSections || []).some(sec => sec.id === selected.sectionId)) ? (
          <p className="text-sm text-red-500 mb-2">You do not teach any subject in this section.</p>
        ) : null}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground">
            {activeMode ? (
              saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'All changes saved' : saving === 'error' ? saveMessage : ''
            ) : 'Select an exam, assignment, or test to enable autosave.'}
          </div>
          {pendingQueue.length > 0 && (
            <Button variant="outline" size="sm" onClick={flushQueue}>Retry pending saves ({pendingQueue.length})</Button>
          )}
        </div>
        <table className="min-w-full text-sm" onPaste={handlePaste}>
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
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    placeholder="e.g., 78"
                  />
                </td>
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

