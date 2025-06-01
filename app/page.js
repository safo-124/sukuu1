// app/page.js
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { Sun, Moon, ArrowRight, LogIn, UserCheck, Server, BookOpenCheck, Users as UsersIcon, ShieldCheck as ShieldCheckIcon } from 'lucide-react'; // Aliased Users and ShieldCheck
import { useSpring, animated, config, useTrail } from 'react-spring';

// Tailwind class constants
const titleTextClasses = "text-zinc-900 dark:text-zinc-50";
const descriptionTextClasses = "text-zinc-600 dark:text-zinc-400";
const primaryButtonClasses = "bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 focus-visible:ring-sky-500";
const outlineButtonClasses = "border-sky-500 text-sky-600 hover:bg-sky-500/10 dark:border-sky-400 dark:text-sky-400 dark:hover:bg-sky-400/10 focus-visible:ring-sky-500";
const elegantGlassCardClasses = `
  rounded-xl
  backdrop-blur-xl backdrop-saturate-150
  shadow-2xl dark:shadow-black/40
  bg-white/65 border border-white/40
  dark:bg-zinc-900/65 dark:border-zinc-700/60
`;
const sectionPadding = "py-20 md:py-28";

// Animated Header
function ElegantLandingHeader() {
  const { setTheme, theme } = useTheme();
  const headerAnimation = useSpring({
    from: { opacity: 0, y: -20 },
    to: { opacity: 1, y: 0 },
    config: config.wobbly,
  });

  return (
    <animated.header style={headerAnimation} className="fixed top-0 left-0 right-0 z-50 py-4 px-4 sm:px-6 lg:px-8 bg-transparent backdrop-blur-md border-b border-zinc-200/30 dark:border-zinc-800/30">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <span className={`text-3xl font-bold tracking-tighter group-hover:opacity-75 transition-opacity ${titleTextClasses}`}>
            SUK<span className="font-semibold text-sky-500">UU</span>
          </span>
        </Link>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className={`h-9 w-9 text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white`}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </animated.header>
  );
}

// Animated Hero Section - Split Layout
function ElegantHeroSection() {
  const leftColAnimation = useSpring({
    from: { opacity: 0, x: -50 },
    to: { opacity: 1, x: 0 },
    config: config.molasses, delay: 100
  });
  const rightColAnimation = useSpring({
    from: { opacity: 0, x: 50 },
    to: { opacity: 1, x: 0 },
    config: config.molasses, delay: 300
  });

  return (
    <section className={`w-full max-w-6xl mx-auto ${sectionPadding} grid md:grid-cols-2 gap-12 items-center`}>
      <animated.div style={leftColAnimation} className="text-center md:text-left">
        <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter mb-6 ${titleTextClasses}`}>
          Empowering Ghanas Schools with <span className="text-sky-500">Sukuu</span>.
        </h1>
        <p className={`text-lg md:text-xl max-w-xl mx-auto md:mx-0 mb-10 ${descriptionTextClasses}`}>
          Discover a smarter, more connected way to manage your educational institution. Sukuu brings everything together, from student data to financial clarity.
        </p>
        <div className="flex flex-col sm:flex-row justify-center md:justify-start items-center gap-4">
          <Button asChild size="lg" className={`${primaryButtonClasses} px-10 py-3 text-lg w-full sm:w-auto shadow-lg hover:shadow-sky-500/30 transition-shadow`}>
            <Link href="#portals">Get Started <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </animated.div>
      <animated.div style={rightColAnimation} className="hidden md:flex justify-center items-center">
        <div className={`w-80 h-80 lg:w-96 lg:h-96 rounded-full ${elegantGlassCardClasses} flex items-center justify-center`}>
          <BookOpenCheck className={`w-32 h-32 lg:w-40 lg:h-40 text-sky-500 opacity-70`} />
        </div>
      </animated.div>
    </section>
  );
}

// "The Sukuu Advantage" Section
const advantages = [
  {
    icon: UsersIcon, // Using aliased import
    title: "Unified Platform",
    description: "Manage students, staff, academics, and finances all in one place, reducing complexity and improving data flow across your institution.",
  },
  {
    icon: ShieldCheckIcon, // Using aliased import
    title: "Data Security & Integrity",
    description: "Built with robust security measures to protect sensitive school data, ensuring privacy and compliance with best practices.",
  },
  {
    icon: Server,
    title: "Accessible & Scalable",
    description: "Designed for the Ghanaian educational context, Sukuu is accessible and scales with your school's growth and evolving needs.",
  },
];

function AdvantageSection() {
  const trail = useTrail(advantages.length, {
    from: { opacity: 0, transform: 'translateY(40px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: config.stiff,
    delay: 200,
  });

  return (
    <section className={`w-full max-w-5xl mx-auto ${sectionPadding} text-center`}>
      <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${titleTextClasses}`}>The Sukuu Advantage</h2>
      <p className={`max-w-2xl mx-auto mb-12 md:mb-16 ${descriptionTextClasses}`}>
        We provide more than just software; we offer a partnership to elevate your schools operational excellence.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {trail.map((style, index) => {
          // ✨ CORRECTED ICON RENDERING HERE ✨
          const IconComponent = advantages[index].icon; // Assign to an uppercase variable
          return (
            <animated.div key={advantages[index].title} style={style} className={`${elegantGlassCardClasses} p-8`}>
              <div className="mb-5 inline-flex items-center justify-center p-3 rounded-full bg-sky-500/10 text-sky-500">
                <IconComponent className="h-7 w-7" /> {/* Use the uppercase variable */}
              </div>
              <h3 className={`text-xl font-semibold mb-3 ${titleTextClasses}`}>{advantages[index].title}</h3>
              <p className={`text-sm ${descriptionTextClasses}`}>{advantages[index].description}</p>
            </animated.div>
          );
        })}
      </div>
    </section>
  );
}

