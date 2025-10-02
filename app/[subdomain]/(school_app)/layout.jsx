// app/[subdomain]/(school_app)/layout.jsx
'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Toaster, toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import {
  Sun, Moon, LayoutDashboard, Users, UserCog, BookOpen, LogOut, Menu, X as CloseIcon, Settings, GraduationCap, CalendarDays, Building, Library, Bus, ClipboardList, Briefcase, CheckSquare, DollarSign, FileText, Percent, BookCopy, Newspaper, Home, // Common icons
  AlertTriangle, Store, Layers, PieChart, Receipt // Added Receipt icon for Payroll
} from 'lucide-react'; // Ensure all used Lucide icons are imported
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import TeacherSidebar from '@/components/teacher/TeacherSidebar';
import SchoolAdminSidebar from '@/components/school/SchoolAdminSidebar';
import { useEdgeHoverSidebar } from '@/hooks/useEdgeHoverSidebar';

// Create a context to hold school data
const SchoolContext = createContext(null);
export const useSchool = () => useContext(SchoolContext);

// --- Refactored SchoolHeader (single definition) ---
function SchoolHeader({ schoolName, schoolLogoUrl, onToggleSidebar, userSession }) {
  const { setTheme, theme } = useTheme();
  const params = useParams();
  const titleTextClasses = "text-zinc-900 dark:text-zinc-50";
  const outlineButtonClasses = "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";
  const getInitials = (name) => {
    if (!name || name.trim() === '') return 'S';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  };
  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" className="md:hidden text-zinc-700 dark:text-zinc-300" onClick={onToggleSidebar}>
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
        {schoolLogoUrl ? (
          <Avatar className="h-9 w-9 border border-zinc-200 dark:border-zinc-700 hidden sm:inline-flex">
            <AvatarImage src={schoolLogoUrl} alt={schoolName || 'School Logo'} />
            <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold">{getInitials(schoolName)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-9 w-9 hidden sm:flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200">{getInitials(schoolName)}</div>
        )}
        <h1 className={`text-lg sm:text-xl font-semibold truncate ${titleTextClasses}`}>{schoolName || 'School Portal'}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className={`${outlineButtonClasses} h-9 w-9`} aria-label="Toggle theme">
          <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        {userSession?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="pl-2 pr-3 h-9 flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={userSession.user.profilePictureUrl || ''} alt={userSession.user.firstName || 'User'} />
                  <AvatarFallback>{(userSession.user.firstName||'U').substring(0,1)}{(userSession.user.lastName||'').substring(0,1)}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-xs font-medium max-w-[110px] truncate">{userSession.user.firstName || 'Profile'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">
                <div className="font-medium">{userSession.user.firstName} {userSession.user.lastName}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{userSession.user.role?.toLowerCase()}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/${params.subdomain}/teacher/profile`}>Profile</Link>
              </DropdownMenuItem>
              {userSession?.user?.role === 'SCHOOL_ADMIN' && (
                <DropdownMenuItem asChild>
                  <Link href={`/${params.subdomain}/settings/profile`}>School Settings</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                const role = userSession?.user?.role;
                const to = role === 'TEACHER' ? `/${params.subdomain}/teacher-login` : `/${params.subdomain}/login`;
                signOut({ callbackUrl: to });
              }} className="text-red-600 dark:text-red-500 focus:text-red-600">
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

// --- Navigation builder (clean, top-level) ---
function getNavigationSections(schoolSubdomain, role) {
  const commonItems = [ { href: `/${schoolSubdomain}/dashboard`, label: 'Dashboard', icon: LayoutDashboard } ];
    const academicItems = [
      { href: `/${schoolSubdomain}/academics/school-levels`, label: 'School Levels', icon: Layers },
      { href: `/${schoolSubdomain}/academics/departments`, label: 'Departments', icon: Briefcase },
      { href: `/${schoolSubdomain}/academics/classes`, label: 'Classes & Sections', icon: Building },
      { href: `/${schoolSubdomain}/academics/subjects`, label: 'Subjects', icon: BookOpen },
      { href: `/${schoolSubdomain}/academics/timetable`, label: 'Timetable', icon: CalendarDays },
      { href: `/${schoolSubdomain}/academics/examinations`, label: 'Examinations', icon: GraduationCap },
      { href: `/${schoolSubdomain}/academics/grades`, label: 'Grades', icon: Percent },
      { href: `/${schoolSubdomain}/academics/grades/manage`, label: 'Manage Grades', icon: Settings },
      { href: `/${schoolSubdomain}/academics/rankings`, label: 'Rankings Overview', icon: PieChart },
    ];
    const peopleItems = [
      { href: `/${schoolSubdomain}/people/students`, label: 'Manage Students', icon: Users },
      { href: `/${schoolSubdomain}/people/parents`, label: 'Manage Parents', icon: Users },
      { href: `/${schoolSubdomain}/people/teachers`, label: 'Manage Teachers', icon: UserCog },
      { href: `/${schoolSubdomain}/people/accountants`, label: 'Manage Accountants', icon: DollarSign },
      { href: `/${schoolSubdomain}/people/procurement`, label: 'Manage Procurement', icon: Briefcase },
  { href: `/${schoolSubdomain}/people/librarians`, label: 'Manage Librarians', icon: Library },
  // Removed dedicated wardens management; warden assignment is integrated into Teachers
      { href: `/${schoolSubdomain}/people/hr-staff`, label: 'Manage HR Staff', icon: Briefcase },
    ];
    const attendanceItems = [
      { href: `/${schoolSubdomain}/attendance/students`, label: 'Student Attendance', icon: CheckSquare },
      { href: `/${schoolSubdomain}/attendance/staff`, label: 'Staff Attendance', icon: ClipboardList },
    ];
    const hrItems = [
      { href: `/${schoolSubdomain}/hr/payroll`, label: 'Payroll', icon: Receipt },
      { href: `/${schoolSubdomain}/hr/leave/types`, label: 'Leave Types', icon: Layers },
      { href: `/${schoolSubdomain}/hr/leave/applications`, label: 'Leave Applications', icon: ClipboardList },
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
      { href: `/${schoolSubdomain}/resources/rooms`, label: 'Rooms', icon: Home },
      { href: `/${schoolSubdomain}/resources/library`, label: 'Library', icon: Library },
      { href: `/${schoolSubdomain}/resources/transport`, label: 'Transport', icon: Bus },
      { href: `/${schoolSubdomain}/resources/hostel`, label: 'Hostel', icon: Home },
      { href: `/${schoolSubdomain}/resources/stores`, label: 'Store', icon: Store },
    ];
    const communicationItems = [
      { href: `/${schoolSubdomain}/communication/announcements`, label: 'Announcements', icon: Newspaper },
      { href: `/${schoolSubdomain}/communications/events`, label: 'Events & Meetings', icon: CalendarDays },
    ];
    const schoolSetupItems = [
      { href: `/${schoolSubdomain}/settings/academic-years`, label: 'Academic Years', icon: CalendarDays },
      { href: `/${schoolSubdomain}/settings/profile`, label: 'School Profile', icon: Settings },
    ];

    switch (role) {
      case 'SCHOOL_ADMIN':
        return [
          { items: commonItems },
          { title: 'Academics', items: academicItems },
          { title: 'People', items: peopleItems },
          { title: 'Attendance', items: attendanceItems },
          { title: 'Finance', items: financeItems },
          { title: 'Human Resources', items: hrItems },
          { title: 'Resources', items: resourceItems },
          { title: 'Communication', items: communicationItems },
          { title: 'School Setup', items: schoolSetupItems },
        ];
      case 'SUPER_ADMIN':
        // Super admins can view most sections, but School Setup (tenant-specific settings)
        // is restricted to the school's own admin.
        return [
          { items: commonItems },
          { title: 'Academics', items: academicItems },
          { title: 'People', items: peopleItems },
          { title: 'Attendance', items: attendanceItems },
          { title: 'Finance', items: financeItems },
          { title: 'Human Resources', items: hrItems },
          { title: 'Resources', items: resourceItems },
          { title: 'Communication', items: communicationItems },
        ];
      case 'HR_MANAGER':
        return [
          { items: commonItems },
          { title: 'People', items: peopleItems },
          { title: 'Attendance', items: attendanceItems },
          { title: 'Human Resources', items: hrItems },
          { title: 'Communication', items: communicationItems },
        ];
      case 'ACCOUNTANT':
        return [
          { items: commonItems },
          { title: 'Finance', items: financeItems },
          { title: 'Human Resources', items: hrItems.filter(i => i.label === 'Payroll') },
          { title: 'People', items: [ { href: `/${schoolSubdomain}/people/teachers`, label: 'Staff Directory', icon: UserCog } ] },
          { title: 'Communication', items: communicationItems },
        ];
      case 'SECRETARY':
        return [
          { items: commonItems },
          { title: 'Academics', items: academicItems.filter(i => ['School Levels','Departments','Classes & Sections','Subjects','Timetable'].includes(i.label)) },
          { title: 'People', items: peopleItems },
          { title: 'Attendance', items: attendanceItems },
          { title: 'Finance', items: financeItems.filter(i => ['Fee Structures','Invoices','Payments'].includes(i.label)) },
          { title: 'Human Resources', items: hrItems },
          { title: 'Resources', items: resourceItems.filter(i => ['Buildings','Rooms'].includes(i.label)) },
          { title: 'Communication', items: communicationItems },
        ];
      case 'PROCUREMENT_OFFICER': {
        // Custom dashboard link for procurement
        const procurementCommon = [ { href: `/${schoolSubdomain}/dashboard/procurement`, label: 'Dashboard', icon: LayoutDashboard } ];
        const procurementFinance = [
          { href: `/${schoolSubdomain}/finance/purchase-orders`, label: 'Purchase Orders', icon: FileText },
          { href: `/${schoolSubdomain}/finance/vendors`, label: 'Vendors', icon: Briefcase },
          { href: `/${schoolSubdomain}/finance/expenses`, label: 'Expenses', icon: DollarSign },
        ];
        const procurementResources = [ { href: `/${schoolSubdomain}/resources/stores`, label: 'Store', icon: Store } ];
        return [
          { items: procurementCommon },
          { title: 'Finance', items: procurementFinance },
          { title: 'Resources', items: procurementResources },
          { title: 'Communication', items: communicationItems },
        ];
      }
      case 'LIBRARIAN': {
        const librarianCommon = [ { href: `/${schoolSubdomain}/dashboard/librarian`, label: 'Dashboard', icon: LayoutDashboard } ];
        const librarianResources = [ { href: `/${schoolSubdomain}/resources/library`, label: 'Library', icon: Library } ];
        return [
          { items: librarianCommon },
          { title: 'Resources', items: librarianResources },
          { title: 'Communication', items: communicationItems },
        ];
      }
      case 'TRANSPORT_MANAGER':
        return [ { items: commonItems }, { title: 'Resources', items: [ { href: `/${schoolSubdomain}/resources/transport`, label: 'Transport', icon: Bus } ] } ];
      case 'HOSTEL_WARDEN': {
        const wardenCommon = [ { href: `/${schoolSubdomain}/dashboard/hostel`, label: 'Dashboard', icon: LayoutDashboard } ];
        return [ { items: wardenCommon }, { title: 'Resources', items: [ { href: `/${schoolSubdomain}/resources/hostel`, label: 'Hostel', icon: Home } ] } ];
      }
      case 'STUDENT':
        return [
          { items: commonItems },
          { title: 'Academics', items: [
            { href: `/${schoolSubdomain}/academics/assignments`, label: 'My Assignments', icon: CheckSquare },
            { href: `/${schoolSubdomain}/academics/grades`, label: 'My Grades', icon: Percent },
            { href: `/${schoolSubdomain}/academics/grades/student-summary`, label: 'My Grades Summary', icon: Percent },
            { href: `/${schoolSubdomain}/student/rankings`, label: 'My Rankings', icon: PieChart },
            { href: `/${schoolSubdomain}/academics/timetable`, label: 'My Timetable', icon: CalendarDays },
            { href: `/${schoolSubdomain}/academics/examinations`, label: 'My Exams', icon: GraduationCap },
            { href: `/${schoolSubdomain}/academics/subjects`, label: 'My Subjects', icon: BookOpen },
          ] },
          { title: 'Attendance', items: [ { href: `/${schoolSubdomain}/attendance/students`, label: 'My Attendance', icon: CheckSquare } ] },
          { title: 'Finance', items: [
            { href: `/${schoolSubdomain}/finance/invoices`, label: 'My Invoices', icon: DollarSign },
            { href: `/${schoolSubdomain}/finance/payments`, label: 'My Payments', icon: CheckSquare },
          ] },
          { title: 'Resources', items: [
            { href: `/${schoolSubdomain}/resources/library`, label: 'Library', icon: Library },
            { href: `/${schoolSubdomain}/resources/hostel`, label: 'My Hostel', icon: Home },
          ] },
          { title: 'Communication', items: communicationItems },
        ];
      case 'PARENT':
        return [
          { items: commonItems },
          { title: 'Children', items: [
            { href: `/${schoolSubdomain}/people/students`, label: 'My Children', icon: Users },
            { href: `/${schoolSubdomain}/academics/rankings/children/performance`, label: 'Children Performance', icon: PieChart },
            { href: `/${schoolSubdomain}/academics/rankings/children`, label: 'Children Rankings', icon: PieChart },
          ] },
          { title: 'Finance', items: [
            { href: `/${schoolSubdomain}/finance/invoices`, label: "Children's Invoices", icon: DollarSign },
            { href: `/${schoolSubdomain}/finance/payments`, label: "Children's Payments", icon: CheckSquare },
          ] },
          { title: 'Communication', items: communicationItems },
        ];
      default:
        return [ { items: commonItems } ];
    }
  }
// --- Main Layout Component ---
export default function SchoolAppLayout({ children }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const [schoolData, setSchoolData] = useState(null);
  const [isLoadingSchoolData, setIsLoadingSchoolData] = useState(true);
  const [authError, setAuthError] = useState(null);
  const edgeHook = useEdgeHoverSidebar({ sidebarWidth: 256, defaultOpen: true });
  const { isOpen: isSidebarOpen, setIsOpen: setIsSidebarOpen } = edgeHook;

  // --- Student sidebar identity state (must stay at top-level for Hooks order) ---
  const [studentSidebarInfo, setStudentSidebarInfo] = useState(null);
  const [studentInfoTried, setStudentInfoTried] = useState(false);

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

  // Persist school context globally once loaded
  useEffect(() => {
    if (schoolData?.id) {
      try {
        if (typeof window !== 'undefined') {
          window.__SCHOOL_ID__ = schoolData.id;
          window.__SCHOOL_SUBDOMAIN__ = schoolData.subdomain;
          localStorage.setItem('schoolId', schoolData.id);
          localStorage.setItem('schoolSubdomain', schoolData.subdomain || subdomain || '');
        }
      } catch (e) {
        console.warn('Failed to persist school context', e);
      }
    }
  }, [schoolData, subdomain]);

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
          // Teacher dashboard
          `/${subdomain}/dashboard/teacher`,
          // Teacher (non-prefixed) legacy routes
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
          // Teacher-prefixed canonical routes
          `/${subdomain}/teacher/academics`,
          `/${subdomain}/teacher/students`,
          `/${subdomain}/teacher/people`,
          `/${subdomain}/teacher/people/teachers`,
          `/${subdomain}/teacher-login`,
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

        // Procurement officer: land on procurement dashboard when visiting generic dashboard
        if (userRole === 'PROCUREMENT_OFFICER') {
          if (currentPath === `/${subdomain}/dashboard`) {
            router.push(`/${subdomain}/dashboard/procurement`);
            return;
          }
        }
        // Librarian: land on librarian dashboard from generic dashboard
        if (userRole === 'LIBRARIAN') {
          if (currentPath === `/${subdomain}/dashboard`) {
            router.push(`/${subdomain}/dashboard/librarian`);
            return;
          }
        }
        // Hostel Warden: land on hostel dashboard from generic dashboard
        if (userRole === 'HOSTEL_WARDEN') {
          if (currentPath === `/${subdomain}/dashboard`) {
            router.push(`/${subdomain}/dashboard/hostel`);
            return;
          }
        }
      }

      // If user is authenticated and authorized for the school and current path, clear error
      setAuthError(null);
    }
  }, [sessionStatus, session, schoolData, isLoadingSchoolData, subdomain, router]);

  // Fetch student self profile (top-level effect; conditional logic inside)
  useEffect(() => {
    let ignore = false;
    async function loadStudentInfo() {
      if (session?.user?.role !== 'STUDENT' || !schoolData?.id) return;
      try {
        const res = await fetch(`/api/schools/${schoolData.id}/students/me/profile`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (!ignore && data?.student) {
          setStudentSidebarInfo(data.student);
        }
      } catch (e) {
        if (!ignore) setStudentSidebarInfo(null);
      } finally {
        if (!ignore) setStudentInfoTried(true);
      }
    }
    loadStudentInfo();
    return () => { ignore = true; };
  }, [session?.user?.role, schoolData?.id]);

  const toggleSidebar = () => setIsSidebarOpen(o => !o);
  // Edge hover auto-toggle state
  const [edgeAuto, setEdgeAuto] = useState({ enabled: true, lastInside: Date.now(), autoOpened: false });
  const EDGE_THRESHOLD = 6; // px from left edge to trigger open
  const AUTO_HIDE_DELAY = 900; // ms after leaving sidebar to auto close

  useEffect(() => {
    if (!edgeAuto.enabled) return;
    function onMove(e) {
      if (e.clientX <= EDGE_THRESHOLD) {
        if (!isSidebarOpen) {
          setIsSidebarOpen(true);
          setEdgeAuto(a => ({ ...a, autoOpened: true, lastInside: Date.now() }));
        } else {
          setEdgeAuto(a => ({ ...a, lastInside: Date.now() }));
        }
      } else if (isSidebarOpen && edgeAuto.autoOpened) {
        // If pointer far from sidebar ( > 260px ) start hide timer
        if (e.clientX > 260) {
          if (Date.now() - edgeAuto.lastInside > AUTO_HIDE_DELAY) {
            setIsSidebarOpen(false);
            setEdgeAuto(a => ({ ...a, autoOpened: false }));
          }
        } else {
          setEdgeAuto(a => ({ ...a, lastInside: Date.now() }));
        }
      }
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [edgeAuto.enabled, edgeAuto.autoOpened, edgeAuto.lastInside, isSidebarOpen]);

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
    const userRole = session.user.role;
    // Build sections for new SchoolAdminSidebar (non-teacher) using navigation builder
    const fullSections = userRole === 'TEACHER' ? [] : getNavigationSections(subdomain, userRole);

    return (
      <SchoolContext.Provider value={schoolData}>
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
          {/* Decide between teacher vs admin sidebar with new collapsible/hover support */}
          {session.user.role === 'TEACHER' ? (
            <div className={`fixed left-0 top-0 z-20 h-screen bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-[width] duration-300 ease-in-out overflow-hidden ${isSidebarOpen ? 'w-60' : 'w-16'} hidden md:flex flex-col`}>
              <TeacherSidebar subdomain={subdomain} collapsed={!isSidebarOpen} />
            </div>
          ) : (
            <div className={`fixed left-0 top-0 z-20 h-screen dark:bg-zinc-950 bg-white border-r border-zinc-200 dark:border-zinc-800 transition-[width] duration-300 ease-in-out overflow-hidden hidden md:flex`} data-role="school-admin-sidebar-wrapper" style={{ width: isSidebarOpen ? 256 : 72 }}>
              {/* Invisible edge hover zone (already handled globally by effect, but helps pointer capture) */}
              <div className="absolute top-0 left-0 h-full w-2 -translate-x-full" aria-hidden="true" />
              <SchoolAdminSidebar
                subdomain={subdomain}
                sections={fullSections}
                collapsed={!isSidebarOpen}
                onNavigate={() => {}}
                headerLabel={(() => {
                  switch (userRole) {
                    case 'SCHOOL_ADMIN': return 'School Admin';
                    case 'ACCOUNTANT': return 'Accountant';
                    case 'SECRETARY': return 'Secretary';
                    case 'HR_MANAGER': return 'HR Manager';
                    case 'PROCUREMENT_OFFICER': return 'Procurement';
                    case 'LIBRARIAN': return 'Librarian';
                    case 'TRANSPORT_MANAGER': return 'Transport';
                    case 'HOSTEL_WARDEN': return 'Hostel';
                    case 'SUPER_ADMIN': return 'Super Admin';
                    case 'PARENT': return 'Parent';
                    default: return undefined; // falls back to component default
                  }
                })()}
                studentDisplay={userRole === 'STUDENT' ? studentSidebarInfo : undefined}
              />
            </div>
          )}
          {/** Adjust margin-left dynamically: teacher sidebar is w-60 (15rem), others w-64 (16rem) */}
          <div className={`flex flex-col flex-1 transition-[margin] duration-300 ease-in-out ${isSidebarOpen ? (session?.user?.role === 'TEACHER' ? 'md:ml-60' : 'md:ml-64') : 'md:ml-16'}`}>
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
