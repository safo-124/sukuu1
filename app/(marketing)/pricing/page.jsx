export const metadata = { title: 'Pricing — Sukuu' };

export default function PricingPage() {
  const tiers = [
    { name: 'Starter', price: '$0', desc: 'For small schools trying Sukuu', features: ['Up to 50 students', 'Core modules', 'Email support'] },
    { name: 'Growth', price: '$99/mo', desc: 'For growing schools', features: ['Up to 1,000 students', 'Advanced modules', 'Priority support'] },
    { name: 'Enterprise', price: 'Contact us', desc: 'Custom needs at scale', features: ['Unlimited students', 'Custom SLAs', 'Dedicated onboarding'] },
  ];
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-3">Pricing</h1>
        <p className="text-zinc-400 mb-10">Simple plans that scale with your school.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <div key={t.name} className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
              <div className="text-lg font-semibold text-white">{t.name}</div>
              <div className="mt-1 text-3xl font-extrabold">{t.price}</div>
              <p className="mt-2 text-zinc-400">{t.desc}</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {t.features.map((f) => <li key={f}>• {f}</li>)}
              </ul>
              <button className="mt-6 w-full rounded-md bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700">Choose {t.name}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