// Login Portals Section
function LoginPortalsSection() {
    const sectionAnimation = useSpring({
        from: { opacity: 0, y: 50 },
        to: { opacity: 1, y: 0 },
        config: config.molasses,
        delay: 400
    });

  return (
    <animated.section style={sectionAnimation} id="portals" className={`w-full max-w-4xl mx-auto ${sectionPadding} text-center`}>
      <h2 className={`text-3xl md:text-4xl font-bold mb-12 ${titleTextClasses}`}>Choose Your Portal</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link href="/#" className={`block p-8 rounded-xl transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1 ${elegantGlassCardClasses}`}>
          <div className="mb-4 inline-flex items-center justify-center p-3 rounded-full bg-sky-500/10 text-sky-500">
            <UserCheck className="h-8 w-8" />
          </div>
          <h3 className={`text-2xl font-semibold mb-3 ${titleTextClasses}`}>School Portal</h3>
          <p className={`text-sm mb-6 ${descriptionTextClasses}`}>
            For teachers, staff, and school administrators to manage daily operations and academic activities.
          </p>
          <Button variant="link" className={`text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 font-semibold px-0`}>
            Access School Portal <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>

        <Link href="/login" className={`block p-8 rounded-xl transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1 ${elegantGlassCardClasses}`}>
          <div className="mb-4 inline-flex items-center justify-center p-3 rounded-full bg-zinc-500/10 text-zinc-500 dark:text-zinc-400">
            <Server className="h-8 w-8" />
          </div>
          <h3 className={`text-2xl font-semibold mb-3 ${titleTextClasses}`}>Super Admin Portal</h3>
          <p className={`text-sm mb-6 ${descriptionTextClasses}`}>
            Centralized system management for Sukuu platform administrators.
          </p>
          <Button variant="link" className={`text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white font-semibold px-0`}>
            Super Admin Login <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </animated.section>
  );
}

function LandingFooter() {
  return (
    <footer className="w-full text-center py-12 mt-16 border-t border-zinc-200/50 dark:border-zinc-800/50">
      <p className={`text-sm ${descriptionTextClasses}`}>
        &copy; {new Date().getFullYear()} Sukuu. Empowering Education in Ghana.
      </p>
      <p className={`text-xs mt-1 ${descriptionTextClasses}`}>
        Aburi, Eastern Region.
      </p>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-gradient-to-b from-zinc-50 via-sky-50/30 to-white dark:from-zinc-950 dark:via-sky-900/20 dark:to-black min-h-screen flex flex-col antialiased selection:bg-sky-500 selection:text-white">
      <ElegantLandingHeader />
      <main className="flex-grow flex flex-col items-center justify-start pt-16 md:pt-20 px-4">
        <ElegantHeroSection />
        <AdvantageSection />
        <LoginPortalsSection />
      </main>
      <LandingFooter />
    </div>
  );
}