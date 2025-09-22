// app/page.jsx
'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export default function LandingPage() {
  const { setTheme, theme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans antialiased relative">
      {/* Theme toggle */}
      <button
        aria-label="Toggle theme"
        onClick={toggleTheme}
        className="fixed right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 backdrop-blur hover:bg-white/20 transition"
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>
      {/* Background gradient effect - mimic Prisma */}
      <div className="absolute inset-0 z-0 opacity-20" style={{
        background: 'radial-gradient(at 50% 10%, #3b0764, transparent), radial-gradient(at 50% 90%, #0c0a09, transparent)'
      }}></div>

      {/* Global Navbar is rendered from RootLayout */}

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center py-20 px-6 max-w-4xl mx-auto min-h-[70vh]">
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-white mb-6">
          All-in-one School OS. <br /> Built to scale.
        </h1>
        <p className="text-lg md:text-xl text-zinc-300 mb-10 max-w-2xl">
          Academics, Finance, HR, Communication and Resources in a single, secure platform. Multi-tenant by design, fast by default.
        </p>
        <div className="flex space-x-4">
          <Link href="/get-started" className="px-8 py-3 bg-sky-600 text-white rounded-full text-lg font-semibold hover:bg-sky-700 transition-colors duration-300 shadow-xl">
            Get started
          </Link>
          <Link href="/products" className="px-8 py-3 border border-zinc-500 text-white rounded-full text-lg font-semibold hover:bg-zinc-800 transition-colors duration-300">
            Learn More
          </Link>
        </div>
      </section>
      {/* Highlights Section (brief) */}
      <section className="relative z-10 py-16 px-6 bg-zinc-900 border-t border-b border-zinc-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-lg font-semibold mb-1">Academics</h3>
            <p className="text-zinc-400 text-sm">Subjects, exams, grades, timetable.</p>
            <Link href="/products#academics" className="text-sky-400 text-sm hover:underline mt-3 inline-block">Learn more</Link>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-lg font-semibold mb-1">Finance</h3>
            <p className="text-zinc-400 text-sm">Invoices, payments, expenses, payroll.</p>
            <Link href="/products#finance" className="text-sky-400 text-sm hover:underline mt-3 inline-block">Learn more</Link>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-lg font-semibold mb-1">HR & Resources</h3>
            <p className="text-zinc-400 text-sm">Staff, attendance, library, transport.</p>
            <Link href="/products#hr" className="text-sky-400 text-sm hover:underline mt-3 inline-block">Learn more</Link>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="relative z-10 py-20 px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Ready to simplify your school management?
        </h2>
        <p className="text-lg text-zinc-300 mb-10 max-w-2xl mx-auto">
          Join hundreds of schools globally that trust Sukuu to power their operations from idea to scale.
        </p>
        <Link href="/signup" className="px-10 py-4 bg-sky-600 text-white rounded-full text-xl font-semibold hover:bg-sky-700 transition-colors duration-300 shadow-xl">
          Start Your Free Trial Today
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-zinc-950 py-12 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 text-zinc-400 text-sm">
          <div>
            <h3 className="font-bold text-white mb-4 text-lg">Sukuu</h3>
            <p className="mb-4">Modern school management for the digital age.</p>
            <div className="flex space-x-4">
              {/* Socials - Placeholder icons */}
              <Link href="#" className="hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.5-1.2 3-2.6 4.5-4C20.5 2.5 22 4 22 4z"/></svg></Link>
              <Link href="#" className="hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-linkedin"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg></Link>
              <Link href="#" className="hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></Link>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">Product</h3>
            <ul>
              <li><Link href="#products" className="hover:text-white py-1 block">Overview</Link></li>
              <li><Link href="#products" className="hover:text-white py-1 block">Academics</Link></li>
              <li><Link href="#products" className="hover:text-white py-1 block">Finance</Link></li>
              <li><Link href="#products" className="hover:text-white py-1 block">HR & People</Link></li>
              <li><Link href="#products" className="hover:text-white py-1 block">Resources</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">Resources</h3>
            <ul>
              <li><Link href="/docs" className="hover:text-white py-1 block">Documentation</Link></li>
              <li><Link href="/blog" className="hover:text-white py-1 block">Blog</Link></li>
              <li><Link href="#" className="hover:text-white py-1 block">Community</Link></li>
              <li><Link href="#" className="hover:text-white py-1 block">Support</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">Company</h3>
            <ul>
              <li><Link href="#" className="hover:text-white py-1 block">About Us</Link></li>
              <li><Link href="#" className="hover:text-white py-1 block">Careers</Link></li>
              <li><Link href="#" className="hover:text-white py-1 block">Contact</Link></li>
              <li><Link href="#" className="hover:text-white py-1 block">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-white py-1 block">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="text-center mt-12 text-zinc-600">
          © {new Date().getFullYear()} Sukuu. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
