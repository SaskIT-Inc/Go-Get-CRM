import { Link } from 'react-router-dom';
import MarketingLayout from '@/features/marketing/components/MarketingLayout';

const STATS = [
  ['500+', 'Firms using GOGET'],
  ['25,000+', 'Filings tracked'],
  ['99.9%', 'Uptime SLA'],
  ['🍁', 'Canadian-built'],
];

const VALUES = [
  { icon: '🎯', title: 'Purpose-built', desc: 'We build features specifically for Canadian accounting workflows — T-slips, CRA deadlines, provincial tax filings. Not generic CRM features ported from another industry.' },
  { icon: '🔒', title: 'Privacy first', desc: 'Your client data stays in Canada. We comply with PIPEDA and provincial privacy laws. We will never sell your data or use it for advertising.' },
  { icon: '💡', title: 'Honest simplicity', desc: "We believe software should do what it says, work reliably, and not require a training course to use. We ship features only when they're actually good." },
];

export default function About() {
  return (
    <MarketingLayout>
      <section className="bg-gradient-to-br from-slate-900 via-navy to-purple-900 text-white py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-5xl font-extrabold mb-4">
            Built by accountants,<br />for accountants
          </h1>
          <p className="text-xl text-white/70">
            We got tired of spreadsheets, missed deadlines, and tools that didn't understand Canadian tax. So we built GOGET CRM.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-5">Our story</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                GOGET CRM started when a small accounting firm in Saskatchewan was drowning in spreadsheets, sticky notes,
                and three different tools that didn't talk to each other. Filing deadlines were being tracked in one place,
                client communications in another, and invoices in a third.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                The founding team — a CPA and a software developer — decided to build the tool they wished existed: one
                platform that handles the entire lifecycle of an accounting client, built specifically for the Canadian
                tax system.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Today, GOGET CRM is used by accounting firms across Canada — from solo practitioners to multi-partner
                firms with dozens of staff.
              </p>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-navy rounded-2xl p-10 text-white">
              <div className="grid grid-cols-2 gap-8">
                {STATS.map(([n, l]) => (
                  <div key={l} className="text-center">
                    <p className="text-4xl font-extrabold text-white mb-1">{n}</p>
                    <p className="text-white/60 text-sm">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-20">
            <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-12">Our values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {VALUES.map((v) => (
                <div key={v.title} className="text-center p-8 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-4xl mb-4">{v.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{v.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-slate-900 to-navy text-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-4xl font-extrabold mb-4">Get in touch</h2>
          <p className="text-white/70 mb-8">
            Have a question about our services? We'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact" className="bg-white text-navy font-extrabold px-8 py-3.5 rounded-xl hover:bg-slate-100 transition-all shadow-xl">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
