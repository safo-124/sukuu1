"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

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
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
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
          <button aria-label="Toggle menu" onClick={()=>setOpen(v=>!v)} className="md:hidden rounded-md p-2 text-zinc-200 hover:bg-white/10">
            {open ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-white/10 bg-zinc-950/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="grid gap-2 text-sm">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className={`block py-2 text-zinc-200 hover:text-white ${pathname===n.href? 'text-white' : ''}`}>{n.label}</Link>
              ))}
              <Link href="/get-started" className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 text-center">Get started</Link>
              <Link href="/login" className="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10 text-center">Sign in</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
