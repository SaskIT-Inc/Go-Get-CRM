import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import PasswordInput from '@/components/PasswordInput';
import logo from '@/assets/goget-mark.png';
import { LayoutGrid, User as UserIcon } from 'lucide-react';

const PORTALS = {
  firm: {
    title: 'Sign in — Firms & Practitioners',
    subtitle: 'Sign in to your GOGET CRM workspace',
    emailPlaceholder: 'you@yourfirm.com',
  },
  client: {
    title: 'Sign in — Client Portal',
    subtitle: 'Sign in to view your work with your accounting firm',
    emailPlaceholder: 'you@example.com',
  },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [portal, setPortal] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err?.errorCode === 'email_not_verified') {
        navigate(`/verify-email?email=${encodeURIComponent(err.data?.email || email.trim().toLowerCase())}`, { replace: true });
        return;
      }
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img src={logo} alt="GOGET CRM" className="h-20 mx-auto object-contain" />
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            GOGET CRM
          </h1>
          {portal && <p className="text-sm text-slate-500 mt-1">{PORTALS[portal].subtitle}</p>}
        </div>

        {!portal ? (
          <div className="space-y-3">
            <p className="text-center text-sm font-semibold text-slate-500 mb-4">Log in to your portal</p>
            <button
              onClick={() => setPortal('firm')}
              className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-primary hover:bg-slate-50 transition-all flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-navy">Firms / Practitioners</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  I represent a tax, bookkeeping, or full-service accounting firm.
                </p>
              </div>
            </button>
            <button
              onClick={() => setPortal('client')}
              className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-primary hover:bg-slate-50 transition-all flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 flex-shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-navy">Clients</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  I am a client of a firm that uses GOGET CRM.
                </p>
              </div>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                Email
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={PORTALS[portal].emailPlaceholder}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                Password
              </label>
              <PasswordInput
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-purple-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-opacity"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => { setPortal(null); setError(''); }}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600"
            >
              ← Choose a different portal
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
