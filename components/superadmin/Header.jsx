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
import { Sun, Moon, LogOut } from 'lucide-react'; // UserCircle removed as it wasn't used

export function Header() {
  const { setTheme, theme } = useTheme();
  const { data: session } = useSession();

  const getInitials = (name) => {
    if (!name || name.trim() === "") return 'SA'; // Super Admin default
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
  };

  // Tailwind classes for consistent styling
  const headerBackgroundColor = "bg-white dark:bg-zinc-950"; // Matches sidebar
  const headerBorderColor = "border-b border-zinc-200 dark:border-zinc-800";
  const textColorPrimary = "text-black dark:text-white";
  const textColorSecondary = "text-zinc-500 dark:text-zinc-400";
  const iconButtonClasses = "border-zinc-300 text-black hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800";
  const dropdownContentClasses = "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700";
  const dropdownItemClasses = "hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer";
  const dropdownSeparatorClasses = "bg-zinc-200 dark:bg-zinc-700";


  return (
    <header className={`superadmin-header fixed top-0 z-40 w-full p-3 md:p-4 ${headerBackgroundColor} ${headerBorderColor}`}>
      {/* This inner div handles the alignment with the sidebar */}
      {/* On small screens (sidebar collapsed/hidden), it's full width.
          On sm+ screens, ml-64 pushes it to the right of the sidebar.
          However, we want the logo to be on the far left and user menu on far right
          *within the area available for the header content*.
          So, this structure is more about the content area of the header.
      */}
      <div className="flex items-center justify-between max-w-full"> {/* Changed from sm:ml-64 to allow logo on far left if sidebar is overlaid */}
        
        {/* App Name / Logo - links to dashboard */}
        <div className="flex items-center"> {/* This div will be on the left within the header's content area */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            {/* You could add an SVG logo here if you have one */}
            {/* <img src="/logo.svg" alt="Sukuu Logo" className="h-7 w-auto" /> */}
            <span className={`text-2xl font-bold tracking-tight group-hover:opacity-80 transition-opacity ${textColorPrimary}`}>
              SUK<span className="font-semibold text-sky-600 dark:text-sky-500">UU</span>
            </span>
          </Link>
        </div>

        {/* Right-aligned items: Theme Toggle & User Menu */}
        <div className="flex items-center space-x-3 md:space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className={iconButtonClasses}
            aria-label="Toggle theme"
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                  <Avatar className="h-9 w-9 border border-zinc-300 dark:border-zinc-700">
                    <AvatarImage src={session.user.image || ''} alt={session.user.name || "User avatar"} />
                    <AvatarFallback className={`bg-zinc-200 dark:bg-zinc-700 ${textColorPrimary}`}>
                      {getInitials(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className={`w-56 ${dropdownContentClasses}`} align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1 p-1">
                    <p className={`text-sm font-medium leading-none ${textColorPrimary}`}>
                      {session.user.name || 'Super Admin'}
                    </p>
                    <p className={`text-xs leading-none ${textColorSecondary}`}>
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className={dropdownSeparatorClasses}/>
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })} className={dropdownItemClasses}>
                  <LogOut className={`mr-2 h-4 w-4 ${textColorSecondary}`} />
                  <span className={textColorPrimary}>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}