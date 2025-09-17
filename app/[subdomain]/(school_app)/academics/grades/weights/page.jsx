// app/[subdomain]/(school_app)/academics/grades/weights/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSchool } from '../../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function GradingWeightsPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const [years, setYears] = useState([]);
  const [levels, setLevels] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [scales, setScales] = useState([]);
  const [configs, setConfigs] = useState([]);

  const [form, setForm] = useState({ academicYearId: '', schoolLevelId: '', classId: '', subjectId: '', gradingScaleId: '', examWeight: '60', classworkWeight: '20', assignmentWeight: '20', isDefault: false });

  const isAdmin = session?.user?.role === 'SCHOOL_ADMIN';

  const loadDeps = async () => {
    if (!school?.id) return;
    try {
      const [y, l, c, s, gs, cfg] = await Promise.all([
        fetch(`/api/schools/${school.id}/academic-years`),
        fetch(`/api/schools/${school.id}/academics/school-levels`),
        fetch(`/api/schools/${school.id}/academics/classes?limit=500`),
        fetch(`/api/schools/${school.id}/academics/subjects`),
        fetch(`/api/schools/${school.id}/academics/grading-scales`),
        fetch(`/api/schools/${school.id}/academics/grades/weights`),
      ]);
      const [yJ, lJ, cJ, sJ, gsJ, cfgJ] = await Promise.all([y.json(), l.json(), c.json(), s.json(), gs.json(), cfg.json()]);
      setYears(yJ.academicYears || []);
      setLevels(lJ.schoolLevels || []);
      setClasses(cJ.classes || []);
      setSubjects(sJ.subjects || []);
      setScales(gsJ.gradingScales || []);
      setConfigs(cfgJ.configs || []);
      if ((yJ.academicYears || []).length && !form.academicYearId) {
        const current = yJ.academicYears.find(y => y.isCurrent) || yJ.academicYears[0];
        setForm(f => ({ ...f, academicYearId: current.id }));
      }
    } catch (e) { toast.error('Failed to load grading weights data'); }
  };

  useEffect(() => { loadDeps(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [school?.id]);

  const createConfig = async () => {
    if (!school?.id) return;
    try {
      if (!form.academicYearId) { toast.error('Select academic year'); return; }
      const payload = {
        academicYearId: form.academicYearId,
        schoolLevelId: form.schoolLevelId || null,
        classId: form.classId || null,
        subjectId: form.subjectId || null,
        gradingScaleId: form.gradingScaleId || null,
        examWeight: Number(form.examWeight || 0),
        classworkWeight: Number(form.classworkWeight || 0),
        assignmentWeight: Number(form.assignmentWeight || 0),
        isDefault: Boolean(form.isDefault),
      };
      const res = await fetch(`/api/schools/${school.id}/academics/grades/weights`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Failed to create config'); return; }
      toast.success('Config created');
      setForm(f => ({ ...f, subjectId: '', classId: '', schoolLevelId: '' }));
      loadDeps();
    } catch { toast.error('Failed to create config'); }
  };

  const displayScope = (cfg) => {
    const yearName = years.find(y => y.id === cfg.academicYearId)?.name || '';
    const levelName = cfg.schoolLevelId ? levels.find(l => l.id === cfg.schoolLevelId)?.name : '';
    const className = cfg.classId ? classes.find(c => c.id === cfg.classId)?.name : '';
    const subjectName = cfg.subjectId ? subjects.find(s => s.id === cfg.subjectId)?.name : '';
    const parts = [yearName, levelName, className, subjectName].filter(Boolean);
    return parts.join(' / ') || 'Default';
  };

  const filteredClasses = useMemo(() => {
    if (!form.schoolLevelId) return classes;
    return classes.filter(c => c.schoolLevel?.id === form.schoolLevelId || c.schoolLevelId === form.schoolLevelId);
  }, [classes, form.schoolLevelId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Grading Weights</h1>
      {!isAdmin && <p className="text-sm text-muted-foreground">View only. Contact an admin to modify weights.</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Academic Year</label>
          <Select value={form.academicYearId} onValueChange={(v) => setForm(f => ({ ...f, academicYearId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {years.map(y => (<SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">School Level (optional)</label>
          <Select value={form.schoolLevelId} onValueChange={(v) => setForm(f => ({ ...f, schoolLevelId: v, classId: '' }))}>
            <SelectTrigger><SelectValue placeholder="All levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All levels</SelectItem>
              {levels.map(l => (<SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Class (optional)</label>
          <Select value={form.classId} onValueChange={(v) => setForm(f => ({ ...f, classId: v }))}>
            <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All classes</SelectItem>
              {filteredClasses.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Subject (optional)</label>
          <Select value={form.subjectId} onValueChange={(v) => setForm(f => ({ ...f, subjectId: v }))}>
            <SelectTrigger><SelectValue placeholder="All subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All subjects</SelectItem>
              {subjects.map(su => (<SelectItem key={su.id} value={su.id}>{su.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Grading Scale (optional)</label>
          <Select value={form.gradingScaleId} onValueChange={(v) => setForm(f => ({ ...f, gradingScaleId: v }))}>
            <SelectTrigger><SelectValue placeholder="No scale" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">No scale</SelectItem>
              {scales.map(gs => (<SelectItem key={gs.id} value={gs.id}>{gs.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Exam %</label>
          <Input type="number" value={form.examWeight} onChange={e => setForm(f => ({ ...f, examWeight: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm mb-1">Classwork %</label>
          <Input type="number" value={form.classworkWeight} onChange={e => setForm(f => ({ ...f, classworkWeight: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm mb-1">Assignment %</label>
          <Input type="number" value={form.assignmentWeight} onChange={e => setForm(f => ({ ...f, assignmentWeight: e.target.value }))} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={createConfig} disabled={!isAdmin}>Save Config</Button>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-medium mb-2">Existing Configurations</h2>
        <div className="space-y-2">
          {configs.map(cfg => (
            <div key={cfg.id} className="rounded-md border p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{displayScope(cfg)}</div>
                <div className="text-sm text-muted-foreground">Exam {cfg.examWeight}% • Classwork {cfg.classworkWeight}% • Assignment {cfg.assignmentWeight}%</div>
              </div>
              <div className="text-xs text-muted-foreground">{scales.find(s => s.id === cfg.gradingScaleId)?.name || 'No scale'}</div>
            </div>
          ))}
          {configs.length === 0 && <p className="text-sm text-muted-foreground">No configurations yet.</p>}
        </div>
      </div>
    </div>
  );
}
