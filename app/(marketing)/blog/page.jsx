export const metadata = { title: 'Blog — Sukuu' };

export default function BlogPage() {
  const posts = [
    { title: 'Announcing Sukuu', date: '2025-09-01', excerpt: 'Sukuu is the modern School OS...' },
    { title: 'Why Multi-Tenant Matters', date: '2025-09-10', excerpt: 'Scaling your school operations securely...' },
  ];
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-3">Blog</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {posts.map((p) => (
            <article key={p.title} className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
              <div className="text-sm text-zinc-400">{new Date(p.date).toLocaleDateString()}</div>
              <h2 className="text-xl font-bold text-white mt-1">{p.title}</h2>
              <p className="text-zinc-300 mt-2">{p.excerpt}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
