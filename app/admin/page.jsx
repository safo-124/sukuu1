import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminRedirectPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === 'SUPER_ADMIN') {
    redirect('/dashboard');
  }
  redirect('/login?admin=1');
}
