// app/(superadmin)/dashboard/page.jsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart3, 
  Users, 
  School, 
  TrendingUp, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  Eye,
  Plus,
  ArrowUpRight,
  Activity,
  Globe,
  Calendar,
  Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

// Modern StatCard Component
const StatCard = ({ title, value, icon: Icon, description, trend, isLoading, color = "purple" }) => {
  const colorClasses = {
    purple: {
      bg: 'from-purple-500/10 to-purple-600/10',
      border: 'border-purple-500/20',
      icon: 'bg-purple-500 text-white',
      trend: 'text-purple-600 dark:text-purple-400'
    },
    blue: {
      bg: 'from-blue-500/10 to-blue-600/10',
      border: 'border-blue-500/20',
      icon: 'bg-blue-500 text-white',
      trend: 'text-blue-600 dark:text-blue-400'
    },
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-600/10',
      border: 'border-emerald-500/20',
      icon: 'bg-emerald-500 text-white',
      trend: 'text-emerald-600 dark:text-emerald-400'
    },
    orange: {
      bg: 'from-orange-500/10 to-orange-600/10',
      border: 'border-orange-500/20',
      icon: 'bg-orange-500 text-white',
      trend: 'text-orange-600 dark:text-orange-400'
    }
  };

  const classes = colorClasses[color];

  if (isLoading) {
    return (
      <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <Skeleton className="h-8 w-24 mb-2 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>
    );
  }

  return (
    <div className={`backdrop-blur-xl bg-gradient-to-br ${classes.bg} border ${classes.border} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`flex items-center justify-center w-12 h-12 ${classes.icon} rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-200`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 ${classes.trend} text-sm font-medium`}>
            <TrendingUp className="w-4 h-4" />
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {title}
        </div>
        {description && (
          <div className="text-xs text-gray-500 dark:text-gray-500">
            {description}
          </div>
        )}
      </div>
    </div>
  );
};

