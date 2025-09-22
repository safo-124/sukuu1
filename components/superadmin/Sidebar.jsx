// components/superadmin/Sidebar.jsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building, 
  Settings2, 
  Users2, 
  ClipboardList, 
  BarChart3, 
  CreditCard, 
  FileText, 
  Shield,
  HelpCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { 
    href: '/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard,
    description: 'Overview & Analytics'
  },
  { 
    href: '/schools', 
    label: 'Schools', 
    icon: Building,
    description: 'Manage Institutions'
  },
  { 
    href: '/requests', 
    label: 'School Requests', 
    icon: ClipboardList,
    description: 'Pending Applications'
  },
  { 
    href: '/account-requests', 
    label: 'Account Requests', 
    icon: Users2,
    description: 'User Applications'
  },
  { 
    href: '/users', 
    label: 'Users', 
    icon: Shield,
    description: 'System Users'
  },
  { 
    href: '/analytics', 
    label: 'Analytics', 
    icon: BarChart3,
    description: 'Reports & Insights'
  },
  { 
    href: '/billing', 
    label: 'Billing', 
    icon: CreditCard,
    description: 'Payments & Plans'
  },
  { 
    href: '/settings', 
    label: 'Settings', 
    icon: Settings2,
    description: 'System Configuration'
  },
];

const supportItems = [
  { 
    href: '/help', 
    label: 'Help Center', 
    icon: HelpCircle 
  },
  { 
    href: '/docs', 
    label: 'Documentation', 
    icon: FileText 
  },
];

export function Sidebar({ isOpen = false, onClose }) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-80 pt-20 transition-all duration-300 will-change-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onMouseLeave={onClose}
      >
        <div className="h-full overflow-y-auto backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border-r border-white/20 dark:border-white/10 shadow-2xl">
          {/* Close button for mobile */}
          <div className="lg:hidden absolute top-24 right-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-6">
            {/* Welcome Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  System Online
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Control Center
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your educational platform
              </p>
            </div>

            {/* Main Navigation */}
            <nav className="space-y-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Main
              </div>
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-xl p-3 transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 shadow-lg shadow-purple-500/10'
                        : 'hover:bg-white/50 dark:hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium transition-colors ${
                        isActive 
                          ? 'text-purple-700 dark:text-purple-300' 
                          : 'text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400'
                      }`}>
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {item.description}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Support Section */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Support
              </div>
              <div className="space-y-2">
                {supportItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-xl p-3 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-200"
                    >
                      <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                      <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Status Card */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-800/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  All Systems Operational
                </span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">
                Platform running smoothly
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}