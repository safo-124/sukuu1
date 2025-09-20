'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../../layout';
import { useSession } from 'next-auth/react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';

export default function TeacherStaffDirectoryPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalTeachers: 0, limit: 10 });
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(searchParams.get('departmentId') || '');
  const [limit, setLimit] = useState(parseInt(searchParams.get('limit') || '10', 10));
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Sync URL query for pagination/search
  const updateQuery = (updates) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    Object.entries(updates).forEach(([k,v]) => {
      if (v === undefined || v === null || v === '') params.delete(k); else params.set(k, String(v));
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const fetchTeachers = useCallback(async () => {
    if (!school?.id) return;
    setIsLoading(true); setError('');
    try {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limitParam = parseInt(searchParams.get('limit') || String(limit), 10);
      const search = searchParams.get('search') || '';
      const qs = new URLSearchParams({ page: String(page), limit: String(limitParam) });
      if (search) qs.set('search', search);
      const dept = searchParams.get('departmentId') || selectedDept;
      if (dept) qs.set('departmentId', dept);
      // Use teacher-allowed endpoint
      const res = await fetch(`/api/schools/${school.id}/people/teachers?` + qs.toString());
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load staff directory');
      setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
      setPagination(data.pagination || { currentPage: page, totalPages: 1, totalTeachers: 0, limit: limitParam });
    } catch (e) {
      setError(e.message);
      toast.error('Error', { description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [school?.id, searchParams, selectedDept, limit]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  // Load departments for filter
  useEffect(() => {
    const loadDepts = async () => {
      if (!school?.id) return;
      try {
        const res = await fetch(`/api/schools/${school.id}/departments`);
        const data = await res.json().catch(() => ({}));
        if (res.ok) setDepartments(Array.isArray(data.departments) ? data.departments : []);
      } catch (_) { /* ignore */ }
    };
    loadDepts();
  }, [school?.id]);

  const onSubmitSearch = () => {
    updateQuery({ search: searchTerm || undefined, departmentId: selectedDept || undefined, limit, page: 1 });
  };

  const onKeyDown = (e) => { if (e.key === 'Enter') onSubmitSearch(); };

  const titleTextClasses = 'text-black dark:text-white';
  const descriptionTextClasses = 'text-zinc-600 dark:text-zinc-400';
  const outlineButtonClasses = 'border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800';

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const limitFromQuery = parseInt(searchParams.get('limit') || String(limit), 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-semibold ${titleTextClasses}`}>Staff Directory</h1>
          <p className={`text-sm ${descriptionTextClasses}`}>Browse teachers at {school?.name || 'your school'}.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Input placeholder="Search by name, email, or staff ID" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} onKeyDown={onKeyDown} className="w-full sm:w-64" />
          <Select value={selectedDept || 'all'} onValueChange={(v)=>{ const val = v==='all' ? '' : v; setSelectedDept(val); updateQuery({ departmentId: val || undefined, page: 1 }); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={String(limit)} onValueChange={(v)=>{ const n = parseInt(v,10); setLimit(n); updateQuery({ limit: n, page: 1 }); }}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10,20,50].map(n => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onSubmitSearch}>Search</Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/40 p-3 text-sm">
          <div className="font-medium text-red-700 dark:text-red-300">Error</div>
          <div className="text-red-600 dark:text-red-400">{error}</div>
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Department</TableHead>
              <TableHead className="hidden lg:table-cell">Job Title</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : teachers.length ? (
              teachers.map(t => (
                <TableRow key={t.id} className="cursor-pointer" onClick={()=>{ router.push(`/${school?.subdomain}/teacher/people/teachers/${t.id}`); }}>
                  <TableCell className="text-sm">
                    {t.user?.firstName} {t.user?.lastName}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{t.user?.email}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{t.department?.name || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{t.jobTitle || '—'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-sm text-muted-foreground">
                  No teachers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="text-muted-foreground">Page {pagination.currentPage || currentPage} / {pagination.totalPages || 1} · {pagination.totalTeachers || 0} total</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className={outlineButtonClasses} disabled={(pagination.currentPage || currentPage) <= 1}
            onClick={() => updateQuery({ page: Math.max(1, (pagination.currentPage || currentPage) - 1) })}>Prev</Button>
          <Button variant="outline" size="sm" className={outlineButtonClasses} disabled={(pagination.currentPage || currentPage) >= (pagination.totalPages || 1)}
            onClick={() => updateQuery({ page: (pagination.currentPage || currentPage) + 1 })}>Next</Button>
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
            <DialogDescription>Read-only staff information.</DialogDescription>
          </DialogHeader>
          {selectedTeacher ? (
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {selectedTeacher.user?.firstName} {selectedTeacher.user?.lastName}</div>
              <div><span className="font-medium">Email:</span> {selectedTeacher.user?.email || '—'}</div>
              <div><span className="font-medium">Department:</span> {selectedTeacher.department?.name || '—'}</div>
              <div><span className="font-medium">Job Title:</span> {selectedTeacher.jobTitle || '—'}</div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
