"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState(null);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const router = useRouter();
  const { subdomain } = useParams();

  useEffect(() => {
    let active = true;
    async function loadSchool() {
      if (!subdomain) return;
      try {
        setSchoolLoading(true);
        const res = await fetch(`/api/schools/by-subdomain/${subdomain}`);
        if (!res.ok) throw new Error("Failed to load school");
        const data = await res.json();
        if (active) setSchool(data.school);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setSchoolLoading(false);
      }
    }
    loadSchool();
    return () => {
      active = false;
    };
  }, [subdomain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      subdomain,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push(`/${subdomain}/dashboard`);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      {/* Animated Blobs */}
      <div className="absolute inset-0 opacity-30">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Glass Container */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/10 border-white/20 rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {school?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={school.logoUrl}
                      alt={`${school.name} logo`}
                      className="w-16 h-16 rounded-2xl object-cover shadow-lg border border-white/20 bg-white/10"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-lg"></div>
                  )}
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {schoolLoading ? "Loading..." : school?.name || "School Admin Login"}
              </h1>
              <p className="text-gray-300">
                {school?.name ? `${school.name} • Admin Portal` : "Access your school management portal"}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert className="bg-red-500/20 border-red-500/30 text-red-200 mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In as Administrator"}
              </Button>
            </form>

            {/* Teacher Login */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-center text-sm text-gray-300 mb-4">Are you a teacher or staff member?</p>
              <Link href={`/${subdomain}/teacher-login`}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-white/20 text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                >
                  Teacher & Staff Login
                </Button>
              </Link>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/20 text-center">
              <p className="text-sm text-gray-400">
                Not part of this school?{" "}
                <Link href="/" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                  Return to Sukuu Home
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

