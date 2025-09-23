export const metadata = {
  title: 'Sukuu — School OS',
  description: 'All-in-one School OS: academics, finance, HR, communication and resources.',
};

import Link from 'next/link';
import { ArrowRight, BookOpen, DollarSign, Users, Building, Zap, Shield, Globe } from 'lucide-react';
import { MarketingFooter } from '@/components/marketing/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <main className="flex-1">
        {/* Hero with enhanced gradients */}
        <section className="relative overflow-hidden px-4">
          {/* Background gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-sky-900/20 via-zinc-950 to-purple-900/20"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative mx-auto max-w-6xl py-24 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-sky-950/50 px-4 py-2 text-sm text-sky-200 border border-sky-800/30">
              <Zap className="h-4 w-4" />
              <span>Trusted by 500+ schools worldwide</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
              All-in-one{' '}
              <span className="bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text text-transparent">
                School OS
              </span>
              <br />
              Built to scale.
            </h1>
            
            <p className="mt-6 text-xl text-zinc-300 max-w-3xl mx-auto leading-relaxed">
              Transform your educational institution with our comprehensive platform. 
              From academics to finance, everything you need in one secure, scalable solution.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                href="/get-started" 
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-sky-700 px-8 py-4 font-semibold text-white hover:from-sky-700 hover:to-sky-800 transition-all duration-200 shadow-lg shadow-sky-500/25"
              >
                Get started free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/products" 
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-200"
              >
                Explore features
                <BookOpen className="h-4 w-4" />
              </Link>
            </div>
            
            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">500+</div>
                <div className="text-sm text-zinc-400">Schools</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">100K+</div>
                <div className="text-sm text-zinc-400">Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-sm text-zinc-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-sm text-zinc-400">Support</div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced value propositions */}
        <section className="relative border-t border-white/10">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/40 to-zinc-950"></div>
          <div className="relative mx-auto max-w-7xl px-4 py-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Everything your school needs
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                Comprehensive modules that work together seamlessly
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="group rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 p-8 hover:border-sky-500/30 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Academics</h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Complete academic management from curriculum to assessments
                </p>
                <ul className="space-y-1 text-sm text-zinc-400">
                  <li>• Subjects & assignments</li>
                  <li>• Exams & grading</li>
                  <li>• Timetable scheduling</li>
                </ul>
                <Link className="inline-flex items-center gap-1 text-sky-400 text-sm hover:text-sky-300 mt-4 group-hover:gap-2 transition-all" href="/products#academics">
                  Learn more <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="group rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 p-8 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <DollarSign className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Finance</h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Streamlined financial operations and reporting
                </p>
                <ul className="space-y-1 text-sm text-zinc-400">
                  <li>• Invoices & payments</li>
                  <li>• Expense tracking</li>
                  <li>• Payroll management</li>
                </ul>
                <Link className="inline-flex items-center gap-1 text-emerald-400 text-sm hover:text-emerald-300 mt-4 group-hover:gap-2 transition-all" href="/products#finance">
                  Learn more <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="group rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 p-8 hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Human Resources</h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Comprehensive staff and people management
                </p>
                <ul className="space-y-1 text-sm text-zinc-400">
                  <li>• Staff profiles & roles</li>
                  <li>• Attendance tracking</li>
                  <li>• Performance reviews</li>
                </ul>
                <Link className="inline-flex items-center gap-1 text-purple-400 text-sm hover:text-purple-300 mt-4 group-hover:gap-2 transition-all" href="/products#hr">
                  Learn more <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="group rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 p-8 hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20 transition-colors">
                  <Building className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Resources</h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Facility and resource management tools
                </p>
                <ul className="space-y-1 text-sm text-zinc-400">
                  <li>• Library catalog</li>
                  <li>• Transport tracking</li>
                  <li>• Inventory management</li>
                </ul>
                <Link className="inline-flex items-center gap-1 text-orange-400 text-sm hover:text-orange-300 mt-4 group-hover:gap-2 transition-all" href="/products#resources">
                  Learn more <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Trust indicators */}
        <section className="relative py-20 px-4">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              <div className="lg:col-span-2">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  Built for the modern educational landscape
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-sky-500/20 flex items-center justify-center">
                      <Shield className="h-3 w-3 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Enterprise Security</h3>
                      <p className="text-zinc-400 text-sm">Bank-grade encryption, role-based access, and compliance ready</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-sky-500/20 flex items-center justify-center">
                      <Globe className="h-3 w-3 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Multi-tenant Architecture</h3>
                      <p className="text-zinc-400 text-sm">Serve multiple schools with complete data isolation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-sky-500/20 flex items-center justify-center">
                      <Zap className="h-3 w-3 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Lightning Fast</h3>
                      <p className="text-zinc-400 text-sm">Built on modern infrastructure for instant response times</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/50 to-zinc-950 p-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white mb-2">150ms</div>
                    <div className="text-zinc-400 text-sm mb-6">Average response time</div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full w-4/5 bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full"></div>
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">Performance benchmark</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced CTA */}
        <section className="relative px-4 py-24">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-900/20 via-purple-900/20 to-sky-900/20"></div>
          <div className="relative text-center max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to transform your school?
            </h2>
            <p className="text-xl text-zinc-300 mb-10 max-w-2xl mx-auto">
              Join hundreds of educational institutions that trust Sukuu to power their digital transformation.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                href="/get-started" 
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-purple-600 px-10 py-4 text-xl font-semibold text-white hover:from-sky-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-sky-500/25"
              >
                Start your free trial
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/contact" 
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-10 py-4 text-xl text-white hover:bg-white/10 hover:border-white/30 transition-all duration-200"
              >
                Book a demo
              </Link>
            </div>
            
            <div className="mt-12 text-center">
              <p className="text-sm text-zinc-500 mb-4">Trusted by leading institutions</p>
              <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
                <div className="h-8 w-24 bg-zinc-700 rounded"></div>
                <div className="h-8 w-20 bg-zinc-700 rounded"></div>
                <div className="h-8 w-28 bg-zinc-700 rounded"></div>
                <div className="h-8 w-22 bg-zinc-700 rounded"></div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
