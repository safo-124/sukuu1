// app/[subdomain]/teacher-login/page.jsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';

export default function TeacherLoginPage() {
  const params = useParams();
  const router = useRouter();
  const subdomain = params.subdomain;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!subdomain) {
      setError("School subdomain not found in URL. Please access via your school's unique link.");
      setIsLoading(false);
      return;
    }

    const result = await signIn('credentials', {
      redirect: false, // Prevent NextAuth.js from redirecting automatically
      email,
      password,
      subdomain, // Pass the subdomain to the authorize function
    });

    if (result?.error) {
      setError(result.error);
      toast.error("Login Failed", { description: result.error });
    } else {
      toast.success("Login Successful!");
      // Redirect to the teacher dashboard or a default teacher route
      router.push(`/${subdomain}/dashboard`); // Or a specific teacher dashboard route
    }
    setIsLoading(false);
  };

  const titleTextClasses = "text-black dark:text-white";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const primaryButtonClasses = "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
  const inputTextClasses = "bg-white/50 dark:bg-zinc-800/50 text-black dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-sky-500 focus:border-sky-500 dark:focus:ring-sky-500 dark:focus:border-sky-500";
  const glassCardClasses = `p-6 md:p-8 rounded-xl backdrop-blur-xl backdrop-saturate-150 shadow-xl dark:shadow-2xl bg-white/60 border border-zinc-200/50 dark:bg-zinc-900/60 dark:border-zinc-700/50`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className={`${glassCardClasses} w-full max-w-md`}>
        <div className="text-center mb-6">
          <h1 className={`text-3xl font-bold ${titleTextClasses}`}>Teacher Login</h1>
          <p className={descriptionTextClasses}>Sign in to your school's teacher portal.</p>
          {subdomain && (
            <p className={`text-sm mt-2 ${descriptionTextClasses}`}>
              Accessing portal for: <span className="font-semibold text-sky-600 dark:text-sky-400">{subdomain}.sukuu.app</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email" className={descriptionTextClasses}>Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="teacher@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`${inputTextClasses} mt-1`}
            />
          </div>
          <div>
            <Label htmlFor="password" className={descriptionTextClasses}>Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`${inputTextClasses} mt-1`}
            />
          </div>

          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Login Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className={`${primaryButtonClasses} w-full`} disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Signing In...</> : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className={descriptionTextClasses}>
            Are you a school admin?{' '}
            <Link href={`/${subdomain}/login`} className="text-sky-600 hover:underline dark:text-sky-400">
              Login here
            </Link>
          </p>
          {/* Add links for other roles if applicable, e.g., student/parent login */}
        </div>
      </div>
    </div>
  );
}
