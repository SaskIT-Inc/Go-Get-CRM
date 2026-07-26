import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/apiClient';
import logo from '@/assets/goget-mark.png';

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmail() {
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoSubmitted = useRef(false);

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const submit = async (e) => {
    e?.preventDefault();
    if (!email || !code) {
      setError('Enter your email and the 6-digit code from your inbox.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyEmail({ email: email.trim().toLowerCase(), code: code.trim() });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'That code didn\'t work. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Land here via the emailed link (?email=&code=) and verify automatically.
  useEffect(() => {
    if (!autoSubmitted.current && searchParams.get('email') && searchParams.get('code')) {
      autoSubmitted.current = true;
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    setError('');
    setResent(false);
    try {
      await api.auth.resendVerification({ email: email.trim().toLowerCase() });
      setResent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err?.message || 'Could not resend the code. Please try again shortly.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4">
            <img src={logo} alt="GOGET CRM" className="h-20 mx-auto object-contain" />
          </Link>
          <h1 className="text-2xl font-bold text-navy">Verify your email</h1>
          <p className="text-sm text-slate-500 mt-1">
            We sent a 6-digit code to {email ? <span className="font-semibold text-slate-700">{email}</span> : 'your inbox'}.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourfirm.com"
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-center text-lg tracking-[0.5em] font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}
          {resent && !error && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-700">
              A new code has been sent, if that email has a pending signup.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-purple-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-opacity"
          >
            {loading ? 'Verifying…' : 'Verify & Continue'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !email}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 disabled:opacity-60 disabled:hover:text-slate-400"
          >
            {cooldown > 0
              ? `Resend code in ${cooldown}s`
              : resending
              ? 'Sending…'
              : "Didn't get a code? Resend"}
          </button>

          <p className="text-center text-xs text-slate-400">
            Already verified?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
