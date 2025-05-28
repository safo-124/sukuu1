// app/(superadmin)/dashboard/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import {
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription // Added for consistency if needed
} from "@/components/ui/card"; // Note: We use divs with bw-glass-card for actual cards
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePlus2, Users, School, Settings, AlertCircle, CheckCircle2, PieChart as PieChartIcon } from "lucide-react";

// Recharts imports
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Helper: StatCard Component with Skeleton ---
const StatCard = ({ title, value, icon, description, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bw-glass-card p-5 min-h-[120px] flex flex-col justify-between"> {/* Added min-height */}
        <div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
            <Skeleton className="h-5 w-3/4 bg-gray-300 dark:bg-gray-700" />
            <Skeleton className="h-6 w-6 bg-gray-300 dark:bg-gray-700 rounded-sm" />
          </CardHeader>
          <CardContent className="p-0 pt-1"> {/* Adjusted padding */}
            <Skeleton className="h-8 w-1/2 mb-1 bg-gray-400 dark:bg-gray-600" />
          </CardContent>
        </div>
        <Skeleton className="h-4 w-full bg-gray-300 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="bw-glass-card p-1 min-h-[120px] flex flex-col justify-between"> {/* Added min-height */}
      <div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium card-title-bw">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent className="pb-2"> {/* Adjusted padding */}
          <div className="text-2xl font-bold card-title-bw">{value}</div>
        </CardContent>
      </div>
      {description && <p className="text-xs card-description-bw px-6 pb-4">{description}</p>}
    </div>
  );
};

