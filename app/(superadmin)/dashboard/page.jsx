// app/(superadmin)/dashboard/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import {
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePlus2, Users, School, Settings, AlertCircle, CheckCircle2, PieChart as PieChartIcon, Edit3, Eye } from "lucide-react"; // Added Edit3, Eye

// Recharts imports
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Helper: StatCard Component with Skeleton (remains the same) ---
const StatCard = ({ title, value, icon, description, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bw-glass-card p-5 min-h-[120px] flex flex-col justify-between">
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
    <div className="bw-glass-card p-1 min-h-[120px] flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium card-title-bw">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-2xl font-bold card-title-bw">{value !== undefined && value !== null ? value : '-'}</div>
        </CardContent>
      </div>
      {description && <p className="text-xs card-description-bw px-6 pb-4">{description}</p>}
    </div>
  );
};

// --- Main Dashboard Component ---
export default function SuperAdminDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState({
    totalSchools: 0, activeSchools: 0, inactiveSchools: 0, totalSchoolAdmins: 0,
  });
  const [recentSchools, setRecentSchools] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Tailwind class constants (as defined previously)
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;
  const titleTextClasses = "text-black dark:text-white";
  const pageTitleClasses = `text-3xl font-bold ${titleTextClasses}`;
  const sectionTitleClasses = `text-xl font-semibold ${titleTextClasses}`; // Simpler definition
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const iconButtonClasses = `${outlineButtonClasses} h-9 w-9 md:h-8 md:w-8`;

  useEffect(() => {
    const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(document.documentElement.classList.contains('dark') || (!('theme' in localStorage) && preferDark));
    const observer = new MutationObserver(() => { setIsDarkMode(document.documentElement.classList.contains('dark')); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsResponse, schoolsResponse] = await Promise.all([
        fetch('/api/superadmin/stats'),
        fetch('/api/superadmin/schools?limit=5&sortBy=createdAt&sortOrder=desc') // Fetch 5 recent schools
      ]);

      if (!statsResponse.ok) {
        const errData = await statsResponse.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch statistics (${statsResponse.status})`);
      }
      const fetchedStats = await statsResponse.json();
      setStats(fetchedStats);

      // Prepare chart data based on fetched stats
      if (fetchedStats && fetchedStats.activeSchools !== undefined && fetchedStats.inactiveSchools !== undefined) {
          setChartData([
            { name: 'Active', value: fetchedStats.activeSchools },
            { name: 'Inactive', value: fetchedStats.inactiveSchools },
          ]);
      } else {
          setChartData([]); // Set to empty or default if stats are not as expected
      }


      if (!schoolsResponse.ok) {
        const errData = await schoolsResponse.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch recent schools (${schoolsResponse.status})`);
      }
      const schoolsData = await schoolsResponse.json();
      setRecentSchools(schoolsData.schools || []);

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data", { description: error.message });
      // Keep existing or default data on error to avoid breaking UI
      setChartData([]); // Clear chart data on error
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array, fetchData will be called once by the effect below

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user?.role === 'SUPER_ADMIN') {
      fetchData();
    } else if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    } else if (sessionStatus === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/login?error=UnauthorizedRole');
    }
  }, [sessionStatus, session, router, fetchData]); // fetchData is now stable

  const PIE_COLORS_LIGHT = ['#222222', '#cccccc'];
  const PIE_COLORS_DARK = ['#eeeeee', '#555555'];

  if (sessionStatus === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><p className={`text-xl ${titleTextClasses}`}>Loading Session...</p></div>;
  }
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
     return <div className="flex items-center justify-center min-h-screen"><p className={`text-xl ${titleTextClasses}`}>Access Denied.</p></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <header className="mb-6">
        <h1 className={pageTitleClasses}>Super Admin Dashboard</h1>
        <p className={descriptionTextClasses}>System overview and management tools.</p>
      </header>

      {/* Stats Cards Section */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Schools" value={isLoading ? undefined : stats.totalSchools} icon={<School className={`h-5 w-5 ${descriptionTextClasses}`} />} isLoading={isLoading} />
        <StatCard title="Active Schools" value={isLoading ? undefined : stats.activeSchools} icon={<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />} description={!isLoading && stats.totalSchools > 0 ? `${((stats.activeSchools / stats.totalSchools) * 100).toFixed(0)}% of total` : undefined} isLoading={isLoading} />
        <StatCard title="Inactive Schools" value={isLoading ? undefined : stats.inactiveSchools} icon={<AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500" />} isLoading={isLoading} />
        <StatCard title="School Admins" value={isLoading ? undefined : stats.totalSchoolAdmins} icon={<Users className={`h-5 w-5 ${descriptionTextClasses}`} />} isLoading={isLoading} />
      </section>

      {/* Main Content Row: Charts and Quick Actions Horizontally */}
      <section className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left Column: Charts Section */}
        <div className="lg:w-2/3">
          <div className={`${glassCardClasses} h-full`}> {/* Ensure card takes full height of its column */}
            <CardHeader>
              <CardTitle className={`${sectionTitleClasses} flex items-center border-none pb-0 mb-0`}><PieChartIcon className={`mr-2 h-5 w-5 ${descriptionTextClasses}`}/>Schools Status</CardTitle>
              <CardDescription className={descriptionTextClasses}>Distribution of active vs. inactive schools.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] md:h-[350px] pt-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="w-48 h-48 md:w-56 md:h-56 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={Math.min(110, window.innerHeight / 7, window.innerWidth / 12)} // Adjusted outerRadius
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={(isDarkMode ? PIE_COLORS_DARK : PIE_COLORS_LIGHT)[index % (isDarkMode ? PIE_COLORS_DARK.length : PIE_COLORS_LIGHT.length)]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: isDarkMode ? 'rgba(10,10,10,0.85)' : 'rgba(250,250,250,0.85)',
                        borderColor: isDarkMode ? 'rgba(200,200,200,0.2)' : 'rgba(50,50,50,0.2)',
                        color: isDarkMode ? '#fff' : '#000',
                        borderRadius: '0.5rem'
                      }}
                    />
                    <Legend wrapperStyle={{ color: isDarkMode ? '#fff' : '#000', paddingTop: '10px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className={`flex items-center justify-center h-full ${descriptionTextClasses}`}>No data available for chart.</div>
              )}
            </CardContent>
          </div>
        </div>

        {/* Right Column: Quick Actions Section */}
        <div className="lg:w-1/3">
          <div className={`${glassCardClasses} h-full flex flex-col`}>
              <CardHeader>
                  <CardTitle className={`${sectionTitleClasses} border-none pb-0 mb-0`}>Quick Actions</CardTitle>
                  <CardDescription className={descriptionTextClasses}>Common administrative tasks.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 flex-grow justify-center pt-4">
              <Link href="/schools/create" passHref className="w-full">
                  <Button className={`${primaryButtonClasses} w-full justify-start text-sm py-3`}>
                  <FilePlus2 className="mr-2 h-4 w-4" /> Create New School
                  </Button>
              </Link>
              <Link href="/schools" passHref className="w-full">
                  <Button variant="outline" className={`${outlineButtonClasses} w-full justify-start text-sm py-3`}>
                  <School className="mr-2 h-4 w-4" /> View All Schools
                  </Button>
              </Link>
              {/* <Button variant="outline" className={`${outlineButtonClasses} w-full justify-start text-sm py-3`}>
                  <Settings className="mr-2 h-4 w-4" /> System Settings
              </Button> */}
              </CardContent>
          </div>
        </div>
      </section>

      {/* Recent Schools Table Section (Full Width) */}
      <section>
        <div className={glassCardClasses}>
          <CardHeader>
            <CardTitle className={`${sectionTitleClasses} border-none pb-0 mb-0`}>Recent Schools</CardTitle>
            <CardDescription className={descriptionTextClasses}>
              Newly added or recently updated schools.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200/80 dark:border-zinc-700/80 hover:bg-transparent dark:hover:bg-transparent">
                  <TableHead className={`${titleTextClasses} font-semibold whitespace-nowrap`}>School Name</TableHead>
                  <TableHead className={`${titleTextClasses} font-semibold hidden md:table-cell whitespace-nowrap`}>Subdomain</TableHead>
                  <TableHead className={`${titleTextClasses} font-semibold whitespace-nowrap`}>Status</TableHead>
                  <TableHead className={`${titleTextClasses} font-semibold hidden sm:table-cell whitespace-nowrap`}>Created</TableHead>
                  <TableHead className={`text-right ${titleTextClasses} font-semibold whitespace-nowrap`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => ( // Show 3 skeleton rows for recent schools
                    <TableRow key={`skeleton-recent-${index}`} className="border-zinc-200/50 dark:border-zinc-800/50">
                      <TableCell><Skeleton className="h-5 w-32 md:w-40 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 md:w-32 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 bg-zinc-300 dark:bg-zinc-700 rounded-full" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 bg-zinc-300 dark:bg-zinc-700 rounded" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Skeleton className={`${iconButtonClasses} bg-zinc-300 dark:bg-zinc-700`} />
                          <Skeleton className={`${iconButtonClasses} bg-zinc-300 dark:bg-zinc-700`} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : recentSchools.length > 0 ? recentSchools.map((school) => (
                  <TableRow key={school.id} className="border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-500/5 dark:hover:bg-white/5">
                    <TableCell className={`font-medium ${descriptionTextClasses}`}>{school.name}</TableCell>
                    <TableCell className={`${descriptionTextClasses} hidden md:table-cell`}>{school.subdomain}</TableCell>
                    <TableCell>
                       <Badge variant={school.isActive ? "default" : "destructive"}
                       className={`text-xs ${school.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-200 border border-green-300 dark:border-green-700' : 'bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-200 border border-red-300 dark:border-red-700'}`}>
                        {school.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className={`${descriptionTextClasses} hidden sm:table-cell`}>
                      {new Date(school.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 md:gap-2">
                        <Link href={`/schools/${school.id}/edit`} passHref>
                          <Button variant="outline" size="icon" className={iconButtonClasses} title="Edit School"> <Edit3 className="h-4 w-4" /> </Button>
                        </Link>
                        <Link href={`/schools/${school.id}`} passHref>
                          <Button variant="outline" size="icon" className={iconButtonClasses} title="View Details"> <Eye className="h-4 w-4" /> </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow className="border-zinc-200/50 dark:border-zinc-800/50">
                    <TableCell colSpan="5" className={`text-center py-10 ${descriptionTextClasses}`}>
                      No recent schools to display.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </div>
      </section>
    </div>
  );
}