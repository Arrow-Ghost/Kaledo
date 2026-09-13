import { useEffect, useState, type FormEvent } from 'react';
import { GOOGLE_OAUTH_ENABLED, signInWithEmail, signInWithGoogle } from '../../lib/auth';
import { getRememberMe } from '../../lib/supabase';
import { useSession } from '../../lib/useSession';

export default function SignIn() {
  const { hasAuthSession, ready } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Read on mount rather than as useState's initial value: this component is
  // client:only, but the initializer would still run wherever window is undefined.
  useEffect(() => setRemember(getRememberMe()), []);

  useEffect(() => {
    if (ready && hasAuthSession) window.location.href = '/onboarding';
  }, [ready, hasAuthSession]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signInWithEmail(email, password, remember);
      window.location.href = '/onboarding';
    } catch (err) {
      setError(
        err instanceof Error && err.message.toLowerCase().includes('invalid')
          ? 'Incorrect email or password.'
          : 'Sign-in could not be completed. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      await signInWithGoogle(remember);
    } catch {
      setError('Google sign-in could not be completed. Please try again.');
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-28">
      <div className="text-center">
        <span className="pill">Welcome back</span>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
          Sign in to <span className="gradient-text">Kaledo</span>
        </h1>
      </div>

      <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
        {GOOGLE_OAUTH_ENABLED && (
          <>
            <button onClick={handleGoogle} className="btn-ghost w-full">
              Continue with Google
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-fg-faint">
              <div className="h-px flex-1 bg-line" /> or <div className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-pink/40 bg-pink/5 px-4 py-2.5 text-sm text-pink">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet/60"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet/60"
          />
          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-fg-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer rounded border border-line"
              />
              Keep me signed in
            </label>
            <a href="/auth/forgot-password" className="text-xs text-fg-faint hover:text-fg">
              Forgot password?
            </a>
          </div>
          <button disabled={busy} type="submit" className="btn-primary w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-fg-muted">
        New to Kaledo?{' '}
        <a href="/auth/sign-up" className="font-semibold text-cyan hover:underline">
          Create an account
        </a>
      </p>
    </div>
  );
}
