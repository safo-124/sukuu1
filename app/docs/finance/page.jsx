export const metadata = {
  title: 'Finance — Sukuu Docs',
  description: 'Invoices, payments, expenses, vendors, payroll, and accounting flows.'
};

export default function FinanceDocsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-white mb-6">Finance</h1>
        <p className="text-zinc-400 mb-8">Set up invoicing, track payments and expenses, and run payroll.</p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Data model highlights</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>Invoice, Payment, Expense, ExpenseCategory</li>
            <li>Vendor and PaymentRequest</li>
            <li>PayrollRecord</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Key API routes</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li><code>/api/schools/[schoolId]/finance/invoices/*</code></li>
            <li><code>/api/schools/[schoolId]/finance/expenses/*</code></li>
            <li><code>/api/schools/[schoolId]/hr/payroll/*</code></li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Common tasks</h2>
          <ul className="list-disc ml-6 space-y-2 text-zinc-300">
            <li>Create and send invoices to parents</li>
            <li>Record payments and generate receipts</li>
            <li>Log expenses and categorize them for reporting</li>
            <li>Run monthly payroll</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Permissions</h2>
          <p className="text-zinc-300">Admin and Accountant manage finance; Parents can view and pay invoices.</p>
        </section>

        <div className="text-sm text-zinc-400">
          <a className="text-sky-400 hover:underline" href="/docs">Back to Docs</a>
        </div>
      </div>
    </div>
  );
}
