export const metadata = {
  title: 'Academics — Sukuu Docs',
  description: 'Subjects, classes, timetable, exams and grades APIs and flows.'
};

export default function AcademicsDocsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-white mb-6">Academics</h1>
        <p className="text-zinc-400 mb-8">Manage subjects, classes, timetable, exams, grades and related student data.</p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Data model highlights</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>Levels, Departments, Classes, Subjects</li>
            <li>Exams & Grades</li>
            <li>Timetable sessions</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Key API routes</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li><code>/api/schools/[schoolId]/academics/*</code> (levels, classes, subjects)</li>
            <li><code>/api/schools/[schoolId]/exams/*</code> and <code>/grades/*</code></li>
            <li><code>/api/schools/[schoolId]/timetable/*</code></li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Common tasks</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>Create subjects and assign to classes</li>
            <li>Publish exam results and generate grade reports</li>
            <li>Build weekly timetables per class</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Permissions</h2>
          <p className="text-zinc-300">Admins and Teachers manage academics; Students and Parents have read access to grades and timetable.</p>
        </section>

        <div className="text-sm text-zinc-400">
          <a className="text-sky-400 hover:underline" href="/docs">Back to Docs</a>
        </div>
      </div>
    </div>
  );
}
