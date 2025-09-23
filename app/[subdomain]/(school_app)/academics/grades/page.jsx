// app/[subdomain]/(school_app)/academics/grades/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Percent, Filter, Trophy, Printer } from 'lucide-react';
import RequireRole from '@/components/auth/RequireRole';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, Tooltip, Legend, XAxis, YAxis } from 'recharts';

// ---------------- STUDENT LIGHTWEIGHT VIEW ----------------
function StudentGradesLite() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [grades, setGrades] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const handlePrint = () => { window.print(); };

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
          <button onClick={handlePrint} className="hidden print:hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
            <Printer className="h-4 w-4" /> Print
          </button>
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
                <TableHead>Remarks</TableHead>
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
                    <TableCell className="max-w-[300px] whitespace-pre-wrap">{g.comments || '—'}</TableCell>
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

// ---------------- STUDENT ANALYTICS CHARTS ----------------
function StudentAnalyticsCharts() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (session?.user?.role !== 'STUDENT' || !session?.user?.schoolId) { setLoading(false); return; }
      try {
        const res = await fetch(`/api/schools/${session.user.schoolId}/students/me/grades-analytics`);
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Failed to load analytics');
        if (!ignore) setAnalytics(d.analytics);
      } catch (e) { if (!ignore) setError(e.message); }
      finally { if (!ignore) setLoading(false); }
    };
    run();
    return () => { ignore = true; };
  }, [session?.user?.role, session?.user?.schoolId]);

  if (loading) return <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  if (!analytics) return null;

  const subjectAverages = (analytics.subjects || []).map(s => ({ name: s.name, average: Number(s.average?.toFixed?.(1) ?? s.average ?? 0) }));
  const predictions = (analytics.predictions || []).map(p => ({ name: p.subjectName, next: p.predictedNextMark ? Number(p.predictedNextMark.toFixed(1)) : null }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-3">Subject Averages</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectAverages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="average" fill="#3b82f6" name="Average" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {predictions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Predicted Next Score (per Subject)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="next" fill="#10b981" name="Predicted" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- PAGE EXPORT ----------------
export default function GradesPage() {
  const { data: session } = useSession();
  if (session?.user?.role === 'STUDENT') {
    return (
      <RequireRole role="STUDENT" fallback={null}>
        <div className="space-y-8">
          <StudentGradesLite />
          <StudentAnalyticsCharts />
        </div>
      </RequireRole>
    );
  }
  // Temporary placeholder for teacher/admin until full dashboard is wired
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Grades</h1>
      <div className="text-sm text-muted-foreground">Teacher/Admin grades dashboard coming soon.</div>
    </div>
  );
}
 
