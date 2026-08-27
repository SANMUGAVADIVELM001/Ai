import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import Logo from '../components/Logo.js';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signup(name, email, password);
      // New accounts go straight to Home, which itself shows the
      // goal/onboarding prompt rather than a fixed roadmap — no roadmap is
      // generated until the learner provides a goal and completes the
      // diagnostic.
      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.toLowerCase().includes('already exists')) {
        setError('An account with this email already exists.');
      } else if (message) {
        setError(message);
      } else {
        setError('Unable to create your account right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={40} />
          </div>
          <h1 className="text-xl font-bold text-ink tracking-tight">PathAI</h1>
          <p className="text-ink-muted text-xs mt-1">Personalized Learning Path Recommender</p>
        </div>

        <div className="rounded-2xl bg-white border border-line shadow-sm p-6">
          <h2 className="text-ink font-semibold text-lg mb-6">Create your account</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="block text-ink-secondary text-xs font-medium mb-1.5">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-white border border-line focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 px-3.5 py-2.5 text-ink text-sm placeholder-ink-muted"
                placeholder="Jane Doe"
              />
            </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-white border border-line focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 px-3.5 py-2.5 text-ink text-sm placeholder-ink-muted"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-ink-secondary text-xs font-medium mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              <UserPlus size={16} strokeWidth={1.75} aria-hidden="true" />
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-ink-secondary text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 hover:text-brand-600 font-medium transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
