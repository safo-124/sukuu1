// app/page.jsx
'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Zap, Database, LayoutDashboard, DollarSign, Users, BookOpen, Briefcase, CalendarDays, Home, Library, Bus, GraduationCap, FileText, CheckSquare, Settings, Newspaper, Layers, Receipt, UserCog, Building, PieChart, ClipboardList, Store, ChartArea } from 'lucide-react'; // Comprehensive icons for features

export default function LandingPage() {
  const { setTheme, theme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans antialiased relative">
      {/* Background gradient effect - mimic Prisma */}
      <div className="absolute inset-0 z-0 opacity-20" style={{
        background: 'radial-gradient(at 50% 10%, #3b0764, transparent), radial-gradient(at 50% 90%, #0c0a09, transparent)'
      }}></div>

      {/* Header */}
      <header className="relative z-10 py-4 px-6 md:px-12 flex items-center justify-between border-b border-zinc-800">
        <Link href="/" className="flex items-center space-x-2 text-white text-2xl font-bold">
          <Zap className="h-7 w-7 text-sky-400" />
          <span>Sukuu</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="#products" className="text-zinc-400 hover:text-white transition-colors duration-200">Products</Link>
          <Link href="#pricing" className="text-zinc-400 hover:text-white transition-colors duration-200">Pricing</Link>
          <Link href="#resources" className="text-zinc-400 hover:text-white transition-colors duration-200">Resources</Link>
          <Link href="/docs" className="text-zinc-400 hover:text-white transition-colors duration-200">Docs</Link>
          <Link href="/blog" className="text-zinc-400 hover:text-white transition-colors duration-200">Blog</Link>
        </nav>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors duration-200"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <Link href="/login" className="text-zinc-400 hover:text-white transition-colors duration-200 hidden sm:block">Log in</Link>
          <Link href="/signup" className="px-4 py-2 bg-white text-zinc-900 rounded-full font-semibold hover:bg-zinc-200 transition-colors duration-200 shadow-lg">
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center py-20 px-6 max-w-4xl mx-auto min-h-[70vh]">
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-white mb-6">
          From idea to scale. <br /> Simplified.
        </h1>
        <p className="text-lg md:text-xl text-zinc-300 mb-10 max-w-2xl">
          Ship at lightning speed, and scale to a global audience effortlessly with your next-gen
          school management system powered by serverless technology.
        </p>
        <div className="flex space-x-4">
          <Link href="/signup" className="px-8 py-3 bg-sky-600 text-white rounded-full text-lg font-semibold hover:bg-sky-700 transition-colors duration-300 shadow-xl">
            Get started for free
          </Link>
          <Link href="#products" className="px-8 py-3 border border-zinc-500 text-white rounded-full text-lg font-semibold hover:bg-zinc-800 transition-colors duration-300">
            Learn More
          </Link>
        </div>
      </section>

      {/* Products/Features Section */}
      <section id="products" className="relative z-10 py-20 px-6 bg-zinc-900 border-t border-b border-zinc-800">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">
          Comprehensive Solutions for Every School
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Product Card 1: Academics */}
          <div className="bg-zinc-800/50 rounded-xl p-8 shadow-lg border border-zinc-700 hover:border-sky-500 transition-all duration-300">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-sky-600/20 p-3 rounded-full">
                <BookOpen className="h-8 w-8 text-sky-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Academics</h3>
            </div>
            <p className="text-zinc-300 mb-4">
              Streamline class management, subject allocation, examination scheduling, and grading with intuitive tools.
            </p>
            <ul className="text-zinc-400 text-sm space-y-2">
              <li className="flex items-center"><Layers className="h-4 w-4 mr-2 text-zinc-500" />School Levels & Departments</li>
              <li className="flex items-center"><Building className="h-4 w-4 mr-2 text-zinc-500" />Classes & Sections</li>
              <li className="flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-zinc-500" />Timetable Management</li>
              <li className="flex items-center"><GraduationCap className="h-4 w-4 mr-2 text-zinc-500" />Examinations & Grades</li>
            </ul>
          </div>

          {/* Product Card 2: Finance */}
          <div className="bg-zinc-800/50 rounded-xl p-8 shadow-lg border border-zinc-700 hover:border-green-500 transition-all duration-300">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-green-600/20 p-3 rounded-full">
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Finance</h3>
            </div>
            <p className="text-zinc-300 mb-4">
              Manage fee structures, invoices, payments, and expenses with comprehensive financial tools.
            </p>
            <ul className="text-zinc-400 text-sm space-y-2">
              <li className="flex items-center"><FileText className="h-4 w-4 mr-2 text-zinc-500" />Fee Structures & Invoices</li>
              <li className="flex items-center"><CheckSquare className="h-4 w-4 mr-2 text-zinc-500" />Payment Tracking</li>
              <li className="flex items-center"><Briefcase className="h-4 w-4 mr-2 text-zinc-500" />Expense Management</li>
              <li className="flex items-center"><PieChart className="h-4 w-4 mr-2 text-zinc-500" />Financial Overview</li>
            </ul>
          </div>

          {/* Product Card 3: Human Resources */}
          <div className="bg-zinc-800/50 rounded-xl p-8 shadow-lg border border-zinc-700 hover:border-purple-500 transition-all duration-300">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-purple-600/20 p-3 rounded-full">
                <UserCog className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Human Resources</h3>
            </div>
            <p className="text-zinc-300 mb-4">
              Efficiently manage staff profiles, attendance, and payroll with built-in HR functionalities.
            </p>
            <ul className="text-zinc-400 text-sm space-y-2">
              <li className="flex items-center"><Users className="h-4 w-4 mr-2 text-zinc-500" />Staff Management</li>
              <li className="flex items-center"><ClipboardList className="h-4 w-4 mr-2 text-zinc-500" />Attendance Tracking</li>
              <li className="flex items-center"><Receipt className="h-4 w-4 mr-2 text-zinc-500" />Payroll & Payslips</li>
              <li className="flex items-center"><FileText className="h-4 w-4 mr-2 text-zinc-500" />Leave Management (Future)</li>
            </ul>
          </div>

          {/* Product Card 4: Resources */}
          <div className="bg-zinc-800/50 rounded-xl p-8 shadow-lg border border-zinc-700 hover:border-yellow-500 transition-all duration-300">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-yellow-600/20 p-3 rounded-full">
                <Home className="h-8 w-8 text-yellow-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Resources</h3>
            </div>
            <p className="text-zinc-300 mb-4">
              Oversee physical assets, facilities, inventory, and manage hostels and transportation.
            </p>
            <ul className="text-zinc-400 text-sm space-y-2">
              <li className="flex items-center"><Building className="h-4 w-4 mr-2 text-zinc-500" />Buildings & Rooms</li>
              <li className="flex items-center"><Store className="h-4 w-4 mr-2 text-zinc-500" />Inventory & Stores</li>
              <li className="flex items-center"><Bus className="h-4 w-4 mr-2 text-zinc-500" />Transportation Management</li>
              <li className="flex items-center"><Library className="h-4 w-4 mr-2 text-zinc-500" />Library Management</li>
            </ul>
          </div>

          {/* Product Card 5: Communication (Placeholder) */}
          <div className="bg-zinc-800/50 rounded-xl p-8 shadow-lg border border-zinc-700 hover:border-pink-500 transition-all duration-300">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-pink-600/20 p-3 rounded-full">
                <Newspaper className="h-8 w-8 text-pink-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Communication</h3>
            </div>
            <p className="text-zinc-300 mb-4">
              Keep your school community informed with announcements, events, and messaging tools.
            </p>
            <ul className="text-zinc-400 text-sm space-y-2">
              <li className="flex items-center"><Newspaper className="h-4 w-4 mr-2 text-zinc-500" />Announcements</li>
              <li className="flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-zinc-500" />Events Calendar</li>
              <li className="flex items-center"><ChartArea className="h-4 w-4 mr-2 text-zinc-500" />Internal Messaging (Future)</li>
            </ul>
          </div>

          {/* Product Card 6: Customization & Admin (Placeholder) */}
          <div className="bg-zinc-800/50 rounded-xl p-8 shadow-lg border border-zinc-700 hover:border-indigo-500 transition-all duration-300">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-indigo-600/20 p-3 rounded-full">
                <Settings className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Admin & Setup</h3>
            </div>
            <p className="text-zinc-300 mb-4">
              Configure every aspect of your school portal, from branding to academic years.
            </p>
            <ul className="text-zinc-400 text-sm space-y-2">
              <li className="flex items-center"><Settings className="h-4 w-4 mr-2 text-zinc-500" />School Profile</li>
              <li className="flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-zinc-500" />Academic Years & Terms</li>
              <li className="flex items-center"><Users className="h-4 w-4 mr-2 text-zinc-500" />User & Role Management</li>
              <li className="flex items-center"><LayoutDashboard className="h-4 w-4 mr-2 text-zinc-500" />Dashboard Customization</li>
            </ul>
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
