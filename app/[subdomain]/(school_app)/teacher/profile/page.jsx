'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

export default function TeacherProfilePage() {
  const { data: session } = useSession();
  const params = useParams();
  const schoolId = session?.user?.schoolId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [me, setMe] = useState(null);
  const { theme, setTheme, systemTheme } = useTheme();
  const [accent, setAccent] = useState('violet');
  const initials = useMemo(() => {
    const f = me?.firstName || session?.user?.firstName || 'U';
    const l = me?.lastName || session?.user?.lastName || '';
    return `${f.substring(0,1)}${l.substring(0,1)}`;
  }, [me, session?.user]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!schoolId) return;
      setLoading(true);
      try {
        const [res, prefRes] = await Promise.all([
          fetch(`/api/schools/${schoolId}/me/profile`),
          fetch(`/api/schools/${schoolId}/me/preferences`),
        ]);
        const [j, pj] = await Promise.all([res.json(), prefRes.json()]);
        if (!ignore) {
          if (res.ok) setMe(j.user);
          if (prefRes.ok) {
            const t = pj.preferences?.theme || 'system';
            const a = pj.preferences?.accent || 'violet';
            setTheme(t);
            setAccent(a);
          }
          else toast.error('Failed to load profile', { description: j.error || 'Please try again.' });
        }
      } catch (e) {
        if (!ignore) toast.error('Failed to load profile');
      } finally { if (!ignore) setLoading(false); }
    }
    load();
    return () => { ignore = true; };
  }, [schoolId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!schoolId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/schools/${schoolId}/me/profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          firstName: me.firstName, lastName: me.lastName, phoneNumber: me.phoneNumber || null, profilePictureUrl: me.profilePictureUrl || null,
        })
      });
      const j = await res.json();
      if (res.ok) { setMe(j.user); toast.success('Profile updated'); }
      else toast.error('Update failed', { description: j.error || 'Please check fields.' });
    } catch {
      toast.error('Update failed');
    } finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('files', file);
      const r = await fetch('/api/upload-files', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Upload failed');
      const url = j.fileUrls?.[0];
      if (url) setMe(prev => ({ ...prev, profilePictureUrl: url }));
      toast.success('Avatar uploaded');
    } catch (e) {
      toast.error('Avatar upload failed', { description: e.message });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;
    if (!currentPassword || !newPassword) return;
    setChangingPw(true);
    try {
      const res = await fetch(`/api/schools/${schoolId}/me/password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword })
      });
      const j = await res.json();
      if (res.ok) { form.reset(); toast.success('Password updated'); }
      else toast.error('Password change failed', { description: j.error || 'Please try again.' });
    } catch {
      toast.error('Password change failed');
    } finally { setChangingPw(false); }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading profile...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={me?.profilePictureUrl || ''} alt={me?.firstName || 'User'} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <label className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[11px] px-2 py-1 rounded-md bg-zinc-800 text-white cursor-pointer border border-zinc-700">
            Change
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{me?.firstName} {me?.lastName}</h1>
          <p className="text-sm text-muted-foreground capitalize">{session?.user?.role?.toLowerCase()}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Account Details */}
        <form onSubmit={handleSave} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950 space-y-4">
          <div>
            <h2 className="text-sm font-semibold mb-1">Account</h2>
            <p className="text-xs text-muted-foreground">Basic details pulled from your staff record.</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={me?.email || ''} disabled />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First Name</Label>
                <Input value={me?.firstName || ''} onChange={(e)=>setMe(p=>({...p, firstName: e.target.value}))} required />
              </div>
              <div>
                <Label className="text-xs">Last Name</Label>
                <Input value={me?.lastName || ''} onChange={(e)=>setMe(p=>({...p, lastName: e.target.value}))} required />
              </div>
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={me?.phoneNumber || ''} onChange={(e)=>setMe(p=>({...p, phoneNumber: e.target.value}))} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>

        {/* Preferences Placeholder */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950">
          <h2 className="text-sm font-semibold mb-2">Preferences</h2>
          <p className="text-xs text-muted-foreground mb-4">Choose your theme and accent.</p>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Theme</Label>
              <div className="mt-2 flex gap-2">
                {['system','light','dark'].map((t)=> (
                  <Button key={t} type="button" size="sm" variant={theme===t? 'default':'outline'} onClick={()=>setTheme(t)}>
                    {t[0].toUpperCase()+t.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Accent</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {['violet','sky','emerald','rose','orange','amber','indigo'].map(c => (
                  <button key={c} type="button" aria-label={c} onClick={()=>setAccent(c)} className={`h-8 w-8 rounded-full ring-2 ${accent===c? 'ring-white':'ring-transparent'} outline outline-1 outline-zinc-300 dark:outline-zinc-700`} style={{ background: `oklch(var(--${c}-500-raw))` }}>
                    <span className="sr-only">{c}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" onClick={async ()=>{
                try {
                  const res = await fetch(`/api/schools/${schoolId}/me/preferences`, { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ theme, accent }) });
                  if (res.ok) {
                    toast.success('Preferences saved');
                    // Write CSS variables for accent at runtime for a cohesive effect
                    const r = document.documentElement;
                    const raw = getComputedStyle(r).getPropertyValue(`--${accent}-500-raw`).trim() || '62% 0.22 275';
                    r.style.setProperty('--accent-color', `oklch(${raw})`);
                    // Optionally map accent to primary and ring shades
                    r.style.setProperty('--primary', `oklch(${raw})`);
                    r.style.setProperty('--ring', `oklch(${raw} / 0.55)`);
                  } else {
                    const j = await res.json();
                    toast.error('Failed to save preferences', { description: j.error || '' });
                  }
                } catch {
                  toast.error('Failed to save preferences');
                }
              }}>Save Preferences</Button>
            </div>
          </div>
        </div>

        {/* Security: Change Password */}
        <form onSubmit={handleChangePassword} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950 space-y-3">
          <h2 className="text-sm font-semibold">Security</h2>
          <p className="text-xs text-muted-foreground">Change your password.</p>
          <div>
            <Label className="text-xs" htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" name="currentPassword" type="password" required />
          </div>
          <div>
            <Label className="text-xs" htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" name="newPassword" type="password" minLength={8} required />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="outline" disabled={changingPw}>{changingPw ? 'Updating...' : 'Update Password'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
