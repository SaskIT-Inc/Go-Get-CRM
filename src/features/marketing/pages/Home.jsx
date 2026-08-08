import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import MarketingLayout from '@/features/marketing/components/MarketingLayout';
import LogoCarousel from '@/features/marketing/components/LogoCarousel';
import AnimatedNumber from '@/features/marketing/components/AnimatedNumber';
import Reveal, { RevealGroup, revealItem } from '@/features/marketing/components/Reveal';
import { MONTHLY_PACKAGES } from '@/lib/serviceCatalog';

const STATS = [
  { label: 'Clients', value: '47', color: 'text-blue-400' },
  { label: 'Active Filings', value: '23', color: 'text-orange-400' },
  { label: 'Open Leads', value: '12', color: 'text-purple-400' },
  { label: 'Open Tasks', value: '8', color: 'text-green-400' },
];

const DEADLINES = [
  'Prairie Wind Farms — T2 Corporate · Jun 30',
  'Jean Tremblay — T1 Personal · Apr 30',
  'Maple Tech — GST/HST · Jul 31',
];

const MY_TASKS = ['Review T2 draft', 'Send invoice INV-042', 'Call new lead'];

const FEATURES = [
  { icon: '👥', title: 'Client Management', desc: 'Full client profiles with contact info, business numbers, GST/HST registration, fiscal year ends, and filing history — all in one place.', color: 'bg-blue-50 text-blue-600' },
  { icon: '📂', title: 'Filing Pipeline', desc: 'Track T1, T2, T3, T4, GST/HST, PST, and WSIB filings through every stage. Never miss a deadline again with built-in alerts.', color: 'bg-orange-50 text-orange-600' },
  { icon: '✅', title: 'Task Management', desc: 'Assign tasks to team members, set due dates, track progress, and manage workload across your entire firm with Kanban and list views.', color: 'bg-green-50 text-green-600' },
  { icon: '💳', title: 'Invoicing & Billing', desc: 'Create professional invoices, track payments, manage retainers, and send estimates — all linked to client records and filings.', color: 'bg-purple-50 text-purple-600' },
  { icon: '📋', title: 'Lead Management', desc: 'Capture leads from your website, track them through your sales pipeline, and convert prospects into paying clients seamlessly.', color: 'bg-pink-50 text-pink-600' },
  { icon: '📊', title: 'Reports & Analytics', desc: 'Revenue by period, filing completion rates, team productivity, and client acquisition trends — all the numbers your firm needs.', color: 'bg-cyan-50 text-cyan-600' },
  { icon: '📄', title: 'Document Management', desc: 'Securely store and organize client documents — T4s, NOAs, financial statements. Find anything in seconds.', color: 'bg-yellow-50 text-yellow-600' },
  { icon: '📅', title: 'Calendar & Scheduling', desc: "Book client appointments, set reminders for filing deadlines, and sync your whole team's schedule in one view.", color: 'bg-indigo-50 text-indigo-600' },
  { icon: '👤', title: 'Team Management', desc: 'Invite staff, set roles and permissions, assign workloads, and see exactly what everyone is working on at a glance.', color: 'bg-rose-50 text-rose-600' },
];

