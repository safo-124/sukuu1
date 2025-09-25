'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, RefreshCw, FileText, Activity } from 'lucide-react';

function Stat({ label, value, hint }) {
  return (
    <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-white/20 dark:border-white/10 backdrop-blur">
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
      {hint && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</div>}
    </div>
  );
}

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true); setError('');
    try {
      const [invRes, snapRes] = await Promise.all([
        fetch('/api/superadmin/billing/invoices?limit=10'),
        fetch('/api/superadmin/billing/usage-snapshots?limit=10')
      ]);
      if (!invRes.ok) throw new Error('Failed invoices');
      if (!snapRes.ok) throw new Error('Failed snapshots');
      const invJson = await invRes.json();
      const snapJson = await snapRes.json();
      setInvoices(invJson.invoices || []);
      setSnapshots(snapJson.snapshots || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.replace('/login'); return; }
    if (session.user?.role !== 'SUPER_ADMIN') { router.replace('/login?error=UnauthorizedRole'); return; }
    loadData();
  }, [status, session]);

  async function runQuarterly() {
    setRunning(true); setError('');
    try {
      const res = await fetch('/api/superadmin/billing/run-quarterly', { method: 'POST' });
      if (!res.ok) throw new Error('Billing run failed');
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Platform Billing</h1>
        <p className="text-gray-600 dark:text-gray-400">Usage-based quarterly billing overview.</p>
      </div>

      <div className="flex gap-4 flex-wrap items-center">
        <Button onClick={runQuarterly} disabled={running} className="rounded-xl">
          <RefreshCw className="w-4 h-4 mr-2" />
          {running ? 'Running…' : 'Run Quarterly Billing'}
        </Button>
        <Button variant="outline" onClick={loadData} disabled={loading} className="rounded-xl">
          <Activity className="w-4 h-4 mr-2" /> Refresh
        </Button>
        {error && <div className="text-sm text-red-500">{error}</div>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Invoices" value={invoices.length} />
        <Stat label="Snapshots" value={snapshots.length} />
        <Stat label="Latest Student Count" value={snapshots[0]?.studentCount ?? '-'} hint="most recent snapshot" />
        <Stat label="Latest Parent Count" value={snapshots[0]?.parentCount ?? '-'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Usage Snapshots</h2>
          <div className="space-y-3">
            {loading && <div className="text-gray-500">Loading…</div>}
            {!loading && snapshots.length === 0 && <div className="text-gray-500 text-sm">No snapshots yet.</div>}
            {snapshots.map(s => (
              <div key={s.id} className="p-4 rounded-xl border border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur flex justify-between text-sm">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{s.school?.name || 'School'}</div>
                  <div className="text-gray-500 dark:text-gray-400">{new Date(s.periodStart).toLocaleDateString()} – {new Date(s.periodEnd).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-700 dark:text-gray-200">Students: {s.studentCount}</div>
                  <div className="text-gray-700 dark:text-gray-200">Parents: {s.parentCount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Invoices</h2>
          <div className="space-y-3">
            {loading && <div className="text-gray-500">Loading…</div>}
            {!loading && invoices.length === 0 && <div className="text-gray-500 text-sm">No invoices yet.</div>}
            {invoices.map(inv => (
              <div key={inv.id} className="p-4 rounded-xl border border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur flex justify-between text-sm">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{inv.school?.name || 'School'}</div>
                  <div className="text-gray-500 dark:text-gray-400">{new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-700 dark:text-gray-200 font-medium">GHS {inv.totalAmount.toFixed(2)}</div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{inv.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-r from-sky-600/10 to-purple-600/10 backdrop-blur">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Next Steps</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Integrate payments & export for accounting, add charts (MRR, ARPU) and automated scheduling (cron) for quarterly runs.</p>
        <Button variant="ghost" className="rounded-xl">View roadmap <ArrowRight className="w-4 h-4 ml-1" /></Button>
      </div>
    </div>
  );
}
