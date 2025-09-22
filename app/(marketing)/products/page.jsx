import Link from 'next/link';
import { BookOpen, DollarSign, Users, Home, Newspaper, Settings } from 'lucide-react';

export const metadata = {
  title: 'Sukuu Products',
  description: 'Overview of Sukuu modules and capabilities.',
};

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-2">Products</h1>
        <p className="text-zinc-400 mb-10">Everything your school needs, in one place.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section id="academics" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="h-6 w-6 text-sky-400" />
              <h2 className="text-2xl font-bold text-white">Academics</h2>
            </div>
            <ul className="list-disc ml-6 space-y-2 text-zinc-300">
              <li>Levels, departments, classes, sections</li>
              <li>Subjects, assignments, examinations, grades</li>
              <li>Timetable and calendar scheduling</li>
            </ul>
            <div className="mt-4"><Link href="/docs" className="text-sky-400 hover:underline">Read docs</Link></div>
          </section>

          <section id="finance" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="h-6 w-6 text-green-400" />
              <h2 className="text-2xl font-bold text-white">Finance</h2>
            </div>
            <ul className="list-disc ml-6 space-y-2 text-zinc-300">
              <li>Fee structures, invoices, payments</li>
              <li>Expenses, vendors, categories</li>
              <li>Payroll with notes and receipt URLs</li>
            </ul>
            <div className="mt-4"><Link href="/docs" className="text-sky-400 hover:underline">Read docs</Link></div>
          </section>

          <section id="hr" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Users className="h-6 w-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Human Resources</h2>
            </div>
            <ul className="list-disc ml-6 space-y-2 text-zinc-300">
              <li>Staff profiles and roles</li>
              <li>Attendance tracking</li>
              <li>Payroll processing and history</li>
            </ul>
            <div className="mt-4"><Link href="/docs" className="text-sky-400 hover:underline">Read docs</Link></div>
          </section>

          <section id="resources" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Home className="h-6 w-6 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">Resources</h2>
            </div>
            <ul className="list-disc ml-6 space-y-2 text-zinc-300">
              <li>Buildings, rooms and inventory</li>
              <li>Library with catalog and loans</li>
              <li>Transport and hostels</li>
            </ul>
            <div className="mt-4"><Link href="/docs" className="text-sky-400 hover:underline">Read docs</Link></div>
          </section>

          <section id="communication" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Newspaper className="h-6 w-6 text-pink-400" />
              <h2 className="text-2xl font-bold text-white">Communication</h2>
            </div>
            <ul className="list-disc ml-6 space-y-2 text-zinc-300">
              <li>Announcements and newsletters</li>
              <li>Events and calendars</li>
              <li>Messaging (planned)</li>
            </ul>
            <div className="mt-4"><Link href="/docs" className="text-sky-400 hover:underline">Read docs</Link></div>
          </section>

          <section id="admin" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Settings className="h-6 w-6 text-indigo-400" />
              <h2 className="text-2xl font-bold text-white">Administration</h2>
            </div>
            <ul className="list-disc ml-6 space-y-2 text-zinc-300">
              <li>School profile and branding</li>
              <li>Academic years and terms</li>
              <li>User and role management</li>
            </ul>
            <div className="mt-4"><Link href="/docs" className="text-sky-400 hover:underline">Read docs</Link></div>
          </section>
        </div>

        <div className="mt-12 text-center">
          <Link href="/get-started" className="inline-block px-6 py-3 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700">Get started</Link>
        </div>
      </div>
    </div>
  );
}
