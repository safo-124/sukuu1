'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Set page title
  useEffect(() => {
    document.title = 'Super Admin Login — Sukuu';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signIn('credentials', {
      redirect: false,
      email: email,
      password: password,
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error === "CredentialsSignin" ? "Invalid email or password." : "Authentication failed.");
    } else if (result.ok) {
      router.push('/dashboard'); // Adjust path
    }
  };

  return (
    <div className="min-h-[100svh] grid place-items-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#0f1e3a] to-[#1b2a4a]">
        <div className="absolute inset-0">
          {/* Floating shapes for visual interest */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-3/4 left-1/2 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%23ffffff' fill-opacity='0.1'%3e%3ccircle cx='30' cy='30' r='1'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")`,
        }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md mx-auto p-6">
        {/* Logo/Branding Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 mb-4 shadow-lg shadow-purple-500/25">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back
          </h1>
          <p className="text-gray-300">
            Sign in to your super admin dashboard
          </p>
          
          {/* Back to main site link */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-1 text-sm text-purple-300 hover:text-purple-200 transition-colors mt-3 group"
          >
            ← Back to Sukuu
            <span className="group-hover:translate-x-0.5 transition-transform">•</span>
          </Link>
        </div>

        {/* Login Form Card */}
  {/* Soft gradient ring behind card */}
  <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-fuchsia-500/30 via-sky-400/25 to-indigo-400/25 blur-xl" aria-hidden></div>
  <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl shadow-black/20 animate-slide-up ring-1 ring-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-200 flex items-center gap-2">
                <User className="w-4 h-4" />
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sukuu.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:border-purple-400 focus:bg-black/30 transition-all duration-200 focus:ring-2 focus:ring-purple-400/20"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-200 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 bg-black/20 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:border-purple-400 focus:bg-black/30 transition-all duration-200 focus:ring-2 focus:ring-purple-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm animate-shake">
                <p className="text-red-200 text-sm text-center flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>

            {/* Additional Links */}
            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-sm text-gray-400">
                Need help?{' '}
                <Link href="/contact" className="text-purple-300 hover:text-purple-200 transition-colors">
                  Contact Support
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Security Badge */}
        <div className="text-center mt-6 animate-fade-in" style={{animationDelay: '0.5s'}}>
          <div className="inline-flex items-center gap-2 text-xs text-gray-400 bg-black/20 px-3 py-2 rounded-full border border-white/10">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Secured with 256-bit SSL encryption
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out 0.2s forwards;
          opacity: 0;
        }
        
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}