export const metadata = { title: 'Solutions — Sukuu' };

export default function SolutionsPage() {
  const solutions = [
    { title: 'K-12 Schools', desc: 'Curriculum planning, grading, communication, and payments in one place.' },
    { title: 'Colleges', desc: 'Programs, departments, exams and student services at scale.' },
    { title: 'Training Centers', desc: 'Cohorts, schedules, resources and streamlined payments.' },
  ];
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-3">Solutions</h1>
        <p className="text-zinc-400 mb-10">Flexible enough for any learning organization.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {solutions.map((s) => (
            <div key={s.title} className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
              <div className="text-lg font-semibold text-white">{s.title}</div>
              <p className="mt-2 text-zinc-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
