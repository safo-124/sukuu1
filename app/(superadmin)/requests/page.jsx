'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';

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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [savingId, setSavingId] = useState(null);
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
    return params.toString();
  }, [status, q]);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/superadmin/school-requests?${paramsString}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, newStatus) => {
    const notes = prompt(`Add a note for status ${newStatus} (optional):`) || '';
    setSavingId(id);
    await fetch('/api/superadmin/school-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus, notes })
    });
    setSavingId(null);
    await load();
  };

  const exportCsv = () => {
    const url = `/api/superadmin/school-requests?${paramsString}${paramsString ? '&' : ''}format=csv`;
    window.open(url, '_blank');
  };

  const convertToSchool = async (id, currentName, currentSubdomain, currentModules) => {
    const name = prompt('School name:', currentName || '') || currentName;
    const sub = prompt('Subdomain (optional):', currentSubdomain || '') || currentSubdomain || '';
    const notes = prompt('Notes (optional):', '') || '';
    const modulesInput = prompt('Modules (comma-separated keys: parent-app, auto-timetable, finance, advanced-hr, procurement, library, transportation, hostel). Leave empty to use request selection.', (Array.isArray(currentModules) ? currentModules.join(',') : '')) || '';
    const modules = Array.from(new Set(modulesInput.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)));
    setSavingId(id);
    await fetch('/api/superadmin/school-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CONVERT', id, schoolName: name, subdomain: sub, notes, modules })
    });
    setSavingId(null);
    await load();
  };

  return (
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
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name/email/school" className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2" />
  <button onClick={load} className="px-3 py-2 bg-sky-600 rounded text-white">Filter</button>
        <button onClick={() => { setStatus(''); setQ(''); }} className="px-3 py-2 border border-zinc-700 rounded">Reset</button>
  <button onClick={exportCsv} className="px-3 py-2 border border-zinc-700 rounded">Export CSV</button>
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
                    <button disabled={savingId===r.id} onClick={() => updateStatus(r.id, 'REVIEWING')} className="px-2 py-1 border border-zinc-700 rounded">Review</button>
                    <button disabled={savingId===r.id} onClick={() => updateStatus(r.id, 'CONTACTED')} className="px-2 py-1 border border-zinc-700 rounded">Contacted</button>
                    <button disabled={savingId===r.id} onClick={() => updateStatus(r.id, 'APPROVED')} className="px-2 py-1 bg-emerald-600 text-white rounded">Approve</button>
                    <button disabled={savingId===r.id} onClick={() => updateStatus(r.id, 'REJECTED')} className="px-2 py-1 bg-rose-600 text-white rounded">Reject</button>
                    {!r.schoolId && (
                      <button disabled={savingId===r.id} onClick={() => convertToSchool(r.id, r.schoolName, r.subdomain, r.requestedModules)} className="px-2 py-1 bg-indigo-600 text-white rounded">Convert to School</button>
                    )}
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
  );
}
