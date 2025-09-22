export const metadata = {
  title: 'Contact — Sukuu',
  description: 'Get in touch with the Sukuu team.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-2">Contact</h1>
        <p className="text-zinc-400 mb-8">We’ll get back to you within 1–2 business days.</p>

        <form className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Name</label>
            <input className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-600" placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Email</label>
            <input type="email" className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-600" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Message</label>
            <textarea rows="5" className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-600" placeholder="How can we help?" />
          </div>
          <button type="button" className="px-4 py-2 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700">Send message</button>
        </form>

        <div className="mt-8 text-sm text-zinc-400">
          <p>Email: support@sukuu.example</p>
          <p>Address: 123 Education Way, Learning City</p>
        </div>
      </div>
    </div>
  );
}
