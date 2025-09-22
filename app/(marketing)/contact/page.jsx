"use client";

export const metadata = { title: 'Contact — Sukuu' };

export default function ContactPage() {
  const submit = (e) => {
    e.preventDefault();
    alert('We will reach out shortly.');
  };
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-3">Contact</h1>
        <p className="text-zinc-400 mb-8">Tell us about your school and we will get in touch.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Name</label>
            <input required className="w-full rounded-md bg-zinc-900 border border-white/10 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Email</label>
            <input required type="email" className="w-full rounded-md bg-zinc-900 border border-white/10 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Message</label>
            <textarea required rows={5} className="w-full rounded-md bg-zinc-900 border border-white/10 px-3 py-2" />
          </div>
          <button className="rounded-md bg-sky-600 px-6 py-2 font-semibold text-white hover:bg-sky-700">Send</button>
        </form>
      </div>
    </div>
  );
}
