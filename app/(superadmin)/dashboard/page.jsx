"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, AlertTriangle, Users, School, RefreshCw } from "lucide-react";

// Recharts (dynamic to avoid SSR issues)
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });

const currency = (v) => `GHS ${Number(v || 0).toFixed(2)}`;

export default function SuperAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Guard
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) return; // next-auth will redirect if needed elsewhere
    if (session.user?.role !== 'SUPER_ADMIN') {
      router.push('/login');
    }
  }, [session, status, router]);

  async function loadStats(force = false) {
    try {
      if (force) setRefreshing(true); else setLoading(true);
      const res = await fetch(`/api/superadmin/stats${force ? '?force=1' : ''}`);
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { if (session?.user?.role === 'SUPER_ADMIN') loadStats(); }, [session]);

  const revenueTrendPct = useMemo(() => {
    if (!stats?.revenueTrend || stats.revenueTrend.length < 2) return null;
    const last = stats.revenueTrend.at(-1).revenue;
    const prev = stats.revenueTrend.at(-2).revenue;
    if (!prev) return null;
    return ((last - prev) / prev) * 100;
  }, [stats]);

  const overageSchools = useMemo(() => (stats?.perSchoolBreakdown || []).filter(s => s.freeTierExceeded), [stats]);
  const mrrSeries = stats?.mrrSeries || [];
  const arpuSeries = stats?.arpuSeries || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Super Admin Dashboard</h1>
        <button
          onClick={() => loadStats(true)}
          disabled={refreshing}
          className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <Card className="p-4 border-destructive/50 bg-destructive/5 text-destructive">
          <div className="font-medium mb-1">Could not load analytics</div>
          <div className="text-xs opacity-90">{error}</div>
        </Card>
      )}

      {loading && !refreshing && (
        <div className="text-sm text-muted-foreground">Loading analytics…</div>
      )}

      {stats && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPI label="Total Schools" value={stats.totalSchools} icon={<School className="h-5 w-5" />} />
            <KPI label="Students" value={stats.totalStudents} icon={<Users className="h-5 w-5" />} />
            <KPI label="Parents" value={stats.totalParents} icon={<Users className="h-5 w-5" />} />
            <KPI label="Quarter Revenue" value={currency(stats.currentQuarterRevenue || 0)} trend={revenueTrendPct} />
          </div>

          {/* Trend & MRR/ARPU */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-4 col-span-2">
              <h2 className="font-medium mb-2">Revenue Trend (Monthly)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.revenueTrend} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v)=> v/1000 + 'k'} width={50} />
                    <Tooltip formatter={(val) => currency(Number(val))} />
                    <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <h2 className="font-medium mb-2">MRR & ARPU</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mergeSeries(mrrSeries, arpuSeries)} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tickFormatter={(v)=> v/1000 + 'k'} width={40} />
                    <YAxis yAxisId="right" orientation="right" width={40} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={2} dot={false} name="MRR" />
                    <Line yAxisId="right" type="monotone" dataKey="arpu" stroke="#f59e0b" strokeWidth={2} dot={false} name="ARPU" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Per School Breakdown */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Per-School Monthly Breakdown</h2>
              <div className="text-xs text-muted-foreground">Cached {stats.cachedAt ? format(new Date(stats.cachedAt), 'PPpp') : '—'}</div>
            </div>
            <ScrollArea className="max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="text-left border-b">
                    <th className="py-2 font-medium">School</th>
                    <th className="py-2 font-medium">Students</th>
                    <th className="py-2 font-medium">Parents</th>
                    <th className="py-2 font-medium">Monthly</th>
                    <th className="py-2 font-medium">Quarter Est.</th>
                    <th className="py-2 font-medium">Free Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perSchoolBreakdown?.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No schools yet.</td></tr>
                  )}
                  {stats.perSchoolBreakdown?.map(row => (
                    <tr key={row.schoolId} className="border-b last:border-b-0">
                      <td className="py-2 pr-2 font-medium flex items-center gap-2">
                        {row.schoolName}
                        {row.freeTierExceeded && (
                          <Badge variant="destructive" className="text-[10px]">Overage</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-2">{row.students}</td>
                      <td className="py-2 pr-2">{row.parents}</td>
                      <td className="py-2 pr-2">{currency(row.monthlyRevenue || 0)}</td>
                      <td className="py-2 pr-2">{currency(row.quarterProjected || 0)}</td>
                      <td className="py-2 pr-2">{row.freeTierExceeded ? 'Exceeded' : 'Within'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
            {overageSchools.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {overageSchools.map(s => (
                  <Badge key={s.schoolId} variant="outline" className="border-destructive text-destructive bg-destructive/5">
                    <AlertTriangle className="h-3 w-3 mr-1" /> {s.schoolName} exceeded free tier
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {/* Free Tier Summary + Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="font-medium mb-2">Free Tier Overage Summary</h2>
              <ul className="text-sm space-y-1">
                <li>Schools Over Free Tier: <strong>{overageSchools.length}</strong></li>
                <li>Current Billing Rate: GHS 10 / student / quarter</li>
                <li>Parent Rate: GHS 5 / parent / quarter</li>
                <li>Enforcement: Hard (grace then block)</li>
              </ul>
            </Card>
            <Card className="p-4">
              <h2 className="font-medium mb-2">Monthly Revenue Distribution</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.perSchoolBreakdown} margin={{ left: 4, right: 10, top: 8, bottom: 0 }}>
                    <XAxis dataKey="schoolName" hide />
                    <YAxis tickFormatter={(v)=> (v/1000)+'k'} width={50} />
                    <Tooltip formatter={(v)=> currency(Number(v))} labelFormatter={() => 'School'} />
                    <Bar dataKey="monthlyRevenue" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Hover bars for amounts; labels hidden for space.</div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ label, value, icon, trend }) {
  const trendPositive = trend != null && trend > 0;
  const trendNegative = trend != null && trend < 0;
  return (
    <Card className="p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      <div className="text-xl font-semibold tracking-tight">{value ?? '—'}</div>
      {trend != null && (
        <div className={`flex items-center gap-1 text-xs ${trendPositive ? 'text-emerald-600' : trendNegative ? 'text-red-600' : 'text-muted-foreground'}`}> 
          {trendPositive && <TrendingUp className="h-3 w-3" />}
            {trendNegative && <TrendingDown className="h-3 w-3" />}
          <span>{trend.toFixed(1)}%</span>
        </div>
      )}
    </Card>
  );
}

function mergeSeries(mrr, arpu) {
  const map = new Map();
  mrr.forEach(r => { map.set(r.month, { month: r.month, mrr: r.mrr }); });
  arpu.forEach(r => { const existing = map.get(r.month) || { month: r.month }; existing.arpu = r.arpu; map.set(r.month, existing); });
  return Array.from(map.values()).sort((a,b)=> a.month.localeCompare(b.month));
}