/**
 * src/pages/Login.jsx
 *
 * Login page — calls POST /api/auth/mock-login.
 * Matches the existing dark-indigo design language of the app.
 */

import { useState } from 'react';
import { Plane, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [airlineId, setAirlineId] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !airlineId.trim()) {
      setError('Both fields are required.');
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), airlineId.trim());
    if (!result.success) {
      setError(result.message);
      setLoading(false);
    }
    // On success, AuthContext navigates to "/" automatically.
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">

      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
              <Plane size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">LoyalForce</h1>
              <p className="text-indigo-300 text-xs">Retention Intelligence Platform</p>
            </div>
          </div>

          <h2 className="text-white text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-7">Sign in to your airline dashboard</p>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 mb-5">
              <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-rose-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                Manager Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="manager@airline.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/8 border border-white/15 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
            </div>

            {/* Airline ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                Airline ID
              </label>
              <input
                id="login-airline-id"
                type="text"
                autoComplete="organization"
                placeholder="e.g. northern_lights_air"
                value={airlineId}
                onChange={(e) => setAirlineId(e.target.value)}
                className="w-full bg-white/8 border border-white/15 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 text-sm"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Authenticating…</>
                : 'Sign In →'
              }
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-6">
            Secured by JWT · Multi-tenant isolation enforced
          </p>
        </div>
      </div>
    </div>
  );
}
