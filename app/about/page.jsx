export const metadata = {
  title: 'About Sukuu',
  description: 'Why Sukuu and how it integrates into your school ecosystem.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-2">About</h1>
        <p className="text-zinc-400 mb-10">Built for scale, security, and simplicity.</p>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-xl font-bold mb-2">Multi-tenant and secure</h3>
            <p className="text-zinc-400">Serve multiple schools from one platform. Subdomain isolation, role-based access, and strict middleware guards keep data safe.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-xl font-bold mb-2">Finance-first workflows</h3>
            <p className="text-zinc-400">Invoices, payments, expenses and payroll with traceability (notes and receipts), plus dashboards for accountants.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-xl font-bold mb-2">Parents and teachers onboard</h3>
            <p className="text-zinc-400">Flutter mobile apps for parents and role-aware web for teachers with attendance, grades, and messaging.</p>
          </div>
        </section>

        <section className="py-8 border-t border-zinc-800">
          <h2 className="text-2xl font-bold text-white mb-4">Integrations</h2>
          <div className="flex flex-wrap items-center gap-3 text-zinc-400">
            <span className="px-3 py-1 rounded bg-zinc-800/60">Prisma</span>
            <span className="px-3 py-1 rounded bg-zinc-800/60">NextAuth</span>
            <span className="px-3 py-1 rounded bg-zinc-800/60">Next.js App Router</span>
            <span className="px-3 py-1 rounded bg-zinc-800/60">Tailwind CSS</span>
            <span className="px-3 py-1 rounded bg-zinc-800/60">Flutter (Parent App)</span>
          </div>
        </section>
      </div>
    </div>
  );
}
