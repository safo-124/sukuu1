'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, PlusCircle, Edit3, Trash2, Globe2, CalendarDays, AlertTriangle } from 'lucide-react';

const canManage = (role) => ['SCHOOL_ADMIN','SECRETARY','HR_MANAGER','SUPER_ADMIN'].includes(role);

const ROLES = [
  'SCHOOL_ADMIN','SECRETARY','HR_MANAGER','TEACHER','ACCOUNTANT','PROCUREMENT_OFFICER','HOSTEL_WARDEN','LIBRARIAN','TRANSPORT_MANAGER','PARENT','STUDENT'
];

const initialForm = {
  id: null,
  title: '',
  content: '',
  isGlobal: false,
  publishedAt: '',
  audience: { roles: [] },
};

export default function AnnouncementsPage() {
  const school = useSchool();
  const { data: session } = useSession();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ ...initialForm });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const manager = useMemo(() => canManage(session?.user?.role), [session?.user?.role]);
  const isSuper = useMemo(() => session?.user?.role === 'SUPER_ADMIN', [session?.user?.role]);

  const titleTextClasses = 'text-black dark:text-white';
  const descriptionTextClasses = 'text-zinc-600 dark:text-zinc-400';
  const primaryButtonClasses = 'bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200';
  const outlineButtonClasses = 'border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800';
  const inputTextClasses = 'bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500';
  const glassCardClasses = 'p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50';

  const fetchAnnouncements = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true); setError('');
    try {
      const pubOnly = manager ? 'false' : 'true';
      const res = await fetch(`/api/schools/${school.id}/communications/announcements?publishedOnly=${pubOnly}&limit=100`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch announcements');
      setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
    } catch (e) {
      setError(e.message);
      toast.error('Unable to load announcements', { description: e.message });
    } finally { setLoading(false); }
  }, [school?.id, manager]);

  useEffect(() => { if (school?.id) fetchAnnouncements(); }, [school?.id, fetchAnnouncements]);

  const openCreate = () => {
    setFormData({ ...initialForm });
    setFormError('');
    setIsDialogOpen(true);
  };

  const openEdit = (row) => {
    setFormData({
      id: row.id,
      title: row.title || '',
      content: row.content || '',
      isGlobal: !!row.isGlobal,
      publishedAt: row.publishedAt ? format(new Date(row.publishedAt), 'yyyy-MM-dd') : '',
      audience: row.audience && typeof row.audience === 'object' ? row.audience : { roles: [] },
    });
    setFormError('');
    setIsDialogOpen(true);
  };

  const onChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const onToggle = (name) => setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  const onRoleToggle = (role) => setFormData(prev => {
    const roles = new Set(prev.audience?.roles || []);
    if (roles.has(role)) roles.delete(role); else roles.add(role);
    return { ...prev, audience: { roles: Array.from(roles) } };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!school?.id) return;
    setIsSubmitting(true); setFormError('');
    const payload = {
      title: formData.title,
      content: formData.content,
      // Only SUPER_ADMIN can set global
      isGlobal: isSuper ? !!formData.isGlobal : false,
      publishedAt: formData.publishedAt ? new Date(formData.publishedAt).toISOString() : null,
      audience: formData.audience,
    };
    const isEdit = !!formData.id;
    const url = isEdit
      ? `/api/schools/${school.id}/communications/announcements/${formData.id}`
      : `/api/schools/${school.id}/communications/announcements`;
    const method = isEdit ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        const err = data?.issues ? data.issues.map(i => i.message).join('; ') : (data?.error || 'Request failed');
        throw new Error(err);
      }
      toast.success(isEdit ? 'Announcement updated' : 'Announcement created');
      setIsDialogOpen(false);
      fetchAnnouncements();
    } catch (e) {
      setFormError(e.message);
      toast.error('Save failed', { description: e.message });
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!school?.id) return;
    if (!confirm('Delete this announcement?')) return;
    const tId = `del-${id}`;
    toast.loading('Deleting...', { id: tId });
    try {
      const res = await fetch(`/api/schools/${school.id}/communications/announcements/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      toast.success('Deleted', { id: tId });
      fetchAnnouncements();
    } catch (e) {
      toast.error('Delete failed', { description: e.message, id: tId });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${titleTextClasses} flex items-center`}>
            <Newspaper className="mr-3 h-8 w-8 opacity-80"/>Announcements
          </h1>
          <p className={descriptionTextClasses}>Share updates and important information with your school community.</p>
        </div>
        {manager && (
          <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) setFormError(''); }}>
            <DialogTrigger asChild>
              <Button className={primaryButtonClasses} onClick={openCreate}><PlusCircle className="mr-2 h-4 w-4"/> New Announcement</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className={titleTextClasses}>{formData.id ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
                <DialogDescription className={descriptionTextClasses}>Fill out details below and publish when ready.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 py-1">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-black dark:text-white">Title <span className="text-red-500">*</span></Label>
                    <Input id="title" name="title" value={formData.title} onChange={onChange} required className={`${inputTextClasses} mt-1`} />
                  </div>
                  <div>
                    <Label htmlFor="content" className="text-black dark:text-white">Content <span className="text-red-500">*</span></Label>
                    <Textarea id="content" name="content" value={formData.content} onChange={onChange} rows={6} required className={`${inputTextClasses} mt-1`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="publishedAt" className="text-black dark:text-white flex items-center gap-2"><CalendarDays className="h-4 w-4"/> Publish Date (optional)</Label>
                      <Input id="publishedAt" name="publishedAt" type="date" value={formData.publishedAt} onChange={onChange} className={`${inputTextClasses} mt-1`} />
                    </div>
                    {isSuper ? (
                      <div className="flex items-center gap-2 mt-6">
                        <Checkbox id="isGlobal" checked={!!formData.isGlobal} onCheckedChange={() => onToggle('isGlobal')} />
                        <Label htmlFor="isGlobal" className="text-black dark:text-white flex items-center gap-2"><Globe2 className="h-4 w-4"/> Global (all schools)</Label>
                      </div>
                    ) : (
                      <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
                        Only SUPER ADMIN can send global announcements.
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-black dark:text-white">Audience Roles (optional)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {ROLES.map(role => (
                        <label key={role} className="flex items-center gap-2 text-sm text-black dark:text-white">
                          <Checkbox checked={formData.audience?.roles?.includes(role)} onCheckedChange={() => onRoleToggle(role)} />
                          <span>{role.replace(/_/g,' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
                <DialogFooter className="pt-3">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className={outlineButtonClasses}>Cancel</Button>
                  </DialogClose>
                  <Button type="submit" className={primaryButtonClasses} disabled={isSubmitting}>{isSubmitting ? (formData.id ? 'Saving...' : 'Creating...') : (formData.id ? 'Save Changes' : 'Create')}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className={`${glassCardClasses} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200/80 dark:border-zinc-700/80">
              <TableHead className={`${titleTextClasses} font-semibold`}>Title</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell`}>Published</TableHead>
              <TableHead className={`${titleTextClasses} font-semibold hidden lg:table-cell`}>Scope</TableHead>
              <TableHead className={`text-right ${titleTextClasses} font-semibold`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                  <TableCell><Skeleton className="h-5 w-64 rounded"/></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28 rounded"/></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24 rounded"/></TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded"/><Skeleton className="h-8 w-8 rounded"/></div></TableCell>
                </TableRow>
              ))
            ) : announcements.length > 0 ? announcements.map(a => (
              <TableRow key={a.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                <TableCell className={`${descriptionTextClasses} font-medium`}>
                  <div className="font-semibold text-black dark:text-white">{a.title}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 max-w-2xl">{a.content}</div>
                </TableCell>
                <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>
                  {a.publishedAt && isValid(new Date(a.publishedAt)) ? format(new Date(a.publishedAt), 'MMM dd, yyyy') : '—'}
                </TableCell>
                <TableCell className={`${descriptionTextClasses} hidden lg:table-cell`}>
                  {a.isGlobal ? 'Global' : 'School'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    {manager && (isSuper || !a.isGlobal) && (
                      <>
                        <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8`} onClick={() => openEdit(a)} title="Edit"><Edit3 className="h-4 w-4"/></Button>
                        <Button variant="outline" size="icon" className={`${outlineButtonClasses} h-8 w-8 border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/50`} onClick={() => handleDelete(a.id)} title="Delete"><Trash2 className="h-4 w-4"/></Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                <TableCell colSpan="4" className={`text-center py-10 ${descriptionTextClasses}`}>
                  No announcements yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
