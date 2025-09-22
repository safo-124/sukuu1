"use client";

import { MarketingFooter } from '@/components/marketing/Footer';

export default function MarketingLayout({ children }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="min-h-[70vh]">{children}</main>
      <MarketingFooter />
    </div>
  );
}