const STEPS = [
  { step: '1', title: 'Book a Consultation', desc: "Tell us about your business — incorporation, bookkeeping, tax, or ongoing support. We'll recommend the right service or package for you." },
  { step: '2', title: 'We Set You Up', desc: 'Incorporation, CRA account setup, bookkeeping software — we handle the setup so you can focus on running your business.' },
  { step: '3', title: 'We Keep You Compliant', desc: 'Ongoing bookkeeping, tax filing, and CRA compliance — handled accurately and on time, all year round.' },
];

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const headlineContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const headlineLine = {
  hidden: { opacity: 0, y: 40, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

function Hero() {
  const mockupRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  const shineX = useMotionTemplate`${mouseX}px`;
  const shineY = useMotionTemplate`${mouseY}px`;

  const handleMouseMove = (e) => {
    const el = mockupRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    mouseX.set(px);
    mouseY.set(py);
    rotateY.set(((px / rect.width) - 0.5) * 14);
    rotateX.set(((py / rect.height) - 0.5) * -14);
  };

  const handleMouseEnter = () => setHovering(true);

  const handleMouseLeave = () => {
    setHovering(false);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-navy to-purple-900 text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.18, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.22, 1], x: [0, -25, 0], y: [0, 25, 0] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute top-1/3 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold text-white/80 mb-8"
          >
            <motion.span animate={{ rotate: [0, 14, -10, 0] }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}>🍁</motion.span>
            Built specifically for Canadian accounting firms
          </motion.div>

          <motion.h1
            variants={headlineContainer}
            initial="hidden"
            animate="show"
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6"
          >
            <motion.span variants={headlineLine} className="block">The CRM your</motion.span>
            <motion.span variants={headlineLine} className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              accounting firm
            </motion.span>
            <motion.span variants={headlineLine} className="block">actually needs</motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Manage clients, T1/T2/GST filings, deadlines, invoices, leads, and your whole team — in one
            beautifully simple platform. No spreadsheets. No missed deadlines.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.04, boxShadow: '0 20px 40px -12px rgba(255,255,255,0.35)' }} whileTap={{ scale: 0.97 }}>
              <Link to="/login" className="group bg-white text-navy font-extrabold px-8 py-4 rounded-2xl text-base hover:bg-slate-100 transition-colors shadow-2xl inline-flex items-center gap-2">
                Staff Login
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>→</motion.span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.08)' }} whileTap={{ scale: 0.97 }}>
              <Link to="/contact" className="border border-white/30 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-colors block">
                Contact Us
              </Link>
            </motion.div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-5 text-white/40 text-sm"
          >
            Serving clients across Saskatchewan — in person or online
          </motion.p>
        </div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 70, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ perspective: 1200 }}
          className="mt-20 max-w-5xl mx-auto"
        >
          <motion.div
            ref={mockupRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
            animate={{ y: [0, -10, 0] }}
            transition={{ y: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
            className="relative bg-slate-800/80 backdrop-blur border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <motion.div
              className="pointer-events-none absolute inset-0"
              animate={{ opacity: hovering ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              style={{
                background: useMotionTemplate`radial-gradient(280px circle at ${shineX} ${shineY}, rgba(255,255,255,0.08), transparent 70%)`,
              }}
            />
            <div className="bg-gradient-to-r from-navy to-purple-600 h-12 flex items-center px-4 gap-3">
              <div className="w-3 h-3 rounded-full bg-white/20" />
              <div className="flex-1 bg-white/10 rounded h-5" />
              <div className="w-20 bg-white/20 rounded h-6 text-xs text-white/60 flex items-center justify-center font-semibold">GOGET</div>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {STATS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 + i * 0.08 }}
                  whileHover={{ y: -4, backgroundColor: 'rgba(51,65,85,0.7)' }}
                  className="bg-slate-700/50 rounded-xl p-3 sm:p-4"
                >
                  <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                  <p className={`text-2xl sm:text-3xl font-extrabold ${s.color}`}>
                    <AnimatedNumber value={s.value} />
                  </p>
                </motion.div>
              ))}
            </div>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="sm:col-span-2 bg-slate-700/30 rounded-xl p-4 h-28">
                <p className="text-slate-400 text-xs mb-3 font-semibold uppercase tracking-wide">Upcoming Filing Deadlines</p>
                {DEADLINES.map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1.3 + i * 0.1 }}
                    className="flex items-center gap-2 mb-2"
                  >
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }}
                    />
                    <p className="text-slate-300 text-xs">{item}</p>
                  </motion.div>
                ))}
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4 h-28">
                <p className="text-slate-400 text-xs mb-3 font-semibold uppercase tracking-wide">My Tasks</p>
                {MY_TASKS.map((t, i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1.4 + i * 0.1 }}
                    className="flex items-center gap-2 mb-2"
                  >
                    <div className="w-3 h-3 rounded border border-slate-500 flex-shrink-0" />
                    <p className="text-slate-300 text-xs">{t}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.a
        href="#features"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.6 }}
        className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-2 text-white/50 hover:text-white/80 transition-colors"
        aria-label="Scroll to explore"
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-5 h-8 rounded-full border border-white/30 flex items-start justify-center p-1.5"
        >
          <div className="w-1 h-1.5 rounded-full bg-white/70" />
        </motion.div>
      </motion.a>
    </section>
  );
}

