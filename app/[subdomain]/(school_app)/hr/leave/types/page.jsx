'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

export default function LeaveTypesPage() {
  const params = useParams();
  const { subdomain } = params || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', defaultDays: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true); setError(null);
      const schoolId = window.__SCHOOL_ID__ || localStorage.getItem('schoolId');
      if (!schoolId) { setError('Missing school context'); return; }
      const res = await fetch(`/api/schools/${schoolId}/hr/leave/types`);
      if (!res.ok) throw new Error('Failed to load');
      const j = await res.json();
      setItems(j.data || []);
    } catch (e) { setError(e.message || 'Failed'); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, []);

  function startCreate() {
    setEditing(null);
    setForm({ name: '', defaultDays: '' });
    setOpen(true);
  }
  function startEdit(item) {
    setEditing(item);
    setForm({ name: item.name, defaultDays: item.defaultDays ?? '' });
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    const schoolId = window.__SCHOOL_ID__ || localStorage.getItem('schoolId');
    if (!schoolId) { toast.error('Missing school'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), defaultDays: form.defaultDays ? parseInt(form.defaultDays,10) : null };
      const res = await fetch(`/api/schools/${schoolId}/hr/leave/types${editing ? '/' + editing.id : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>({error:'Failed'}));
        throw new Error(j.error || 'Save failed');
      }
      const j = await res.json();
      if (editing) {
        setItems(list => list.map(i => i.id === editing.id ? j.data : i));
        toast.success('Leave type updated');
      } else {
        setItems(list => [j.data, ...list]);
        toast.success('Leave type created');
      }
      setOpen(false);
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally { setSaving(false); }
  }

  async function remove(item) {
    if (!window.confirm('Delete this leave type?')) return;
    const schoolId = window.__SCHOOL_ID__ || localStorage.getItem('schoolId');
    if (!schoolId) { toast.error('Missing school'); return; }
    try {
      const res = await fetch(`/api/schools/${schoolId}/hr/leave/types/${item.id}`, { method: 'DELETE' });
      if (!res.ok) { const j = await res.json().catch(()=>({error:'Failed'})); throw new Error(j.error || 'Delete failed'); }
      setItems(list => list.filter(i => i.id !== item.id));
      toast.success('Deleted');
    } catch (err) { toast.error(err.message || 'Delete failed'); }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold'>Leave Types</h1>
          <p className='text-sm text-muted-foreground'>Define and manage leave categories</p>
        </div>
        <Button size='sm' onClick={startCreate}>New Type</Button>
      </div>
      {loading && <p className='text-sm'>Loading...</p>}
      {error && <p className='text-sm text-destructive'>{error}</p>}
      {!loading && !error && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {items.map(item => (
            <Card key={item.id} className='p-4 space-y-2'>
              <div className='flex items-start justify-between'>
                <div>
                  <div className='font-medium'>{item.name}</div>
                  <div className='text-xs text-muted-foreground'>Default Days: {item.defaultDays ?? '—'}</div>
                </div>
                <div className='flex gap-2'>
                  <Button size='xs' variant='outline' onClick={()=>startEdit(item)}>Edit</Button>
                  <Button size='xs' variant='destructive' onClick={()=>remove(item)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
          {items.length === 0 && <p className='text-sm text-muted-foreground col-span-full'>No leave types yet.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Leave Type' : 'New Leave Type'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className='space-y-4'>
            <div>
              <label className='block text-xs font-medium mb-1'>Name *</label>
              <Input value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} required />
            </div>
            <div>
              <label className='block text-xs font-medium mb-1'>Default Days (optional)</label>
              <Input type='number' min='1' value={form.defaultDays} onChange={e=>setForm(f=>({...f, defaultDays:e.target.value}))} />
            </div>
            <DialogFooter className='pt-2 flex gap-2 justify-end'>
              <Button type='button' variant='secondary' onClick={()=>setOpen(false)}>Cancel</Button>
              <Button type='submit' disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}