// Activity Item Component
const ActivityItem = ({ icon: Icon, title, description, time, status }) => {
  const statusColors = {
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-orange-600 dark:text-orange-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors group">
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${statusColors[status]} bg-current bg-opacity-10`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
          {title}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {description}
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-500">
        {time}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [schools, setSchools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'monthlyAmount', direction: 'desc' });

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const sortedRows = useMemo(() => {
    if (!stats?.perSchoolMonthly) return [];
    const rows = [...stats.perSchoolMonthly];
    const { key, direction } = sortConfig;
    rows.sort((a,b) => {
      const av = a[key] ?? 0;
      const bv = b[key] ?? 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        return direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return direction === 'asc' ? av - bv : bv - av;
    });
    return rows;
  }, [stats, sortConfig]);

  useEffect(() => {
    if (session && session.user?.role !== 'SUPER_ADMIN') {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, schoolsRes] = await Promise.all([
          fetch('/api/superadmin/stats'),
          fetch('/api/superadmin/schools?limit=5&sortBy=createdAt&sortOrder=desc')
        ]);

        const [statsData, schoolsData] = await Promise.all([
          statsRes.json(),
          schoolsRes.json()
        ]);

        setStats(statsData);
        setSchools(schoolsData.schools || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.role === 'SUPER_ADMIN') {
      fetchData();
    }
  }, [session, router]);

  const recentActivity = [
    { 
      icon: School, 
      title: 'New School Registration', 
      description: 'Greenwood Academy submitted application', 
      time: '2 min ago', 
      status: 'info' 
    },
    { 
      icon: CheckCircle2, 
      title: 'Payment Processed', 
      description: 'Monthly subscription for Lincoln High', 
      time: '15 min ago', 
      status: 'success' 
    },
    { 
      icon: Users, 
      title: 'User Account Created', 
      description: 'New admin user for Valley School', 
      time: '1 hour ago', 
      status: 'info' 
    },
    { 
      icon: AlertTriangle, 
      title: 'System Alert', 
      description: 'High API usage detected', 
      time: '2 hours ago', 
      status: 'warning' 
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'Admin'}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's what's happening with your platform today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Reports
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add School
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Schools"
          value={isLoading ? "..." : stats?.totalSchools || "0"}
          icon={School}
          description="Active institutions"
          trend="+12%"
          isLoading={isLoading}
          color="purple"
        />
        <StatCard
          title="Total Users"
          value={isLoading ? "..." : stats?.totalUsers || "0"}
          icon={Users}
          description="Platform users"
          trend="+8%"
          isLoading={isLoading}
          color="blue"
        />
        <StatCard
          title="Monthly Revenue"
          value={isLoading ? "..." : `GHS ${ (stats?.monthlyRevenue ?? 0).toLocaleString(undefined,{ minimumFractionDigits:2, maximumFractionDigits:2 }) }`}
          icon={CreditCard}
          description="Est. from quarterly usage"
          trend={stats?.monthlyRevenue ? '+23%' : undefined}
          isLoading={isLoading}
          color="emerald"
        />
        <StatCard
          title="System Health"
          value="99.9%"
          icon={Activity}
          description="Uptime status"
          trend="Excellent"
          isLoading={isLoading}
          color="orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Schools */}
        <div className="lg:col-span-2">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Schools
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Latest registered institutions
                </p>
              </div>
              <Link href="/schools">
                <Button variant="ghost" size="sm" className="rounded-xl">
                  View All
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 rounded" />
                        <Skeleton className="h-3 w-1/2 rounded" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : schools.length > 0 ? (
                <div className="space-y-4">
                  {schools.map((school) => (
                    <div key={school.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors group">
                      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold">
                        {school.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {school.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <Globe className="w-3 h-3" />
                          {school.subdomain}.sukuu.com
                        </div>
                      </div>
                      <Badge 
                        variant={school.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className="rounded-full"
                      >
                        {school.status}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="rounded-lg" title="View">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                          title="Delete school"
                          onClick={() => setDeleteTarget({ id: school.id, name: school.name })}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <School className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No schools registered yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Monthly Contributors (Per-School Monthly Breakdown) */}
          <div className="mt-8 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Monthly Contributors</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Prorated monthly revenue derived from current quarter usage</p>
              </div>
              <div className="flex items-center gap-4">
                {stats?.perSchoolMonthly?.length ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{stats.perSchoolMonthly.length} schools</span>
                ) : null}
                <Link href="/superadmin/billing" className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline">Billing / Usage →</Link>
              </div>
            </div>
            <div className="p-6 overflow-x-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_,i)=> <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : stats?.perSchoolMonthly?.length ? (
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500 dark:text-gray-400 select-none">
                    <tr>
                      {[
                        ['rank', '#'],
                        ['schoolName', 'School'],
                        ['studentCount', 'Students'],
                        ['parentCount', 'Parents'],
                        ['monthlyAmount', 'Monthly'],
                        ['monthlyPercent', '% of Total'],
                        ['quarterAmount', 'Quarter']
                      ].map(([key, label]) => (
                        <th
                          key={key}
                          onClick={() => key !== 'rank' && handleSort(key)}
                          className={`py-2 pr-4 ${key !== 'rank' ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors' : ''} ${['studentCount','parentCount','monthlyAmount','monthlyPercent','quarterAmount'].includes(key) ? 'text-right' : ''}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {label}
                            {sortConfig.key === key && (
                              <span className="text-[10px] font-medium">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.slice(0,10).map((row, idx) => {
                      const rank = idx + 1;
                      const highlight = rank <= 3;
                      return (
                        <tr key={row.schoolId} className={`border-t border-gray-100 dark:border-gray-800 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors ${highlight ? 'bg-gradient-to-r from-amber-50/60 to-transparent dark:from-amber-500/5' : ''}`}> 
                          <td className="py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">
                            {highlight ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold shadow">{rank}</span>
                            ) : rank}
                          </td>
                          <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            {row.schoolName}
                            {row.overFreeTier && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">Over</span>
                            )}
                            {row.upgradeRequired && !row.overFreeTier && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">Action</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">{row.studentCount}</td>
                          <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">{row.parentCount}</td>
                          <td className="py-2 pr-4 text-right font-semibold text-gray-900 dark:text-white">GHS {row.monthlyAmount.toFixed(2)}</td>
                          <td className="py-2 pr-4 text-right text-gray-700 dark:text-gray-300">{row.monthlyPercent != null ? row.monthlyPercent.toFixed(2) + '%' : '—'}</td>
                          <td className="py-2 pr-4 text-right text-gray-600 dark:text-gray-400">GHS {row.quarterAmount.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No usage snapshots yet.</div>
              )}
            </div>
            <div className="px-6 pb-4 text-xs text-gray-500 dark:text-gray-500 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" /> Figures are approximate until invoices are generated (quarterly).
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Activity
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Latest platform events
                </p>
              </div>
            </div>
            <div className="p-3">
              <div className="space-y-1">
                {recentActivity.map((activity, index) => (
                  <ActivityItem key={index} {...activity} />
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl shadow-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <Link href="/schools/create">
                <Button variant="ghost" className="w-full justify-start rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20">
                  <Plus className="w-4 h-4 mr-3" />
                  Add New School
                </Button>
              </Link>
              <Link href="/users">
                <Button variant="ghost" className="w-full justify-start rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20">
                  <Users className="w-4 h-4 mr-3" />
                  Manage Users
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" className="w-full justify-start rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                  <BarChart3 className="w-4 h-4 mr-3" />
                  View Analytics
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Delete confirmation dialog
{deleteTarget && (
  <AlertDialog open={!!deleteTarget} onOpenChange={(open)=> !open && !isDeleting && setDeleteTarget(null)}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete “{deleteTarget.name}” permanently?</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently remove the school and all cascading related data. Restricted relations will block the delete unless force is applied.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={isDeleting}
          className="bg-red-600 hover:bg-red-700"
          onClick={async()=>{
            setIsDeleting(true);
            try {
              const res = await fetch(`/api/superadmin/schools/${deleteTarget.id}?force=1`, { method: 'DELETE' });
              if(!res.ok){
                const data = await res.json().catch(()=>({}));
                alert(`Delete failed: ${data.error || res.status}`);
              } else {
                // Refresh lists
                setSchools(prev => prev.filter(s=> s.id !== deleteTarget.id));
                // Refresh stats silently
                fetch('/api/superadmin/stats').then(r=>r.json()).then(d=> setStats(d)).catch(()=>{});
              }
            } finally {
              setIsDeleting(false);
              setDeleteTarget(null);
            }
          }}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}