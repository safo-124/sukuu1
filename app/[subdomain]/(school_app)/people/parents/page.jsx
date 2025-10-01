// app/[subdomain]/(school_app)/people/parents/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Search, UserPlus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Edit2, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const glassCardClasses = 'p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50';

const initialForm = { firstName: '', lastName: '', email: '', password: '', phoneNumber: '', address: '', children: [{ studentIdNumber: '', relationToStudent: '', isPrimaryContact: true }] };

export default function ManageParentsPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [parents, setParents] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', address: '', isActive: true, children: [] });
  const [deletingId, setDeletingId] = useState(null);

  // Restrict non-admins
  useEffect(() => {
    if (!session) return;
    if (session.user?.role && !['SCHOOL_ADMIN', 'SECRETARY', 'ACCOUNTANT'].includes(session.user.role)) {
      router.replace(`/${school?.subdomain || ''}/dashboard`);
    }
  }, [session, router, school?.subdomain]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set('search', search); else params.delete('search');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(t);
  }, [search, pathname, router, searchParams]);

  const fetchParents = useCallback(async (page = 1, srch = debouncedSearch) => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(pagination.limit), ...(srch ? { search: srch } : {}) });
      const res = await fetch(`/api/schools/${school.id}/people/parents?${qs.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load parents');
      const data = await res.json();
      setParents(data.parents || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, total: 0, limit: 10 });
    } catch (e) {
      toast.error('Error fetching parents', { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [school?.id, debouncedSearch, pagination.limit]);

  useEffect(() => {
    if (school?.id && session) {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const srch = searchParams.get('search') || '';
      fetchParents(page, srch);
    }
  }, [school?.id, session, searchParams, fetchParents]);

  const addChildRow = () => setForm((f) => ({ ...f, children: [...(f.children || []), { studentIdNumber: '', relationToStudent: '', isPrimaryContact: false }] }));
  const removeChildRow = (idx) => setForm((f) => ({ ...f, children: (f.children || []).filter((_, i) => i !== idx) }));
  const updateChildRow = (idx, key, val) => setForm((f) => ({ ...f, children: (f.children || []).map((c, i) => (i === idx ? { ...c, [key]: val } : c)) }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!school?.id) return;
    setSubmitting(true);
    try {
      const payload = { ...form, phoneNumber: form.phoneNumber || undefined, address: form.address || undefined, children: (form.children || []).filter((c) => c.studentIdNumber?.trim()) };
      const res = await fetch(`/api/schools/${school.id}/people/parents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || 'Failed to create parent';
        if (data.issues) msg = data.issues.map((i) => `${i.path?.join('.') || 'Field'}: ${i.message}`).join('; ');
        toast.error('Creation failed', { description: msg });
      } else {
        toast.success('Parent created');
        setOpen(false); setForm(initialForm); fetchParents();
      }
    } catch (e) {
      toast.error('Unexpected error', { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (parentId, name) => {
    if (!school?.id) return;
    const toastId = `parent-active-${parentId}`;
    toast.loading('Updating...', { id: toastId });
    try {
      const res = await fetch(`/api/schools/${school.id}/people/parents/${parentId}`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(data.message || 'Updated', { id: toastId });
      fetchParents(pagination.currentPage, debouncedSearch);
    } catch (e) {
      toast.error('Update failed', { description: e.message, id: toastId });
    }
  };

  const openEdit = (p) => {
    setEditing(p);
    setEditForm({
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      email: p.email || '',
      phoneNumber: p.phoneNumber || '',
      address: p.address || '',
      isActive: !!p.isActive,
      children: (p.children || []).map(c => ({ studentIdNumber: c.studentIdNumber || '', relationToStudent: c.relationToStudent || '', isPrimaryContact: !!c.isPrimaryContact })),
    });
    setEditOpen(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!school?.id || !editing) return;
    try {
      const res = await fetch(`/api/schools/${school.id}/people/parents/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update parent');
      toast.success('Parent updated');
      setEditOpen(false);
      setEditing(null);
      fetchParents(pagination.currentPage, debouncedSearch);
    } catch (e) {
      toast.error('Update failed', { description: e.message });
    }
  };

  const confirmDelete = (p) => { setDeletingId(p.id); setDeleteOpen(true); };
  const doDelete = async () => {
    if (!school?.id || !deletingId) return;
    const id = deletingId;
    setDeleteOpen(false);
    const t = toast.loading('Deleting parent...');
    try {
      const res = await fetch(`/api/schools/${school.id}/people/parents/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast.success('Parent deleted', { id: t });
      setDeletingId(null);
      fetchParents(pagination.currentPage, debouncedSearch);
    } catch (e) {
      toast.error('Delete failed', { description: e.message, id: t });
    }
  };

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${glassCardClasses}`}>
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Parents</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Manage parent accounts and link children by admission number.</p>
        </div>
        <Button onClick={() => { setForm(initialForm); setOpen(true); }} className="bg-black text-white dark:bg-white dark:text-black"><UserPlus className="h-4 w-4 mr-2"/>Add Parent</Button>
      </div>

      <div className={`space-y-4 ${glassCardClasses}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Children</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-56" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : parents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-zinc-500">No parents found.</TableCell>
                </TableRow>
              ) : (
                parents.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.firstName} {p.lastName}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      {(p.children || []).slice(0, 3).map((c, i) => (
                        <span key={c.id} className="inline-block text-xs mr-2 text-zinc-700 dark:text-zinc-300">{c.name} ({c.studentIdNumber})</span>
                      ))}
                      {(p.children || []).length > 3 && <span className="text-xs text-zinc-500">+{(p.children || []).length - 3} more</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Edit2 className="h-4 w-4 mr-1"/>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => confirmDelete(p)}><Trash2 className="h-4 w-4 mr-1"/>Delete</Button>
                        <Button variant="outline" size="sm" onClick={() => toggleActive(p.id, `${p.firstName} ${p.lastName}`)}>{p.isActive ? 'Deactivate' : 'Activate'}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchParents(1)} disabled={pagination.currentPage <= 1}><ChevronsLeft className="h-4 w-4"/></Button>
          <Button variant="outline" size="icon" onClick={() => fetchParents(Math.max(1, pagination.currentPage - 1))} disabled={pagination.currentPage <= 1}><ChevronLeft className="h-4 w-4"/></Button>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Page {pagination.currentPage} of {pagination.totalPages}</span>
          <Button variant="outline" size="icon" onClick={() => fetchParents(Math.min(pagination.totalPages, pagination.currentPage + 1))} disabled={pagination.currentPage >= pagination.totalPages}><ChevronRight className="h-4 w-4"/></Button>
          <Button variant="outline" size="icon" onClick={() => fetchParents(pagination.totalPages)} disabled={pagination.currentPage >= pagination.totalPages}><ChevronsRight className="h-4 w-4"/></Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Parent</DialogTitle>
            <DialogDescription>Set the parent’s details and optionally link their children using admission numbers.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
              </div>
              <div className="sm:col-span-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="sm:col-span-2">
                <Label>Password</Label>
                <Input type="password" minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phoneNumber} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Children (by Admission Number)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addChildRow}>Add Child</Button>
              </div>
              <div className="space-y-3">
                {(form.children || []).map((c, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center">
                    <div className="sm:col-span-3">
                      <Input placeholder="Admission number" value={c.studentIdNumber} onChange={(e) => updateChildRow(idx, 'studentIdNumber', e.target.value)} />
                    </div>
                    <div className="sm:col-span-3">
                      <Input placeholder="Relation (e.g., Mother)" value={c.relationToStudent} onChange={(e) => updateChildRow(idx, 'relationToStudent', e.target.value)} />
                    </div>
                    <div className="sm:col-span-1 flex items-center justify-end gap-3">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Primary</span>
                      <Switch checked={!!c.isPrimaryContact} onCheckedChange={(v) => updateChildRow(idx, 'isPrimaryContact', v)} />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeChildRow(idx)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Creating...</>) : 'Create Parent'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Parent Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Parent</DialogTitle>
            <DialogDescription>Update the parent’s details and children.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} required />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} required />
              </div>
              <div className="sm:col-span-2">
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editForm.phoneNumber} onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Children (by Admission Number)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditForm((f)=>({ ...f, children: [...(f.children||[]), { studentIdNumber: '', relationToStudent: '', isPrimaryContact: false }] }))}>Add Child</Button>
              </div>
              <div className="space-y-3">
                {(editForm.children || []).map((c, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center">
                    <div className="sm:col-span-3">
                      <Input placeholder="Admission number" value={c.studentIdNumber} onChange={(e) => setEditForm((f)=>({ ...f, children: f.children.map((x,i)=> i===idx? { ...x, studentIdNumber: e.target.value } : x) }))} />
                    </div>
                    <div className="sm:col-span-3">
                      <Input placeholder="Relation (e.g., Mother)" value={c.relationToStudent} onChange={(e) => setEditForm((f)=>({ ...f, children: f.children.map((x,i)=> i===idx? { ...x, relationToStudent: e.target.value } : x) }))} />
                    </div>
                    <div className="sm:col-span-1 flex items-center justify-end gap-3">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Primary</span>
                      <Switch checked={!!c.isPrimaryContact} onCheckedChange={(v) => setEditForm((f)=>({ ...f, children: f.children.map((x,i)=> i===idx? { ...x, isPrimaryContact: v } : x) }))} />
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditForm((f)=>({ ...f, children: f.children.filter((_,i)=> i!==idx) }))}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Parent Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete parent?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the parent account and unlink their children. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
