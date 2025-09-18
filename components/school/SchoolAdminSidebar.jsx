"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Expect icon components passed in items.

export default function SchoolAdminSidebar({
  subdomain,
  sections,
  collapsed,
  onNavigate,
  widthExpanded = 256,
  widthCollapsed = 72,
}) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState({});

  const toggleGroup = (key) => setOpenGroups(g => ({ ...g, [key]: !g[key] }));

  const normalized = useMemo(() => sections.filter(s => (s.items || []).length > 0), [sections]);

  const renderItem = (item) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          className={`group flex items-center w-full rounded-md px-2.5 py-2 text-sm transition-colors border border-transparent relative overflow-hidden
            ${active ? 'bg-gradient-to-r from-sky-50 to-sky-100 dark:from-sky-900/30 dark:to-sky-800/10 text-sky-700 dark:text-sky-300 font-medium ring-1 ring-sky-200/60 dark:ring-sky-700/40' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'}`}
          title={collapsed ? item.label : undefined}
        >
          {active && <span className="absolute left-0 top-0 h-full w-0.5 bg-sky-500 dark:bg-sky-400" />}
          {item.icon && <item.icon className={`h-4 w-4 mr-2 shrink-0 ${active ? 'text-sky-500 dark:text-sky-400' : 'text-zinc-400 group-hover:text-zinc-500 dark:group-hover:text-zinc-300'} ${collapsed ? 'mx-auto mr-0' : ''}`} />}
          {!collapsed && <span className="truncate relative z-10">{item.label}</span>}
        </Link>
      </li>
    );
  };

  const renderSection = (section, idx) => {
    if (!section.title) {
      return (
        <ul key={idx} className="space-y-1 mb-2">
          {section.items.map(renderItem)}
        </ul>
      );
    }
    const open = openGroups[section.title] ?? true;
    return (
      <div key={section.title} className="mb-3">
        <button
          type="button"
          onClick={() => toggleGroup(section.title)}
          className={`flex items-center w-full px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? section.title : undefined}
        >
          {collapsed ? (
            <span>{section.title[0]}</span>
          ) : open ? (
            <ChevronDown className="h-4 w-4 mr-1" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-1" />
          )}
          {!collapsed && <span>{section.title}</span>}
        </button>
        {(!collapsed && open) && (
          <ul className="space-y-1 mt-1">{section.items.map(renderItem)}</ul>
        )}
        {idx !== normalized.length - 1 && !collapsed && <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent my-2" />}
      </div>
    );
  };

  return (
    <div
      className="flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-[width] duration-300 ease-in-out overflow-hidden"
      style={{ width: collapsed ? widthCollapsed : widthExpanded }}
    >
      <div className={`p-4 pb-3 bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 text-white shadow-sm ${collapsed ? 'px-2' : ''}`}>
        <div className="text-sm font-semibold tracking-wide truncate">{collapsed ? 'ADM' : 'School Admin'}</div>
        {!collapsed && <div className="text-[11px] opacity-80">Navigation</div>}
      </div>
      <div className="flex-1 overflow-y-auto thin-scrollbar" data-sidebar-scroll>
        <nav className="p-3 text-sm">
          {normalized.map((s, i) => renderSection(s, i))}
        </nav>
      </div>
      <div className="p-3 text-[10px] text-zinc-400 dark:text-zinc-600 border-t border-zinc-200 dark:border-zinc-800">© {new Date().getFullYear()} Sukuu</div>
    </div>
  );
}
