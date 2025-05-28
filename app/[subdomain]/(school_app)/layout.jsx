// app/[subdomain]/(school_app)/layout.jsx
'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { useSession, signOut } from 'next-auth/react';
import { Toaster, toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sun, Moon, LayoutDashboard, Users, BookOpen, LogOut, Menu, X as CloseIcon, AlertTriangle } from 'lucide-react'; // Added Menu, CloseIcon
import { useTheme } from 'next-themes';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const SchoolContext = createContext(null);
export const useSchool = () => useContext(SchoolContext);

function SchoolHeader({ schoolName, schoolLogo, onToggleSidebar }) {
  const { setTheme, theme } = useTheme();
  const { data: session } = useSession();
  const params = useParams(); // Get subdomain for logout redirect

  const titleTextClasses = "text-black dark:text-white";
  const outlineButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={onToggleSidebar}>
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className={`text-lg sm:text-xl font-semibold ${titleTextClasses} truncate`}>{schoolName || 'School Portal'}</h1>
      </div>
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className={`${outlineButtonClasses} h-9 w-9`}
            aria-label="Toggle theme"
          >
          <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: `/${params.subdomain}/login` })} className={outlineButtonClasses}>
          <LogOut className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}

function SchoolSidebar({ schoolSubdomain, schoolName, isOpen, onClose }) {
  const currentPathname = usePathname(); // For active link highlighting
  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-700 dark:text-zinc-400";
  const activeLinkClasses = "bg-zinc-100 dark:bg-zinc-800 text-sky-600 dark:text-sky-400 font-semibold";
  const linkClasses = `flex items-center p-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 ${descriptionTextClasses} group transition-colors duration-150`;
  
  const navItems = [
    { href: `/${schoolSubdomain}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `/${schoolSubdomain}/students`, label: 'Students', icon: Users },
    { href: `/${schoolSubdomain}/academics`, label: 'Academics', icon: BookOpen },
    // Add more school admin links (e.g., Teachers, Classes, Timetable, Finance)
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 z-10 bg-black/30 md:hidden" onClick={onClose}></div>}
      
      <aside className={`fixed left-0 top-0 z-20 h-screen w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between h-16 border-b border-zinc-200 dark:border-zinc-800 px-4">
          <Link href={`/${schoolSubdomain}/dashboard`} className="flex items-center" onClick={onClose}>
            {/* Add school logo here if available: schoolData.logoUrl */}
            <h2 className={`text-xl font-bold ${titleTextClasses} truncate`}>{schoolName || 'Sukuu School'}</h2>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
            <CloseIcon className="h-6 w-6" />
          </Button>
        </div>
        <nav className="p-4 space-y-1.5">
          {navItems.map(item => {
            const isActive = currentPathname === item.href || (item.href !== `/${schoolSubdomain}/dashboard` && currentPathname.startsWith(item.href + '/'));
            return (
              <Link key={item.href} href={item.href}
                className={`${linkClasses} ${isActive ? activeLinkClasses : ''}`} onClick={onClose}>
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-sky-600 dark:text-sky-500' : 'text-zinc-500 dark:text-zinc-400'} group-hover:text-black dark:group-hover:text-white transition-colors duration-150`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default function SchoolAppLayout({ children }) {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [schoolData, setSchoolData] = useState(null);
  const [isLoadingSchoolData, setIsLoadingSchoolData] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile sidebar

  const subdomain = params.subdomain;

  useEffect(() => {
    async function validateSubdomainAndFetchSchool() {
      if (!subdomain) {
        setAuthError("Subdomain parameter is missing."); setIsLoadingSchoolData(false); return;
      }
      try {
        const response = await fetch(`/api/schools/by-subdomain/${subdomain}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Invalid school domain or school not found.");
        }
        const data = await response.json();
        if (data.school && data.school.isActive) {
          setSchoolData(data.school);
        } else {
          throw new Error(data.school && !data.school.isActive ? "This school is currently inactive." : "School not found.");
        }
      } catch (err) {
        console.error("Subdomain validation error:", err); setAuthError(err.message); toast.error(err.message);
      } finally {
        setIsLoadingSchoolData(false);
      }
    }
    if (subdomain) { // Only fetch if subdomain param is present
        validateSubdomainAndFetchSchool();
    } else {
        setIsLoadingSchoolData(false);
        setAuthError("Unable to determine school from URL.");
    }
  }, [subdomain]);

  useEffect(() => {
    if (isLoadingSchoolData || sessionStatus === 'loading') return;

    if (sessionStatus === 'unauthenticated') {
      router.push(`/${subdomain}/login`); return;
    }

    if (sessionStatus === 'authenticated') {
      if (!schoolData || session.user?.schoolId !== schoolData.id || 
          (session.user?.role !== 'SCHOOL_ADMIN' /* && add other valid tenant roles */) ) {
        setAuthError("Access denied. You are not authorized for this school.");
        toast.error("Access Denied. Please log in with appropriate credentials.");
        signOut({ redirect: false }).then(() => {
          router.push(`/${subdomain}/login?error=UnauthorizedSchool`);
        });
      } else {
         setAuthError(null);
      }
    }
  }, [sessionStatus, session, schoolData, isLoadingSchoolData, subdomain, router]);
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Loading state for the entire page shell
  if (isLoadingSchoolData || sessionStatus === 'loading') {
    return (
      <div className="flex flex-col h-screen">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <Skeleton className="h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-8 rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <Skeleton className="h-8 w-20 rounded-md bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-64 border-r p-4 space-y-3 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hidden md:block">
            <Skeleton className="h-8 w-3/4 mb-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full bg-zinc-200 dark:bg-zinc-800 rounded-md" />)}
          </aside>
          <main className="flex-1 p-6 overflow-y-auto pt-6 md:ml-64 bg-zinc-50 dark:bg-zinc-900">
            <Skeleton className="h-32 w-full rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <Skeleton className="h-64 w-full mt-6 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          </main>
        </div>
        <Toaster richColors theme="system" closeButton position="top-right" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-zinc-100 dark:bg-zinc-950">
        <Alert variant="destructive" className="max-w-md bg-white dark:bg-zinc-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-red-700 dark:text-red-400">Access Issue</AlertTitle>
          <AlertDescription className="text-red-600 dark:text-red-300">{authError}</AlertDescription>
        </Alert>
        {subdomain && <Button onClick={() => router.push(`/${subdomain}/login`)} className="mt-6">Go to Login</Button>}
        <Toaster richColors theme="system" closeButton position="top-right" />
      </div>
    );
  }
  
  if (schoolData && session && session.user.schoolId === schoolData.id) {
    return (
      <SchoolContext.Provider value={schoolData}>
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
          <SchoolSidebar schoolSubdomain={subdomain} schoolName={schoolData.name} isOpen={isSidebarOpen} onClose={toggleSidebar} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <SchoolHeader schoolName={schoolData.name} schoolLogo={schoolData.logoUrl} onToggleSidebar={toggleSidebar} />
            <main className="flex-1 overflow-y-auto pt-16 md:ml-64 p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
        <Toaster richColors theme="system" closeButton position="top-right" />
      </SchoolContext.Provider>
    );
  }

  return <div className="flex items-center justify-center min-h-screen"><p className="text-black dark:text-white">An unexpected issue occurred. Please try refreshing.</p><Toaster /></div>;
}