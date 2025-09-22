import Link from 'next/link';
import { BookOpen, DollarSign, Users, Building, Calendar, FileText, Calculator, Award, Clock, MessageSquare, Shield, BarChart3, ArrowRight, CheckCircle } from 'lucide-react';

export const metadata = {
  title: 'Products — Sukuu',
  description: 'Comprehensive school management modules: academics, finance, HR, and resources.',
};

export default function ProductsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/10 via-zinc-950 to-purple-900/10"></div>
        <div className="relative mx-auto max-w-6xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-sky-950/50 px-4 py-2 text-sm text-sky-200 border border-sky-800/30">
            <Building className="h-4 w-4" />
            <span>Complete school management platform</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
            Everything your school needs,{' '}
            <span className="bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text text-transparent">
              in one place
            </span>
          </h1>
          
          <p className="mt-6 text-xl text-zinc-300 max-w-3xl mx-auto">
            Comprehensive modules that work seamlessly together to streamline your educational operations.
          </p>
        </div>
      </section>

      {/* Main modules */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Academics */}
            <div id="academics" className="group rounded-3xl border border-white/10 bg-gradient-to-br from-sky-900/20 to-sky-950/20 p-8 hover:border-sky-500/30 hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-2xl bg-sky-500/10 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
                  <BookOpen className="h-8 w-8 text-sky-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Academics</h2>
                  <p className="text-sky-400">Core educational management</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-sky-400" />
                    <span>Curriculum planning</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-sky-400" />
                    <span>Class management</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-sky-400" />
                    <span>Assignment tracking</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-sky-400" />
                    <span>Exam management</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-sky-400" />
                    <span>Grade tracking</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-sky-400" />
                    <span>Timetable scheduling</span>
                  </div>
                </div>
              </div>
              
              <Link href="/docs/academics" className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 font-medium group-hover:gap-3 transition-all">
                Learn more <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Finance */}
            <div id="finance" className="group rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-900/20 to-emerald-950/20 p-8 hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <DollarSign className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Finance</h2>
                  <p className="text-emerald-400">Complete financial management</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>Fee structures</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>Invoice generation</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>Payment processing</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>Expense tracking</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>Payroll management</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>Financial reporting</span>
                  </div>
                </div>
              </div>
              
              <Link href="/docs/finance" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium group-hover:gap-3 transition-all">
                Learn more <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Secondary modules */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Human Resources */}
            <div id="hr" className="group rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/20 to-purple-950/20 p-8 hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <Users className="h-8 w-8 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Human Resources</h2>
                  <p className="text-purple-400">Staff & people management</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-purple-400" />
                    <span>Staff profiles</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-purple-400" />
                    <span>Role management</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-purple-400" />
                    <span>Attendance tracking</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-purple-400" />
                    <span>Performance reviews</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-purple-400" />
                    <span>Leave management</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-purple-400" />
                    <span>Contract tracking</span>
                  </div>
                </div>
              </div>
              
              <Link href="/docs/hr" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium group-hover:gap-3 transition-all">
                Learn more <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Resources */}
            <div id="resources" className="group rounded-3xl border border-white/10 bg-gradient-to-br from-orange-900/20 to-orange-950/20 p-8 hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-2xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                  <Building className="h-8 w-8 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Resources</h2>
                  <p className="text-orange-400">Facility & asset management</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-orange-400" />
                    <span>Library catalog</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-orange-400" />
                    <span>Book loans</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-orange-400" />
                    <span>Transport management</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-orange-400" />
                    <span>Inventory tracking</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-orange-400" />
                    <span>Room management</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-4 w-4 text-orange-400" />
                    <span>Asset tracking</span>
                  </div>
                </div>
              </div>
              
              <Link href="/docs/resources" className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-medium group-hover:gap-3 transition-all">
                Learn more <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Additional features */}
      <section className="px-4 py-16 border-t border-white/10">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Plus many more features</h2>
            <p className="text-zinc-400">Built-in tools for comprehensive school management</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 hover:border-white/20 transition-colors">
              <MessageSquare className="h-8 w-8 text-blue-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Communication</h3>
              <p className="text-zinc-400 text-sm">Announcements, events, and messaging</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 hover:border-white/20 transition-colors">
              <Calendar className="h-8 w-8 text-indigo-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Scheduling</h3>
              <p className="text-zinc-400 text-sm">Timetables, events, and calendar management</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 hover:border-white/20 transition-colors">
              <BarChart3 className="h-8 w-8 text-green-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Analytics</h3>
              <p className="text-zinc-400 text-sm">Insights and reporting across all modules</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 hover:border-white/20 transition-colors">
              <Shield className="h-8 w-8 text-red-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Security</h3>
              <p className="text-zinc-400 text-sm">Role-based access and data protection</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 hover:border-white/20 transition-colors">
              <Award className="h-8 w-8 text-yellow-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Achievements</h3>
              <p className="text-zinc-400 text-sm">Track student progress and awards</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 hover:border-white/20 transition-colors">
              <Clock className="h-8 w-8 text-pink-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Time tracking</h3>
              <p className="text-zinc-400 text-sm">Monitor attendance and activity</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to streamline your school operations?
          </h2>
          <p className="text-xl text-zinc-300 mb-8">
            Start with our comprehensive platform today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/get-started" 
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-purple-600 px-8 py-4 font-semibold text-white hover:from-sky-700 hover:to-purple-700 transition-all duration-200"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link 
              href="/contact" 
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-white hover:bg-white/10 transition-all duration-200"
            >
              Schedule demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
