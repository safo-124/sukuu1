import Link from 'next/link';

export const metadata = {
  title: 'Get Started — Sukuu',
  description: 'Quick start for admins and developers to onboard with Sukuu.',
};

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-2">Get started</h1>
        <p className="text-zinc-400 mb-10">Choose your path to launch quickly.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Admin path */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-2xl font-bold text-white mb-2">For School Admins</h2>
            <ol className="list-decimal ml-6 space-y-2 text-zinc-300">
              <li>Log in or request access to your school portal.</li>
              <li>Complete School Profile and set Academic Year & Terms.</li>
              <li>Invite staff (teachers, accountants) and assign roles.</li>
              <li>Configure Finance: fee structures, bank/payment settings.</li>
              <li>Launch: publish timetable, set up classes, add students.</li>
            </ol>
            <div className="mt-6 flex gap-3 flex-wrap">
              <Link href="/login" className="px-4 py-2 bg-white text-zinc-900 rounded-md font-semibold hover:bg-zinc-200">Log in</Link>
              <Link href="/request-account" className="px-4 py-2 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700">Request an Account</Link>
              <Link href="/request-school" className="px-4 py-2 bg-sky-700 text-white rounded-md font-semibold hover:bg-sky-800">Request a School</Link>
              <Link href="/docs" className="px-4 py-2 border border-zinc-700 text-white rounded-md font-semibold hover:bg-zinc-800">Read docs</Link>
            </div>
          </section>

          {/* Developer path */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-2xl font-bold text-white mb-2">For Developers</h2>
            <ol className="list-decimal ml-6 space-y-2 text-zinc-300">
              <li>Clone the repo and install dependencies.</li>
              <li>Configure <code>.env</code> with <code>DATABASE_URL</code> and <code>NEXTAUTH_SECRET</code>.</li>
              <li>Run Prisma migrations and seed credentials.</li>
              <li>Start the dev server and sign in with seeded user.</li>
              <li>Customize modules (Academics, Finance, HR) as needed.</li>
            </ol>
            <div className="mt-6 flex gap-3">
              <Link href="/docs" className="px-4 py-2 bg-white text-zinc-900 rounded-md font-semibold hover:bg-zinc-200">Developer docs</Link>
              <a href="https://prisma.io" target="_blank" className="px-4 py-2 border border-zinc-700 text-white rounded-md font-semibold hover:bg-zinc-800">Prisma</a>
            </div>
          </section>
        </div>

        <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-xl font-bold text-white mb-2">Need a demo?</h3>
          <p className="text-zinc-300">We’ll walk you through Sukuu and tailor a setup for your school or group.</p>
          <div className="mt-4">
            <Link href="/contact" className="inline-block px-4 py-2 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700">Contact sales</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
