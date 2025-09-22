"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/customers', label: 'Customers' },
  { href: '/blog', label: 'Blog' },
];

export function MarketingNavbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="font-extrabold text-white tracking-tight">Sukuu</Link>
        <nav className="hidden md:flex items-center gap-4 text-sm">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`text-zinc-300 hover:text-white ${pathname===n.href? 'text-white' : ''}`}>{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/get-started" className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700">Get started</Link>
          <Link href="/login" className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/10">Sign in</Link>
        </div>
      </div>
    </header>
  );
}
