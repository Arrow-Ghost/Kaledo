import { useEffect, useState, type FormEvent } from 'react';
import { GOOGLE_OAUTH_ENABLED, signInWithGoogle, signUpWithEmail } from '../../lib/auth';
import { useSession } from '../../lib/useSession';

export default function SignUp() {
  const { hasAuthSession, ready } = useSession();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  useEffect(() => {
    if (ready && hasAuthSession) window.location.href = '/onboarding';
  }, [ready, hasAuthSession]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const result = await signUpWithEmail(email, password, fullName);
      if (result.session) {
        window.location.href = '/onboarding';
      } else {
        setSentConfirmation(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up could not be completed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Google sign-up could not be completed. Please try again.');
    }
  }

  if (sentConfirmation) {
    return (
      <div className="mx-auto max-w-md px-6 py-28 text-center">
        <span className="pill">Check your inbox</span>
        <h1 className="mt-4 font-display text-3xl font-bold">Confirm your email</h1>
        <p className="mt-3 text-fg-muted">
          We sent a confirmation link to <strong>{email}</strong>. Click it, then come
          back here to finish setting up your account.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-28">
      <div className="text-center">
        <span className="pill">Create account</span>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
          Join <span className="gradient-text">Kaledo</span>
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
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet/60"
          />
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
            placeholder="Password (min 8 characters)"
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet/60"
          />
          <button disabled={busy} type="submit" className="btn-primary w-full">
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-fg-muted">
        Already have an account?{' '}
        <a href="/auth/sign-in" className="font-semibold text-cyan hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