export default function Home() {
  return (
    <MarketingLayout>
      <Hero />

      {/* ── SOCIAL PROOF ── */}
      <section className="bg-slate-50 border-y border-slate-100 py-10">
        <Reveal className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-slate-500 text-sm font-semibold uppercase tracking-widest mb-6">
            Trusted by accounting &amp; partner firms across Canada
          </p>
          <LogoCarousel />
        </Reveal>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Everything your firm needs, nothing it doesn't</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">Built by accountants, for accountants. Every feature solves a real problem Canadian firms face.</p>
          </Reveal>

          <RevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" stagger={0.08}>
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={revealItem}
                whileHover={{ y: -8, boxShadow: '0 20px 35px -18px rgba(15,23,42,0.25)' }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="group p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors bg-white"
              >
                <motion.div
                  whileHover={{ rotate: -8, scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                  className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center text-2xl mb-5`}
                >
                  {f.icon}
                </motion.div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Getting started is simple</h2>
            <p className="text-xl text-slate-500">From incorporation to ongoing bookkeeping — we make it easy to get set up right.</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
              className="hidden md:block absolute top-8 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-blue-200 to-purple-200 origin-left"
            />
            {STEPS.map((s, i) => (
              <Reveal key={s.step} delay={i * 0.15} className="text-center relative">
                <motion.div
                  whileHover={{ scale: 1.12, rotate: 6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                  className="w-16 h-16 bg-gradient-to-br from-navy to-purple-600 text-white rounded-2xl flex items-center justify-center text-2xl font-extrabold mx-auto mb-6 shadow-lg relative z-10"
                >
                  {s.step}
                </motion.div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{s.title}</h3>
                <p className="text-slate-500 leading-relaxed">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-slate-500 mb-12">Monthly bookkeeping, tax, and advisory bundles built for growing Canadian businesses.</p>
          </Reveal>
          <RevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto" stagger={0.1}>
            {MONTHLY_PACKAGES.map((plan) => (
              <motion.div
                key={plan.name}
                variants={revealItem}
                whileHover={{ y: -10, scale: plan.highlight ? 1.03 : 1.02 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className={`rounded-2xl border-2 p-8 relative flex flex-col ${
                  plan.highlight
                    ? 'border-navy shadow-2xl bg-gradient-to-b from-navy to-purple-900 text-white md:-mt-3 md:-mb-3'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {plan.highlight && (
                  <motion.div
                    animate={{ boxShadow: ['0 0 0px rgba(168,85,247,0.4)', '0 0 22px rgba(168,85,247,0.7)', '0 0 0px rgba(168,85,247,0.4)'] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-400 to-purple-400 text-white text-xs font-extrabold px-4 py-1 rounded-full uppercase tracking-wide"
                  >
                    Most Popular
                  </motion.div>
                )}
                <p className={`text-xs font-extrabold uppercase tracking-widest mb-1 ${plan.highlight ? 'text-blue-300' : 'text-slate-400'}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold">{plan.price.replace('/month', '')}</span>
                  <span className={`text-sm mb-1.5 ${plan.highlight ? 'text-white/60' : 'text-slate-400'}`}>/mo CAD</span>
                </div>
                <p className={`text-xs mb-4 ${plan.highlight ? 'text-white/50' : 'text-slate-400'}`}>Best for: {plan.ideal}</p>
                <ul className="space-y-2 mb-7 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckIcon className={`mt-0.5 flex-shrink-0 w-4 h-4 ${plan.highlight ? 'text-green-400' : 'text-green-500'}`} />
                      <span className={plan.highlight ? 'text-white/80' : 'text-slate-600'}>{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((m) => (
                    <li key={m} className={`flex items-start gap-2 text-sm line-through ${plan.highlight ? 'text-white/25' : 'text-slate-300'}`}>
                      <CrossIcon className="mt-0.5 flex-shrink-0 w-4 h-4 opacity-40" />
                      {m}
                    </li>
                  ))}
                </ul>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/contact"
                    className={`w-full py-3 rounded-2xl font-bold text-sm transition-colors text-center block ${
                      plan.highlight ? 'bg-white text-navy hover:bg-slate-100' : 'bg-gradient-to-r from-navy to-purple-600 text-white hover:opacity-90'
                    }`}
                  >
                    Get Started →
                  </Link>
                </motion.div>
              </motion.div>
            ))}
          </RevealGroup>
          <p className="text-center text-sm text-gray-400 mt-8">
            Custom quotes available for one-off services (incorporation, tax returns, notary, and more) — contact us
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-navy to-purple-900 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>
        <Reveal className="relative max-w-3xl mx-auto px-6">
          <h2 className="text-5xl font-extrabold mb-6">Ready to get started?</h2>
          <p className="text-xl text-white/70 mb-10">
            Whether it's incorporation, bookkeeping, tax, or ongoing compliance — Go-Get can help.
          </p>
          <motion.div className="inline-block" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link to="/contact" className="inline-block bg-white text-navy font-extrabold px-10 py-4 rounded-2xl text-lg hover:bg-slate-100 transition-colors shadow-2xl">
              Contact Us →
            </Link>
          </motion.div>
        </Reveal>
      </section>
    </MarketingLayout>
  );
}
