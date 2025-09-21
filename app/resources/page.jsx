import Link from 'next/link';

export const metadata = {
  title: 'Sukuu Resources',
  description: 'Documentation, blog, community, and support.',
};

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-2">Resources</h1>
        <p className="text-zinc-400 mb-8">Everything you need to succeed with Sukuu.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-xl font-bold text-white mb-1">Documentation</h2>
            <p className="text-zinc-400 mb-3">Guides for setup, APIs, and workflows.</p>
            <Link href="/docs" className="text-sky-400 hover:underline">Read docs</Link>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-xl font-bold text-white mb-1">Blog</h2>
            <p className="text-zinc-400 mb-3">News, tips, and product updates.</p>
            <Link href="/blog" className="text-sky-400 hover:underline">Go to blog</Link>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-xl font-bold text-white mb-1">Community</h2>
            <p className="text-zinc-400 mb-3">Join the conversation and share best practices.</p>
            <Link href="#" className="text-sky-400 hover:underline">Join community</Link>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-xl font-bold text-white mb-1">Support</h2>
            <p className="text-zinc-400 mb-3">We’re here to help when you need it.</p>
            <Link href="#" className="text-sky-400 hover:underline">Contact support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
