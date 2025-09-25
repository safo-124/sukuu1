// app/(superadmin)/analytics/page.jsx
'use client';
import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { BarChart3, TrendingUp, Users, School, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

function Card({ title, value, icon:Icon, sub, loading, accent='from-purple-600 to-blue-600' }) {
  return (
    <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07] bg-gradient-to-br from-white to-transparent pointer-events-none" />
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${accent} text-white shadow`}> {Icon && <Icon className="w-6 h-6"/>} </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-28 mb-2" />
          <Skeleton className="h-4 w-40" />
        </>
      ) : (
        <>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
          {sub && <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">{sub}</div>}
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage(){
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  useEffect(()=>{
    if (session && session.user?.role !== 'SUPER_ADMIN') router.push('/login');
  },[session, router]);

  useEffect(()=>{
    let ignore = false;
    async function load(){
      setLoading(true);
      try {
        const res = await fetch(`/api/superadmin/analytics?months=${months}`);
        const json = await res.json();
        if(!ignore && !json.error) setData(json);
      } finally { if(!ignore) setLoading(false); }
    }
    if (session?.user?.role === 'SUPER_ADMIN') load();
    return ()=>{ ignore = true; };
  },[months, session]);

  const revenueSeries = data?.revenue || [];
  const growthSeries = data?.growth || [];
  const topSchools = data?.topSchools || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Platform Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Deep insights across growth, usage & revenue.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={months} onChange={e=> setMonths(Number(e.target.value))} className="bg-white/70 dark:bg-slate-800/70 border border-white/30 dark:border-slate-700/30 rounded-xl px-3 py-2 text-sm outline-none">
            {[3,6,9,12].map(m=> <option key={m} value={m}>{m} months</option>)}
          </select>
          <Button variant="outline" onClick={()=> setMonths(m=> m)} className="rounded-xl">Refresh</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Total Schools" value={loading? '...' : data?.totals.totalSchools} icon={School} loading={loading} />
        <Card title="Total Users" value={loading? '...' : data?.totals.totalUsers} icon={Users} accent='from-blue-600 to-indigo-600' loading={loading} />
        <Card title="Total Students" value={loading? '...' : data?.totals.totalStudents} icon={BarChart3} accent='from-emerald-600 to-teal-600' loading={loading} />
        <Card title="Total Parents" value={loading? '...' : data?.totals.totalParents} icon={BarChart3} accent='from-pink-600 to-rose-600' loading={loading} />
      </div>

      {/* Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue (Prorated Monthly)</h3>
            <span className="text-xs text-gray-500 dark:text-gray-500">Usage based • GHS</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-4 text-left">Month</th>
                  <th className="py-2 pr-4 text-right">Revenue (GHS)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(months)].map((_,i)=> (
                    <tr key={i}><td className='py-2 pr-4'><Skeleton className='h-4 w-24'/></td><td className='py-2 pr-4 text-right'><Skeleton className='h-4 w-20 ml-auto'/></td></tr>
                  ))
                ) : revenueSeries.map(r=> (
                  <tr key={r.key} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 font-medium text-gray-800 dark:text-gray-200">{r.key}</td>
                    <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">{r.monthlyRevenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribution</h3>
          {loading ? (
            <div className='space-y-3'>
              {[...Array(4)].map((_,i)=> <Skeleton key={i} className='h-4 w-1/2' />)}
            </div>
          ) : (
            <ul className="space-y-3 text-sm">
              <li className='flex justify-between'><span>Active Schools</span><span className='font-medium'>{data?.distribution.active}</span></li>
              <li className='flex justify-between'><span>Inactive Schools</span><span className='font-medium'>{data?.distribution.inactive}</span></li>
              <li className='flex justify-between'><span>Over Free Tier</span><span className='font-medium'>{data?.distribution.overFreeTier}</span></li>
              <li className='flex justify-between'><span>Total Students</span><span className='font-medium'>{data?.totals.totalStudents}</span></li>
            </ul>
          )}
          <p className='mt-4 text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1'><AlertTriangle className='h-3 w-3'/> Revenue is estimated (prorated from quarterly usage).</p>
        </div>
      </div>

      {/* Growth & Top Schools */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        <div className='p-6 rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 shadow'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>Growth (New)</h3>
          <table className='min-w-full text-sm'>
            <thead>
              <tr className='text-gray-500 dark:text-gray-400'>
                <th className='py-2 pr-4 text-left'>Month</th>
                <th className='py-2 pr-4 text-right'>Schools</th>
                <th className='py-2 pr-4 text-right'>Users</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(months)].map((_,i)=> <tr key={i}><td className='py-2 pr-4'><Skeleton className='h-4 w-20'/></td><td className='py-2 pr-4 text-right'><Skeleton className='h-4 w-10 ml-auto'/></td><td className='py-2 pr-4 text-right'><Skeleton className='h-4 w-10 ml-auto'/></td></tr>) : growthSeries.map(g => (
                <tr key={g.key} className='border-t border-gray-100 dark:border-gray-800'>
                  <td className='py-2 pr-4 font-medium text-gray-800 dark:text-gray-200'>{g.key}</td>
                  <td className='py-2 pr-4 text-right'>{g.newSchools}</td>
                  <td className='py-2 pr-4 text-right'>{g.newUsers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className='lg:col-span-2 p-6 rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 shadow'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Top Schools (Current Quarter)</h3>
            <span className='text-xs text-gray-500 dark:text-gray-500'>{topSchools.length} schools</span>
          </div>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='text-gray-500 dark:text-gray-400'>
                  <th className='py-2 pr-4 text-left'>#</th>
                  <th className='py-2 pr-4 text-left'>School</th>
                  <th className='py-2 pr-4 text-right'>Students</th>
                  <th className='py-2 pr-4 text-right'>Parents</th>
                  <th className='py-2 pr-4 text-right'>Monthly GHS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? [...Array(5)].map((_,i)=> <tr key={i}><td className='py-2 pr-4'><Skeleton className='h-4 w-4'/></td><td className='py-2 pr-4'><Skeleton className='h-4 w-32'/></td><td className='py-2 pr-4 text-right'><Skeleton className='h-4 w-10 ml-auto'/></td><td className='py-2 pr-4 text-right'><Skeleton className='h-4 w-10 ml-auto'/></td><td className='py-2 pr-4 text-right'><Skeleton className='h-4 w-16 ml-auto'/></td></tr>) : topSchools.map(r => (
                  <tr key={r.schoolId} className='border-t border-gray-100 dark:border-gray-800 hover:bg-white/40 dark:hover:bg-slate-800/40'>
                    <td className='py-2 pr-4 font-medium'>{r.rank}</td>
                    <td className='py-2 pr-4 font-medium text-gray-800 dark:text-gray-200'>{r.schoolName}</td>
                    <td className='py-2 pr-4 text-right'>{r.students}</td>
                    <td className='py-2 pr-4 text-right'>{r.parents}</td>
                    <td className='py-2 pr-4 text-right font-semibold'>GHS {r.monthlyAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
