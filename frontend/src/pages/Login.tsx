import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import Logo from '../components/Logo.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.toLowerCase().includes('incorrect')) {
        setError('Email or password is incorrect.');
      } else {
        setError('Unable to sign in right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={40} />
          </div>
          <h1 className="text-xl font-bold text-ink tracking-tight">PathAI</h1>
          <p className="text-ink-muted text-xs mt-1">Personalized Learning Path Recommender</p>
        </div>

        <div className="rounded-2xl bg-white border border-line shadow-sm p-6">
          <h2 className="text-ink font-semibold text-lg mb-6">Welcome back</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-ink-secondary text-xs font-medium mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-white border border-line focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 px-3.5 py-2.5 text-ink text-sm placeholder-ink-muted"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-ink-secondary text-xs font-medium mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-white border border-line focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 px-3.5 py-2.5 text-ink text-sm placeholder-ink-muted"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-error text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
            >
              <LogIn size={16} strokeWidth={1.75} aria-hidden="true" />
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-3">
            <button type="button" className="text-ink-muted hover:text-ink-secondary text-xs transition-colors">
              Forgot password?
            </button>
          </p>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-line" />
            <span className="text-ink-muted text-[10px] tracking-wider">OR</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <p className="text-center text-ink-secondary text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-500 hover:text-brand-600 font-medium transition-colors">
              Create Account
            </Link>
          </p>
        </div>

        <p className="text-center text-ink-muted text-xs mt-6">
          Demo: demo@pathai.local / Demo123! (local development only)
        </p>
      </div>
    </div>
  );
}
