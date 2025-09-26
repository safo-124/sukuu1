'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSchool } from '../../../layout';
import { useSession } from 'next-auth/react';
import RequireRole from '@/components/auth/RequireRole';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

export default function GradeManagerPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [filters, setFilters] = useState({
    academicYearId: '',
    termId: '',
    subjectId: '',
    sectionId: '',
    examScheduleId: '',
    assignmentId: '',
    label: '',
    studentId: '',
    publishedOnly: false,
    gradeType: 'all', // all | exam | assignment | test
  });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(50);
  const [selected, setSelected] = useState({}); // id -> boolean
  const [editing, setEditing] = useState({}); // id -> { marksObtained, comments }
  const [assignments, setAssignments] = useState([]);
  const [rankingBusy, setRankingBusy] = useState(false);
  const [rankingEnabled, setRankingEnabled] = useState(false);

  // Load filter data
  useEffect(() => {
    const run = async () => {
      if (!school?.id || !session) return;
      try {
        const [yearsRes, subjectsRes, sectionsRes, examsRes] = await Promise.all([
          fetch(`/api/schools/${school.id}/academic-years`),
          fetch(`/api/schools/${school.id}/academics/subjects`),
          fetch(`/api/schools/${school.id}/academics/sections`),
          fetch(`/api/schools/${school.id}/academics/exam-schedules`),
        ]);
        if (yearsRes.ok) {
          const d = await yearsRes.json();
          const yr = d.academicYears || [];
          setYears(yr);
          const current = yr.find(y => y.isCurrent) || yr[0];
          if (current) setFilters(f => ({ ...f, academicYearId: current.id, termId: current.terms?.[0]?.id || '' }));
        }
        if (subjectsRes.ok) { const d = await subjectsRes.json(); setSubjects(d.subjects || []); }
        if (sectionsRes.ok) { const d = await sectionsRes.json(); setSections(d.sections || []); }
        if (examsRes.ok) {
          const d = await examsRes.json();
          const flat = (d.examSchedules || []).map(es => ({ id: es.id, label: `${es.exam?.term?.academicYear?.name || ''} ${es.exam?.name || ''} - ${es.subject?.name || ''} (${es.class?.name || ''})`, subjectId: es.subjectId, classId: es.classId, termId: es.exam?.termId, academicYearId: es.exam?.term?.academicYear?.id }));
          setExamSchedules(flat);
        }
      } catch (e) { console.error(e); toast.error('Failed to load filter data'); }
    };
    run();
  }, [school?.id, session]);

  const fetchGrades = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.academicYearId) qs.set('academicYearId', filters.academicYearId);
      if (filters.termId) qs.set('termId', filters.termId);
      if (filters.subjectId) qs.set('subjectId', filters.subjectId);
      if (filters.sectionId) qs.set('sectionId', filters.sectionId);
      if (filters.gradeType === 'exam' && filters.examScheduleId) qs.set('examScheduleId', filters.examScheduleId);
      if (filters.gradeType === 'assignment' && filters.assignmentId) qs.set('assignmentId', filters.assignmentId);
      if (filters.gradeType === 'test' && filters.label) qs.set('label', filters.label);
      if (filters.studentId) qs.set('studentId', filters.studentId);
      if (filters.publishedOnly) qs.set('publishedOnly', '1');
      qs.set('take', String(take));
      qs.set('skip', String(skip));
      const res = await fetch(`/api/schools/${school.id}/academics/grades?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load grades');
      setRows(data.items || []);
      setTotal(data.total || 0);
      setSelected({});
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGrades(); }, [filters.academicYearId, filters.termId, filters.subjectId, filters.sectionId, filters.gradeType, filters.examScheduleId, filters.assignmentId, filters.label, filters.studentId, filters.publishedOnly, skip, take]);

  // Compute classId and filtered exam schedules early so effects can use them safely
  const classIdForSelectedSection = useMemo(() => sections.find(s => s.id === filters.sectionId)?.classId, [sections, filters.sectionId]);
  const filteredExamSchedules = useMemo(() => {
    const classId = classIdForSelectedSection;
    return examSchedules.filter(es => (!filters.subjectId || es.subjectId === filters.subjectId) && (!classId || es.classId === classId));
  }, [examSchedules, filters.subjectId, classIdForSelectedSection]);

  // Load overallRankingEnabled for selected class/year
  useEffect(() => {
    const load = async () => {
      const classId = classIdForSelectedSection;
      if (!school?.id || !filters.academicYearId || !classId) return;
      try {
        const qs = new URLSearchParams({ academicYearId: filters.academicYearId, classId });
        const res = await fetch(`/api/schools/${school.id}/academics/ranking-config?${qs.toString()}`);
        const d = await res.json().catch(()=>({}));
        if (res.ok) setRankingEnabled(!!d.overallRankingEnabled);
      } catch {}
    };
    load();
  }, [school?.id, filters.academicYearId, classIdForSelectedSection]);

  const toggleSelect = (id, checked) => setSelected(prev => ({ ...prev, [id]: checked }));

  const onEditField = (id, field, value) => setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const saveRow = async (row) => {
    const changes = editing[row.id];
    if (!changes) return;
    try {
      const res = await fetch(`/api/schools/${school.id}/academics/grades/${row.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update grade');
      toast.success('Grade updated');
      setEditing(prev => { const n = { ...prev }; delete n[row.id]; return n; });
      fetchGrades();
    } catch (e) { toast.error(e.message); }
  };

  const deleteRow = async (row) => {
    if (!confirm('Delete this grade? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/schools/${school.id}/academics/grades/${row.id}`, { method: 'DELETE' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete grade');
      toast.success('Grade deleted');
      fetchGrades();
    } catch (e) { toast.error(e.message); }
  };

  const publishSelected = async () => {
    const ids = Object.entries(selected).filter(([,v]) => v).map(([k]) => k);
    if (!ids.length) return toast.error('Select at least one grade');
    try {
      const res = await fetch(`/api/schools/${school.id}/academics/grades/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gradeIds: ids }) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || 'Failed to publish');
      toast.success(`Published ${data.count || ids.length} grades`);
      fetchGrades();
    } catch (e) { toast.error(e.message); }
  };

  const deleteSelected = async () => {
    const ids = Object.entries(selected).filter(([,v]) => v).map(([k]) => k);
    if (!ids.length) return toast.error('Select at least one grade');
    if (!confirm(`Delete ${ids.length} selected grade(s)? This cannot be undone.`)) return;
    try {
      const results = await Promise.allSettled(ids.map(id => fetch(`/api/schools/${school.id}/academics/grades/${id}`, { method: 'DELETE' })));
      const ok = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
      const failed = ids.length - ok;
      if (ok) toast.success(`Deleted ${ok} grade(s)`);
      if (failed) toast.error(`${failed} deletion(s) failed`);
      fetchGrades();
    } catch (e) { toast.error('Bulk delete failed'); }
  };

  const exportCsv = useCallback(() => {
    const header = ['id','studentId','studentName','subject','class','section','examName','assignmentId','marksObtained','comments','isPublished','updatedAt'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const studentName = `${r?.student?.lastName || ''} ${r?.student?.firstName || ''}`.trim();
      const csvRow = [
        r.id,
        r.student?.id || '',
        studentName,
        r.subject?.name || '',
        r.section?.class?.name || '',
        r.section?.name || '',
        r.examSchedule?.exam?.name || '',
        r.assignmentId || '',
        r.marksObtained ?? '',
        (r.comments || '').toString().replaceAll('"', '""'),
        r.isPublished ? '1' : '0',
        r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
      ];
      // Quote fields with commas or quotes
      const escaped = csvRow.map(val => {
        const s = String(val);
        return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replaceAll('"','""')}"` : s;
      });
      lines.push(escaped.join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  const recomputeRankings = async () => {
    if (!filters.sectionId || !filters.termId || !filters.academicYearId) {
      return toast.error('Select Academic Year, Term and Section to compute rankings');
    }
    setRankingBusy(true);
    try {
      // Persist toggle per class/year if possible
      const classId = classIdForSelectedSection;
      if (classId && filters.academicYearId) {
        await fetch(`/api/schools/${school.id}/academics/ranking-config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ academicYearId: filters.academicYearId, classId, overallRankingEnabled: rankingEnabled }) });
      }
      const res = await fetch(`/api/schools/${school.id}/academics/rankings/recompute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: filters.sectionId, termId: filters.termId, academicYearId: filters.academicYearId, publish: rankingEnabled })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || 'Ranking failed');
      toast.success(`Computed rankings for ${data.count} student(s)`);
    } catch (e) { toast.error(e.message); }
    finally { setRankingBusy(false); }
  };

  // Load assignments when subject/section filters change (for assignment gradeType)
  useEffect(() => {
    const run = async () => {
      if (!school?.id || !filters.subjectId) { setAssignments([]); return; }
      try {
        const qs = new URLSearchParams();
        qs.set('subjectId', filters.subjectId);
        if (filters.sectionId) qs.set('sectionId', filters.sectionId);
        const res = await fetch(`/api/schools/${school.id}/academics/assignments?${qs.toString()}`);
        if (!res.ok) { setAssignments([]); return; }
        const d = await res.json();
        setAssignments(d.assignments || []);
      } catch { setAssignments([]); }
    };
    run();
  }, [school?.id, filters.subjectId, filters.sectionId]);

  return (
  <RequireRole role={["SCHOOL_ADMIN"]} fallback={<div className="p-6 text-sm text-muted-foreground">Only school admins can manage grades.</div>}>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Grade Manager</h1>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <div>
            <label className="block text-sm mb-1">Academic Year</label>
            <Select value={filters.academicYearId} onValueChange={(v) => setFilters(f => ({ ...f, academicYearId: v }))}>
              <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                {years.map(y => (<SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">Term</label>
            <Select value={filters.termId} onValueChange={(v) => setFilters(f => ({ ...f, termId: v }))}>
              <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
              <SelectContent>
                {(years.find(y => y.id === filters.academicYearId)?.terms || []).map(t => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">Grade Type</label>
            <Select value={filters.gradeType} onValueChange={(v) => setFilters(f => ({ ...f, gradeType: v, examScheduleId: '', assignmentId: '', label: '' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="exam">Exam</SelectItem>
                <SelectItem value="assignment">Assignment</SelectItem>
                <SelectItem value="test">Test</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">Subject</label>
            <Select value={filters.subjectId} onValueChange={(v) => setFilters(f => ({ ...f, subjectId: v }))}>
              <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">Section</label>
            <Select value={filters.sectionId} onValueChange={(v) => setFilters(f => ({ ...f, sectionId: v }))}>
              <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
              <SelectContent>
                {sections.map(sec => (<SelectItem key={sec.id} value={sec.id}>{sec.class?.name} - {sec.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {filters.gradeType !== 'assignment' && (
            <div>
              <label className="block text-sm mb-1">Exam Schedule</label>
              <Select
                value={filters.examScheduleId || '__ALL__'}
                onValueChange={(v) => setFilters(f => ({ ...f, examScheduleId: v === '__ALL__' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">All</SelectItem>
                  {filteredExamSchedules.map(es => (<SelectItem key={es.id} value={es.id}>{es.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}
          {filters.gradeType === 'assignment' && (
            <div>
              <label className="block text-sm mb-1">Assignment</label>
              <Select
                value={filters.assignmentId || '__ALL__'}
                onValueChange={(v) => setFilters(f => ({ ...f, assignmentId: v === '__ALL__' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">All</SelectItem>
                  {assignments.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.title} {(a.section?.class?.name ? `(${a.section?.class?.name}${a.section?.name ? ` - ${a.section?.name}` : ''})` : '')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {filters.gradeType === 'test' && (
            <div>
              <label className="block text-sm mb-1">Test Label</label>
              <Input value={filters.label} onChange={(e) => setFilters(f => ({ ...f, label: e.target.value }))} placeholder="e.g., Quiz 1" />
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Student ID</label>
            <Input value={filters.studentId} onChange={(e) => setFilters(f => ({ ...f, studentId: e.target.value }))} placeholder="Optional" />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={filters.publishedOnly} onCheckedChange={(v) => setFilters(f => ({ ...f, publishedOnly: !!v }))} /> Published only
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{total} grades</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setSkip(0); fetchGrades(); }}>Refresh</Button>
            <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
            <Button variant="destructive" onClick={deleteSelected}>Delete Selected</Button>
            <Button onClick={publishSelected}>Publish Selected</Button>
          </div>
        </div>

        <div className="flex items-center gap-4 border rounded-md p-3">
          <div className="text-sm font-medium">Overall Ranking</div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={rankingEnabled} onCheckedChange={(v) => setRankingEnabled(!!v)} /> Enable and publish for selected Section/Term
          </label>
          <Button onClick={recomputeRankings} disabled={rankingBusy}>
            {rankingBusy ? 'Computing…' : 'Compute Rankings'}
          </Button>
          <div className="text-xs text-muted-foreground">Uses published grades in the selected Academic Year, Term, and Section.</div>
        </div>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox checked={!!selected[r.id]} onCheckedChange={(v) => toggleSelect(r.id, !!v)} />
                    </TableCell>
                    <TableCell>{r.student?.lastName}, {r.student?.firstName}</TableCell>
                    <TableCell>{r.subject?.name || '—'}</TableCell>
                    <TableCell>{r.section?.class?.name} - {r.section?.name}</TableCell>
                    <TableCell>{r.examSchedule?.exam?.name || '—'}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={r.marksObtained ?? ''}
                        onChange={(e) => onEditField(r.id, 'marksObtained', e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={r.comments ?? ''}
                        onChange={(e) => onEditField(r.id, 'comments', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>{r.isPublished ? 'Published' : 'Draft'}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" onClick={() => saveRow(r)} disabled={!editing[r.id]}>Save</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteRow(r)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" disabled={skip === 0} onClick={() => setSkip(s => Math.max(0, s - take))}>Prev</Button>
          <Button variant="outline" onClick={() => setSkip(s => s + take)} disabled={skip + take >= total}>Next</Button>
          <Select value={String(take)} onValueChange={(v) => { setTake(Number(v)); setSkip(0); }}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </RequireRole>
  );
}
