// app/(auth)/login/page.jsx (or your chosen path)
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Card, // We'll use a div with the custom class instead of Shadcn Card for full control of glass effect
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Still useful for structuring content
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// A simple theme toggle button (optional, for testing)
// import { MoonIcon, SunIcon } from "@radix-ui/react-icons"
// import { useTheme } from "next-themes"

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  // const { setTheme, theme } = useTheme(); // For theme toggle example

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
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Optional Theme Toggle for testing */}
      {/* <div className="absolute top-4 right-4">
        <Button variant="outline" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div> */}

      {/* Using a div for the glass effect container */}
      <div className="bw-glass-card"> {/* Applied custom glass class */}
        {/* Using CardHeader, CardTitle etc. for semantic structure but styling them with custom classes */}
        <div className="text-center mb-6"> {/* Simulating CardHeader */}
          <h1 className="text-2xl font-bold card-title-bw">Super Admin Login</h1>
          <p className="text-sm card-description-bw">
            Access your dashboard securely.
          </p>
        </div>

        {/* Simulating CardContent */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                // Input styling is now handled by the global CSS for .bw-glass-card input
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                // Input styling is now handled by the global CSS
              />
            </div>

            {error && (
              <p className="p-3 rounded-md text-sm font-medium error-message-bw text-center">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full button-primary-bw" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Login'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}