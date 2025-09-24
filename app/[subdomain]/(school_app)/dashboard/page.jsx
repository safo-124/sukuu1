// app/[subdomain]/(school_app)/dashboard/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSchool } from '../layout'; // Consume school data from context
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from "@/components/ui/card"; // Using parts of Shadcn Card for structure
import Link from 'next/link';
import { toast } from 'sonner';
import { Users, UserCog, Building, CalendarDays, BellPlus, DollarSign, BarChart3, PieChart as PieIcon, ListChecks, Receipt, Clock3, Trophy, Megaphone, BookOpen } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// --- Helper: StatCard Component (Ensure it's robust for undefined values during loading) ---
const StatCard = ({ title, value, icon, description, isLoading, linkTo }) => {
  const titleTextClasses = "text-zinc-900 dark:text-zinc-50";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  // Using Tailwind classes for glassmorphism directly on this component's root
  const glassCardClasses = `
    p-1 min-h-[130px] flex flex-col justify-between rounded-xl 
    backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl 
    bg-white/70 border border-zinc-200/80 
    dark:bg-zinc-900/70 dark:border-zinc-700/80
    ${linkTo ? 'hover:shadow-lg dark:hover:shadow-sky-500/20 transition-shadow' : ''}
  `;
  const StatCardWrapper = linkTo ? Link : 'div';


  if (isLoading) {
    return (
      <div className={`${glassCardClasses} p-5`}> {/* Add padding for skeleton */}
        <div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
            <Skeleton className="h-5 w-3/4 bg-zinc-300 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-6 w-6 bg-zinc-300 dark:bg-zinc-700 rounded-sm" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <Skeleton className="h-8 w-1/2 mb-1 bg-zinc-400 dark:bg-zinc-600 rounded" />
          </CardContent>
        </div>
        <Skeleton className="h-4 w-full bg-zinc-300 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  return (
    <StatCardWrapper href={linkTo || undefined} className={glassCardClasses}>
      <div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-5 pt-5">
          <CardTitle className={`text-sm font-medium ${titleTextClasses}`}>{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent className="pb-2 px-5">
          <div className={`text-3xl font-bold ${titleTextClasses}`}>{value !== undefined && value !== null ? value : '-'}</div>
        </CardContent>
      </div>
      {description && <p className={`text-xs px-6 pb-4 ${descriptionTextClasses}`}>{description}</p>}
    </StatCardWrapper>
  );
};


export default function SchoolAdminDashboardPage() {
  const { data: session } = useSession();
  const schoolData = useSchool(); // from SchoolAppLayout context
  const params = useParams();
  const subdomain = params?.subdomain;
  const router = useRouter();

  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0, 
    totalTeachers: 0, 
    totalClasses: 0, // Added totalClasses
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [studentPerformance, setStudentPerformance] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [studentCounts, setStudentCounts] = useState({ pendingAssignments: 0, unpaidInvoices: 0, nextExam: null });
  const [loadingStudentCounts, setLoadingStudentCounts] = useState(false);
  // Accountant finance state
  const [financeStats, setFinanceStats] = useState(null);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [financeRange, setFinanceRange] = useState(30); // 7 | 30 | 90

  // Admin dashboard extras
  const [adminFinance, setAdminFinance] = useState(null);
  const [loadingAdminFinance, setLoadingAdminFinance] = useState(false);
  const [libraryStats, setLibraryStats] = useState(null);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [rankingsSummary, setRankingsSummary] = useState({ totalSnapshots: 0, published: 0, groups: 0, items: [] });
  const [loadingRankings, setLoadingRankings] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  // Tailwind class constants
  const pageTitleClasses = "text-zinc-900 dark:text-zinc-50";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/70 border border-zinc-200/80 dark:bg-zinc-900/70 dark:border-zinc-700/80`;
  const sectionTitleClasses = `text-xl font-semibold ${pageTitleClasses}`;
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  // Redirect procurement officers to their dedicated dashboard
  useEffect(() => {
    if (session?.user?.role === 'PROCUREMENT_OFFICER' && subdomain) {
      router.replace(`/${subdomain}/dashboard/procurement`);
    }
  }, [session?.user?.role, subdomain, router]);



  const fetchDashboardStats = useCallback(async () => {
    if (!schoolData?.id) return;
    setIsLoadingStats(true);
    try {
      const response = await fetch(`/api/schools/${schoolData.id}/dashboard-stats`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch dashboard stats (${response.status})`);
      }
      const data = await response.json();
      setDashboardStats({ // Ensure all expected fields are set, defaulting if not present
          totalStudents: data.totalStudents || 0,
          totalTeachers: data.totalTeachers || 0,
          totalClasses: data.totalClasses || 0, // Use new field
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      toast.error("Could not load dashboard statistics", { description: error.message });
      setDashboardStats({ totalStudents: 0, totalTeachers: 0, totalClasses: 0 }); // Reset on error
    } finally {
      setIsLoadingStats(false);
    }
  }, [schoolData?.id]);

  useEffect(() => {
    if (schoolData?.id && session?.user?.role !== 'STUDENT') {
      fetchDashboardStats();
    }
  }, [schoolData, fetchDashboardStats, session?.user?.role]);

  // Load admin summaries (finance-lite, library stats, rankings overview, announcements)
  useEffect(() => {
    const role = session?.user?.role;
    if (!schoolData?.id || !role || ['STUDENT','ACCOUNTANT','PROCUREMENT_OFFICER'].includes(role)) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingAdminFinance(true);
        const res = await fetch(`/api/schools/${schoolData.id}/dashboard/finance?range=30`);
        if (!cancelled && res.ok) setAdminFinance(await res.json());
      } catch (e) {
        console.error('Admin finance load error', e);
      } finally {
        if (!cancelled) setLoadingAdminFinance(false);
      }
    })();
    (async () => {
      try {
        setLoadingLibrary(true);
        const res = await fetch(`/api/schools/${schoolData.id}/resources/library/stats`);
        if (!cancelled && res.ok) setLibraryStats(await res.json());
      } catch (e) {
        console.error('Library stats load error', e);
      } finally {
        if (!cancelled) setLoadingLibrary(false);
      }
    })();
    (async () => {
      try {
        setLoadingRankings(true);
        const res = await fetch(`/api/schools/${schoolData.id}/academics/rankings/overview`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          const items = data?.items || [];
          const totals = items.reduce((acc, it) => {
            acc.totalSnapshots += Number(it.totalSnapshots || 0);
            acc.published += Number(it.publishedCount || 0);
            return acc;
          }, { totalSnapshots: 0, published: 0 });
          setRankingsSummary({ ...totals, groups: items.length, items });
        }
      } catch (e) {
        console.error('Rankings overview load error', e);
      } finally {
        if (!cancelled) setLoadingRankings(false);
      }
    })();
    (async () => {
      try {
        setLoadingAnnouncements(true);
        const res = await fetch(`/api/schools/${schoolData.id}/communications/announcements?limit=5&publishedOnly=true`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setAnnouncements(data?.announcements || []);
        }
      } catch (e) {
        console.error('Announcements load error', e);
      } finally {
        if (!cancelled) setLoadingAnnouncements(false);
      }
    })();
    return () => { cancelled = true; };
  }, [schoolData?.id, session?.user?.role]);

  // Load accountant finance dashboard stats
  useEffect(() => {
    if (!schoolData?.id || session?.user?.role !== 'ACCOUNTANT') return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingFinance(true);
        const res = await fetch(`/api/schools/${schoolData.id}/dashboard/finance?range=${financeRange}`);
        if (!cancelled && res.ok) {
          setFinanceStats(await res.json());
        }
      } catch (e) {
        console.error('Finance stats load error', e);
      } finally {
        if (!cancelled) setLoadingFinance(false);
      }
    })();
    return () => { cancelled = true; };
  }, [schoolData?.id, session?.user?.role, financeRange]);

  // Load student performance if student
  useEffect(() => {
    if (!schoolData?.id || session?.user?.role !== 'STUDENT') return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingPerformance(true);
        const res = await fetch(`/api/schools/${schoolData.id}/students/me/performance`);
        if (!cancelled && res.ok) {
          setStudentPerformance(await res.json());
        }
      } catch (e) {
        console.error('Performance load error', e);
      } finally {
        if (!cancelled) setLoadingPerformance(false);
      }
    })();
    return () => { cancelled = true; };
  }, [schoolData?.id, session?.user?.role]);

  // Load student quick counts (assignments, invoices, next exam)
  useEffect(() => {
    if (!schoolData?.id || session?.user?.role !== 'STUDENT') return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingStudentCounts(true);
        const [assRes, invRes] = await Promise.all([
          fetch(`/api/schools/${schoolData.id}/students/me/assignments`),
          fetch(`/api/schools/${schoolData.id}/students/me/invoices`),
        ]);
        let pendingAssignments = 0;
        if (assRes.ok) {
          const d = await assRes.json();
          const now = new Date();
          pendingAssignments = (d.assignments || []).filter(a => !a.submittedAt && (!a.dueDate || new Date(a.dueDate) >= now)).length;
        }
        let unpaidInvoices = 0;
        if (invRes.ok) {
          const d = await invRes.json();
          unpaidInvoices = (d.invoices || []).filter(inv => (inv.due ?? (inv.total - inv.paid)) > 0).length;
        }
        if (!cancelled) setStudentCounts({ pendingAssignments, unpaidInvoices, nextExam: null });
      } catch (e) {
        console.error('Student quick counts error', e);
        if (!cancelled) setStudentCounts({ pendingAssignments: 0, unpaidInvoices: 0, nextExam: null });
      } finally {
        if (!cancelled) setLoadingStudentCounts(false);
      }
    })();
    return () => { cancelled = true; };
  }, [schoolData?.id, session?.user?.role]);

  // Skeleton for the entire page if schoolData isn't available from context yet
  if (!schoolData && isLoadingStats) { 
    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <Skeleton className={`h-10 w-3/4 mb-2 bg-zinc-200 dark:bg-zinc-800 rounded-md`} />
        <Skeleton className={`h-6 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-md`} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className={`h-[130px] w-full ${glassCardClasses} bg-zinc-200 dark:bg-zinc-800`} />)}
        </div>
        <Skeleton className={`h-40 w-full ${glassCardClasses} bg-zinc-200 dark:bg-zinc-800`} />
      </div>
    );
  }
  
  if (!schoolData) {
      return <div className={`text-xl p-4 md:p-6 lg:p-8 ${pageTitleClasses}`}>Loading school information or school not found...</div>;
  }


  // Student dashboard variant
  if (session?.user?.role === 'STUDENT') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className={`text-3xl font-bold ${pageTitleClasses}`}>My Dashboard</h1>
          <p className={descriptionTextClasses}>Overview of your academic performance and recent metrics.</p>
        </div>
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Pending Assignments"
            value={studentCounts.pendingAssignments}
            icon={<ListChecks className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingStudentCounts}
            description="Assignments not yet submitted"
            linkTo={`/${subdomain}/academics/assignments`}
          />
          <StatCard
            title="Unpaid Invoices"
            value={studentCounts.unpaidInvoices}
            icon={<Receipt className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingStudentCounts}
            description="Invoices with balance due"
            linkTo={`/${subdomain}/finance/invoices`}
          />
          <StatCard
            title="Overall Average"
            value={studentPerformance?.overallAverage != null ? studentPerformance.overallAverage.toFixed(1) : '-'}
            icon={<PieChart className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingPerformance}
            description="Cumulative published grades"
          />
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Subjects Graded"
            value={studentPerformance?.subjects?.length || 0}
            icon={<BarChart3 className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingPerformance}
            description="Subjects with published marks"
          />
          <StatCard
            title="Terms Counted"
            value={studentPerformance?.terms?.length || 0}
            icon={<CalendarDays className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingPerformance}
            description="Terms contributing to average"
          />
          <StatCard
            title="Next Exam"
            value={studentCounts.nextExam?.date ? new Date(studentCounts.nextExam.date).toLocaleDateString() : '—'}
            icon={<Clock3 className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingStudentCounts}
            description={studentCounts.nextExam?.name || 'Upcoming exam schedule'}
          />
        </section>
        <section className="space-y-4">
          <h2 className={`text-xl font-semibold ${pageTitleClasses}`}>Subject Averages</h2>
          {loadingPerformance && <Skeleton className="h-24 w-full" />}
          {!loadingPerformance && (!studentPerformance?.subjects?.length) && <p className="text-sm text-muted-foreground">No published grades yet.</p>}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {studentPerformance?.subjects?.map(s => (
              <div key={s.subjectId} className={glassCardClasses}>
                <div className="p-4 space-y-1">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-2xl font-bold">{s.average.toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">Assessments: {s.count}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-4">
          <h2 className={`text-xl font-semibold ${pageTitleClasses}`}>Term Averages</h2>
          {loadingPerformance && <Skeleton className="h-20 w-full" />}
          <div className="grid gap-4 md:grid-cols-3">
            {studentPerformance?.terms?.map(t => (
              <div key={t.termId} className={glassCardClasses}>
                <div className="p-4 space-y-1">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xl font-bold">{t.average.toFixed(1)}</p>
                  <p className="text-[11px] text-muted-foreground">Grades: {t.count}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Accountant dashboard variant
  if (session?.user?.role === 'ACCOUNTANT') {
    const fmt = (n) => Number(n || 0).toLocaleString();
    const currency = (n) => `GHS ${Number(n || 0).toLocaleString()}`;
    const seriesDates = (() => {
      if (!financeStats?.payments?.series && !financeStats?.expenses?.series) return [];
      const map = new Map();
      (financeStats?.payments?.series || []).forEach(p => map.set(p.date, { date: p.date, payments: p.total, expenses: 0 }));
      (financeStats?.expenses?.series || []).forEach(e => {
        if (map.has(e.date)) map.get(e.date).expenses = e.total; else map.set(e.date, { date: e.date, payments: 0, expenses: e.total });
      });
      return Array.from(map.values()).sort((a,b)=>a.date.localeCompare(b.date));
    })();
    const invoiceStatusData = (() => {
      const by = financeStats?.invoices?.byStatus || {};
      return Object.keys(by).map(k => ({ name: k.replaceAll('_',' '), value: Number(by[k]||0) })).filter(d => d.value>0);
    })();
    const COLORS = ['#0ea5e9','#22c55e','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#eab308'];
    const hasSeriesData = seriesDates.length > 0;
    const hasInvoiceStatusData = invoiceStatusData.length > 0;
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${pageTitleClasses}`}>Finance Overview</h1>
            <p className={descriptionTextClasses}>Quick snapshot for invoices, payments and expenses.</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="hidden md:flex items-center gap-1 mr-2">
              <Button variant={financeRange===7?undefined:'outline'} size="sm" onClick={()=>setFinanceRange(7)}>7d</Button>
              <Button variant={financeRange===30?undefined:'outline'} size="sm" onClick={()=>setFinanceRange(30)}>30d</Button>
              <Button variant={financeRange===90?undefined:'outline'} size="sm" onClick={()=>setFinanceRange(90)}>90d</Button>
            </div>
            <Link href={`/${subdomain}/finance/invoices`}><Button className={primaryButtonClasses} size="sm">Create Invoice</Button></Link>
            <Link href={`/${subdomain}/finance/payments`}><Button variant="outline" className={outlineButtonClasses} size="sm">Record Payment</Button></Link>
            <Link href={`/${subdomain}/finance/expenses`}><Button variant="outline" className={outlineButtonClasses} size="sm">Add Expense</Button></Link>
          </div>
        </div>

        {/* Top stats */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Outstanding Amount"
            value={financeStats?.invoices?.outstandingAmount ? currency(financeStats.invoices.outstandingAmount) : '-' }
            icon={<DollarSign className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingFinance}
            description="Unpaid balance across invoices"
            linkTo={`/${subdomain}/finance/invoices`}
          />
          <StatCard
            title="Invoices (Total)"
            value={fmt(financeStats?.invoices?.total)}
            icon={<Receipt className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingFinance}
            description={`Due in 7 days: ${fmt(financeStats?.invoices?.dueSoon)}`}
            linkTo={`/${subdomain}/finance/invoices`}
          />
          <StatCard
            title={`Payments (${financeStats?.payments?.rangeDays || financeRange}d)`}
            value={currency(financeStats?.payments?.lastRange?.totalAmount)}
            icon={<BarChart3 className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingFinance}
            description={`${fmt(financeStats?.payments?.lastRange?.count)} receipts in range`}
            linkTo={`/${subdomain}/finance/payments`}
          />
          <StatCard
            title={`Expenses (${financeStats?.expenses?.rangeDays || financeRange}d)`}
            value={currency(financeStats?.expenses?.lastRange?.totalAmount)}
            icon={<PieIcon className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingFinance}
            description={`${fmt(financeStats?.expenses?.lastRange?.count)} entries in range`}
            linkTo={`/${subdomain}/finance/expenses`}
          />
          <StatCard
            title="Net Cashflow"
            value={currency(financeStats?.netCashflow)}
            icon={<BarChart3 className={`h-5 w-5 ${descriptionTextClasses}`} />}
            isLoading={loadingFinance}
            description={`Payments minus expenses over ${financeStats?.payments?.rangeDays || financeRange} days`}
          />
        </section>

        {/* Charts */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className={`lg:col-span-2 ${glassCardClasses}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Payments vs Expenses (30 days)</h2>
            </div>
            <div className="h-72 w-full">
              {loadingFinance ? (
                <Skeleton className="h-full w-full" />
              ) : hasSeriesData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seriesDates} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v=>Number(v).toLocaleString()} width={70} />
                    <Tooltip formatter={(v)=>Number(v).toLocaleString()} />
                    <Legend />
                    <Area type="monotone" dataKey="payments" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} name="Payments" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-zinc-500">No data for the last 30 days.</div>
              )}
            </div>
          </div>
          <div className={`${glassCardClasses}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Invoices by Status</h2>
            </div>
            <div className="h-72 w-full">
              {loadingFinance ? (
                <Skeleton className="h-full w-full" />
              ) : hasInvoiceStatusData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={invoiceStatusData} dataKey="value" nameKey="name" outerRadius={100} label>
                      {invoiceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v)=>Number(v).toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-zinc-500">No invoice data yet.</div>
              )}
            </div>
          </div>
        </section>

        {/* Recent activity */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className={glassCardClasses}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Recent Invoices</h2>
              <Link href={`/${subdomain}/finance/invoices`} className="text-sm underline">View all</Link>
            </div>
            <ul className="space-y-2 text-sm">
              {(!financeStats?.recentInvoices?.length) && !loadingFinance && <li className="text-zinc-500">No recent invoices.</li>}
              {(financeStats?.recentInvoices||[]).map(inv => (
                <li key={inv.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <span>{inv.invoiceNumber || inv.id.slice(0,8)}</span>
                  <span className="font-medium">GHS {Number(inv.totalAmount||0).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={glassCardClasses}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Today</h2>
              <div className="text-xs text-zinc-500">Payments & Expenses</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-zinc-500 mb-1">Payments</div>
                <div className="text-xl font-semibold">{currency(financeStats?.payments?.today?.totalAmount)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-zinc-500 mb-1">Expenses</div>
                <div className="text-xl font-semibold">{currency(financeStats?.expenses?.today?.totalAmount)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className={`text-3xl font-bold ${pageTitleClasses}`}>{schoolData?.name} Dashboard</h1>
        <p className={descriptionTextClasses}>Welcome back, {session?.user?.name || 'Administrator'}! Here's an overview of your school.</p>
      </div>

      {/* Core Stats */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Students" 
          value={dashboardStats.totalStudents} 
          icon={<Users className={`h-5 w-5 ${descriptionTextClasses}`} />} 
          isLoading={isLoadingStats}
          linkTo={`/${subdomain}/people/students`}
          description="View all students"
        />
        <StatCard 
          title="Total Teachers" 
          value={dashboardStats.totalTeachers} 
          icon={<UserCog className={`h-5 w-5 ${descriptionTextClasses}`} />} 
          isLoading={isLoadingStats}
          linkTo={`/${subdomain}/people/teachers`}
          description="Manage teaching staff"
        />
        <StatCard 
          title="Total Classes" // Updated title
          value={dashboardStats.totalClasses} // Use new stat
          icon={<Building className={`h-5 w-5 ${descriptionTextClasses}`} />} 
          isLoading={isLoadingStats}
          linkTo={`/${subdomain}/academics/classes`}
          description="View all classes"
        />
        <StatCard
          title="Outstanding Invoices"
          value={adminFinance?.invoices?.outstandingAmount != null ? `GHS ${Number(adminFinance?.invoices?.outstandingAmount || 0).toLocaleString()}` : '-'}
          icon={<DollarSign className={`h-5 w-5 ${descriptionTextClasses}`} />}
          isLoading={loadingAdminFinance}
          linkTo={`/${subdomain}/finance/invoices`}
          description="Unpaid balance across invoices"
        />
      </section>

      {/* Quick Actions & At-a-glance */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        <div className={`lg:col-span-2 ${glassCardClasses}`}>
          <h2 className={`${sectionTitleClasses} mb-4 border-none pb-0`}>Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button asChild className={`${primaryButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${subdomain}/people/students?page=1`}> 
                <Users className="mr-2 h-4 w-4" /> View Students
              </Link>
            </Button>
            <Button asChild className={`${primaryButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${subdomain}/people/teachers?page=1`}>
                <UserCog className="mr-2 h-4 w-4" /> View Teachers
              </Link>
            </Button>
            <Button asChild className={`${primaryButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${subdomain}/academics/timetable`}>
                <CalendarDays className="mr-2 h-4 w-4" /> View Timetable
              </Link>
            </Button>
            <Button asChild className={`${primaryButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${subdomain}/communication/announcements`}>
                <BellPlus className="mr-2 h-4 w-4" /> Send Announcement
              </Link>
            </Button>
            <Button asChild variant="outline" className={`${outlineButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${subdomain}/academics/rankings`}>
                <Trophy className="mr-2 h-4 w-4" /> Manage Rankings
              </Link>
            </Button>
            <Button asChild variant="outline" className={`${outlineButtonClasses} justify-start text-sm py-3`}>
              <Link href={`/${subdomain}/resources/library`}>
                <BookOpen className="mr-2 h-4 w-4" /> Library Overview
              </Link>
            </Button>
          </div>
        </div>

        <div className={glassCardClasses}>
          <h2 className={`${sectionTitleClasses} mb-4 border-none pb-0 flex items-center`}>
            <Megaphone className={`mr-2 h-5 w-5 ${descriptionTextClasses}`} /> Announcements
          </h2>
          {loadingAnnouncements ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (<Skeleton key={i} className="h-10 w-full" />))}
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {(!announcements?.length) && <li className="text-zinc-500">No announcements yet.</li>}
              {announcements?.map(a => (
                <li key={a.id} className="flex items-start justify-between gap-3 border rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{a.publishedAt ? new Date(a.publishedAt).toLocaleString() : 'Draft'}</p>
                  </div>
                  <Link href={`/${subdomain}/communication/announcements`} className="text-xs underline whitespace-nowrap">Open</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      
      {/* Finance, Library, Rankings */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className={`${glassCardClasses} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center"><DollarSign className={`mr-2 h-5 w-5 ${descriptionTextClasses}`} /> Finance (30 days)</h2>
          </div>
          <div className="h-72 w-full">
            {loadingAdminFinance ? (
              <Skeleton className="h-full w-full" />
            ) : (() => {
              const payments = adminFinance?.payments?.series || [];
              const expenses = adminFinance?.expenses?.series || [];
              if (!payments.length && !expenses.length) return <div className="h-full flex items-center justify-center text-sm text-zinc-500">No data for the last 30 days.</div>;
              const map = new Map();
              payments.forEach(p => map.set(p.date, { date: p.date, payments: p.total, expenses: 0 }));
              expenses.forEach(e => { if (map.has(e.date)) map.get(e.date).expenses = e.total; else map.set(e.date, { date: e.date, payments: 0, expenses: e.total }); });
              const data = Array.from(map.values()).sort((a,b)=>a.date.localeCompare(b.date));
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v=>Number(v).toLocaleString()} width={70} />
                    <Tooltip formatter={(v)=>Number(v).toLocaleString()} />
                    <Legend />
                    <Area type="monotone" dataKey="payments" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} name="Payments" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>
        <div className={glassCardClasses}>
          <h2 className={`${sectionTitleClasses} mb-4 border-none pb-0 flex items-center`}>
            <BookOpen className={`mr-2 h-5 w-5 ${descriptionTextClasses}`} /> Library Snapshot
          </h2>
          {loadingLibrary ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => (<Skeleton key={i} className="h-8 w-full" />))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-xs text-zinc-500 mb-1">Titles</div>
                <div className="text-lg font-semibold">{Number(libraryStats?.titles || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-zinc-500 mb-1">Available Copies</div>
                <div className="text-lg font-semibold">{Number(libraryStats?.available || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-zinc-500 mb-1">Borrowed</div>
                <div className="text-lg font-semibold">{Number(libraryStats?.borrowed || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-zinc-500 mb-1">Active Borrowers</div>
                <div className="text-lg font-semibold">{Number(libraryStats?.activeBorrowers || 0).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Rankings quick status */}
      <section className={`${glassCardClasses}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center"><Trophy className={`mr-2 h-5 w-5 ${descriptionTextClasses}`} /> Rankings Status</h2>
          <Link href={`/${subdomain}/academics/rankings`} className="text-xs underline">Open rankings</Link>
        </div>
        {loadingRankings ? (
          <Skeleton className="h-16 w-full" />
        ) : (!rankingsSummary.groups ? (
          <div className="text-sm text-zinc-500">No ranking snapshots yet.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-zinc-500 mb-1">Groups</div>
                <div className="text-lg font-semibold">{rankingsSummary.groups}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-zinc-500 mb-1">Snapshots</div>
                <div className="text-lg font-semibold">{Number(rankingsSummary.totalSnapshots).toLocaleString()}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-zinc-500 mb-1">Published</div>
                <div className="text-lg font-semibold">{Number(rankingsSummary.published).toLocaleString()}</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              {rankingsSummary.items.slice(0,5).map((it, idx) => (
                <li key={`${it.sectionId}|${it.termId}|${it.academicYearId}|${idx}`} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{it.section?.class?.name} {it.section?.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{it.academicYear?.name} · {it.term?.name}</p>
                  </div>
                  <div className="text-xs whitespace-nowrap">{it.publishedCount}/{it.totalSnapshots} published</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}