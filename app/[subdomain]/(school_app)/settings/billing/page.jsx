'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

function Stat({ label, value, warn }) {
  return (
    <div className={`p-4 rounded-xl border backdrop-blur bg-white/60 dark:bg-slate-900/60 ${warn ? 'border-red-400/40' : 'border-white/10'}`}>
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${warn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{value}</div>
    </div>
  );
}

export default function SchoolBillingPage() {
  const params = useParams();
  const schoolId = params?.subdomain; // in path-based multi-tenancy this param acts as subdomain; server resolves actual school
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await fetch(`/api/schools/${schoolId}/billing`);
        if (!res.ok) throw new Error('Failed to load billing');
        const j = await res.json();
        setData(j);
      } catch (e) { setError(e.message); } finally { setLoading(false); }
    })();
  }, [schoolId]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading billing…</div>;
  if (error) return <div className="p-6 text-sm text-red-500">{error}</div>;
  if (!data) return null;
  const { school, snapshot, invoices, periodStart, periodEnd } = data;
  const warn = school.upgradeRequired;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Billing & Usage</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Quarter {new Date(periodStart).toLocaleDateString()} – {new Date(periodEnd).toLocaleDateString()}</p>
      </div>

      {warn && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">
            You have exceeded the free tier student limit ({school.freeTierStudentLimit}). To continue adding students, please upgrade or contact support.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Students" value={snapshot?.studentCount ?? '-'} warn={warn} />
        <Stat label="Parents" value={snapshot?.parentCount ?? '-'} />
        <Stat label="Free Tier Limit" value={school.freeTierStudentLimit} warn={warn} />
        <Stat label="Invoices" value={invoices.length} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Invoices</h2>
        <div className="space-y-3">
          {invoices.map(inv => (
            <div key={inv.id} className="p-4 rounded-xl border border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur flex justify-between text-sm">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Quarter {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}</div>
                <div className="text-xs uppercase tracking-wide text-gray-500">{inv.status}</div>
              </div>
              <div className="text-right font-medium text-gray-800 dark:text-gray-200">GHS {inv.totalAmount.toFixed(2)}</div>
            </div>
          ))}
          {invoices.length === 0 && <div className="text-xs text-gray-500">No invoices yet.</div>}
        </div>
      </div>
    </div>
  );
}
