// components/superadmin/Sidebar.jsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building, Settings2, Users2, ClipboardList } from 'lucide-react'; // Example icons

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/schools', label: 'Manage Schools', icon: Building },
  { href: '/requests', label: 'School Requests', icon: ClipboardList },
  { href: '/account-requests', label: 'Account Requests', icon: ClipboardList },
  { href: '/users', label: 'Manage Users', icon: Users2 },
  { href: '/settings', label: 'System Settings', icon: Settings2 },
];

export function Sidebar({ isOpen = false, onClose }) {
  const pathname = usePathname();

  return (
    <aside
      className={
        `superadmin-sidebar fixed left-0 top-0 z-50 h-screen w-64 pt-16 transition-transform duration-300 will-change-transform ` +
        `${isOpen ? 'translate-x-0' : '-translate-x-full'}`
      }
      onMouseLeave={onClose}
    >
      <div className="h-full overflow-y-auto px-3 py-4 rounded-r-xl border border-white/20 bg-white/30 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/30">
        <ul className="space-y-2 font-medium">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`sidebar-link flex items-center gap-3 rounded-lg p-2 group transition-colors ${
                    isActive ? 'sidebar-link-active' : ''
                  }`}
                >
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/30 bg-white/20 text-slate-700 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-800/40 dark:text-zinc-200 ${isActive ? 'ring-1 ring-sky-400/40 dark:ring-sky-500/30' : ''}`}>
                    <Icon className={`h-4 w-4`} />
                  </span>
                  <span className="text-slate-800 dark:text-zinc-100">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}