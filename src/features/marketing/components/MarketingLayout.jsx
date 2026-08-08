import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import Logo from '@/components/Logo';
import ChatWidget from '@/features/marketing/components/ChatWidget';

const NAV_LINKS = [
  { label: 'Features', to: '/#features' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export default function MarketingLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(null);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (latest) => setScrolled(latest > 12));

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="font-sans text-slate-900 antialiased bg-white">
      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-md border-slate-100 shadow-md'
            : 'bg-white/70 backdrop-blur border-transparent shadow-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            className="flex items-center justify-between"
            animate={{ height: scrolled ? 60 : 72 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Link to="/" className="flex items-center gap-2.5">
              <motion.div whileHover={{ rotate: -8, scale: 1.08 }} whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                <Logo />
              </motion.div>
              <span className="text-lg font-extrabold bg-gradient-to-r from-navy to-purple-600 bg-clip-text text-transparent">
                GOGET
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:block">CRM</span>
            </Link>

            <div
              className="hidden md:flex items-center gap-1 relative"
              onMouseLeave={() => setHovered(null)}
            >
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.label}
                  to={l.to}
                  onMouseEnter={() => setHovered(l.label)}
                  className="relative px-4 py-2 text-sm font-medium text-slate-600 hover:text-navy transition-colors"
                >
                  {hovered === l.label && (
                    <motion.span
                      layoutId="nav-hover-pill"
                      className="absolute inset-0 bg-slate-100 rounded-lg -z-10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/login"
                  className="relative overflow-hidden bg-gradient-to-r from-navy to-purple-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg block"
                >
                  Sign In
                </Link>
              </motion.div>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
              aria-label="Toggle menu"
            >
              <motion.span animate={{ rotate: mobileOpen ? 90 : 0 }} className="inline-block">
                {mobileOpen ? '✕' : '☰'}
              </motion.span>
            </motion.button>
          </motion.div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden border-t border-slate-100 bg-white overflow-hidden"
            >
              <motion.div
                className="px-6 py-4 space-y-1"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              >
                {NAV_LINKS.map((l) => (
                  <motion.div
                    key={l.label}
                    variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                  >
                    <Link
                      to={l.to}
                      onClick={() => setMobileOpen(false)}
                      className="block text-sm font-medium text-slate-700 py-2.5 px-2 rounded-lg hover:bg-slate-50"
                    >
                      {l.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                  className="pt-3 border-t border-slate-100 flex flex-col gap-2"
                >
                  <Link
                    to="/login"
                    className="text-center bg-gradient-to-r from-navy to-purple-600 text-white text-sm font-bold py-2.5 rounded-xl"
                  >
                    Sign In
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── Page content ── */}
      <main>{children}</main>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <Logo />
                <span className="text-lg font-extrabold text-white">GOGET CRM</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                The all-in-one CRM built specifically for Canadian accounting firms. Manage clients, filings,
                invoices, and your team — all in one place.
              </p>
              <p className="text-xs mt-4 text-slate-500">🍁 Proudly built for Canada</p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} GOGET CRM. All rights reserved.</p>
            <div className="flex items-center gap-6 text-xs">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}
