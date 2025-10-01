export const metadata = {
  title: 'Sukuu Documentation',
  description: 'Project overview, architecture, setup, data models, APIs, roles, and deployment.',
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-extrabold text-white mb-6">Sukuu Documentation</h1>
        <p className="text-zinc-400 mb-8">A complete guide to running and extending the Sukuu platform.</p>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">Overview</h2>
          <p className="text-zinc-300">Sukuu is a multi-tenant school management platform built with Next.js (App Router), Prisma ORM, NextAuth for authentication, and a Flutter mobile app for parents. It covers Academics, Finance, HR, Communication, and Resources, with strict role-based access and subdomain or path-based tenancy.</p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">Architecture</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>Web: Next.js App Router under <code>app/</code>, UI via Tailwind and shadcn/ui components.</li>
            <li>Auth: NextAuth with Credentials provider, JWT strategy, role and school binding in <code>lib/auth.js</code>.</li>
            <li>Data: Prisma ORM with PostgreSQL; schema in <code>prisma/schema.prisma</code> and migrations in <code>prisma/migrations/</code>.</li>
            <li>APIs: RESTful routes in <code>app/api/**</code> for super admin and tenant features.</li>
            <li>Mobile: Flutter parent app (fees, attendance, grades, messages) with secure storage and glass UI.</li>
            <li>Tenancy: Subdomain routing via <code>middleware.js</code> with path-based fallback.</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">Setup & Development</h2>
          <ol className="list-decimal ml-6 space-y-2 text-zinc-300">
            <li>Install dependencies: <code>npm install</code></li>
            <li>Set environment variables: <code>.env</code> with <code>DATABASE_URL</code>, <code>NEXTAUTH_SECRET</code>, <code>NEXT_PUBLIC_MAIN_DOMAIN</code>.</li>
            <li>Run Prisma migrations: <code>npx prisma migrate dev</code></li>
            <li>Seed credentials (optional): <code>node prisma/seed.js</code></li>
            <li>Start dev server: <code>npm run dev</code></li>
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">Core Data Models</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>Schools & Subdomains</li>
            <li>Users with roles: SUPER_ADMIN, ADMIN, ACCOUNTANT, TEACHER, STUDENT, PARENT</li>
            <li>Finance: Invoices, Payments, Expenses, ExpenseCategory, Vendors, PayrollRecord, PaymentRequest</li>
            <li>Academics: Levels, Departments, Classes, Subjects, Exams, Grades</li>
            <li>People: StaffProfile, StudentProfile, Guardians</li>
            <li>Resources: Library, Hostel, Transport (as applicable)</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">API Endpoints</h2>
          <p className="text-zinc-300 mb-3">Key routes (selection):</p>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li><code>app/api/schools/[schoolId]/finance/*</code> — invoices, payments, expenses</li>
            <li><code>app/api/schools/[schoolId]/hr/payroll</code> — list/create payroll records</li>
            <li><code>app/api/schools/[schoolId]/hr/payroll/[recordId]/pay</code> — pay payroll (notes, receipt URL)</li>
            <li><code>app/api/parents/pay</code> — parent payment flow</li>
            <li><code>app/api/superadmin/*</code> — platform-wide management</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">Roles & Permissions</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>Super Admin: access to <code>/(superadmin)</code> app area</li>
            <li>Admin/Accountant: finance and HR actions; role-aware UI</li>
            <li>Teacher: teacher dashboard and academics</li>
            <li>Student/Parent: grades, attendance, invoices, and payments</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">Security & Compliance</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>JWT sessions with NextAuth; middleware guards on tenant and role routes.</li>
            <li>Least-privilege UI (role-aware) across HR/Finance actions.</li>
            <li>Auditability: Payroll payments store notes and receipt URLs.</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">Deployment</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>Works on Vercel or Node hosts; set <code>NEXT_PUBLIC_MAIN_DOMAIN</code> for subdomain handling.</li>
            <li>Run Prisma <code>generate</code> and <code>migrate deploy</code> on release pipelines.</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">Product Documentation</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li><a href="/docs/academics" className="text-sky-400 hover:underline">Academics</a>: subjects, exams, grades, timetable</li>
            <li><a href="/docs/finance" className="text-sky-400 hover:underline">Finance</a>: invoices, payments, expenses, payroll</li>
            <li><a href="/docs/hr" className="text-sky-400 hover:underline">HR</a>: staff, attendance, payroll</li>
            <li><a href="/docs/resources" className="text-sky-400 hover:underline">Resources</a>: library, hostel, transport</li>
            <li><a href="/products#communication" className="text-sky-400 hover:underline">Communication</a>: announcements, events</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
