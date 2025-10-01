export const metadata = {
  title: 'Resources — Sukuu Docs',
  description: 'Library, hostel, transport, and other school resources.'
};

export default function ResourcesDocsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-white mb-6">Resources</h1>
        <p className="text-zinc-400 mb-8">Manage library loans, hostel allocation, transport routes, and related assets.</p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Data model highlights</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>Library: Book, BookLoan</li>
            <li>Hostel: Rooms and Assignments</li>
            <li>Transport: Routes and Stops</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Key API routes</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li><code>/api/schools/[schoolId]/resources/library/*</code></li>
            <li><code>/api/schools/[schoolId]/resources/hostel/*</code></li>
            <li><code>/api/schools/[schoolId]/resources/transport/*</code></li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Common tasks</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>Issue/return library books and monitor overdue items</li>
            <li>Assign and track hostel rooms</li>
            <li>Define bus routes and generate student pickup lists</li>
          </ul>
        </section>

        <div className="text-sm text-zinc-400">
          <a className="text-sky-400 hover:underline" href="/docs">Back to Docs</a>
        </div>
      </div>
    </div>
  );
}
