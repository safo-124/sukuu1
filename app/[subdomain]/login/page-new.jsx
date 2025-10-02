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
import { 
  Loader2, 
  LogIn, 
  AlertTriangle, 
  School, 
  GraduationCap, 
  ChevronRight, 
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SchoolAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingSchool, setIsVerifyingSchool] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { data: session, status: sessionStatus } = useSession();
  const [schoolName, setSchoolName] = useState('');
  const [schoolExistsAndActive, setSchoolExistsAndActive] = useState(null);
  const [error, setError] = useState('');

  const subdomain = params.subdomain;
  const dashboardUrl = subdomain ? `/${subdomain}/dashboard` : '/';

  // Redirect if already authenticated for this school
  useEffect(() => {
    if (sessionStatus === 'authenticated' &&
        session?.user?.role === 'SCHOOL_ADMIN' && 
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
            toast.error("This school account is currently inactive.", { 
              description: "Please contact support or the main administrator."
            });
            setSchoolName(data.school.name);
            setSchoolExistsAndActive(false);
          } else {
            toast.error("Invalid school domain or school not found.", { 
              description: "Please check the URL and try again."
            });
            setSchoolExistsAndActive(false);
          }
        }).catch((err) => {
            toast.error("Error Verifying School", { 
              description: err.message || "Could not verify the school domain."
            });
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
        toast.error("Login unavailable.", { 
          description: "This school domain is invalid or inactive."
        });
        return;
    }
    setIsLoading(true);

    const result = await signIn('credentials', {
      redirect: false,
      email: email,
      password: password,
      subdomain: subdomain,
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      toast.error("Login Failed", { 
        description: result.error === "CredentialsSignin" 
          ? "Invalid email or password for this school." 
          : result.error 
      });
    } else if (result.ok) {
      toast.success("Login successful! Redirecting...");
      router.push(dashboardUrl);
    }
  };

  if (isVerifyingSchool) {
    return (
      <div className="min-h-[100svh] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 grid place-items-center p-4">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-10 opacity-50">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          </div>
        </div>

        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-lg">
                <School className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-ping"></div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Verifying School</h2>
              <p className="text-gray-300">Please wait while we verify your school domain...</p>
            </div>
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 grid place-items-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        {/* Soft gradient ring behind card */}
        <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-fuchsia-500/30 via-sky-400/25 to-indigo-400/25 blur-xl" aria-hidden></div>
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl ring-1 ring-white/10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              {schoolName ? `${schoolName}` : 'School Login'}
            </h1>
            
            {schoolExistsAndActive !== false && schoolName && (
              <p className="text-gray-300">
                Welcome to the {schoolName} administration portal
              </p>
            )}
            
            {schoolExistsAndActive === false && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mt-4">
                <div className="flex items-center gap-2 text-red-200">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">School Unavailable</span>
                </div>
                <p className="text-red-300 text-sm mt-1">
                  This school domain is currently inactive or not found.
                </p>
              </div>
            )}
          </div>

          {schoolExistsAndActive && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-200">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 rounded-xl h-12"
                  placeholder="admin@school.com"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-200">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 rounded-xl h-12 pr-12"
                    placeholder="••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert className="bg-red-500/20 border-red-500/30 text-red-200">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Login Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                disabled={isLoading || !schoolExistsAndActive}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="h-5 w-5" />
                    <span>Sign In</span>
                  </div>
                )}
              </Button>
            </form>
          )}


          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/20 text-center">
            <p className="text-sm text-gray-400">
              Not part of this school?{' '}
              <Link href="/" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                Return to Sukuu Home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}