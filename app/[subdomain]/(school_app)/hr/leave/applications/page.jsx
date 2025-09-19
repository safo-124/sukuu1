'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';

export default function LeaveApplicationsPage() {
  const params = useParams();
  const { subdomain } = params || {};
  const [apps, setApps] = useState([]);
  const [types, setTypes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Use 'ALL' sentinel instead of empty string because Radix Select.Item cannot have empty value.
  const [filter, setFilter] = useState({ status: 'ALL', leaveTypeId: 'ALL', staffId: 'ALL' });
  const [open, setOpen] = useState(false);
  const [moderatingId, setModeratingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ staffId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [sessionRole, setSessionRole] = useState(null);
  const [sessionStaffId, setSessionStaffId] = useState(null);

  const schoolId = typeof window !== 'undefined' ? (window.__SCHOOL_ID__ || localStorage.getItem('schoolId')) : null;

  async function load() {
    if (!schoolId) { setError('Missing school context'); return; }
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams();
      if (filter.status !== 'ALL') qs.append('status', filter.status);
  if (filter.leaveTypeId && filter.leaveTypeId !== 'ALL') qs.append('leaveTypeId', filter.leaveTypeId);
  if (filter.staffId && filter.staffId !== 'ALL') qs.append('staffId', filter.staffId);
      const [appsRes, typesRes] = await Promise.all([
        fetch(`/api/schools/${schoolId}/hr/leave/applications?` + qs.toString()),
        fetch(`/api/schools/${schoolId}/hr/leave/types`)
      ]);
      if (!appsRes.ok) throw new Error('Failed to load applications');
      if (!typesRes.ok) throw new Error('Failed to load types');
      const appsJson = await appsRes.json();
      const typesJson = await typesRes.json();
      setApps(appsJson.data || []);
      setTypes(typesJson.data || []);
      // Load staff list (reuse teachers endpoint for now)
      const staffRes = await fetch(`/api/schools/${schoolId}/people/teachers`);
      if (staffRes.ok) {
        const staffJson = await staffRes.json();
        setStaff(staffJson.teachers || []);
      }
      // Attempt to read session info exposed globally (fallback logic if present)
      try {
        const s = window.__SESSION_USER__;
        if (s) { setSessionRole(s.role); setSessionStaffId(s.staffProfileId); }
      } catch {}
    } catch (e) {
      setError(e.message || 'Failed');
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, [filter.status, filter.leaveTypeId, filter.staffId]);

  function resetForm() {
    setForm({ staffId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  }

  function startCreate() {
    resetForm();
    // If teacher only, lock staffId to own
    if (sessionRole === 'TEACHER' && sessionStaffId) {
      setForm(f => ({ ...f, staffId: sessionStaffId }));
    }
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (!schoolId) { toast.error('Missing school'); return; }
    setCreating(true);
    try {
      const payload = { ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() };
      const res = await fetch(`/api/schools/${schoolId}/hr/leave/applications`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) { const j = await res.json().catch(()=>({error:'Failed'})); throw new Error(j.error || 'Create failed'); }
      const j = await res.json();
      setApps(list => [j.data, ...list]);
      toast.success('Leave application submitted');
      setOpen(false);
    } catch (err) {
      toast.error(err.message || 'Create failed');
    } finally { setCreating(false); }
  }

  async function moderate(app, status) {
    if (!schoolId) { toast.error('Missing school'); return; }
    setModeratingId(app.id);
    try {
      const res = await fetch(`/api/schools/${schoolId}/hr/leave/applications/${app.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
      });
      if (!res.ok) { const j = await res.json().catch(()=>({error:'Failed'})); throw new Error(j.error || 'Action failed'); }
      const j = await res.json();
      setApps(list => list.map(a => a.id === app.id ? { ...a, ...j.data } : a));
      toast.success(`Application ${status.toLowerCase()}`);
    } catch (err) { toast.error(err.message || 'Action failed'); }
    finally { setModeratingId(null); }
  }

  const filteredTypes = types;
  const canModerate = sessionRole && ['SUPER_ADMIN','ADMIN','ACCOUNTANT'].includes(sessionRole); // extend when HR role exists

  const statusColor = (s) => {
    switch(s) {
      case 'APPROVED': return 'text-green-600';
      case 'REJECTED': return 'text-red-600';
      default: return 'text-amber-600';
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold'>Leave Applications</h1>
          <p className='text-sm text-muted-foreground'>Submit and manage leave requests</p>
        </div>
        <div className='flex gap-2'>
          <Button size='sm' onClick={startCreate}>New Application</Button>
        </div>
      </div>

      <div className='flex flex-wrap gap-3 items-end'>
        <div>
          <label className='block text-xs font-medium mb-1'>Status</label>
          <Select value={filter.status} onValueChange={v=>setFilter(f=>({...f,status:v}))}>
            <SelectTrigger className='w-40'><SelectValue placeholder='Status' /></SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>All</SelectItem>
              <SelectItem value='PENDING'>Pending</SelectItem>
              <SelectItem value='APPROVED'>Approved</SelectItem>
              <SelectItem value='REJECTED'>Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className='block text-xs font-medium mb-1'>Leave Type</label>
          <Select value={filter.leaveTypeId} onValueChange={v=>setFilter(f=>({...f,leaveTypeId:v}))}>
            <SelectTrigger className='w-48'><SelectValue placeholder='All Types' /></SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>All</SelectItem>
              {filteredTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className='block text-xs font-medium mb-1'>Staff</label>
          <Select value={filter.staffId} onValueChange={v=>setFilter(f=>({...f,staffId:v}))}>
            <SelectTrigger className='w-48'><SelectValue placeholder='All Staff' /></SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>All</SelectItem>
              {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.user?.firstName} {s.user?.lastName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && <p className='text-sm'>Loading...</p>}
      {error && <p className='text-sm text-destructive'>{error}</p>}

      {!loading && !error && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {apps.map(app => (
            <Card key={app.id} className='p-4 space-y-2'>
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <div className='font-medium'>{app.staff?.user ? `${app.staff.user.firstName} ${app.staff.user.lastName}` : 'Staff'}</div>
                  <div className='text-xs text-muted-foreground'>{app.leaveType?.name}</div>
                </div>
                <span className={`text-xs font-semibold ${statusColor(app.status)}`}>{app.status}</span>
              </div>
              <div className='text-xs'>From: {new Date(app.startDate).toLocaleDateString()}</div>
              <div className='text-xs'>To: {new Date(app.endDate).toLocaleDateString()}</div>
              {app.reason && <div className='text-xs line-clamp-2 italic text-muted-foreground'>{app.reason}</div>}
              {canModerate && app.status === 'PENDING' && (
                <div className='flex gap-2 pt-1'>
                  <Button size='xs' variant='outline' disabled={moderatingId===app.id} onClick={()=>moderate(app,'APPROVED')}>{moderatingId===app.id?'...':'Approve'}</Button>
                  <Button size='xs' variant='destructive' disabled={moderatingId===app.id} onClick={()=>moderate(app,'REJECTED')}>{moderatingId===app.id?'...':'Reject'}</Button>
                </div>
              )}
            </Card>
          ))}
          {apps.length === 0 && <p className='text-sm text-muted-foreground col-span-full'>No applications found.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>New Leave Application</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className='space-y-4'>
            <div className='grid sm:grid-cols-2 gap-4'>
              <div>
                <label className='block text-xs font-medium mb-1'>Staff *</label>
                <Select value={form.staffId} onValueChange={v=>setForm(f=>({...f,staffId:v}))} disabled={sessionRole==='TEACHER'}>
                  <SelectTrigger><SelectValue placeholder='Select Staff' /></SelectTrigger>
                  <SelectContent>
                    {sessionRole!=='TEACHER' && staff.map(s => <SelectItem key={s.id} value={s.id}>{s.user?.firstName} {s.user?.lastName}</SelectItem>)}
                    {sessionRole==='TEACHER' && sessionStaffId && <SelectItem value={sessionStaffId}>Myself</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className='block text-xs font-medium mb-1'>Leave Type *</label>
                <Select value={form.leaveTypeId} onValueChange={v=>setForm(f=>({...f,leaveTypeId:v}))}>
                  <SelectTrigger><SelectValue placeholder='Select Type' /></SelectTrigger>
                  <SelectContent>
                    {types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className='block text-xs font-medium mb-1'>Start Date *</label>
                <Input type='date' value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))} required />
              </div>
              <div>
                <label className='block text-xs font-medium mb-1'>End Date *</label>
                <Input type='date' value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} required />
              </div>
              <div className='sm:col-span-2'>
                <label className='block text-xs font-medium mb-1'>Reason (optional)</label>
                <textarea className='w-full border rounded p-2 text-sm' rows={3} value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} />
              </div>
            </div>
            <DialogFooter className='pt-2 flex gap-2 justify-end'>
              <Button type='button' variant='secondary' onClick={()=>setOpen(false)}>Cancel</Button>
              <Button type='submit' disabled={creating}>{creating?'Submitting...':'Submit'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}