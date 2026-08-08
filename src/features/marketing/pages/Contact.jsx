import { useState } from 'react';
import MarketingLayout from '@/features/marketing/components/MarketingLayout';
import { api } from '@/api/apiClient';

const CONTACT_INFO = [
  { icon: '✉️', label: 'Email', value: 'hello@gogetcrm.ca' },
  { icon: '📞', label: 'Phone', value: '+1 (306) 555-0100' },
  { icon: '🕐', label: 'Hours', value: 'Mon–Fri, 9am–5pm CST' },
  { icon: '📍', label: 'Location', value: 'Saskatoon, Saskatchewan, Canada' },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    setError('');
    try {
      await api.public.contact(form);
      setStatus('success');
      setForm({ name: '', email: '', company: '', message: '' });
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <MarketingLayout>
      <section className="bg-gradient-to-br from-slate-900 via-navy to-purple-900 text-white py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-5xl font-extrabold mb-4">Get in touch</h1>
          <p className="text-xl text-white/70">Questions, demos, or custom requirements — we respond within 1 business day.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact info */}
            <div className="lg:col-span-1 space-y-8">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Contact information</h2>
                <div className="space-y-5">
                  {CONTACT_INFO.map((c) => (
                    <div key={c.label} className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">{c.icon}</div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">{c.label}</p>
                        <p className="text-slate-700 font-semibold text-sm">{c.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-2">
              {status === 'success' && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-5 py-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Thanks — your message has been sent. We'll be in touch within one business day.
                </div>
              )}
              {status === 'error' && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-5 py-4">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name *</label>
                    <input
                      type="text" name="name" required value={form.name} onChange={handleChange}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-all"
                      placeholder="Jane Smith, CPA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email *</label>
                    <input
                      type="email" name="email" required value={form.email} onChange={handleChange}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-all"
                      placeholder="jane@yourfirm.ca"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Firm / Company</label>
                  <input
                    type="text" name="company" value={form.company} onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-all"
                    placeholder="Smith & Associates CPA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message *</label>
                  <textarea
                    name="message" rows={5} required value={form.message} onChange={handleChange}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy transition-all resize-none"
                    placeholder="Tell us about your firm and what you're looking for…"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="bg-gradient-to-r from-navy to-purple-600 text-white font-bold px-8 py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-60"
                >
                  {status === 'submitting' ? 'Sending…' : 'Send Message →'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
