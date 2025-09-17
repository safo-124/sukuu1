// app/[subdomain]/(school_app)/layout.jsx
'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Toaster, toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Sun, Moon, LayoutDashboard, Users, UserCog, BookOpen, LogOut, Menu, X as CloseIcon, Settings, GraduationCap, CalendarDays, Building, Library, Bus, ClipboardList, Briefcase, CheckSquare, DollarSign, FileText, Percent, BookCopy, Newspaper, Home, // Common icons
  AlertTriangle, Store, Layers, PieChart, Receipt // Added Receipt icon for Payroll
} from 'lucide-react'; // Ensure all used Lucide icons are imported
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Create a context to hold school data
const SchoolContext = createContext(null);
export const useSchool = () => useContext(SchoolContext);

// --- SchoolHeader Component ---
function SchoolHeader({ schoolName, schoolLogoUrl, onToggleSidebar, userSession }) {
  const { setTheme, theme } = useTheme();
  const params = useParams();

  const titleTextClasses = "text-zinc-900 dark:text-zinc-50";
  const outlineButtonClasses = "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

  const getInitials = (name) => {
    if (!name || name.trim() === "") return schoolName ? schoolName.substring(0,1).toUpperCase() : 'S';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="md:hidden mr-2 text-zinc-700 dark:text-zinc-300" onClick={onToggleSidebar}>
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
        <div className="flex items-center gap-2">
            {schoolLogoUrl ? (
                <Avatar className="h-8 w-8 hidden sm:flex border border-zinc-200 dark:border-zinc-700">
                    <AvatarImage src={schoolLogoUrl} alt={schoolName || 'School Logo'} />
                    <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-xs">
                        {getInitials(schoolName)}
                    </AvatarFallback>
                </Avatar>
            ) : null}
            <h1 className={`text-lg sm:text-xl font-semibold ${titleTextClasses} truncate`}>{schoolName || 'School Portal'}</h1>
        </div>
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
        {userSession?.user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const role = userSession?.user?.role;
                const to = role === 'TEACHER' ? `/${params.subdomain}/teacher-login` : `/${params.subdomain}/login`;
                signOut({ callbackUrl: to });
              }}
              className={`${outlineButtonClasses} px-2 sm:px-3`}
            >
              <LogOut className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
            </Button>
        )}
      </div>
    </header>
  );
}

