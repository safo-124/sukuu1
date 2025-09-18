"use client";
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { LayoutDashboard, BookOpen, Percent, CalendarDays, CheckSquare, GraduationCap, Users, UserCog, Newspaper, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * TeacherSidebar
 * A compact, collapsible grouped navigation just for teacher role.
 * Accepts: subdomain (string), onNavigate (optional callback for closing mobile drawer)
 */
export default function TeacherSidebar({ subdomain, onNavigate, collapsed = false }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState({ academics: true, people: true, communication: false });

  const toggle = (key) => setOpenGroups(g => ({ ...g, [key]: !g[key] }));

  const groups = useMemo(() => ([
    {
      key: 'core',
      items: [
        { href: `/${subdomain}/dashboard/teacher`, label: 'My Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      key: 'academics', title: 'Academics', items: [
        { href: `/${subdomain}/teacher/academics/subjects`, label: 'My Subjects', icon: BookOpen },
        { href: `/${subdomain}/teacher/academics/assignments`, label: 'Assignments', icon: CheckSquare },
        { href: `/${subdomain}/teacher/academics/grades/exams`, label: 'Exam Grades', icon: Percent },
        { href: `/${subdomain}/teacher/academics/grades/continuous`, label: 'CA Grades', icon: Percent },
        { href: `/${subdomain}/teacher/academics/timetable`, label: 'My Timetable', icon: CalendarDays },
        { href: `/${subdomain}/teacher/academics/examinations`, label: 'Examinations', icon: GraduationCap },
      ]
    },
    {
      key: 'people', title: 'People', items: [
        { href: `/${subdomain}/teacher/students`, label: 'My Students', icon: Users },
        { href: `/${subdomain}/people/teachers`, label: 'Staff Directory', icon: UserCog },
      ]
    },
    {
      key: 'communication', title: 'Communication', items: [
        { href: `/${subdomain}/communication/announcements`, label: 'Announcements', icon: Newspaper },
      ]
    }
  ]), [subdomain]);

  const renderGroup = (group) => {
    if (group.key === 'core') {
      return (
        <ul className="space-y-1 mb-2" key={group.key}>
          {group.items.map(item => renderItem(item))}
        </ul>
      );
    }
    const isOpen = openGroups[group.key];
    return (
      <div key={group.key} className="mb-3">
        <button type="button" onClick={() => toggle(group.key)} className="flex items-center w-full px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 group">
          {isOpen ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />} {group.title}
        </button>
        {isOpen && (
          <ul className="space-y-1 mt-1">
            {group.items.map(item => renderItem(item))}
          </ul>
        )}
      </div>
    );
  };

  const renderItem = (item) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          className={`relative flex items-center ${collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-2'} rounded-md text-sm transition-colors group border border-transparent overflow-hidden ${active ? 'bg-gradient-to-r from-sky-50 to-sky-100 dark:from-sky-900/30 dark:to-sky-800/10 text-sky-700 dark:text-sky-300 font-medium ring-1 ring-sky-200/60 dark:ring-sky-700/40' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'}`}
        >
          {active && <span className="absolute left-0 top-0 h-full w-0.5 bg-sky-500 dark:bg-sky-400" />}
          {item.icon && <item.icon className={`h-4 w-4 ${collapsed ? '' : 'mr-2'} shrink-0 ${active ? 'text-sky-500 dark:text-sky-400' : 'text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300'}`} />}
          {!collapsed && <span className="truncate relative z-10">{item.label}</span>}
        </Link>
      </li>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`p-4 pb-3 bg-gradient-to-r from-sky-600 via-sky-500 to-sky-600 text-white shadow-sm ${collapsed ? 'px-2' : ''}`}>
        <div className="text-sm font-semibold tracking-wide truncate">{collapsed ? 'TCH' : 'Teacher Portal'}</div>
        {!collapsed && <div className="text-[11px] opacity-80">Quick access</div>}
      </div>
      <div className="flex-1 overflow-y-auto thin-scrollbar" data-sidebar-scroll>
        <nav className="p-3 text-sm">
          {groups.map(g => (
            <div key={g.key} className="relative">
              {renderGroup(g)}
              {g.key !== 'communication' && <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent my-2" />}
            </div>
          ))}
        </nav>
      </div>
      <div className="p-3 text-[11px] text-zinc-400 dark:text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">© {new Date().getFullYear()} Sukuu</div>
    </div>
  );
}

