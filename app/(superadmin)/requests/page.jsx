'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';

const statusColor = (s) => {
  switch (s) {
    case 'NEW':
      return 'bg-sky-600/80 text-white border-sky-500/50';
    case 'REVIEWING':
      return 'bg-amber-600/80 text-white border-amber-500/50';
    case 'APPROVED':
      return 'bg-emerald-600/80 text-white border-emerald-500/50';
    case 'REJECTED':
      return 'bg-rose-600/80 text-white border-rose-500/50';
    case 'CONTACTED':
      return 'bg-violet-600/80 text-white border-violet-500/50';
    default:
      return 'bg-zinc-700 text-white border-zinc-600';
  }
};

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialized, setInitialized] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('desc');
  const [savingId, setSavingId] = useState(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState(null);
  const [convertForm, setConvertForm] = useState({ name: '', subdomain: '', notes: '', modules: [] });
  const [subdomainState, setSubdomainState] = useState({ value: '', valid: true, checking: false, available: true, message: '' });
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusChange, setStatusChange] = useState({ id: null, newStatus: '', notes: '' });
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteTargetId, setNoteTargetId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const labelMap = {
    'parent-app': 'Parent App Access',
    'auto-timetable': 'Auto Timetable',
    'finance': 'Finance',
    'advanced-hr': 'Advanced HR',
    'procurement': 'Procurement',
    'library': 'Library',
    'transportation': 'Transportation',
    'hostel': 'Hostel',
  };

  const paramsString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    if (page) params.set('page', String(page));
    if (pageSize) params.set('pageSize', String(pageSize));
    if (sort) params.set('sort', sort);
    return params.toString();
  }, [status, q, page, pageSize, sort]);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/superadmin/school-requests?${paramsString}`);
    const json = await res.json();
    if (Array.isArray(json)) {
      // backward compatibility if server returns older shape
      setData(json);
      setTotal(json.length);
    } else {
      setData(json.items || []);
      setTotal(json.total || 0);
      setPage(json.page || 1);
      setPageSize(json.pageSize || 20);
    }
    setLoading(false);
  };

  // Initialize state from URL on first mount
  useEffect(() => {
    if (initialized) return;
    try {
      const sp = new URLSearchParams(searchParams?.toString?.() || '');
      const s = sp.get('status') || '';
      const qq = sp.get('q') || '';
      const pg = parseInt(sp.get('page') || '1', 10);
      const ps = parseInt(sp.get('pageSize') || '20', 10);
      const so = (sp.get('sort') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
      if (s) setStatus(s);
      if (qq) setQ(qq);
      if (!Number.isNaN(pg)) setPage(Math.max(1, pg));
      if (!Number.isNaN(ps)) setPageSize(Math.min(100, Math.max(1, ps)));
      setSort(so);
    } finally {
      setInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL in sync with filters
  useEffect(() => {
    if (!initialized) return;
    const qs = paramsString;
    router.replace(`?${qs}`);
  }, [initialized, paramsString, router]);

  useEffect(() => { if (initialized) load(); }, [initialized]);

  const openStatusDialog = (id, newStatus) => {
    setStatusChange({ id, newStatus, notes: '' });
    setStatusDialogOpen(true);
  };

  const submitStatusChange = async () => {
    const { id, newStatus, notes } = statusChange;
    if (!id || !newStatus) return;
    setSavingId(id);
    await fetch('/api/superadmin/school-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus, notes })
    });
    setSavingId(null);
    setStatusDialogOpen(false);
    setStatusChange({ id: null, newStatus: '', notes: '' });
    await load();
  };

  const exportCsv = () => {
    const url = `/api/superadmin/school-requests?${paramsString}${paramsString ? '&' : ''}format=csv`;
    window.open(url, '_blank');
  };

  const openConvert = (req) => {
    setConvertTarget(req);
    setConvertForm({
      name: req.schoolName || '',
      subdomain: (req.subdomain || '').toLowerCase(),
      notes: '',
      modules: Array.isArray(req.requestedModules) ? [...req.requestedModules] : [],
    });
    setSubdomainState({ value: (req.subdomain || '').toLowerCase(), valid: true, checking: false, available: true, message: '' });
    setConvertOpen(true);
  };

  const toggleModule = (key) => {
    setConvertForm((prev) => {
      const set = new Set(prev.modules);
      if (set.has(key)) set.delete(key); else set.add(key);
      return { ...prev, modules: Array.from(set) };
    });
  };

  const submitConvert = async () => {
    if (!convertTarget) return;
    // basic validation
    const name = (convertForm.name || '').trim();
    if (!name) {
      toast.error('School name is required');
      return;
    }
    const sub = (convertForm.subdomain || '').trim().toLowerCase();
    if (sub) {
      // enforce client format
      const formatOk = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(sub) && sub.length >= 3 && sub.length <= 63;
      if (!formatOk) {
        toast.error('Invalid subdomain format');
        return;
      }
      if (subdomainState.checking) {
        toast.message('Please wait for subdomain check to finish');
        return;
      }
      if (!subdomainState.available) {
        toast.error(subdomainState.message || 'Subdomain not available');
        return;
      }
    }
    setSavingId(convertTarget.id);
    try {
      const res = await fetch('/api/superadmin/school-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CONVERT', id: convertTarget.id, schoolName: name, subdomain: sub, notes: convertForm.notes, modules: convertForm.modules })
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'Failed to convert' }));
        toast.error(err.error || 'Failed to convert');
      } else {
        toast.success('Converted to school');
        setConvertOpen(false);
        setConvertTarget(null);
        await load();
      }
    } finally {
      setSavingId(null);
    }
  };

  // Handle subdomain input change with debounce check
  useEffect(() => {
    const sub = (convertForm.subdomain || '').trim().toLowerCase();
    setSubdomainState((s) => ({ ...s, value: sub }));
    if (!sub) {
      setSubdomainState({ value: '', valid: true, checking: false, available: true, message: '' });
      return;
    }
    const valid = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(sub) && sub.length >= 3 && sub.length <= 63;
    if (!valid) {
      setSubdomainState({ value: sub, valid: false, checking: false, available: false, message: 'Invalid format' });
      return;
    }
    setSubdomainState({ value: sub, valid: true, checking: true, available: false, message: '' });
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/schools/check-subdomain?subdomain=${encodeURIComponent(sub)}`);
        const json = await res.json();
        if (!res.ok) {
          setSubdomainState({ value: sub, valid: false, checking: false, available: false, message: json.reason || 'Invalid subdomain', suggestions: json.suggestions || [] });
        } else {
          setSubdomainState({ value: sub, valid: true, checking: false, available: !!json.available, message: json.available ? 'Available' : (json.reason || 'Not available'), suggestions: json.suggestions || [] });
        }
      } catch (e) {
        setSubdomainState({ value: sub, valid: false, checking: false, available: false, message: 'Error checking availability', suggestions: [] });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [convertForm.subdomain]);

  // Base subdomain suggestions from school name when empty
  const baseSuggestions = useMemo(() => {
    const src = (convertForm.name || convertTarget?.schoolName || '').toLowerCase().trim();
    if (!src) return [];
    let base = src.replace(/[^a-z0-9]+/g, '-');
    base = base.replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!base) base = 'school';
    base = base.slice(0, 61);
    const rand = Math.floor(Math.random() * 900 + 100);
    const list = [
      base,
      `${base}-school`,
      `${base}-app`,
      `${base}-portal`,
      `${base}-${rand}`,
    ];
    // Deduplicate
    return Array.from(new Set(list)).slice(0, 5);
  }, [convertForm.name, convertTarget?.schoolName]);

  return (
    <>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2">
          <option value="">All statuses</option>
          <option>NEW</option>
          <option>REVIEWING</option>
          <option>APPROVED</option>
          <option>REJECTED</option>
          <option>CONTACTED</option>
        </select>
        <select value={sort} onChange={(e)=>{ setSort(e.target.value); setPage(1); }} className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2">
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/email/school" className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2" />
  <button onClick={() => { setPage(1); load(); }} className="px-3 py-2 bg-sky-600 rounded text-white">Filter</button>
        <button onClick={() => { setStatus(''); setQ(''); setPage(1); }} className="px-3 py-2 border border-zinc-700 rounded">Reset</button>
  <button onClick={exportCsv} className="px-3 py-2 border border-zinc-700 rounded">Export CSV</button>
        <div className="ml-auto text-sm text-zinc-400">
          {total > 0 ? (
            <>Showing {(page-1)*pageSize + 1}–{Math.min(page*pageSize, total)} of {total}</>
          ) : (
            <>No records</>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button disabled={page<=1 || loading} onClick={() => { setPage((p)=>Math.max(1,p-1)); setTimeout(load, 0); }} className="px-3 py-2 border border-zinc-700 rounded disabled:opacity-50">Previous</button>
        <button disabled={page*pageSize>=total || loading} onClick={() => { setPage((p)=>p+1); setTimeout(load, 0); }} className="px-3 py-2 border border-zinc-700 rounded disabled:opacity-50">Next</button>
        <select disabled={loading} value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value,10)); setPage(1); setTimeout(load,0); }} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm">
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
      </div>

      {loading ? <div>Loading...</div> : (
        <div className="space-y-4">
          {data.map((r) => (
            <div key={r.id} className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/40">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="text-base font-medium">{r.schoolName}{r.subdomain ? ` (${r.subdomain})` : ''}</div>
                  <div className="text-xs text-zinc-400">Requested {new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColor(r.status)}>{r.status}</Badge>
                  <div className="flex gap-2">
                    <button disabled={savingId===r.id} onClick={() => openStatusDialog(r.id, 'REVIEWING')} className="px-2 py-1 border border-zinc-700 rounded">Review</button>
                    <button disabled={savingId===r.id} onClick={() => openStatusDialog(r.id, 'CONTACTED')} className="px-2 py-1 border border-zinc-700 rounded">Contacted</button>
                    <button disabled={savingId===r.id} onClick={() => openStatusDialog(r.id, 'APPROVED')} className="px-2 py-1 bg-emerald-600 text-white rounded">Approve</button>
                    <button disabled={savingId===r.id} onClick={() => openStatusDialog(r.id, 'REJECTED')} className="px-2 py-1 bg-rose-600 text-white rounded">Reject</button>
                    {!r.schoolId && (
                      <button disabled={savingId===r.id} onClick={() => openConvert(r)} className="px-2 py-1 bg-indigo-600 text-white rounded">Convert to School</button>
                    )}
                    <button disabled={savingId===r.id} onClick={() => { setNoteTargetId(r.id); setNoteText(''); setNoteDialogOpen(true); }} className="px-2 py-1 border border-zinc-700 rounded">Add Note</button>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-zinc-400">Requester</div>
                  <div>{r.requesterName}</div>
                  <div className="text-zinc-400 text-xs">{r.requesterEmail}{r.requesterPhone ? ` · ${r.requesterPhone}` : ''}</div>
                </div>
                <div>
                  <div className="text-zinc-400">Requested modules</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(r.requestedModules && r.requestedModules.length ? r.requestedModules : []).map((m) => (
                      <Badge key={m} className="bg-zinc-800/70 border border-zinc-700 text-zinc-200">{labelMap[m] || m}</Badge>
                    ))}
                    {(!r.requestedModules || r.requestedModules.length === 0) && (
                      <span className="text-zinc-500">None specified</span>
                    )}
                  </div>
                </div>
                {r.message ? (
                  <div>
                    <div className="text-zinc-400">Message</div>
                    <div className="whitespace-pre-wrap">{r.message}</div>
                  </div>
                ) : null}
              </div>

              {r.logs?.length ? (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Activity</div>
                  <ol className="relative ml-2 border-l border-white/10">
                    {r.logs.map((log) => (
                      <li key={log.id} className="mb-3 ml-4">
                        <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-sky-500/80" />
                        <div className="text-sm">
                          <span className="font-medium">{log.action}</span>
                          {log.notes ? <span className="text-zinc-300"> — {log.notes}</span> : null}
                        </div>
                        <div className="text-xs text-zinc-400">{new Date(log.createdAt).toLocaleString()} {log.actorUser ? `· ${log.actorUser.firstName || ''} ${log.actorUser.lastName || ''} (${log.actorUser.email})` : ''}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          ))}
          {data.length === 0 && (
            <div className="text-center text-zinc-400">No requests found.</div>
          )}
        </div>
      )}
  </div>

  {/* Convert Dialog */}
    <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
      <DialogContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Convert to School</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">School name</label>
            <input value={convertForm.name} onChange={(e)=>setConvertForm(f=>({...f,name:e.target.value}))} className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Subdomain (optional)</label>
            <input value={convertForm.subdomain} onChange={(e)=>setConvertForm(f=>({...f,subdomain:e.target.value}))} className={`w-full rounded-md bg-zinc-800 text-white px-3 py-2 border ${subdomainState.value && (!subdomainState.valid || !subdomainState.available) ? 'border-rose-600' : 'border-zinc-700'}`} />
            {convertForm.subdomain ? (
              <div className="mt-1 text-xs">
                {subdomainState.checking ? (
                  <span className="text-zinc-400">Checking availability...</span>
                ) : (
                  <>
                    <span className={subdomainState.valid && subdomainState.available ? 'text-emerald-400' : 'text-rose-400'}>
                      {subdomainState.message || (subdomainState.available ? 'Available' : 'Not available')}
                    </span>
                    {(!subdomainState.available && subdomainState.suggestions?.length) ? (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {subdomainState.suggestions.slice(0,4).map((sug) => (
                          <button key={sug} type="button" onClick={() => setConvertForm(f=>({...f, subdomain: sug }))} className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200">
                            {sug}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              baseSuggestions.length ? (
                <div className="mt-1 text-xs">
                  <div className="text-zinc-400 mb-1">Suggestions</div>
                  <div className="flex flex-wrap gap-2">
                    {baseSuggestions.map((sug) => (
                      <button key={sug} type="button" onClick={() => setConvertForm(f=>({...f, subdomain: sug }))} className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200">
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Notes (optional)</label>
            <textarea rows="3" value={convertForm.notes} onChange={(e)=>setConvertForm(f=>({...f,notes:e.target.value}))} className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700" />
          </div>
          <div>
            <div className="block text-sm text-zinc-400 mb-2">Modules</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(labelMap).map(([key,label])=> (
                <label key={key} className="flex items-center gap-2 p-2 rounded border border-zinc-700 bg-zinc-800/60">
                  <Checkbox checked={convertForm.modules.includes(key)} onCheckedChange={()=>toggleModule(key)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <button className="px-3 py-2 border border-zinc-700 rounded">Cancel</button>
          </DialogClose>
          <button disabled={!!savingId} onClick={submitConvert} className="px-3 py-2 bg-indigo-600 text-white rounded">{savingId? 'Converting...' : 'Convert'}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Note Dialog */}
    <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
      <DialogContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Note</label>
            <textarea rows="4" value={noteText} onChange={(e)=>setNoteText(e.target.value)} className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700" />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <button className="px-3 py-2 border border-zinc-700 rounded">Cancel</button>
          </DialogClose>
          <button disabled={!!savingId || !noteText.trim()} onClick={async ()=>{
            if (!noteTargetId) return;
            setSavingId(noteTargetId);
            try {
              const res = await fetch('/api/superadmin/school-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'NOTE', id: noteTargetId, notes: noteText.trim() }) });
              if (!res.ok) {
                const err = await res.json().catch(()=>({ error: 'Failed to add note' }));
                toast.error(err.error || 'Failed to add note');
              } else {
                toast.success('Note added');
                setNoteDialogOpen(false);
                setNoteTargetId(null);
                setNoteText('');
                await load();
              }
            } finally {
              setSavingId(null);
            }
          }} className="px-3 py-2 bg-zinc-700 text-white rounded">{savingId? 'Saving...' : 'Save Note'}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Status Change Dialog */}
    <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
      <DialogContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-zinc-400">New status</div>
            <div className="text-base font-medium">{statusChange.newStatus}</div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Notes (optional)</label>
            <textarea rows="3" value={statusChange.notes} onChange={(e)=>setStatusChange(s=>({...s,notes:e.target.value}))} className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700" />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <button className="px-3 py-2 border border-zinc-700 rounded">Cancel</button>
          </DialogClose>
          <button disabled={!!savingId} onClick={submitStatusChange} className="px-3 py-2 bg-sky-600 text-white rounded">{savingId? 'Updating...' : 'Update'}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
