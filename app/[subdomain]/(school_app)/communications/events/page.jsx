"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

export default function EventsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const search = useSearchParams();
  const [events, setEvents] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    joinUrl: '',
    forParents: true,
    isGlobal: false,
    parentIds: [],
  });

  const schoolId = session?.user?.schoolId;

  useEffect(() => {
    if (!schoolId) return;
    const run = async () => {
      setLoading(true);
      try {
        const [evRes, prRes] = await Promise.all([
          fetch(`/api/schools/${schoolId}/events`),
          fetch(`/api/schools/${schoolId}/people/parents?limit=100`),
        ]);
        const ev = await evRes.json();
        const pr = await prRes.json();
        setEvents(ev.events || []);
        setParents((pr.parents || []).map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, email: p.email })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [schoolId]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!schoolId) return;
    try {
      const res = await fetch(`/api/schools/${schoolId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          startDate: new Date(form.startDate).toISOString(),
          endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setOpen(false);
      setForm({ title: '', description: '', startDate: '', endDate: '', location: '', joinUrl: '', forParents: true, isGlobal: false, parentIds: [] });
      // Reload
      const evRes = await fetch(`/api/schools/${schoolId}/events`);
      const ev = await evRes.json();
      setEvents(ev.events || []);
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleParent = (id) => {
    setForm((f) => ({
      ...f,
      parentIds: f.parentIds.includes(id) ? f.parentIds.filter(x => x !== id) : [...f.parentIds, id],
    }));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Events & Parent Meetings</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule Event / Meeting</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Title</label>
                  <Input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm">Location</label>
                  <Input value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})} placeholder="Auditorium or Online" />
                </div>
                <div>
                  <label className="text-sm">Start</label>
                  <Input type="datetime-local" value={form.startDate} onChange={(e)=>setForm({...form,startDate:e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm">End</label>
                  <Input type="datetime-local" value={form.endDate} onChange={(e)=>setForm({...form,endDate:e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm">Zoom/Google Meet link</label>
                  <Input value={form.joinUrl} onChange={(e)=>setForm({...form,joinUrl:e.target.value})} placeholder="https://..." />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm">Description</label>
                  <Textarea rows={4} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Invite specific parents (optional)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-auto border rounded-sm p-2">
                    {parents.map(p => (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.parentIds.includes(p.id)} onChange={()=>toggleParent(p.id)} />
                        <span>{p.name} <span className="text-muted-foreground">({p.email})</span></span>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">If you leave all unchecked but set "for parents" on, all parents will see it.</div>
                </div>
                <div className="md:col-span-2 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.forParents} onChange={(e)=>setForm({...form,forParents:e.target.checked})} /> For Parents (school-wide)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.isGlobal} onChange={(e)=>setForm({...form,isGlobal:e.target.checked})} /> Global (visible across schools)
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {events.map(ev => (
          <Card key={ev.id}>
            <CardHeader>
              <CardTitle className="text-base">{ev.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="text-muted-foreground">{format(new Date(ev.startDate), 'PPpp')}{ev.endDate ? ` - ${format(new Date(ev.endDate), 'PPpp')}`: ''}</div>
              {ev.location && <div>Location: {ev.location}</div>}
              {ev.joinUrl && <div className="truncate">Link: <a className="text-blue-600 underline" href={ev.joinUrl} target="_blank" rel="noreferrer">{ev.joinUrl}</a></div>}
              <div className="text-xs text-muted-foreground">{ev.isGlobal ? 'Global' : 'School'} {ev.forParents ? '• Parents' : ''}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
