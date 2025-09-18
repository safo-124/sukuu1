'use client';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function TeacherProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user?.profilePictureUrl || ''} alt={user?.firstName || 'User'} />
          <AvatarFallback>{(user?.firstName||'U').substring(0,1)}{(user?.lastName||'').substring(0,1)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold">{user?.firstName} {user?.lastName}</h1>
          <p className="text-sm text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950">
          <h2 className="text-sm font-semibold mb-2">Account</h2>
          <p className="text-xs text-muted-foreground mb-3">Basic details pulled from your staff record.</p>
          <ul className="text-sm space-y-1">
            <li><span className="text-muted-foreground">Email:</span> {user?.email}</li>
            <li><span className="text-muted-foreground">First Name:</span> {user?.firstName}</li>
            <li><span className="text-muted-foreground">Last Name:</span> {user?.lastName}</li>
          </ul>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950">
          <h2 className="text-sm font-semibold mb-2">Preferences</h2>
          <p className="text-xs text-muted-foreground mb-3">Theme & locale preferences (future feature).</p>
          <Button size="sm" variant="outline" disabled>Coming Soon</Button>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950">
          <h2 className="text-sm font-semibold mb-2">Security</h2>
          <p className="text-xs text-muted-foreground mb-3">Password & 2FA management to be added.</p>
          <Button size="sm" variant="outline" disabled>Coming Soon</Button>
        </div>
      </div>
    </div>
  );
}
