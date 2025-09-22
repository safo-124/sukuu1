export const metadata = {
  title: 'Sukuu — School OS',
  description: 'All-in-one School OS: academics, finance, HR, communication and resources.',
};

import Link from 'next/link';

export default function MarketingHome() {
  return (
    <div>
      {/* Hero */}
      <section className="relative px-4">
        <div className="mx-auto max-w-6xl py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white">
            All-in-one School OS. Built to scale.
          </h1>
          <p className="mt-4 text-lg text-zinc-300 max-w-2xl mx-auto">
            Academics, Finance, HR, Communication and Resources in a single, secure platform.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/get-started" className="rounded-full bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700">Get started</Link>
            <Link href="/products" className="rounded-full border border-white/10 px-6 py-3 text-white hover:bg-white/10">Explore products</Link>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="border-t border-white/10 bg-zinc-900/40">
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 px-4 py-12">
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
            <h3 className="text-lg font-semibold text-white">Academics</h3>
            <p className="text-zinc-400 text-sm">Subjects, exams, grades, timetable.</p>
            <Link className="text-sky-400 text-sm hover:underline mt-3 inline-block" href="/products#academics">Learn more</Link>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
            <h3 className="text-lg font-semibold text-white">Finance</h3>
            <p className="text-zinc-400 text-sm">Invoices, payments, expenses, payroll.</p>
            <Link className="text-sky-400 text-sm hover:underline mt-3 inline-block" href="/products#finance">Learn more</Link>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
            <h3 className="text-lg font-semibold text-white">HR & Resources</h3>
            <p className="text-zinc-400 text-sm">Staff, attendance, library, transport.</p>
            <Link className="text-sky-400 text-sm hover:underline mt-3 inline-block" href="/products#hr">Learn more</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white">Ready to simplify your school management?</h2>
        <p className="mt-3 text-zinc-300">Join schools that trust Sukuu to power their operations.</p>
        <div className="mt-6">
          <Link href="/get-started" className="rounded-md bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700">Start Free</Link>
        </div>
      </section>
    </div>
  );
}
