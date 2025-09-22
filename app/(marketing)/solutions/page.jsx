export const metadata = { 
  title: 'Solutions — Sukuu',
  description: 'Flexible solutions for K-12 schools, colleges, and training centers. Scalable platform for any learning organization.'
};

import Link from 'next/link';
import { GraduationCap, School, BookOpen, Users, Calendar, Award, ArrowRight, CheckCircle, Building2, Laptop } from 'lucide-react';

export default function SolutionsPage() {
  const solutions = [
    { 
      title: 'K-12 Schools', 
      desc: 'Complete solution for primary and secondary education',
      features: [
        'Curriculum planning and management',
        'Student progress tracking',
        'Parent communication portal',
        'Fee collection and financial tracking',
        'Teacher collaboration tools',
        'Report card generation'
      ],
      icon: School,
      color: 'sky',
      stats: { schools: '300+', students: '75K+' }
    },
    { 
      title: 'Colleges & Universities', 
      desc: 'Comprehensive platform for higher education institutions',
      features: [
        'Program and department management',
        'Course registration system',
        'Academic transcript management',
        'Research project tracking',
        'Alumni network management',
        'Campus resource allocation'
      ],
      icon: GraduationCap,
      color: 'purple',
      stats: { schools: '150+', students: '200K+' }
    },
    { 
      title: 'Training Centers', 
      desc: 'Streamlined operations for professional development',
      features: [
        'Cohort and batch management',
        'Flexible scheduling system',
        'Certificate generation',
        'Resource library access',
        'Performance analytics',
        'Payment processing'
      ],
      icon: Laptop,
      color: 'emerald',
      stats: { schools: '200+', students: '50K+' }
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      sky: {
        bg: 'from-sky-900/20 to-sky-950/20',
        border: 'border-sky-500/30',
        shadow: 'shadow-sky-500/10',
        icon: 'bg-sky-500/10 text-sky-400',
        iconHover: 'group-hover:bg-sky-500/20',
        text: 'text-sky-400',
        button: 'from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800'
      },
      purple: {
        bg: 'from-purple-900/20 to-purple-950/20',
        border: 'border-purple-500/30',
        shadow: 'shadow-purple-500/10',
        icon: 'bg-purple-500/10 text-purple-400',
        iconHover: 'group-hover:bg-purple-500/20',
        text: 'text-purple-400',
        button: 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
      },
      emerald: {
        bg: 'from-emerald-900/20 to-emerald-950/20',
        border: 'border-emerald-500/30',
        shadow: 'shadow-emerald-500/10',
        icon: 'bg-emerald-500/10 text-emerald-400',
        iconHover: 'group-hover:bg-emerald-500/20',
        text: 'text-emerald-400',
        button: 'from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800'
      }
    };
    return colorMap[color];
  };

  return (
    <div>
      <section className="relative overflow-hidden px-4 py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/10 via-zinc-950 to-purple-900/10"></div>
        <div className="relative mx-auto max-w-6xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-purple-950/50 px-4 py-2 text-sm text-purple-200 border border-purple-800/30">
            <Building2 className="h-4 w-4" />
            <span>Trusted by 650+ educational institutions</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
            Solutions for every{' '}
            <span className="bg-gradient-to-r from-purple-400 to-sky-400 bg-clip-text text-transparent">
              learning organization
            </span>
          </h1>
          
          <p className="mt-6 text-xl text-zinc-300 max-w-3xl mx-auto">
            Whether you're running a K-12 school, university, or training center, 
            Sukuu adapts to your unique needs and scales with your growth.
          </p>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {solutions.map((solution, index) => {
              const IconComponent = solution.icon;
              const colors = getColorClasses(solution.color);
              
              return (
                <div 
                  key={solution.title}
                  className="group rounded-3xl border bg-gradient-to-b p-8 transition-all duration-500 hover:shadow-2xl border-white/10 from-zinc-900/40 to-zinc-950/40"
                >
                  <div className="text-center mb-8">
                    <div className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${colors.icon} ${colors.iconHover}`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-2">{solution.title}</h3>
                    <p className="text-zinc-400">{solution.desc}</p>
                    
                    <div className="mt-4 flex justify-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-white">{solution.stats.schools}</div>
                        <div className="text-zinc-500">Schools</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-white">{solution.stats.students}</div>
                        <div className="text-zinc-500">Students</div>
                      </div>
                    </div>
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {solution.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <div className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center bg-zinc-800`}>
                          <CheckCircle className={`h-3 w-3 ${colors.text}`} />
                        </div>
                        <span className="text-zinc-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link
                    href="/get-started"
                    className={`group/btn inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r px-6 py-3 font-semibold text-white transition-all duration-200 ${colors.button}`}
                  >
                    Get started
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 border-t border-white/10">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Built for diverse educational needs</h2>
            <p className="text-zinc-400">From small academies to large university systems</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <BookOpen className="h-8 w-8 text-blue-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Private Schools</h3>
              <p className="text-zinc-400 text-sm">Streamline admissions, academics, and parent communication</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <Users className="h-8 w-8 text-green-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Public Schools</h3>
              <p className="text-zinc-400 text-sm">Manage large student populations with ease and compliance</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <Calendar className="h-8 w-8 text-purple-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Online Schools</h3>
              <p className="text-zinc-400 text-sm">Virtual learning management with digital-first workflows</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <Award className="h-8 w-8 text-yellow-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Vocational Schools</h3>
              <p className="text-zinc-400 text-sm">Track certifications and hands-on learning programs</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <Building2 className="h-8 w-8 text-red-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Corporate Training</h3>
              <p className="text-zinc-400 text-sm">Employee development and skill-building programs</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <Laptop className="h-8 w-8 text-indigo-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Bootcamps</h3>
              <p className="text-zinc-400 text-sm">Intensive programs with cohort-based learning</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to see Sukuu in action?
          </h2>
          <p className="text-xl text-zinc-300 mb-8">
            Discover how Sukuu can transform your educational institution.
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
              Schedule a demo
            </Link>
          </div>
          
          <div className="mt-8 text-sm text-zinc-500">
            14-day free trial • No setup fees • Cancel anytime
          </div>
        </div>
      </section>
    </div>
  );
}
