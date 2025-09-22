'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { Sun, Moon, Zap } from 'lucide-react';

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

  const showNavbar = MARKETING_PREFIXES.some((p) =>
    p === '/' ? pathname === '/' : pathname.startsWith(p)
  );

  if (!showNavbar) return null;

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <header className="relative z-10 py-4 px-6 md:px-12 flex items-center justify-between border-b border-zinc-800 bg-transparent">
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
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors duration-200"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
        <Link href="/login" className="text-zinc-400 hover:text-white transition-colors duration-200 hidden sm:block">Log in</Link>
        <Link href="/get-started" className="px-4 py-2 bg-white text-zinc-900 rounded-full font-semibold hover:bg-zinc-200 transition-colors duration-200 shadow-lg">
          Get started
        </Link>
      </div>
    </header>
  );
}
