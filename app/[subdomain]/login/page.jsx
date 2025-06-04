// app/[subdomain]/login/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import Link from 'next/link';
import { Loader2, LogIn } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';


export default function SchoolAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingSchool, setIsVerifyingSchool] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { data: session, status: sessionStatus } = useSession();
  const [schoolName, setSchoolName] = useState('');
  const [schoolExistsAndActive, setSchoolExistsAndActive] = useState(null);
  const [error, setError] = useState(''); // FIX: Declare error as a state variable

  const subdomain = params.subdomain;
  const dashboardUrl = subdomain ? `/${subdomain}/dashboard` : '/';

  // Redirect if already authenticated for this school
  useEffect(() => {
    if (sessionStatus === 'authenticated' &&
        session?.user?.role === 'SCHOOL_ADMIN' && // Only redirect if it's an admin
        session?.user?.schoolSubdomain === subdomain) {
      router.replace(dashboardUrl);
    }
  }, [sessionStatus, session, router, subdomain, dashboardUrl]);

  // Fetch school name for display and validate subdomain
  useEffect(() => {
    if (subdomain) {
      setIsVerifyingSchool(true);
      fetch(`/api/schools/by-subdomain/${subdomain}`)
        .then(res => {
          if (!res.ok) {
            return res.json().then(errData => {
              throw new Error(errData.error || `School domain check failed: ${res.status}`);
            }).catch(() => {
              throw new Error(`School domain check failed: ${res.status}`);
            });
          }
          return res.json();
        })
        .then(data => {
          if (data.school && data.school.name && data.school.isActive) {
            setSchoolName(data.school.name);
            setSchoolExistsAndActive(true);
          } else if (data.school && !data.school.isActive) {
            toast.error("This school account is currently inactive.", { description: "Please contact support or the main administrator."});
            setSchoolName(data.school.name);
            setSchoolExistsAndActive(false);
          } else {
            toast.error("Invalid school domain or school not found.", { description: "Please check the URL and try again."});
            setSchoolExistsAndActive(false);
          }
        }).catch((err) => {
            toast.error("Error Verifying School", { description: err.message || "Could not verify the school domain."});
            setSchoolExistsAndActive(false);
        }).finally(() => {
            setIsVerifyingSchool(false);
        });
    } else {
        toast.error("School domain is missing from URL.");
        setSchoolExistsAndActive(false);
        setIsVerifyingSchool(false);
    }
  }, [subdomain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolExistsAndActive) {
        toast.error("Login unavailable.", { description: "This school domain is invalid or inactive."});
        return;
    }
    setIsLoading(true);

    const result = await signIn('credentials', {
      redirect: false,
      email: email,
      password: password,
      subdomain: subdomain, // FIX: Changed 'subdomain_context' to 'subdomain'
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error); // Set the error state
      toast.error("Login Failed", { description: result.error === "CredentialsSignin" ? "Invalid email or password for this school." : result.error });
    } else if (result.ok) {
      toast.success("Login successful! Redirecting...");
      router.push(dashboardUrl);
    }
  };

  // --- Tailwind Class Constants for "Beautiful" B&W Design ---
  const titleTextClasses = "text-zinc-900 dark:text-zinc-50";
  const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
  const glassCardClasses = `
    w-full max-w-md p-8 md:p-10
    rounded-xl backdrop-blur-2xl backdrop-saturate-150
    shadow-2xl dark:shadow-black/50
    bg-white/80 border border-zinc-200/90
    dark:bg-zinc-900/80 dark:border dark:border-zinc-700/90
  `; // Enhanced glass effect
  const labelTextClasses = `text-sm font-medium ${titleTextClasses}`;
  const inputTextClasses = `
    bg-white/70 dark:bg-zinc-800/70
    text-zinc-900 dark:text-zinc-50
    border-zinc-300 dark:border-zinc-700
    focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black focus:ring-black dark:focus:ring-white
    focus:border-transparent dark:focus:border-transparent
    placeholder:text-zinc-400 dark:placeholder:text-zinc-500
    transition-shadow duration-150 ease-in-out
  `; // More refined input
  const primaryButtonClasses = `
    bg-black text-white
    hover:bg-zinc-800
    dark:bg-white dark:text-black
    dark:hover:bg-zinc-200
    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black dark:focus-visible:ring-white dark:focus-visible:ring-offset-black
    transition-colors duration-150 ease-in-out
  `;
  const teacherLoginButtonClasses = `
    w-full py-3 text-base font-semibold flex items-center justify-center gap-2
    bg-sky-600 text-white
    hover:bg-sky-700
    dark:bg-sky-400 dark:text-zinc-900
    dark:hover:bg-sky-300
    focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-600 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-black
    transition-colors duration-150 ease-in-out
  `; // New button style for teacher login
  const linkTextClasses = "font-medium text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white transition-colors";

  if (isVerifyingSchool) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-zinc-100 dark:bg-zinc-950">
            <Loader2 className={`h-12 w-12 animate-spin ${descriptionTextClasses}`} />
            <p className={`mt-4 text-lg ${titleTextClasses}`}>Verifying school domain...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-zinc-100 dark:bg-zinc-950 antialiased">
      <div className={glassCardClasses}>
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold ${titleTextClasses}`}>
            {schoolName || (subdomain ? 'School Login' : 'Loading...')}
          </h1>
          {schoolExistsAndActive !== false && schoolName && (
            <p className={`mt-2 ${descriptionTextClasses}`}>
              Welcome to the {schoolName} portal.
            </p>
          )}
          {schoolExistsAndActive === false && (
            <p className="text-red-600 dark:text-red-400 mt-2 font-medium">
              This school domain is currently unavailable.
            </p>
          )}
        </div>

        {schoolExistsAndActive && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className={labelTextClasses}>Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`${inputTextClasses} mt-1.5`}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className={labelTextClasses}>Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${inputTextClasses} mt-1.5`}
                placeholder="••••••••"
              />
            </div>
            {/* Error Alert */}
            {error && ( // Now 'error' is a state variable
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 dark:border-red-700/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              className={`${primaryButtonClasses} w-full py-3 text-base font-semibold flex items-center justify-center gap-2`}
              disabled={isLoading || !schoolExistsAndActive}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
              <span>{isLoading ? 'Signing In...' : 'Sign In as Admin'}</span>
            </Button>
          </form>
        )}

        {/* Teacher Login Button */}
        {schoolExistsAndActive && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <p className={`text-center text-sm mb-3 ${descriptionTextClasses}`}>
              Are you a teacher?
            </p>
            <Link href={`/${subdomain}/teacher-login`} passHref>
              <Button
                type="button"
                className={`${teacherLoginButtonClasses} w-full`}
                disabled={!schoolExistsAndActive}
              >
                Sign In as Teacher
              </Button>
            </Link>
          </div>
        )}

        <p className={`mt-6 text-center text-sm ${descriptionTextClasses}`}>
          Not a school administrator? <Link href="/" className={linkTextClasses}>Return to Sukuu Home</Link>
        </p>
      </div>
    </div>
  );
}
