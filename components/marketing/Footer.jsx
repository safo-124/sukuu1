import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950 py-10 text-sm text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <div className="text-white font-extrabold mb-2">Sukuu</div>
          <p>Modern school management for the digital age.</p>
        </div>
        <div>
          <div className="text-white font-medium mb-2">Product</div>
          <ul className="space-y-1">
            <li><Link className="hover:text-white" href="/products">Overview</Link></li>
            <li><Link className="hover:text-white" href="/products#academics">Academics</Link></li>
            <li><Link className="hover:text-white" href="/products#finance">Finance</Link></li>
            <li><Link className="hover:text-white" href="/products#hr">HR & People</Link></li>
            <li><Link className="hover:text-white" href="/products#resources">Resources</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-white font-medium mb-2">Company</div>
          <ul className="space-y-1">
            <li><Link className="hover:text-white" href="/about">About</Link></li>
            <li><Link className="hover:text-white" href="/customers">Customers</Link></li>
            <li><Link className="hover:text-white" href="/contact">Contact</Link></li>
            <li><Link className="hover:text-white" href="/privacy">Privacy</Link></li>
            <li><Link className="hover:text-white" href="/terms">Terms</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-white font-medium mb-2">Resources</div>
          <ul className="space-y-1">
            <li><Link className="hover:text-white" href="/docs">Docs</Link></li>
            <li><Link className="hover:text-white" href="/blog">Blog</Link></li>
            <li><Link className="hover:text-white" href="/get-started">Get started</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 mt-8 text-center">© {new Date().getFullYear()} Sukuu. All rights reserved.</div>
    </footer>
  );
}
