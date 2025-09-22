export const metadata = { title: 'Get Started — Sukuu' };

import Link from 'next/link';

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-6 py-12 text-center">
        <h1 className="text-4xl font-extrabold text-white mb-3">Get Started</h1>
        <p className="text-zinc-300">Tell us about your school to begin onboarding.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/request-school" className="rounded-md bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700">Request a School</Link>
          <Link href="/request-account" className="rounded-md border border-white/10 px-6 py-3 text-white hover:bg-white/10">Request an Admin Account</Link>
        </div>
      </div>
    </div>
  );
}
