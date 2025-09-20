'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import StatsCard from '@/components/teacher/StatsCard';
import { Users, Layers, BookOpen, Filter } from 'lucide-react';

export default function TeacherStudentsPage() {
  const school = useSchool();
  const { data: session } = useSession();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ page:1, totalPages:0, total:0 });
  const [aggregates, setAggregates] = useState(null);
  const [classes, setClasses] = useState([]);
  const [levels, setLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({ classId:'', levelId:'', subjectId:'' });
  const [showFilters, setShowFilters] = useState(false);

  const loadFilters = useCallback(async () => {
    if (!school?.id) return;
    try {
      const [classesRes, levelsRes, subjectsRes] = await Promise.all([
        fetch(`/api/schools/${school.id}/academics/classes`),
        fetch(`/api/schools/${school.id}/academics/school-levels`),
        fetch(`/api/schools/${school.id}/academics/subjects?mine=1`)
      ]);
      if (classesRes.ok) { const d = await classesRes.json(); setClasses(d.classes || []); }
      if (levelsRes.ok) { const d = await levelsRes.json(); setLevels(d.schoolLevels || []); }
      if (subjectsRes.ok) { const d = await subjectsRes.json(); setSubjects(d.subjects || []); }
    } catch (e) { /* silent */ }
  }, [school?.id]);

  const loadStudents = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters.classId) params.set('classId', filters.classId);
      if (filters.levelId) params.set('levelId', filters.levelId);
      if (filters.subjectId) params.set('subjectId', filters.subjectId);
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('include', 'sections,subjects,meta');
      const res = await fetch(`/api/schools/${school.id}/teachers/me/students?` + params.toString());
      if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d.error || 'Failed'); }
      const data = await res.json();
      setStudents(data.students || []);
      setPagination(data.pagination || { page:1, totalPages:0, total:0 });
      setAggregates(data.aggregates || null);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [school?.id, search, filters.classId, filters.levelId, filters.subjectId, page, limit]);

  useEffect(() => { loadFilters(); }, [loadFilters]);
  useEffect(() => { loadStudents(); }, [loadStudents]);

  // Default to first subject (mine) so the initial view shows students enrolled in my subject
  useEffect(() => {
    if (!filters.subjectId && subjects.length > 0) {
      setFilters(f => ({ ...f, subjectId: subjects[0].id }));
      setPage(1);
    }
  }, [subjects]);

  const onChangeFilter = (name, value) => { setFilters(f => ({ ...f, [name]: value })); setPage(1); };
  const onSearchKey = (e) => { if (e.key === 'Enter') { setPage(1); loadStudents(); } };
  const resetFilters = () => { setFilters({ classId:'', levelId:'', subjectId:'' }); setSearch(''); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Header + Metrics */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">My Students</h1>
            <p className="text-sm text-muted-foreground">Students in sections you teach or manage.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-2">
              <Input placeholder="Search name or ID" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={onSearchKey} className="w-48" />
              <Button variant="outline" onClick={()=>{ setPage(1); loadStudents(); }}>Search</Button>
              <Button variant="ghost" onClick={resetFilters}>Reset</Button>
            </div>
            <Button variant={showFilters ? 'default' : 'outline'} onClick={()=>setShowFilters(v=>!v)} className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatsCard label="Students" value={aggregates?.totalStudents ?? (loading ? '…' : students.length)} icon={Users} accent="sky" />
          <StatsCard label="Sections" value={aggregates?.uniqueSections ?? (loading ? '…' : '—')} icon={Layers} accent="emerald" />
          <StatsCard label="Subjects" value={aggregates?.uniqueSubjects ?? (loading ? '…' : '—')} icon={BookOpen} accent="violet" />
          <StatsCard label="Page" value={`${pagination.page}/${pagination.totalPages || 1}`} icon={Users} accent="amber" />
        </div>
      </div>

      {showFilters && (
        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950 space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs mb-1">Class</label>
              <Select value={filters.classId} onValueChange={(v)=>onChangeFilter('classId', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  {classes.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs mb-1">Level</label>
              <Select value={filters.levelId} onValueChange={(v)=>onChangeFilter('levelId', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All Levels" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  {levels.map(l => (<SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs mb-1">Subject</label>
              <Select value={filters.subjectId} onValueChange={(v)=>onChangeFilter('subjectId', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All Subjects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  {subjects.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Select value={String(limit)} onValueChange={(v)=>{ setLimit(parseInt(v,10)); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10,20,50].map(n => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10">
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="hidden sm:table-cell">Adm #</TableHead>
              <TableHead>Class / Section</TableHead>
              <TableHead className="hidden md:table-cell">Level</TableHead>
              <TableHead className="hidden lg:table-cell">Subjects (You Teach)</TableHead>
              <TableHead className="hidden xl:table-cell">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_,i)=>(
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                </TableRow>
              ))
            ) : students.length ? (
              students.map(st => (
                <TableRow key={st.id}>
                  <TableCell className="font-medium">{st.lastName}, {st.firstName}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{st.studentIdNumber}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{st.section?.className} - {st.section?.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{st.section?.levelName}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{(st.subjectsTaught||[]).map(s=>s.name).join(', ') || '—'}</TableCell>
                  <TableCell className="hidden xl:table-cell text-xs">{st.section?.isClassTeacher ? 'Class Teacher' : 'Subject Teacher'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-6 w-6 opacity-50" />
                    <p>No students found for your current teaching assignments.</p>
                    <p className="text-xs max-w-md">If you expect students here, ensure timetable slots or subject-level assignments are configured, and that you are set as class teacher for any managed sections.</p>
                    <Button size="sm" variant="outline" onClick={loadStudents}>Refresh</Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="text-muted-foreground">Page {pagination.page} / {pagination.totalPages || 1} · {pagination.total || 0} total</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</Button>
          <Button variant="outline" size="sm" disabled={page>= (pagination.totalPages||1)} onClick={()=>setPage(p=>p+1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
