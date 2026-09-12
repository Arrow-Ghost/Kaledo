import { useState, type FormEvent } from 'react';
import { sendPasswordReset } from '../../lib/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch {
      setError('Could not send the reset link. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-28">
      <div className="text-center">
        <span className="pill">Reset password</span>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
          Forgot your password?
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          We'll email you a link to set a new one.
        </p>
      </div>

      <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
        {sent ? (
          <p className="text-sm text-fg-muted">
            If an account exists for <strong>{email}</strong>, a reset link is on its
            way. Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-pink/40 bg-pink/5 px-4 py-2.5 text-sm text-pink">
                {error}
              </div>
            )}
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet/60"
            />
            <button disabled={busy} type="submit" className="btn-primary w-full">
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-fg-muted">
        <a href="/auth/sign-in" className="font-semibold text-cyan hover:underline">
          Back to sign in
        </a>
      </p>
    </div>
  );
}
