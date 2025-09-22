// components/superadmin/Header.jsx
'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sun, Moon, LogOut, Bell, Search, Shield, Settings } from 'lucide-react';

export function Header() {
  const { setTheme, theme } = useTheme();
  const { data: session } = useSession();

  const getInitials = (name) => {
    if (!name || name.trim() === "") return 'SA';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
  };

  return (
    <header className="fixed top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-white/20 dark:border-white/10 shadow-lg shadow-black/5">
      <div className="flex items-center justify-between h-20 px-6">
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-all duration-200">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Sukuu Admin
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Super Administrator</p>
            </div>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search schools, users, or settings..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-white/10 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-200"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-200"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-200"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-12 w-12 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-200">
                <Avatar className="h-10 w-10 border-2 border-white/20 dark:border-white/10">
                  <AvatarImage src={session?.user?.image} alt={session?.user?.name} />
                  <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold">
                    {getInitials(session?.user?.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="w-64 backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border border-white/20 dark:border-white/10 shadow-2xl" 
              align="end"
            >
              <DropdownMenuLabel className="pb-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{session?.user?.name || 'Super Admin'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{session?.user?.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Super Administrator</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/20 dark:bg-white/10" />
              <DropdownMenuItem className="cursor-pointer hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg mx-1">
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg mx-1">
                <Shield className="mr-2 h-4 w-4" />
                System Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/20 dark:bg-white/10" />
              <DropdownMenuItem 
                className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg mx-1"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}