"use client";

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sun, Moon, Zap, Menu, X } from 'lucide-react';

const MARKETING_PREFIXES = [
  '/',
  '/products',
  '/pricing',
  '/resources',
  '/docs',
  '/blog',
  '/about',
  '/contact',
  '/solutions',
  '/customers',
  '/get-started',
  '/signup',
  '/login',
  '/admin',
];

export default function Navbar() {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const showNavbar = MARKETING_PREFIXES.some((p) =>
    p === '/' ? pathname === '/' : pathname.startsWith(p)
  );

  if (!showNavbar) return null;

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
  const toggleMobile = () => setMobileOpen((v) => !v);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="relative z-20 border-b border-zinc-800 bg-transparent">
      <div className="py-4 px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 text-white text-2xl font-bold">
          <Zap className="h-7 w-7 text-sky-400" />
          <span>Sukuu</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/products" className="text-zinc-400 hover:text-white transition-colors duration-200">Products</Link>
          <Link href="/solutions" className="text-zinc-400 hover:text-white transition-colors duration-200">Solutions</Link>
          <Link href="/pricing" className="text-zinc-400 hover:text-white transition-colors duration-200">Pricing</Link>
          <Link href="/resources" className="text-zinc-400 hover:text-white transition-colors duration-200">Resources</Link>
          <Link href="/docs" className="text-zinc-400 hover:text-white transition-colors duration-200">Docs</Link>
          <Link href="/blog" className="text-zinc-400 hover:text-white transition-colors duration-200">Blog</Link>
          <Link href="/admin" className="text-zinc-400 hover:text-white transition-colors duration-200">Admin</Link>
        </nav>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors duration-200"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <Link href="/login" className="text-zinc-400 hover:text-white transition-colors duration-200 hidden sm:block">Log in</Link>
          <Link href="/get-started" className="px-4 py-2 bg-white text-zinc-900 rounded-full font-semibold hover:bg-zinc-200 transition-colors duration-200 shadow-lg hidden sm:block">
            Get started
          </Link>
          <button
            className="p-2 rounded-md text-zinc-300 md:hidden hover:bg-zinc-800"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={toggleMobile}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div
        className={`md:hidden absolute inset-x-0 top-full origin-top ${
          mobileOpen ? 'animate-in fade-in-0 zoom-in-95' : 'hidden'
        }`}
      >
        <div className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-6 py-4 space-y-3">
          <div className="grid gap-1">
            <Link href="/products" className="block py-2 text-zinc-200 hover:text-white">Products</Link>
            <Link href="/solutions" className="block py-2 text-zinc-200 hover:text-white">Solutions</Link>
            <Link href="/pricing" className="block py-2 text-zinc-200 hover:text-white">Pricing</Link>
            <Link href="/resources" className="block py-2 text-zinc-200 hover:text-white">Resources</Link>
            <Link href="/docs" className="block py-2 text-zinc-200 hover:text-white">Docs</Link>
            <Link href="/blog" className="block py-2 text-zinc-200 hover:text-white">Blog</Link>
            <Link href="/admin" className="block py-2 text-zinc-200 hover:text-white">Admin</Link>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <Link href="/login" className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10">Log in</Link>
            <Link href="/get-started" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200">Get started</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
