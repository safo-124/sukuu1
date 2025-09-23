// app/[subdomain]/(school_app)/academics/rankings/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import RequireRole from '@/components/auth/RequireRole';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function RankingsOverviewPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const [years, setYears] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({ academicYearId: '', termId: '', sectionId: '' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!school?.id || !session) return;
    (async () => {
      try {
        const [yRes, sRes] = await Promise.all([
          fetch(`/api/schools/${school.id}/academic-years`),
          fetch(`/api/schools/${school.id}/academics/sections`),
        ]);
        if (yRes.ok) {
          const d = await yRes.json();
          const yr = d.academicYears || [];
          setYears(yr);
          const current = yr.find(y => y.isCurrent) || yr[0];
          if (current) setFilters(f => ({ ...f, academicYearId: current.id, termId: current.terms?.[0]?.id || '' }));
        }
        if (sRes.ok) {
          const d = await sRes.json();
          setSections(d.sections || []);
        }
      } catch (e) {
        toast.error('Failed to load filters');
      }
    })();
  }, [school?.id, session]);

  const fetchRows = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.academicYearId) qs.set('academicYearId', filters.academicYearId);
      if (filters.termId) qs.set('termId', filters.termId);
      if (filters.sectionId) qs.set('sectionId', filters.sectionId);
      const res = await fetch(`/api/schools/${school.id}/academics/rankings/overview?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load rankings');
      setRows(data.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, [filters.academicYearId, filters.termId, filters.sectionId]);

  const recompute = async (r, publish) => {
    try {
      const res = await fetch(`/api/schools/${school.id}/academics/rankings/recompute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sectionId: r.sectionId, termId: r.termId, academicYearId: r.academicYearId, publish }) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || 'Operation failed');
      toast.success(`Recomputed ${data.count} rankings ${publish ? 'and published' : ''}`);
      fetchRows();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const recomputeAll = async (publish) => {
    if (!rows.length) return;
    setBusy(true);
    try {
      // Run sequentially to avoid server overload; could be parallel with Promise.allSettled if needed
      let total = 0; let failures = 0;
      for (const r of rows) {
        try {
          const res = await fetch(`/api/schools/${school.id}/academics/rankings/recompute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sectionId: r.sectionId, termId: r.termId, academicYearId: r.academicYearId, publish }) });
          const data = await res.json().catch(()=>({}));
          if (!res.ok) { failures++; continue; }
          total += data.count || 0;
        } catch { failures++; }
      }
      toast.success(`Recomputed ${total} snapshots across ${rows.length} section(s)${publish ? ' and published' : ''}${failures ? ` • ${failures} failed` : ''}`);
      fetchRows();
    } finally {
      setBusy(false);
    }
  };

  return (
    <RequireRole role={["SCHOOL_ADMIN","SUPER_ADMIN"]} fallback={<div className="p-6 text-sm text-muted-foreground">Only school admins can view this page.</div>}>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold">Rankings Overview</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!rows.length || busy} onClick={() => recomputeAll(false)}>Recompute All</Button>
            <Button size="sm" disabled={!rows.length || busy} onClick={() => recomputeAll(true)}>Recompute & Publish All</Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground -mt-3">Monitor, recompute, and publish section rankings by term. Use batch actions for the filtered set.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Academic Year</label>
            <Select value={filters.academicYearId} onValueChange={(v) => setFilters(f => ({ ...f, academicYearId: v }))}>
              <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                {years.map(y => (<SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">Term</label>
            <Select value={filters.termId} onValueChange={(v) => setFilters(f => ({ ...f, termId: v }))}>
              <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
              <SelectContent>
                {(years.find(y => y.id === filters.academicYearId)?.terms || []).map(t => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">Section</label>
            <Select
              value={filters.sectionId || '__ALL__'}
              onValueChange={(v) => setFilters(f => ({ ...f, sectionId: v === '__ALL__' ? '' : v }))}
            >
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All</SelectItem>
                {sections.map(sec => (<SelectItem key={sec.id} value={sec.id}>{sec.class?.name} - {sec.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rankings found for selected filters.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={`${r.sectionId}|${r.termId}|${r.academicYearId}`} className="border rounded-md p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{r.section?.class?.name} - {r.section?.name}</div>
                  <div className="text-xs text-muted-foreground">{r.academicYear?.name} • {r.term?.name} • Last computed: {r.computedAt ? new Date(r.computedAt).toLocaleString() : '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs">Published: {r.publishedCount} / {r.totalSnapshots}</div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => recompute(r, false)}>Recompute</Button>
                    <Button size="sm" onClick={() => recompute(r, true)}>Recompute & Publish</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RequireRole>
  );
}
