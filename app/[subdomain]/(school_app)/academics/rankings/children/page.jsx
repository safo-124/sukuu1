// app/[subdomain]/(school_app)/academics/rankings/children/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSchool } from '../../../layout';
import { useSession } from 'next-auth/react';
import RequireRole from '@/components/auth/RequireRole';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function ParentRankingsPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const [years, setYears] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({ academicYearId: '', termId: '', sectionId: '' });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

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
      } catch {}
    })();
  }, [school?.id, session]);

  const refresh = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.academicYearId) qs.set('academicYearId', filters.academicYearId);
      if (filters.termId) qs.set('termId', filters.termId);
      if (filters.sectionId) qs.set('sectionId', filters.sectionId);
      const res = await fetch(`/api/schools/${school.id}/parents/me/children/rankings?${qs.toString()}`);
      const data = await res.json();
      setItems(res.ok ? (data.rankings || []) : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [filters.academicYearId, filters.termId, filters.sectionId]);

  const groups = useMemo(() => {
    const g = new Map();
    for (const r of items) {
      const key = `${r.student?.lastName || ''} ${r.student?.firstName || ''}`.trim() || r.studentId;
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(r);
    }
    return Array.from(g.entries());
  }, [items]);

  return (
    <RequireRole role="PARENT" fallback={<div className="p-6 text-sm text-muted-foreground">Only parents can view this page.</div>}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Children Rankings</h1>
          <p className="text-sm text-muted-foreground">Published section positions for your children.</p>
        </div>

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
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published rankings yet.</p>
        ) : (
          <div className="space-y-6">
            {groups.map(([childName, arr]) => (
              <div key={childName} className="border rounded-lg">
                <div className="p-3 border-b text-sm font-medium">{childName}</div>
                <div className="divide-y">
                  {arr.map(r => (
                    <div key={r.id} className="p-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{r.section?.class?.name} - {r.section?.name}</div>
                        <div className="text-xs text-muted-foreground">{r.academicYear?.name} • {r.term?.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">#{r.position}</div>
                        <div className="text-xs text-muted-foreground">out of {r.sectionTotal ?? '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RequireRole>
  );
}
