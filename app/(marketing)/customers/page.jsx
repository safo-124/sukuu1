export const metadata = { title: 'Customers — Sukuu' };

export default function CustomersPage() {
  const logos = ['Greenwood High', 'Blue Valley Academy', 'Sunrise College', 'Unity Primary'];
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-3">Customers</h1>
        <p className="text-zinc-400 mb-10">Trusted by forward-thinking schools.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {logos.map((l) => (
            <div key={l} className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-center text-zinc-300">{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
