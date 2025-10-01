'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSchool } from '../../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function TeacherTestsPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const isTeacher = session?.user?.role === 'TEACHER';

  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({ subjectId: '', sectionId: '', mode: 'ALL' });
  const [tests, setTests] = useState([]);
  const [busy, setBusy] = useState(false);

  const [newTest, setNewTest] = useState({ title: '', mode: 'IN_PERSON', maxMarks: '', dueDate: '' });
  const [testFiles, setTestFiles] = useState([]);

  useEffect(() => {
    const loadBasics = async () => {
      if (!school?.id) return;
      try {
        const mine = isTeacher ? '1' : '0';
        const [subjectsRes, sectionsRes] = await Promise.all([
          fetch(`/api/schools/${school.id}/academics/subjects?mine=${mine}`),
          fetch(`/api/schools/${school.id}/academics/sections`),
        ]);
        if (subjectsRes.ok) { const d = await subjectsRes.json(); setSubjects(d.subjects || []); }
        if (sectionsRes.ok) { const d = await sectionsRes.json(); setSections(d.sections || []); }
      } catch (e) { console.error(e); }
    };
    loadBasics();
  }, [school?.id, isTeacher]);

  const loadTests = async () => {
    if (!school?.id) return;
    setBusy(true);
    try {
      const params = new URLSearchParams();
      params.set('isTest', '1');
      if (filters.subjectId) params.set('subjectId', filters.subjectId);
      if (filters.mode && filters.mode !== 'ALL') params.set('mode', filters.mode);
      const res = await fetch(`/api/schools/${school.id}/academics/assignments?` + params.toString());
      const d = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(d.error || 'Failed to load tests');
      setTests(d.assignments || []);
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  useEffect(() => { loadTests(); }, [school?.id, filters.subjectId, filters.mode]);

  const createTest = async () => {
    if (!school?.id || !filters.subjectId || !newTest.title || !newTest.dueDate) {
      return toast.error('Subject, Title and Due Date are required');
    }
    try {
      setBusy(true);
      let fileUrls = [];
      if (testFiles && testFiles.length) {
        const formData = new FormData();
        for (const f of testFiles) formData.append('files', f);
        const up = await fetch('/api/upload-files', { method: 'POST', body: formData });
        const upJ = await up.json().catch(()=>({}));
        if (!up.ok) throw new Error(upJ.error || 'File upload failed');
        fileUrls = upJ.fileUrls || [];
      }
      const payload = {
        title: newTest.title,
        description: '',
        dueDate: newTest.dueDate,
        subjectId: filters.subjectId,
        sectionId: filters.sectionId || null,
        classId: undefined,
        teacherId: 'self',
        maxMarks: newTest.maxMarks ? Number(newTest.maxMarks) : null,
        attachments: fileUrls,
        type: 'SUBJECT',
        isTest: true,
        testDeliveryMode: newTest.mode,
      };
      const res = await fetch(`/api/schools/${school.id}/academics/assignments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(d.error || 'Failed to create test');
      toast.success('Test created');
      setNewTest({ title: '', mode: 'IN_PERSON', maxMarks: '', dueDate: '' });
      setTestFiles([]);
      loadTests();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const deleteTest = async (id) => {
    if (!school?.id) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/schools/${school.id}/academics/assignments/${id}`, { method: 'DELETE' });
      const d = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(d.error || 'Failed to delete test');
      toast.success('Test deleted');
      loadTests();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const makeObjective = async (id) => {
    if (!school?.id) return;
    try {
      setBusy(true);
      // convert to OBJECTIVE to enable auto-marking question bank
      const res = await fetch(`/api/schools/${school.id}/academics/assignments/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'OBJECTIVE' })
      });
      const d = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(d.error || 'Failed to update test type');
      toast.success('Test switched to Objective');
      loadTests();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const saveQuestions = async (id, questions) => {
    if (!school?.id) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/schools/${school.id}/academics/assignments/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'OBJECTIVE', objectives: questions })
      });
      const d = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(d.error || 'Failed to save questions');
      toast.success('Questions saved');
      loadTests();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tests</h1>
      <p className="text-xs text-muted-foreground">Create and manage tests for your classes. Online tests can use objective questions for auto‑marking. Face‑to‑face tests can include a PDF upload.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm mb-1">Subject</label>
          <Select value={filters.subjectId} onValueChange={(v)=>setFilters(s=>({...s, subjectId: v}))}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map(s=> (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Section (optional)</label>
          <Select value={filters.sectionId || ''} onValueChange={(v)=>setFilters(s=>({...s, sectionId: v}))}>
            <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {sections.map(sec => (<SelectItem value={sec.id} key={sec.id}>{sec.class?.name} - {sec.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Mode</label>
          <Select value={filters.mode} onValueChange={(v)=>setFilters(s=>({...s, mode: v}))}>
            <SelectTrigger><SelectValue placeholder="All modes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="IN_PERSON">Face to Face</SelectItem>
              <SelectItem value="ONLINE">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={loadTests} disabled={busy}>Refresh</Button>
        </div>
      </div>

      <div className="rounded-md border p-4 space-y-3">
        <h3 className="font-medium">Create Test</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <Input value={newTest.title} onChange={e=>setNewTest(t=>({...t, title: e.target.value}))} placeholder="e.g., Midterm Test" />
          </div>
          <div>
            <label className="block text-sm mb-1">Mode</label>
            <Select value={newTest.mode} onValueChange={(v)=>setNewTest(t=>({...t, mode: v}))}>
              <SelectTrigger><SelectValue placeholder="Delivery mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_PERSON">Face to Face</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">Max Marks</label>
            <Input type="number" value={newTest.maxMarks} onChange={e=>setNewTest(t=>({...t, maxMarks: e.target.value}))} placeholder="e.g., 50" />
          </div>
          <div>
            <label className="block text-sm mb-1">Due Date</label>
            <Input type="datetime-local" value={newTest.dueDate} onChange={e=>setNewTest(t=>({...t, dueDate: e.target.value}))} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Upload PDF (optional)</label>
            <input type="file" accept="application/pdf" multiple onChange={(e)=>setTestFiles(Array.from(e.target.files||[]))} />
            <p className="text-xs text-muted-foreground mt-1">Attach materials or the test paper for face‑to‑face tests.</p>
          </div>
          <div className="md:col-span-4">
            <Button onClick={createTest} disabled={busy || !filters.subjectId}>Create Test</Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="p-3 border-b font-medium">My Tests</div>
        <div className="divide-y">
          {tests.map(t => (
            <div key={t.id} className="p-3 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="font-medium">{t.title} <span className="text-xs text-muted-foreground">({t.testDeliveryMode || 'IN_PERSON'})</span></div>
                <div className="text-xs text-muted-foreground">{t.subject?.name} · Due {new Date(t.dueDate).toLocaleString()}</div>
                {Array.isArray(t.attachments) && t.attachments.length > 0 && (
                  <div className="text-xs">
                    Attachments: {t.attachments.map((a,i)=>(<a key={i} href={a} className="underline mr-2" target="_blank">File {i+1}</a>))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={()=>makeObjective(t.id)} disabled={busy || t.type === 'OBJECTIVE'}>Enable Objective</Button>
                <Button variant="outline" onClick={()=>saveQuestions(t.id, [
                  { question: '2 + 2 = ?', options: ['3','4','5'], correctAnswer: '4', marks: 1 },
                ])} disabled={busy || t.type !== 'OBJECTIVE'}>Add Sample Questions</Button>
                <Button variant="destructive" onClick={()=>deleteTest(t.id)} disabled={busy}>Delete</Button>
              </div>
            </div>
          ))}
          {!tests.length && (
            <div className="p-3 text-sm text-muted-foreground">No tests found. Create one above.</div>
          )}
        </div>
      </div>
    </div>
  );
}
