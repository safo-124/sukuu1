"use client";
export default function StatsCard({ label, value, icon: Icon, accent = 'sky' }) {
  const color = {
    sky: 'text-sky-600 dark:text-sky-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    violet: 'text-violet-600 dark:text-violet-400',
    amber: 'text-amber-600 dark:text-amber-400'
  }[accent] || 'text-sky-600 dark:text-sky-400';

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex items-center gap-4 shadow-sm">
      {Icon && <div className={`p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 ${color}`}><Icon className="h-5 w-5" /></div>}
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400 font-medium">{label}</div>
        <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</div>
      </div>
    </div>
  );
}
