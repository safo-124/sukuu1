'use client';

import { useState } from 'react';

export default function RequestSchoolForm() {
  const [form, setForm] = useState({ requesterName: '', requesterEmail: '', requesterPhone: '', schoolName: '', subdomain: '', message: '', requestedModules: [] });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleModule = (key) => {
    setForm((prev) => {
      const set = new Set(prev.requestedModules);
      if (set.has(key)) set.delete(key); else set.add(key);
      return { ...prev, requestedModules: Array.from(set) };
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/schools/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Failed');
      setDone(true);
    } catch (e) {
      setError('Unable to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200">
        <div className="max-w-lg mx-auto px-6 py-12 text-center">
          <h1 className="text-4xl font-extrabold text-white mb-2">Request received</h1>
          <p className="text-zinc-400">We’ll reach out shortly at the email provided.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-2">Request a School</h1>
        <p className="text-zinc-400 mb-6">Tell us about your school and we’ll get you onboarded.</p>

        {error && <div className="mb-4 text-rose-400">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Your name</label>
            <input name="requesterName" value={form.requesterName} onChange={onChange} className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Email</label>
            <input name="requesterEmail" type="email" value={form.requesterEmail} onChange={onChange} className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Phone (optional)</label>
            <input name="requesterPhone" value={form.requesterPhone} onChange={onChange} className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Proposed subdomain (optional)</label>
            <input name="subdomain" value={form.subdomain} onChange={onChange} placeholder="e.g., greenfield" className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-zinc-400 mb-1">School name</label>
            <input name="schoolName" value={form.schoolName} onChange={onChange} className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-zinc-400 mb-1">Message (optional)</label>
            <textarea name="message" rows="5" value={form.message} onChange={onChange} className="w-full rounded-md bg-zinc-800 text-white px-3 py-2 border border-zinc-700" />
          </div>
          <div className="md:col-span-2">
            <div className="block text-sm text-zinc-400 mb-1">Modules you’re interested in (optional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[{
                key:'parent-app',label:'Parent App Access'
              },{ key:'auto-timetable',label:'Auto Timetable' },{ key:'finance',label:'Finance' },{ key:'advanced-hr',label:'Advanced HR' },{ key:'procurement',label:'Procurement' },{ key:'library',label:'Library' },{ key:'transportation',label:'Transportation' },{ key:'hostel',label:'Hostel' }].map(m => (
                <label key={m.key} className="flex items-center gap-2 p-2 rounded border border-zinc-700 bg-zinc-800/60">
                  <input type="checkbox" checked={form.requestedModules.includes(m.key)} onChange={() => toggleModule(m.key)} className="accent-sky-500" />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button disabled={submitting} onClick={submit} className="px-4 py-2 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700 disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit request'}</button>
        </div>
      </div>
    </div>
  );
}
