import Link from 'next/link';

export const metadata = {
  title: 'Sukuu Pricing',
  description: 'Simple, transparent pricing for schools and groups.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-2">Pricing</h1>
        <p className="text-zinc-400 mb-10">Start free. Upgrade when you’re ready. Cancel anytime.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
            <h3 className="text-xl font-bold mb-2">Starter</h3>
            <p className="text-zinc-400 mb-6">For small schools starting out</p>
            <div className="text-4xl font-extrabold mb-6">$0<span className="text-lg text-zinc-400">/mo</span></div>
            <ul className="space-y-2 text-zinc-300 text-sm mb-6">
              <li>Academics, Finance, HR basics</li>
              <li>Multi-tenant with 1 school</li>
              <li>Email support</li>
            </ul>
            <Link href="/get-started" className="block text-center px-4 py-2 bg-white text-zinc-900 rounded-md font-semibold hover:bg-zinc-200">Get started</Link>
          </div>

          <div className="rounded-2xl border border-sky-500 bg-zinc-900/60 p-8 ring-1 ring-sky-500/30">
            <div className="inline-block mb-3 px-2 py-1 text-xs rounded bg-sky-500/10 text-sky-300 border border-sky-700/40">Most Popular</div>
            <h3 className="text-xl font-bold mb-2">Pro</h3>
            <p className="text-zinc-400 mb-6">For growing schools and groups</p>
            <div className="text-4xl font-extrabold mb-6">$99<span className="text-lg text-zinc-400">/mo</span></div>
            <ul className="space-y-2 text-zinc-300 text-sm mb-6">
              <li>Unlimited schools (tenants)</li>
              <li>Payroll with receipts & notes</li>
              <li>Priority support</li>
            </ul>
            <Link href="/get-started" className="block text-center px-4 py-2 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700">Start Pro</Link>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
            <h3 className="text-xl font-bold mb-2">Enterprise</h3>
            <p className="text-zinc-400 mb-6">For large groups and ministries</p>
            <div className="text-4xl font-extrabold mb-6">Custom</div>
            <ul className="space-y-2 text-zinc-300 text-sm mb-6">
              <li>SLA, SSO, custom integrations</li>
              <li>Advanced compliance</li>
              <li>Dedicated success manager</li>
            </ul>
            <Link href="/contact" className="block text-center px-4 py-2 border border-zinc-700 text-white rounded-md font-semibold hover:bg-zinc-800">Contact sales</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
