export const metadata = {
  title: 'HR — Sukuu Docs',
  description: 'Staff profiles, attendance, and payroll operations.'
};

export default function HrDocsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-white mb-6">HR</h1>
        <p className="text-zinc-400 mb-8">Manage staff profiles, attendance, roles, and payroll integrations.</p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Data model highlights</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>StaffProfile and User roles</li>
            <li>PayrollRecord</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Key API routes</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li><code>/api/schools/[schoolId]/hr/staff/*</code></li>
            <li><code>/api/schools/[schoolId]/hr/payroll/*</code></li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Common tasks</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>Onboard a new staff member</li>
            <li>Assign roles and permissions</li>
            <li>Run payroll and attach notes/receipts</li>
          </ul>
        </section>

        <div className="text-sm text-zinc-400">
          <a className="text-sky-400 hover:underline" href="/docs">Back to Docs</a>
        </div>
      </div>
    </div>
  );
}
