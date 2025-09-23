export const metadata = { title: 'Contact — Sukuu' };

import ClientForm from './ClientForm';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-3">Contact</h1>
        <p className="text-zinc-400 mb-8">Tell us about your school and we will get in touch.</p>
        <ClientForm />
      </div>
    </div>
  );
}
