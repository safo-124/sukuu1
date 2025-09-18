// app/[subdomain]/(school_app)/finance/overview/page.jsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSchool } from '../../layout';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DollarSign, TrendingUp, TrendingDown, ArrowRightLeft, FileText, Receipt, Clock, List } from 'lucide-react';

const metricCardBase = 'relative rounded-xl border bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border-zinc-200/60 dark:border-zinc-800/60 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-2';

function MetricCard({ title, value, icon: Icon, description, tone = 'default' }) {
  const toneClasses = {
    default: '',
    positive: 'ring-1 ring-emerald-500/30',
    warning: 'ring-1 ring-amber-500/30',
    danger: 'ring-1 ring-red-500/30'
  }[tone] || '';
  return (
    <div className={`${metricCardBase} ${toneClasses}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</p>
        {Icon && <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />}
      </div>
      <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{value}</div>
      {description && <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400 line-clamp-2">{description}</p>}
    </div>
  );
}

export default function FinanceOverviewPage() {
  const school = useSchool();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [agingDetail, setAgingDetail] = useState(null);
  const [agingLoading, setAgingLoading] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/schools/${school.id}/finance/stats?includeAging=1`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load finance stats');
      }
      const data = await res.json();
      setStats(data.stats || null);
    } catch (e) {
      console.error('FinanceOverview fetch error', e);
      setError(e.message);
      toast.error('Finance overview error', { description: e.message });
    } finally { setLoading(false); }
  }, [school?.id]);

  const fetchAgingDetails = useCallback(async () => {
    if (!school?.id) return;
    try {
      setAgingLoading(true);
      const res = await fetch(`/api/schools/${school.id}/finance/invoices/aging?includeDetails=true`);
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.error || 'Failed to load aging details');
      }
      const data = await res.json();
      setAgingDetail(data);
    } catch (e) {
      console.error('Aging details fetch error', e);
      toast.error('Aging details error', { description: e.message });
    } finally {
      setAgingLoading(false);
    }
  }, [school?.id]);

  useEffect(() => { if (school?.id && session) { fetchStats(); fetchAgingDetails(); } }, [school, session, fetchStats, fetchAgingDetails]);

  const agingBuckets = useMemo(() => stats?.aging || null, [stats]);
  const totalAging = useMemo(() => agingBuckets ? Object.values(agingBuckets).reduce((a,b)=>a+b,0) : 0, [agingBuckets]);

  const detailedBuckets = useMemo(() => {
    if (!agingDetail) return null;
    const map = { '0-30':'0_30','31-60':'31_60','61-90':'61_90','90+':'90_plus' };
    const counts = { '0_30':0,'31_60':0,'61_90':0,'90_plus':0 };
    if (agingDetail.invoices) {
      for (const inv of agingDetail.invoices) {
        const d = inv.daysPastDue;
        let key;
        if (d <= 30) key='0_30'; else if (d <= 60) key='31_60'; else if (d <= 90) key='61_90'; else key='90_plus';
        counts[key] += 1;
      }
    }
    return counts;
  }, [agingDetail]);

  const bucketLabel = {
    '0_30': '0-30 Days',
    '31_60': '31-60 Days',
    '61_90': '61-90 Days',
    '90_plus': '90+ Days'
  };

  const bucketKeys = ['0_30','31_60','61_90','90_plus'];

  const formatMoney = (n) => new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD'}).format(n || 0);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Financial Overview</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Key revenue, collections, expenses and aging insights.</p>
      </div>

      {loading && !stats && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_,i)=>(<Skeleton key={i} className="h-28 rounded-xl" />))}
        </div>
      )}

      {error && !loading && (
        <Card className="p-6 border-red-300/40 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {stats && (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard title="Total Billed" value={formatMoney(stats.totalBilled)} icon={FileText} description="Sum of issued invoice totals" />
            <MetricCard title="Collected (Invoices)" value={formatMoney(stats.totalCollected)} icon={DollarSign} description="Invoice payments recorded" tone="positive" />
            <MetricCard title="Outstanding" value={formatMoney(stats.outstanding)} icon={Clock} description="Unpaid balance" tone={stats.outstanding>0? 'warning':'default'} />
            <MetricCard title="Expenses" value={formatMoney(stats.expensesTotal)} icon={TrendingDown} description="Recorded spend" tone={stats.expensesTotal>0?'danger':'default'} />
            <MetricCard title="Net (Cash)" value={formatMoney(stats.net)} icon={TrendingUp} description="Payments minus expenses" tone={stats.net>=0?'positive':'danger'} />
          </div>

          {agingBuckets && (
            <Card className="p-5 space-y-4 bg-white/60 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-50">Invoice Aging</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Outstanding by days past due</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-medium">{formatMoney(totalAging)} due</Badge>
                  <button onClick={() => fetchAgingDetails()} className="text-[10px] px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition text-zinc-600 dark:text-zinc-300 disabled:opacity-50" disabled={agingLoading}>{agingLoading? '...' : 'Refresh'}</button>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {bucketKeys.map(key => {
                  const val = agingBuckets[key] || 0;
                  const pct = totalAging ? (val/totalAging)*100 : 0;
                  const count = detailedBuckets ? detailedBuckets[key] : null;
                  const isSelected = selectedBucket === key;
                  return (
                    <div key={key} className="space-y-1 group">
                      <div className="flex justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer" onClick={() => setSelectedBucket(isSelected? null : key)}>
                        <span className="flex items-center gap-1">{bucketLabel[key]} {count !== null && <span className="text-[10px] font-normal text-zinc-400">({count})</span>}</span>
                        <span>{formatMoney(val)} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 rounded bg-zinc-200/70 dark:bg-zinc-800/70 overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${isSelected? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700' : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 dark:from-amber-500 dark:via-amber-600 dark:to-amber-700'}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedBucket && agingDetail?.invoices && (
                <div className="pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><List className="h-3 w-3"/> {bucketLabel[selectedBucket]} Invoices</p>
                    <button onClick={()=>setSelectedBucket(null)} className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">Close</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-md border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-950/30">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px]">Invoice</TableHead>
                          <TableHead className="text-[10px]">Student</TableHead>
                          <TableHead className="text-[10px] text-right">Outstanding</TableHead>
                          <TableHead className="text-[10px] text-right">Days Past</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agingDetail.invoices.filter(inv => {
                          const d = inv.daysPastDue;
                          if (selectedBucket==='0_30') return d <= 30;
                          if (selectedBucket==='31_60') return d>30 && d<=60;
                          if (selectedBucket==='61_90') return d>60 && d<=90;
                          return d>90;
                        }).map(inv => (
                          <TableRow key={inv.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                            <TableCell className="text-[11px] font-medium">{inv.invoiceNumber}</TableCell>
                            <TableCell className="text-[11px]">{inv.student ? `${inv.student.firstName} ${inv.student.lastName}` : '—'}</TableCell>
                            <TableCell className="text-[11px] text-right tabular-nums">{formatMoney(inv.outstanding)}</TableCell>
                            <TableCell className="text-[11px] text-right tabular-nums">{inv.daysPastDue}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {selectedBucket && detailedBuckets && detailedBuckets[selectedBucket] === 0 && (
                      <div className="py-4 text-center text-[11px] text-zinc-500">No invoices in this bucket</div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 bg-white/60 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-50 flex items-center gap-2"><FileText className="h-4 w-4"/> Recent Invoices</h2>
              </div>
              <div className="overflow-x-auto -mx-3 px-3">
                <Table className="min-w-[520px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Number</TableHead>
                      <TableHead className="text-xs">Issued</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="text-xs text-right">Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stats.recentInvoices||[]).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-xs text-zinc-500">No invoices</TableCell>
                      </TableRow>) }
                    {(stats.recentInvoices||[]).map(inv => {
                      const remain = Math.max(0, (inv.totalAmount||0) - (inv.paidAmount||0));
                      const badgeTone = inv.status === 'PAID' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : inv.status === 'OVERDUE' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
                      return (
                        <TableRow key={inv.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                          <TableCell className="text-xs font-medium">{inv.invoiceNumber}</TableCell>
                          <TableCell className="text-xs">{new Date(inv.issueDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeTone}`}>{inv.status}</span></TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{formatMoney(inv.totalAmount)}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{formatMoney(inv.paidAmount)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="p-5 bg-white/60 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-50 flex items-center gap-2"><Receipt className="h-4 w-4"/> Recent Expenses</h2>
              </div>
              <div className="overflow-x-auto -mx-3 px-3">
                <Table className="min-w-[460px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stats.recentExpenses||[]).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-xs text-zinc-500">No expenses</TableCell>
                      </TableRow>) }
                    {(stats.recentExpenses||[]).map(exp => (
                      <TableRow key={exp.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                        <TableCell className="text-xs font-medium truncate max-w-[180px]">{exp.description || '—'}</TableCell>
                        <TableCell className="text-xs">{exp.date ? new Date(exp.date).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{formatMoney(exp.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
