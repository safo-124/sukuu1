"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function ProcurementOfficerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { subdomain, officerId } = params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ firstName:"", lastName:"", email:"", phoneNumber:"", jobTitle:"", qualification:"", staffIdNumber:"", password: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const schoolId = window.__SCHOOL_ID__ || localStorage.getItem('schoolId');
        if (!schoolId) { setError('School context missing'); return; }
        const res = await fetch(`/api/schools/${schoolId}/people/procurement/${officerId}`);
        if (!res.ok) {
          const j = await res.json().catch(()=>({error:'Failed'}));
          throw new Error(j.error || 'Failed to load profile');
        }
        const j = await res.json();
        if (!ignore) setData(j.data);
      } catch (e) {
        if (!ignore) setError(e.message || 'Failed to load profile');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    if (officerId) load();
    return () => { ignore = true; };
  }, [officerId]);

  if (loading) return <p className="text-sm">Loading profile...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm">No data.</p>;

  const schoolId = typeof window !== 'undefined' ? (window.__SCHOOL_ID__ || localStorage.getItem('schoolId')) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.firstName} {data.lastName}</h1>
          <p className="text-sm text-muted-foreground">{data.jobTitle} • {data.staffIdNumber}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={editOpen} onOpenChange={(o)=>{ setEditOpen(o); if (o && data) setForm({ firstName:data.firstName||"", lastName:data.lastName||"", email:data.email||"", phoneNumber:data.phoneNumber||"", jobTitle:data.jobTitle||"", qualification:data.qualification||"", staffIdNumber:data.staffIdNumber||"", password: "" }); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Edit</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Procurement Officer</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={async (e)=>{
                e.preventDefault();
                if (!schoolId) { toast.error('Missing school context'); return; }
                setSaving(true);
                try {
                  const payload = { ...form };
                  if (!payload.password) delete payload.password;
                  if (!payload.qualification) delete payload.qualification;
                  const res = await fetch(`/api/schools/${schoolId}/people/procurement/${officerId}`, {
                    method:'PATCH',
                    headers:{ 'Content-Type':'application/json' },
                    body: JSON.stringify(payload)
                  });
                  if (!res.ok) { const j = await res.json().catch(()=>({error:'Failed'})); throw new Error(j.error||'Update failed'); }
                  const j = await res.json();
                  setData(d=>({ ...d, ...j.data }));
                  toast.success('Updated');
                  setEditOpen(false);
                  setForm(f => ({ ...f, password: "" }));
                } catch (err) {
                  toast.error(err.message||'Update failed');
                } finally { setSaving(false); }
              }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">First Name</label>
                    <Input value={form.firstName} onChange={e=>setForm(f=>({...f, firstName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Last Name</label>
                    <Input value={form.lastName} onChange={e=>setForm(f=>({...f, lastName:e.target.value}))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1">Email</label>
                    <Input type="email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1">New Password</label>
                    <Input type="password" value={form.password} onChange={e=>setForm(f=>({...f, password:e.target.value}))} placeholder="Leave blank to keep current" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1">Phone</label>
                    <Input value={form.phoneNumber} onChange={e=>setForm(f=>({...f, phoneNumber:e.target.value}))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1">Job Title</label>
                    <Input value={form.jobTitle} onChange={e=>setForm(f=>({...f, jobTitle:e.target.value}))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1">Qualification</label>
                    <Input value={form.qualification} onChange={e=>setForm(f=>({...f, qualification:e.target.value}))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1">Staff ID</label>
                    <Input value={form.staffIdNumber} onChange={e=>setForm(f=>({...f, staffIdNumber:e.target.value}))} />
                  </div>
                </div>
                <DialogFooter className="pt-2 flex gap-2 justify-end">
                  <Button type="button" variant="secondary" onClick={()=>setEditOpen(false)} disabled={saving}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving?'Saving...':'Save'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Procurement Officer</AlertDialogTitle>
                <AlertDialogDescription>This will permanently remove this procurement officer. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="destructive" disabled={deleting} onClick={async ()=>{
                    if (!schoolId) { toast.error('Missing school context'); return; }
                    setDeleting(true);
                    try {
                      const res = await fetch(`/api/schools/${schoolId}/people/procurement/${officerId}`, { method:'DELETE' });
                      if (!res.ok) { const j = await res.json().catch(()=>({error:'Failed'})); throw new Error(j.error||'Delete failed'); }
                      toast.success('Deleted');
                      router.push(`/${subdomain}/people/procurement`);
                    } catch (err) {
                      toast.error(err.message||'Delete failed');
                    } finally { setDeleting(false); }
                  }}>{deleting?'Deleting...':'Delete'}</Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" size="sm" onClick={() => router.push(`/${subdomain}/people/procurement`)}>Back</Button>
        </div>
      </div>
      <Separator />
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-4 space-y-2">
          <h2 className="text-sm font-medium">Contact</h2>
          <p className="text-xs break-all">Email: {data.email}</p>
          {data.phoneNumber && <p className="text-xs">Phone: {data.phoneNumber}</p>}
        </Card>
        <Card className="p-4 space-y-2">
          <h2 className="text-sm font-medium">Role</h2>
          <p className="text-xs font-medium uppercase tracking-wide">{data.role || 'PROCUREMENT_OFFICER'}</p>
        </Card>
        <Card className="p-4 space-y-2">
          <h2 className="text-sm font-medium">Department</h2>
          <p className="text-xs">{data?.department?.name || '—'}</p>
        </Card>
      </div>
    </div>
  );
}
