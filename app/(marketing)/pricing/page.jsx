export const metadata = { 
  title: 'Pricing — Sukuu',
  description: 'Simple, transparent pricing that scales with your school. Start free or choose a plan that fits your needs.'
};

import React, { Suspense } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Star, Zap, Shield, Users, Building, Crown, Calculator } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getAllPlatformSettings } from '@/lib/platformSettings';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Convert a Quarterly (3‑month) fee into a per-month display (rounded) when desired.
function formatMonthlyFromQuarter(quarterFee) {
  const monthly = quarterFee / 3;
  return monthly.toFixed(monthly < 10 ? 2 : 0); // show 2dp for small numbers
}

export const revalidate = 3600; // cache for an hour (Static-like with ISR)

export default async function PricingPage() {
  const settings = await getAllPlatformSettings();
  const studentQuarter = Number(settings.studentQuarterFee || 10);
  const parentQuarter = Number(settings.parentQuarterFee || 5);
  const studentMonthly = formatMonthlyFromQuarter(studentQuarter);
  const parentMonthly = formatMonthlyFromQuarter(parentQuarter);

  const tiers = [
    { 
      name: 'Starter',
      price: 'GHS 0',
      period: 'Forever free',
      desc: 'Perfect for small schools getting started', 
      features: [
        'Up to 50 students (no billing)',
        'Core academics module',
        'Basic finance tracking',
        'Email support',
        'Mobile parent app',
        'Standard reports'
      ],
      cta: 'Start for free',
      popular: false,
      icon: Users
    },
    { 
      name: 'Usage Based',
      price: `GHS ${studentQuarter} / student`,
      period: 'per 3 months',
      desc: 'Simple usage billing as you grow',
      features: [
        `≈ GHS ${studentMonthly} per student monthly (billed quarterly)`,
        `Parent app: GHS ${parentQuarter} per parent / 3 months (≈ GHS ${parentMonthly}/mo)`,
        'All core & advanced modules',
        'Advanced reporting & analytics',
        'Priority support SLA',
        'Custom branding',
        'API & integrations',
        'Multi-campus support'
      ],
      cta: 'Start free trial',
      popular: true,
      icon: Building
    },
    { 
      name: 'Enterprise', 
      price: 'Custom', 
      period: 'tailored pricing',
      desc: 'Custom solutions for large institutions', 
      features: [
        'Unlimited students',
        'White-label solution',
        'Custom SLAs',
        'Dedicated support',
        'Custom modules',
        'Advanced security',
        'Training & onboarding',
        'Migration assistance'
      ],
      cta: 'Contact sales',
      popular: false,
      icon: Crown
    },
  ];
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/10 via-zinc-950 to-purple-900/10"></div>
        <div className="relative mx-auto max-w-6xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-950/50 px-4 py-2 text-sm text-emerald-200 border border-emerald-800/30">
            <Star className="h-4 w-4" />
            <span>Start free • No credit card required</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
            Simple pricing that{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
              scales with you
            </span>
          </h1>
          
          <p className="mt-6 text-xl text-zinc-300 max-w-3xl mx-auto">
            Transparent pricing with no hidden fees. Start free and upgrade as your school grows.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {tiers.map((tier, index) => {
              const IconComponent = tier.icon;
              return (
                <div 
                  key={tier.name} 
                  className={`relative rounded-3xl border p-8 transition-all duration-300 hover:shadow-2xl ${
                    tier.popular 
                      ? 'border-sky-500/50 bg-gradient-to-b from-sky-900/20 to-sky-950/20 shadow-xl shadow-sky-500/10 scale-105' 
                      : 'border-white/10 bg-gradient-to-b from-zinc-900/40 to-zinc-900/20 hover:border-white/20'
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="rounded-full bg-gradient-to-r from-sky-600 to-purple-600 px-4 py-1 text-sm font-semibold text-white">
                        Most Popular
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${
                      tier.popular ? 'bg-sky-500/20 text-sky-400' : 'bg-zinc-800/50 text-zinc-400'
                    }`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
                    <p className="mt-2 text-zinc-400">{tier.desc}</p>
                    
                    <div className="mt-6">
                      <div className="flex items-baseline justify-center">
                        <span className="text-4xl font-bold text-white">{tier.price}</span>
                        {tier.period !== 'Forever free' && tier.period !== 'tailored pricing' && (
                          <span className="ml-1 text-zinc-400">/{tier.period.split(' ')[1]}</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">{tier.period}</p>
                    </div>
                  </div>
                  
                  <ul className="mt-8 space-y-4">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <div className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center ${
                          tier.popular ? 'bg-sky-500/20' : 'bg-emerald-500/20'
                        }`}>
                          <Check className={`h-3 w-3 ${
                            tier.popular ? 'text-sky-400' : 'text-emerald-400'
                          }`} />
                        </div>
                        <span className="text-zinc-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-8">
                    <Link
                      href={tier.name === 'Enterprise' ? '/contact' : '/get-started'}
                      className={`group inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-semibold transition-all duration-200 ${
                        tier.popular
                          ? 'bg-gradient-to-r from-sky-600 to-purple-600 text-white hover:from-sky-700 hover:to-purple-700 shadow-lg shadow-sky-500/25'
                          : 'border border-white/20 text-white hover:bg-white/10 hover:border-white/30'
                      }`}
                    >
                      {tier.cta}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Estimator + Simple Charts */}
      <section className="px-4 py-16 border-t border-white/10">
        <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-2">
          {/* Cost Estimator */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-zinc-900/30 p-8 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.08),transparent)]" />
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Quarterly Cost Estimator</h3>
                <p className="text-sm text-zinc-400">Model your expected usage-based billing.</p>
              </div>
            </div>
            <Estimator initialStudentFee={studentQuarter} initialParentFee={parentQuarter} />
          </div>
          {/* Charts */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Illustrative Usage Scaling</h3>
            <p className="text-sm text-zinc-400">Example cumulative quarterly cost vs active users (students + parents). Real analytics appear after you start using the platform.</p>
            <Suspense fallback={<div className='text-zinc-500 text-sm'>Loading charts…</div>}>
              <Charts studentFee={studentQuarter} parentFee={parentQuarter} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Features comparison */}
      <section className="px-4 py-16 border-t border-white/10">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Compare features</h2>
            <p className="text-zinc-400">All plans include core functionality with additional features as you scale</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <Shield className="h-8 w-8 text-blue-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Security & Compliance</h3>
              <p className="text-zinc-400 text-sm">Enterprise-grade security across all plans</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <Zap className="h-8 w-8 text-yellow-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Performance</h3>
              <p className="text-zinc-400 text-sm">Lightning-fast response times guaranteed</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <Users className="h-8 w-8 text-green-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Support</h3>
              <p className="text-zinc-400 text-sm">Dedicated support team for all customers</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <Building className="h-8 w-8 text-purple-400 mb-3" />
              <h3 className="font-semibold text-white mb-2">Scalability</h3>
              <p className="text-zinc-400 text-sm">Grow from 50 to 50,000 students seamlessly</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently asked questions</h2>
          </div>
          
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <h3 className="font-semibold text-white mb-2">Can I change plans anytime?</h3>
              <p className="text-zinc-400">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <h3 className="font-semibold text-white mb-2">Is there a free trial?</h3>
              <p className="text-zinc-400">Yes! All paid plans come with a 14-day free trial. No credit card required.</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <h3 className="font-semibold text-white mb-2">What about data migration?</h3>
              <p className="text-zinc-400">We provide free data migration assistance for all Professional and Enterprise customers.</p>
            </div>
            
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
              <h3 className="font-semibold text-white mb-2">Do you offer discounts for non-profits?</h3>
              <p className="text-zinc-400">Yes, we offer special pricing for educational non-profits. Contact us for details.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to transform your school?
          </h2>
          <p className="text-xl text-zinc-300 mb-8">
            Join thousands of schools already using Sukuu to streamline their operations.
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
              Contact sales
            </Link>
          </div>
          
          <div className="mt-8 text-sm text-zinc-500">
            No credit card required • Cancel anytime
          </div>
        </div>
      </section>
    </div>
  );
}

// Client components (dynamic) -------------------------------------------
const Estimator = dynamic(() => Promise.resolve(EstimatorImpl), { ssr: false });
const Charts = dynamic(() => Promise.resolve(ChartsImpl), { ssr: false });

function EstimatorImpl({ initialStudentFee, initialParentFee }) {
  const [students, setStudents] = React.useState(120);
  const [parents, setParents] = React.useState(90);
  const [studentFee, setStudentFee] = React.useState(initialStudentFee);
  const [parentFee, setParentFee] = React.useState(initialParentFee);
  const total = (students * studentFee) + (parents * parentFee);
  const perStudentMonthly = (studentFee / 3).toFixed(2);
  const perParentMonthly = (parentFee / 3).toFixed(2);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Students" value={students} onChange={setStudents} />
        <Field label="Parents" value={parents} onChange={setParents} />
        <Field label="Student Fee / Quarter (GHS)" value={studentFee} onChange={setStudentFee} step={0.5} />
        <Field label="Parent Fee / Quarter (GHS)" value={parentFee} onChange={setParentFee} step={0.5} />
      </div>
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-zinc-300 space-y-2">
        <div className="flex justify-between"><span>Quarterly Total</span><span className="font-semibold text-white">GHS {total.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Approx Monthly (all)</span><span>GHS {(total/3).toFixed(2)}</span></div>
        <div className="text-xs text-zinc-500">Student monthly ≈ GHS {perStudentMonthly} • Parent monthly ≈ GHS {perParentMonthly}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, step=1 }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
      {label}
      <input type="number" value={value} step={step} min={0}
        onChange={(e)=> onChange(Number(e.target.value))}
        className="w-full rounded-lg bg-zinc-800/60 text-white border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600" />
    </label>
  );
}

function ChartsImpl({ studentFee, parentFee }) {
  const data = React.useMemo(()=>{
    const rows = [];
    for (let i=0;i<=5;i++) { // 6 sample points (quarters)
      const qStudents = 50 + i*40; // hypothetical growth
      const qParents = Math.round(qStudents*0.75);
      const total = (qStudents*studentFee)+(qParents*parentFee);
      rows.push({ quarter: `Q${i+1}`, students: qStudents, parents: qParents, total });
    }
    return rows;
  }, [studentFee, parentFee]);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 h-[320px] flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="quarter" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
            <Legend />
            <Line type="monotone" dataKey="students" stroke="#38bdf8" strokeWidth={2} />
            <Line type="monotone" dataKey="parents" stroke="#a855f7" strokeWidth={2} />
            <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

