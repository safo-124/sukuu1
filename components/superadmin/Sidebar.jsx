// components/superadmin/Sidebar.jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building, Settings2, Users2 } from 'lucide-react'; // Example icons

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/schools', label: 'Manage Schools', icon: Building },
  // Add more items as needed
  { href: '/users', label: 'Manage Users', icon: Users2 },
  { href: '/settings', label: 'System Settings', icon: Settings2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="superadmin-sidebar fixed left-0 top-0 z-30 h-screen w-64 pt-16 transition-transform -translate-x-full sm:translate-x-0">
      <div className="h-full px-3 py-4 overflow-y-auto">
        <ul className="space-y-2 font-medium">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/(superadmin)/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`sidebar-link flex items-center p-2 rounded-lg group ${
                    isActive ? 'sidebar-link-active' : ''
                  }`}
                >
                  <Icon className={`w-5 h-5 transition duration-75 ${isActive ? '' : 'group-hover:text-foreground'}`} />
                  <span className="ms-3">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}