// --- SchoolSidebar Component ---
function SchoolSidebar({ schoolSubdomain, schoolName, schoolLogoUrl, isOpen, onClose, userRole }) {
  const currentPathname = usePathname();
  const titleTextClasses = "text-zinc-900 dark:text-zinc-50";
  const linkLabelTextClasses = "text-zinc-700 dark:text-zinc-300";
  const activeLinkClasses = "bg-zinc-100 dark:bg-zinc-800 text-sky-600 dark:text-sky-500 font-semibold";
  const linkClassesBase = `flex items-center p-2.5 rounded-lg group transition-colors duration-150`;
  const hoverClasses = "hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white";

  const getInitials = (name) => {
    if (!name || name.trim() === "") return 'S';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
  };

  // Define navigation items based on user role
  const getNavigationSections = (role) => {
    const commonItems = [
      { href: `/${schoolSubdomain}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    ];

    const academicItems = [
      { href: `/${schoolSubdomain}/academics/school-levels`, label: 'School Levels', icon: Layers },
      { href: `/${schoolSubdomain}/academics/departments`, label: 'Departments', icon: Briefcase },
      { href: `/${schoolSubdomain}/academics/classes`, label: 'Classes & Sections', icon: Building },
      { href: `/${schoolSubdomain}/academics/subjects`, label: 'Subjects', icon: BookOpen },
      { href: `/${schoolSubdomain}/academics/timetable`, label: 'Timetable', icon: CalendarDays },
      { href: `/${schoolSubdomain}/academics/examinations`, label: 'Examinations', icon: GraduationCap },
      { href: `/${schoolSubdomain}/academics/grades`, label: 'Grades', icon: Percent },
    ];

    const peopleItems = [
      { href: `/${schoolSubdomain}/people/students`, label: 'Manage Students', icon: Users },
      { href: `/${schoolSubdomain}/people/teachers`, label: 'Manage Teachers', icon: UserCog },
    ];

    const attendanceItems = [
      { href: `/${schoolSubdomain}/attendance/students`, label: 'Student Attendance', icon: CheckSquare },
      { href: `/${schoolSubdomain}/attendance/staff`, label: 'Staff Attendance', icon: ClipboardList },
    ];

    // NEW: HR Items
    const hrItems = [
        { href: `/${schoolSubdomain}/hr/payroll`, label: 'Payroll', icon: Receipt },
        // Add more HR items here (e.g., Leave Management)
    ];

    const financeItems = [
        { href: `/${schoolSubdomain}/finance/overview`, label: 'Financial Overview', icon: PieChart },
        { href: `/${schoolSubdomain}/finance/fee-structures`, label: 'Fee Structures', icon: FileText },
        { href: `/${schoolSubdomain}/finance/invoices`, label: 'Invoices', icon: DollarSign },
        { href: `/${schoolSubdomain}/finance/payments`, label: 'Payments', icon: CheckSquare },
        { href: `/${schoolSubdomain}/finance/expenses`, label: 'Expenses', icon: Briefcase },
        { href: `/${schoolSubdomain}/finance/scholarships`, label: 'Scholarships', icon: Percent },
    ];

    const resourceItems = [
        { href: `/${schoolSubdomain}/resources/buildings`, label: 'Buildings', icon: Building },
        { href: `/${schoolSubdomain}/resources/rooms`, label: 'Rooms', icon: Home }, // Use Home icon for general rooms
        { href: `/${schoolSubdomain}/resources/library`, label: 'Library', icon: Library },
        { href: `/${schoolSubdomain}/resources/transport`, label: 'Transport', icon: Bus },
        { href: `/${schoolSubdomain}/resources/hostel`, label: 'Hostel', icon: Home }, // Use Home icon for general hostel
        { href: `/${schoolSubdomain}/resources/stores`, label: 'Store', icon: Store },
    ];

    const communicationItems = [
        { href: `/${schoolSubdomain}/communication/announcements`, label: 'Announcements', icon: Newspaper },
    ];

    const schoolSetupItems = [
        { href: `/${schoolSubdomain}/settings/academic-years`, label: 'Academic Years', icon: CalendarDays },
        { href: `/${schoolSubdomain}/settings/profile`, label: 'School Profile', icon: Settings },
    ];


    // Define sections based on role
    switch (role) {
      case 'SUPER_ADMIN':
      case 'SCHOOL_ADMIN':
        return [
          { items: commonItems },
          { title: 'Academics', items: academicItems },
          { title: 'People', items: peopleItems },
          { title: 'Attendance', items: attendanceItems },
          { title: 'Finance', items: financeItems }, // Use defined financeItems
          { title: 'Human Resources', items: hrItems }, // NEW HR Section
          { title: 'Resources', items: resourceItems }, // Use defined resourceItems
          { title: 'Communication', items: communicationItems }, // Use defined communicationItems
          { title: 'School Setup', items: schoolSetupItems } // Use defined schoolSetupItems
        ];
      case 'HR_MANAGER': // HR Manager has access to HR and parts of People/Attendance/Settings
        return [
            { items: commonItems },
            { title: 'People', items: peopleItems },
            { title: 'Attendance', items: attendanceItems },
            { title: 'Human Resources', items: hrItems }, // NEW HR Section
            { title: 'School Setup', items: [{ href: `/${schoolSubdomain}/settings/profile`, label: 'School Profile', icon: Settings }] } // Limited settings
        ];
      case 'ACCOUNTANT': // Accountant has access to Finance and parts of HR/People/Settings
        return [
            { items: commonItems },
            { title: 'Finance', items: financeItems },
            { title: 'Human Resources', items: hrItems.filter(item => item.label === 'Payroll') }, // Only Payroll
            { title: 'People', items: [{ href: `/${schoolSubdomain}/people/teachers`, label: 'Staff Directory', icon: UserCog }] }, // Staff Directory
        ];
      case 'TEACHER':
        return [
          { items: [{ href: `/${schoolSubdomain}/dashboard/teacher`, label: 'My Dashboard', icon: LayoutDashboard }] },
          {
            title: 'Academics',
            items: [
              { href: `/${schoolSubdomain}/teacher/academics/assignments`, label: 'Assignments', icon: CheckSquare },
              { href: `/${schoolSubdomain}/teacher/academics/grades`, label: 'Grades', icon: Percent },
              { href: `/${schoolSubdomain}/teacher/academics/timetable`, label: 'My Timetable', icon: CalendarDays },
              { href: `/${schoolSubdomain}/teacher/academics/examinations`, label: 'Examinations', icon: GraduationCap },
              { href: `/${schoolSubdomain}/teacher/academics/subjects`, label: 'My Subjects', icon: BookOpen },
            ]
          },
          {
            title: 'People',
            items: [
              { href: `/${schoolSubdomain}/people/students`, label: 'My Students', icon: Users },
              { href: `/${schoolSubdomain}/people/teachers`, label: 'Staff Directory', icon: UserCog },
            ]
          },
          {
            title: 'Attendance',
            items: [
              { href: `/${schoolSubdomain}/attendance/students`, label: 'Student Attendance', icon: CheckSquare },
              { href: `/${schoolSubdomain}/attendance/staff`, label: 'My Attendance', icon: ClipboardList },
            ]
          },
          { title: 'Human Resources', items: hrItems.filter(item => item.label === 'Payroll') }, // Teachers can view their own payroll records
          {
            title: 'Communication',
            items: [
              { href: `/${schoolSubdomain}/communication/announcements`, label: 'Announcements', icon: Newspaper },
            ]
          },
        ];
      // Add cases for other roles (SECRETARY, PROCUREMENT_OFFICER, LIBRARIAN, TRANSPORT_MANAGER, HOSTEL_WARDEN, STUDENT, PARENT)
      case 'SECRETARY':
        return [
          { items: commonItems },
          { title: 'Academics', items: academicItems.filter(item => ['School Levels', 'Departments', 'Classes & Sections', 'Subjects', 'Timetable'].includes(item.label)) },
          { title: 'People', items: peopleItems },
          { title: 'Attendance', items: attendanceItems },
          { title: 'Finance', items: financeItems.filter(item => ['Fee Structures', 'Invoices', 'Payments'].includes(item.label)) },
          { title: 'Human Resources', items: hrItems },
          { title: 'Resources', items: resourceItems.filter(item => ['Buildings', 'Rooms'].includes(item.label)) }, // Secretaries might manage general school resources
          { title: 'Communication', items: communicationItems },
          { title: 'School Setup', items: schoolSetupItems }
        ];
      case 'PROCUREMENT_OFFICER':
        return [
          { items: commonItems },
          { title: 'Finance', items: financeItems.filter(item => ['Expenses'].includes(item.label)) },
          { title: 'Resources', items: resourceItems.filter(item => ['Store'].includes(item.label)) },
          // Add Procurement specific routes
        ];
      case 'LIBRARIAN':
        return [
          { items: commonItems },
          { title: 'Resources', items: [{ href: `/${schoolSubdomain}/resources/library`, label: 'Library', icon: Library }] },
          // Add Library specific routes
        ];
      case 'TRANSPORT_MANAGER':
        return [
          { items: commonItems },
          { title: 'Resources', items: [{ href: `/${schoolSubdomain}/resources/transport`, label: 'Transport', icon: Bus }] },
          // Add Transport specific routes
        ];
      case 'HOSTEL_WARDEN':
        return [
          { items: commonItems },
          { title: 'Resources', items: [{ href: `/${schoolSubdomain}/resources/hostel`, label: 'Hostel', icon: Home }] },
          // Add Hostel specific routes
        ];
      case 'STUDENT':
        return [
          { items: commonItems },
          {
            title: 'Academics',
            items: [
              { href: `/${schoolSubdomain}/academics/assignments`, label: 'My Assignments', icon: CheckSquare },
              { href: `/${schoolSubdomain}/academics/grades`, label: 'My Grades', icon: Percent },
              { href: `/${schoolSubdomain}/academics/timetable`, label: 'My Timetable', icon: CalendarDays },
              { href: `/${schoolSubdomain}/academics/examinations`, label: 'My Exams', icon: GraduationCap },
              { href: `/${schoolSubdomain}/academics/subjects`, label: 'My Subjects', icon: BookOpen },
            ]
          },
          { href: `/${schoolSubdomain}/attendance/students`, label: 'My Attendance', icon: CheckSquare },
          {
            title: 'Finance',
            items: [
              { href: `/${schoolSubdomain}/finance/invoices`, label: 'My Invoices', icon: DollarSign },
              { href: `/${schoolSubdomain}/finance/payments`, label: 'My Payments', icon: CheckSquare },
            ]
          },
          {
            title: 'Resources',
            items: [
              { href: `/${schoolSubdomain}/resources/library`, label: 'Library', icon: Library },
              { href: `/${schoolSubdomain}/resources/hostel`, label: 'My Hostel', icon: Home },
            ]
          },
          {
            title: 'Communication',
            items: [
              { href: `/${schoolSubdomain}/communication/announcements`, label: 'Announcements', icon: Newspaper },
            ]
          },
        ];
      case 'PARENT':
        return [
          { items: commonItems },
          {
            title: 'Children',
            items: [
              { href: `/${schoolSubdomain}/people/students`, label: 'My Children', icon: Users }, // Link to manage children
            ]
          },
          {
            title: 'Finance',
            items: [
              { href: `/${schoolSubdomain}/finance/invoices`, label: 'Children\'s Invoices', icon: DollarSign },
              { href: `/${schoolSubdomain}/finance/payments`, label: 'Children\'s Payments', icon: CheckSquare },
            ]
          },
          {
            title: 'Communication',
            items: [
              { href: `/${schoolSubdomain}/communication/announcements`, label: 'Announcements', icon: Newspaper },
            ]
          },
        ];
      default:
        return [
          { items: commonItems }, // Minimal access for undefined roles
        ];
    }
  };

  const navigationSections = getNavigationSections(userRole);

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm md:hidden" onClick={onClose}></div>}

      <aside className={`fixed left-0 top-0 z-20 h-screen w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between h-16 border-b border-zinc-200 dark:border-zinc-800 px-4 shrink-0">
          <Link href={`/${schoolSubdomain}/dashboard`} className="flex items-center gap-2 group" onClick={onClose}>
            {schoolLogoUrl ? (
                <Avatar className="h-9 w-9 border border-zinc-300 dark:border-zinc-700">
                    <AvatarImage src={schoolLogoUrl} alt={schoolName || 'School Logo'} />
                    <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-sm font-semibold">{getInitials(schoolName)}</AvatarFallback>
                </Avatar>
            ) : (
                <div className={`flex items-center justify-center h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-700 ${titleTextClasses} font-semibold text-sm`}>{getInitials(schoolName)}</div>
            )}
            <h2 className={`text-lg font-bold ${titleTextClasses} truncate group-hover:opacity-80 transition-opacity`}>{schoolName || 'Sukuu'}</h2>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden text-zinc-700 dark:text-zinc-300" onClick={onClose}> <CloseIcon className="h-5 w-5" /> </Button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigationSections.map((section, sectionIndex) => (
            <div key={section.title || `section-${sectionIndex}`}>
              {section.title && ( <h3 className="px-2 py-2 text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-600 tracking-wider">{section.title}</h3> )}
              <ul className="space-y-1">
                {section.items.map(item => {
                  const isActive = currentPathname === item.href ||
                                   (item.href !== `/${schoolSubdomain}/dashboard` && currentPathname.startsWith(item.href + '/'));
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link href={item.href} className={`${linkClassesBase} ${isActive ? activeLinkClasses : `${linkLabelTextClasses} ${hoverClasses}`}`} onClick={onClose}>
                        {Icon ? <Icon className={`w-5 h-5 mr-3 shrink-0 ${isActive ? 'text-sky-500 dark:text-sky-400' : 'text-zinc-500 dark:text-zinc-400'} group-hover:text-current transition-colors duration-150`} /> : <div className="w-5 h-5 mr-3 shrink-0"></div>}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

// --- Main SchoolAppLayout Component ---
export default function SchoolAppLayout({ children }) {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [schoolData, setSchoolData] = useState(null);
  const [isLoadingSchoolData, setIsLoadingSchoolData] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const subdomain = params.subdomain;

  const fetchSchoolData = useCallback(async () => {
      if (!subdomain) {
        setAuthError("Subdomain parameter is missing from URL.");
        setIsLoadingSchoolData(false);
        return;
      }
      setIsLoadingSchoolData(true);
      try {
        const response = await fetch(`/api/schools/by-subdomain/${subdomain}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Failed to parse error response." }));
          throw new Error(errorData.error || "Invalid school domain or school not found.");
        }
        const data = await response.json();
        if (data.school && data.school.isActive) {
          setSchoolData(data.school);
        } else {
          throw new Error(data.school && !data.school.isActive ? "This school is currently inactive." : "School not found or inactive.");
        }
      } catch (err) {
        console.error("Subdomain validation error:", err);
        setAuthError(err.message);
        toast.error("School Verification Failed", { description: err.message });
      } finally {
        setIsLoadingSchoolData(false);
      }
  }, [subdomain]);

  useEffect(() => {
    if (subdomain) { fetchSchoolData(); }
    else {
      setIsLoadingSchoolData(false);
      setAuthError("Unable to determine school from URL. Subdomain is missing.");
    }
  }, [subdomain, fetchSchoolData]);

  useEffect(() => {
    if (isLoadingSchoolData || sessionStatus === 'loading') return;

    const schoolAdminLoginPath = subdomain ? `/${subdomain}/login` : '/login';
    const teacherLoginPath = subdomain ? `/${subdomain}/teacher-login` : '/teacher-login';

    if (sessionStatus === 'unauthenticated') {
      // If unauthenticated, redirect to admin login by default,
      // unless the current path is explicitly the teacher login page.
      if (!window.location.pathname.includes('/teacher-login')) {
        router.push(schoolAdminLoginPath);
      }
      return;
    }

  if (sessionStatus === 'authenticated') {
      // User is authenticated, now check authorization for the specific school and role
      if (!schoolData || session.user?.schoolId !== schoolData.id || session.user?.schoolSubdomain !== subdomain) {
        setAuthError("Access denied. You are not authorized for this school or your session is invalid.");
        signOut({ redirect: false }).then(() => {
          router.push(`${schoolAdminLoginPath}?error=UnauthorizedSchool`); // Redirect to admin login on school mismatch
        });
        return;
      }

      // Role-based redirection after successful login/session check
      const userRole = session.user?.role;
      const currentPath = window.location.pathname;

      if (userRole === 'TEACHER') {
        // Redirect teacher from generic dashboard or admin login page
        if (currentPath === `/${subdomain}/dashboard` || currentPath === schoolAdminLoginPath) {
          router.push(`/${subdomain}/dashboard/teacher`);
          return;
        }
        // Teacher allowlist to avoid hitting admin pages that may error
        const teacherAllowedPrefixes = [
          `/${subdomain}/dashboard/teacher`,
          `/${subdomain}/academics/assignments`,
          `/${subdomain}/academics/grades`,
          `/${subdomain}/academics/timetable`,
          `/${subdomain}/academics/examinations`,
          `/${subdomain}/academics/subjects`,
          `/${subdomain}/people/students`,
          `/${subdomain}/people/teachers`,
          `/${subdomain}/attendance/students`,
          `/${subdomain}/attendance/staff`,
          `/${subdomain}/communication/announcements`,
          `/${subdomain}/hr/payroll`,
        ];
        const isAllowed = teacherAllowedPrefixes.some(p => currentPath === p || currentPath.startsWith(p + '/'));
        if (!isAllowed) {
          router.push(`/${subdomain}/dashboard/teacher`);
          return;
        }
      } else { // All other roles (admins, etc.)
        // If an admin is on the teacher login page, redirect to their main dashboard
        if (currentPath === teacherLoginPath) {
          router.push(`/${subdomain}/dashboard`);
          return;
        }
        // If an admin tries to access a teacher-specific dashboard (optional, can let them see it)
        if (currentPath === `/${subdomain}/dashboard/teacher`) {
          // Can redirect to main dashboard or allow them to see it. For now, redirect.
          router.push(`/${subdomain}/dashboard`);
          return;
        }
      }

      // If user is authenticated and authorized for the school and current path, clear error
      setAuthError(null);
    }
  }, [sessionStatus, session, schoolData, isLoadingSchoolData, subdomain, router]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (isLoadingSchoolData || sessionStatus === 'loading') {
    return (
      <div className="flex flex-col h-screen">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shrink-0">
          <Skeleton className="h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-8 rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <Skeleton className="h-8 w-20 rounded-md bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-64 border-r p-4 space-y-3 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hidden md:block shrink-0">
            <Skeleton className="h-8 w-3/4 mb-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full bg-zinc-200 dark:bg-zinc-800 rounded-md" />)}
          </aside>
          <main className="flex-1 p-6 overflow-y-auto pt-6 md:ml-0 bg-zinc-50 dark:bg-zinc-900">
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
        {subdomain && <Button onClick={() => router.push(`/${subdomain}/login`)} className="mt-6">Go to Admin Login</Button>}
        {subdomain && <Button onClick={() => router.push(`/${subdomain}/teacher-login`)} className="mt-6 ml-2">Go to Teacher Login</Button>}
        {!subdomain && <Button onClick={() => router.push(`/`)} className="mt-6">Go to Homepage</Button>}
        <Toaster richColors theme="system" closeButton position="top-right" />
      </div>
    );
  }

  if (schoolData && session && session.user.schoolId === schoolData.id && session.user.schoolSubdomain === subdomain) {
    return (
      <SchoolContext.Provider value={schoolData}>
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
          <SchoolSidebar
            schoolSubdomain={subdomain}
            schoolName={schoolData.name}
            schoolLogoUrl={schoolData.logoUrl}
            isOpen={isSidebarOpen}
            onClose={toggleSidebar}
            userRole={session.user.role} // Pass user role to sidebar for dynamic navigation
          />
          <div className="flex flex-col flex-1 md:ml-64">
            <SchoolHeader
                schoolName={schoolData.name}
                schoolLogoUrl={schoolData.logoUrl}
                onToggleSidebar={toggleSidebar}
                userSession={session}
            />
            <main className="flex-1 overflow-y-auto pt-16">
              <div className="p-4 md:p-6 lg:p-8">
                {children}
              </div>
            </main>
          </div>
        </div>
        <Toaster richColors theme="system" closeButton position="top-right" />
      </SchoolContext.Provider>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
        <p className="text-black dark:text-white">Verifying access or loading school data...</p>
        <Toaster richColors theme="system" closeButton position="top-right" />
    </div>
  );
}
