// app/[subdomain]/(school_app)/academics/rankings/children/performance/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSchool } from '@/app/[subdomain]/(school_app)/layout';
import { useSession } from 'next-auth/react';
import RequireRole from '@/components/auth/RequireRole';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, Tooltip, Legend, XAxis, YAxis } from 'recharts';

export default function ParentPerformancePage() {
  const school = useSchool();
  const { data: session } = useSession();
  const [years, setYears] = useState([]);
  const [filters, setFilters] = useState({ academicYearId: '', termId: '' });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!school?.id || !session) return;
    (async () => {
      try {
        const yRes = await fetch(`/api/schools/${school.id}/academic-years`);
        if (yRes.ok) {
          const d = await yRes.json();
          const yr = d.academicYears || [];
          setYears(yr);
          const current = yr.find(y => y.isCurrent) || yr[0];
          if (current) setFilters(f => ({ ...f, academicYearId: current.id, termId: current.terms?.[0]?.id || '' }));
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

      // Fetch analytics and rankings in parallel
      const [analyticsRes, rankingsRes] = await Promise.all([
        fetch(`/api/schools/${school.id}/parents/me/children/grades-analytics?${qs.toString()}`),
        fetch(`/api/schools/${school.id}/parents/me/children/rankings?${qs.toString()}`),
      ]);
      const [analyticsJson, rankingsJson] = await Promise.all([
        analyticsRes.json().catch(() => ({ children: [] })),
        rankingsRes.json().catch(() => ({ rankings: [] })),
      ]);

      const children = analyticsRes.ok ? (analyticsJson.children || []) : [];
      const rankings = rankingsRes.ok ? (rankingsJson.rankings || []) : [];
      // Map first/latest ranking per student
      const rankMap = new Map();
      for (const r of rankings) {
        if (!rankMap.has(r.studentId)) rankMap.set(r.studentId, r);
      }
      const merged = children.map(c => ({
        ...c,
        ranking: c?.student?.id ? rankMap.get(c.student.id) || null : null,
      }));
      setItems(merged);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [filters.academicYearId, filters.termId]);

  return (
    <RequireRole role="PARENT" fallback={<div className="p-6 text-sm text-muted-foreground">Only parents can view this page.</div>}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Children Performance</h1>
          <p className="text-sm text-muted-foreground">Average by subject and simple predictions; rankings shown if published by admin.</p>
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
        </div>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No analytics yet.</p>
        ) : (
          <div className="space-y-6">
            {items.map(({ student, analytics, ranking }) => {
              const subjectData = (analytics?.subjects || []).map(s => ({ name: s.subjectName, average: Number(s.average?.toFixed?.(1) ?? s.average ?? 0) }));
              const predictions = (analytics?.predictions || []).map(p => ({ name: p.subjectName, next: p.predictedNextMark ? Number(p.predictedNextMark.toFixed(1)) : null }));
              return (
                <Card key={student.id} className="p-4">
                  <div className="mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-medium">{student.lastName} {student.firstName}</div>
                      {ranking?.position != null && ranking?.sectionTotal != null && (
                        <Badge variant="secondary" className="text-[11px]">
                          Position: {ranking.position} / {ranking.sectionTotal}
                          {ranking?.section?.class?.name || ranking?.section?.name ? (
                            <span className="ml-1 text-[10px] text-muted-foreground">(
                              {`${ranking?.section?.class?.name ? ranking.section.class.name + ' - ' : ''}${ranking?.section?.name ?? ''}`}
                            )</span>
                          ) : null}
                        </Badge>
                      )}
                    </div>
                    {analytics?.average != null && (
                      <div className="text-xs text-muted-foreground">Overall average: {Number(analytics.average).toFixed(1)}</div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-56">
                      <h3 className="text-sm font-medium mb-2">Subject Averages</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={50} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="average" fill="#3b82f6" name="Average" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-56">
                      <h3 className="text-sm font-medium mb-2">Predicted Next Score</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={predictions}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={50} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="next" fill="#10b981" name="Predicted" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RequireRole>
  );
}
