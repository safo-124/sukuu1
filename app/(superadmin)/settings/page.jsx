// app/(superadmin)/settings/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Save } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Example settings
  const [platformName, setPlatformName] = useState('Sukuu');
  const [supportEmail, setSupportEmail] = useState('support@sukuu.com');
  const [allowSchoolSignup, setAllowSchoolSignup] = useState(true);
  const [enableParentApp, setEnableParentApp] = useState(true);
  // Billing settings (GHS)
  const [studentQuarterFee, setStudentQuarterFee] = useState(10); // GHS per student per 3 months
  const [parentQuarterFee, setParentQuarterFee] = useState(5);    // GHS per parent per 3 months

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (session.user?.role !== 'SUPER_ADMIN') {
      router.replace('/login?error=UnauthorizedRole');
      return;
    }
    // fetch existing settings
    (async () => {
      try {
        const res = await fetch('/api/superadmin/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const data = await res.json();
        const s = data.settings || {};
        if (typeof s.platformName === 'string') setPlatformName(s.platformName);
        if (typeof s.supportEmail === 'string') setSupportEmail(s.supportEmail);
        if (typeof s.allowSchoolSignup === 'boolean') setAllowSchoolSignup(s.allowSchoolSignup);
        if (typeof s.enableParentApp === 'boolean') setEnableParentApp(s.enableParentApp);
  if (typeof s.studentQuarterFee === 'number') setStudentQuarterFee(s.studentQuarterFee);
  if (typeof s.parentQuarterFee === 'number') setParentQuarterFee(s.parentQuarterFee);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, session, router]);

  const onSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const payload = {
        settings: {
          platformName,
          supportEmail,
          allowSchoolSignup,
          enableParentApp,
          studentQuarterFee: Number(studentQuarterFee) || 0,
          parentQuarterFee: Number(parentQuarterFee) || 0,
        },
      };
      const res = await fetch('/api/superadmin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to save');
      }
      setSuccess('Settings saved');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-600 dark:text-gray-400">Loading settings…</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Configure global platform options for all schools.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Name */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">Brand</div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Platform Name</label>
          <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
        </div>

        {/* Support Email */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">Support</div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Support Email</label>
          <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
        </div>

        {/* Allow School Signup */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Onboarding</div>
              <div className="font-medium text-gray-900 dark:text-white">Allow New School Signups</div>
            </div>
            <Switch checked={allowSchoolSignup} onCheckedChange={setAllowSchoolSignup} />
          </div>
        </div>

        {/* Enable Parent App */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Mobile</div>
              <div className="font-medium text-gray-900 dark:text-white">Enable Parent App</div>
            </div>
            <Switch checked={enableParentApp} onCheckedChange={setEnableParentApp} />
          </div>
        </div>

        {/* Billing: Student Fee */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">Billing</div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Student Fee (GHS / 3 months)</label>
          <Input type="number" min="0" step="0.01" value={studentQuarterFee} onChange={(e) => setStudentQuarterFee(e.target.value)} />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Charged per active student each quarter (term). Default: 10 GHS.</p>
        </div>

        {/* Billing: Parent App Fee */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-2xl p-6">
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">Billing</div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Parent App Fee (GHS / 3 months)</label>
            <Input type="number" min="0" step="0.01" value={parentQuarterFee} onChange={(e) => setParentQuarterFee(e.target.value)} />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Charged per connected parent each quarter. Default: 5 GHS.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving} className="rounded-xl">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