// --- Main Dashboard Component ---
export default function SuperAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState({
    totalSchools: 0, activeSchools: 0, inactiveSchools: 0, totalSchoolAdmins: 0,
  });
  const [recentSchools, setRecentSchools] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Determine dark mode on client
    const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(document.documentElement.classList.contains('dark') || (!('theme' in localStorage) && preferDark));
    
    const observer = new MutationObserver(() => {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);


  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session.user?.role !== 'SUPER_ADMIN') {
      router.push('/login?error=UnauthorizedRole');
    }

    if (status === 'authenticated' && session.user?.role === 'SUPER_ADMIN') {
      const fetchData = async () => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
          const fetchedStats = {
            totalSchools: 12, activeSchools: 10, inactiveSchools: 2, totalSchoolAdmins: 15,
          };
          const fetchedRecentSchools = [
            { id: '1', name: 'Prestige International', subdomain: 'prestige', isActive: true, createdAt: new Date(Date.now() - 100000000).toISOString() },
            { id: '2', name: 'Future Leaders Academy', subdomain: 'future', isActive: true, createdAt: new Date(Date.now() - 200000000).toISOString() },
            { id: '3', name: 'Innovate High', subdomain: 'innovate', isActive: false, createdAt: new Date(Date.now() - 300000000).toISOString() },
            { id: '4', name: 'Global Scholars', subdomain: 'global', isActive: true, createdAt: new Date(Date.now() - 400000000).toISOString() },
          ];

          setStats(fetchedStats);
          setRecentSchools(fetchedRecentSchools);
          setChartData([
            { name: 'Active', value: fetchedStats.activeSchools },
            { name: 'Inactive', value: fetchedStats.inactiveSchools },
          ]);

        } catch (error) {
          console.error("Failed to fetch dashboard data:", error);
        }
        setIsLoading(false);
      };
      fetchData();
    }
  }, [session, status, router]);

  const PIE_COLORS_LIGHT = ['#222222', '#bbbbbb']; // Near Black, Light Gray
  const PIE_COLORS_DARK = ['#eeeeee', '#555555'];  // Near White, Dark Gray

  if (status === 'loading' || (!session && status !== "unauthenticated")) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-xl card-title-bw">Loading Session...</p></div>;
  }
  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-xl card-title-bw">Access Denied.</p></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold card-title-bw">Super Admin Dashboard</h1>
        <p className="card-description-bw">System overview and management tools.</p>
      </header>

      {/* Stats Cards Section */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Schools" value={stats.totalSchools} icon={<School className="h-5 w-5 card-description-bw" />} isLoading={isLoading} />
        <StatCard title="Active Schools" value={stats.activeSchools} icon={<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />} description={`${((stats.activeSchools / (stats.totalSchools || 1)) * 100).toFixed(0)}% of total`} isLoading={isLoading} />
        <StatCard title="Inactive Schools" value={stats.inactiveSchools} icon={<AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500" />} isLoading={isLoading} />
        <StatCard title="School Admins" value={stats.totalSchoolAdmins} icon={<Users className="h-5 w-5 card-description-bw" />} isLoading={isLoading} />
      </section>

      {/* Main Content Row: Charts and Quick Actions Horizontally */}
      <section className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left Column: Charts Section */}
        <div className="lg:w-2/3">
          <div className="bw-glass-card p-1 h-full">
            <CardHeader>
              <CardTitle className="card-title-bw flex items-center"><PieChartIcon className="mr-2 h-5 w-5 card-description-bw"/>Schools Status</CardTitle>
              <CardDescription className="card-description-bw">Distribution of active vs. inactive schools.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] md:h-[350px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="w-48 h-48 md:w-56 md:h-56 rounded-full bg-gray-300 dark:bg-gray-700" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={Math.min(120, window.innerHeight / 6, window.innerWidth / 10)}
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
              )}
            </CardContent>
          </div>
        </div>

        {/* Right Column: Quick Actions Section */}
        <div className="lg:w-1/3">
          <div className="bw-glass-card p-1 h-full flex flex-col">
              <CardHeader>
                  <CardTitle className="card-title-bw">Quick Actions</CardTitle>
                  <CardDescription className="card-description-bw">Common administrative tasks.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 flex-grow justify-center">
              <Link href="/(superadmin)/schools/create" passHref className="w-full">
                  <Button className="button-primary-bw w-full justify-start">
                  <FilePlus2 className="mr-2 h-4 w-4" /> Create New School
                  </Button>
              </Link>
              <Link href="/(superadmin)/schools" passHref className="w-full">
                  <Button variant="outline" className="dark:text-white dark:border-gray-700 hover:dark:border-white text-black border-gray-300 hover:border-black w-full justify-start">
                  <School className="mr-2 h-4 w-4" /> View All Schools
                  </Button>
              </Link>
              {/* <Button variant="outline" className="dark:text-white dark:border-gray-700 hover:dark:border-white text-black border-gray-300 hover:border-black w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" /> System Settings
              </Button> */}
              </CardContent>
          </div>
        </div>
      </section>

      {/* Recent Schools Table Section (Full Width) */}
      <section>
        <div className="bw-glass-card p-1">
          <CardHeader>
            <CardTitle className="card-title-bw">Recent Schools</CardTitle>
            <CardDescription className="card-description-bw">
              Newly added or recently updated schools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="dark:border-gray-700 hover:dark:bg-gray-800/50 hover:bg-gray-200/50">
                  <TableHead className="card-title-bw w-[30%]">School Name</TableHead>
                  <TableHead className="card-title-bw w-[20%]">Subdomain</TableHead>
                  <TableHead className="card-title-bw w-[15%]">Status</TableHead>
                  <TableHead className="card-title-bw w-[20%]">Created At</TableHead>
                  <TableHead className="text-right card-title-bw w-[15%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => ( // Show 4 skeleton rows to match dummy data
                    <TableRow key={`skeleton-${index}`} className="dark:border-gray-700">
                      <TableCell><Skeleton className="h-5 w-full bg-gray-300 dark:bg-gray-700 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full bg-gray-300 dark:bg-gray-700 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full bg-gray-300 dark:bg-gray-700 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full bg-gray-300 dark:bg-gray-700 rounded" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-full bg-gray-300 dark:bg-gray-700 rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : recentSchools.length > 0 ? recentSchools.map((school) => (
                  <TableRow key={school.id} className="dark:border-gray-700 hover:dark:bg-gray-800/30 hover:bg-gray-200/30">
                    <TableCell className="font-medium card-description-bw">{school.name}</TableCell>
                    <TableCell className="card-description-bw">{school.subdomain}</TableCell>
                    <TableCell>
                      <Badge variant={school.isActive ? "default" : "destructive"}
                       className={`${school.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-200 border border-green-300 dark:border-green-700' : 'bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-200 border border-red-300 dark:border-red-700'}`}>
                        {school.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="card-description-bw">
                      {new Date(school.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/(superadmin)/schools/${school.id}/edit`} passHref> {/* Update this link based on your actual routing */}
                        <Button variant="outline" size="sm" className="dark:text-white dark:border-gray-700 hover:dark:border-white text-black border-gray-300 hover:border-black">
                          Manage
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan="5" className="text-center card-description-bw py-10">
                      No recent schools found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </div>
      </section>
    </div>
  );
}