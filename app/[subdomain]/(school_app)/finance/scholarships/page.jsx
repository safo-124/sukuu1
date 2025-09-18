"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// Placeholder fetch helper; will call /api/schools/:schoolId/finance/scholarships
async function fetchScholarships(schoolId, params = {}) {
  const query = new URLSearchParams();
  if (params.studentId) query.set('studentId', params.studentId);
  if (params.academicYearId) query.set('academicYearId', params.academicYearId);
  if (params.isActive !== undefined && params.isActive !== 'ALL') query.set('isActive', params.isActive === 'true');
  const qs = query.toString();
  const res = await fetch(`/api/schools/${schoolId}/finance/scholarships${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(`Failed to load scholarships (${res.status})`);
  return res.json();
}

async function fetchAcademicYears(schoolId) {
  // Lightweight fetch: reuse existing endpoint if any; placeholder fallback
  try {
    const res = await fetch(`/api/schools/${schoolId}/academics/years`);
    if (res.ok) return (await res.json()).academicYears || [];
  } catch {}
  return [];
}

export default function ScholarshipsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [filters, setFilters] = useState({ academicYearId: 'ALL', isActive: 'ALL', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [years, setYears] = useState([]);

  // Form state for creation
  const [form, setForm] = useState({ studentId: '', academicYearId: '', type: 'PERCENTAGE', percentage: '', amount: '', notes: '', isActive: true });

  const filteredData = useMemo(() => {
    let rows = data;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(r => `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.toLowerCase().includes(q) || (r.student?.studentIdNumber || '').toLowerCase().includes(q));
    }
    if (filters.academicYearId && filters.academicYearId !== 'ALL') rows = rows.filter(r => r.academicYear?.id === filters.academicYearId);
    if (filters.isActive !== 'ALL') rows = rows.filter(r => r.isActive === (filters.isActive === 'true'));
    return rows;
  }, [data, filters]);

  const load = async (sid, opts = {}) => {
    setLoading(true);
    try {
      const payload = await fetchScholarships(sid, opts);
      setData(payload.scholarships || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const s = await fetch('/api/auth/session');
        if (s.ok) {
          const session = await s.json();
          const sid = session?.user?.schoolId;
          if (sid) {
            setSchoolId(sid);
            await Promise.all([
              load(sid),
              (async () => { const yrs = await fetchAcademicYears(sid); setYears(yrs); })()
            ]);
          } else setError('No school context found.');
        } else setError('Unable to resolve session.');
      } catch (e) { setError(e.message); } finally { setLoading(false); }
    };
    init();
  }, []);

  const submitCreate = async () => {
    if (!schoolId) return;
    setCreating(true);
    try {
      const payload = { studentId: form.studentId, academicYearId: form.academicYearId, type: form.type, notes: form.notes, isActive: form.isActive };
      if (form.type === 'PERCENTAGE') payload.percentage = Number(form.percentage);
      else payload.amount = Number(form.amount);
      const res = await fetch(`/api/schools/${schoolId}/finance/scholarships`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const j = await res.json().catch(()=>({ error: 'Failed'}));
        throw new Error(j.error || 'Failed to create');
      }
      toast.success('Scholarship created');
      setShowCreate(false);
      setForm({ studentId: '', academicYearId: '', type: 'PERCENTAGE', percentage: '', amount: '', notes: '', isActive: true });
      await load(schoolId);
    } catch (e) {
      toast.error(e.message);
    } finally { setCreating(false); }
  };

  const toggleActive = async (row) => {
    if (!schoolId) return;
    const prev = row.isActive;
    setData(d => d.map(s => s.id === row.id ? { ...s, isActive: !prev } : s));
    try {
      const res = await fetch(`/api/schools/${schoolId}/finance/scholarships/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !prev }) });
      if (!res.ok) throw new Error('Failed to update status');
    } catch (e) {
      toast.error(e.message);
      setData(d => d.map(s => s.id === row.id ? { ...s, isActive: prev } : s));
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scholarships</h1>
          <p className="text-sm text-muted-foreground">Manage student scholarships and fee relief allocations.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-end">
          <Input placeholder="Search student..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="w-44" />
          <Select value={filters.academicYearId} onValueChange={v => setFilters(f => ({ ...f, academicYearId: v }))}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Academic Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Years</SelectItem>
              {years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.isActive} onValueChange={v => setFilters(f => ({ ...f, isActive: v }))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => schoolId && load(schoolId, { academicYearId: filters.academicYearId !== 'ALL' ? filters.academicYearId : undefined, isActive: filters.isActive !== 'ALL' ? filters.isActive : undefined })}>Refresh</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Scholarship
          </Button>
        </div>
      </div>
      <Separator />

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}
      {!loading && error && (
        <Card className="p-4 text-sm text-red-600">{error}</Card>
      )}
      {!loading && !error && (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm py-6">No scholarships found.</TableCell>
                </TableRow>
              )}
              {filteredData.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{s.student?.firstName} {s.student?.lastName}</TableCell>
                  <TableCell>{s.academicYear?.name}</TableCell>
                  <TableCell>{s.type}</TableCell>
                  <TableCell>{s.type === 'PERCENTAGE' ? `${s.percentage}%` : s.amount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={!!s.isActive} onCheckedChange={() => toggleActive(s)} />
                      <span className="text-xs text-muted-foreground">{s.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(s.updatedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Scholarship</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input placeholder="Student ID" value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} />
            <Select value={form.academicYearId} onValueChange={v => setForm(f => ({ ...f, academicYearId: v }))}>
              <SelectTrigger><SelectValue placeholder="Academic Year" /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v, percentage: '', amount: '' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                <SelectItem value="FIXED">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
            {form.type === 'PERCENTAGE' ? (
              <Input type="number" placeholder="Percentage %" value={form.percentage} onChange={e => setForm(f => ({ ...f, percentage: e.target.value }))} />
            ) : (
              <Input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            )}
            <Input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              <span className="text-sm">Active</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={creating || !form.studentId || !form.academicYearId || (form.type==='PERCENTAGE' ? !form.percentage : !form.amount)}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
