import { useState, type FormEvent } from 'react';
import { updatePassword } from '../../lib/auth';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => (window.location.href = '/onboarding'), 1500);
    } catch {
      setError('Could not update your password. The reset link may have expired — request a new one.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-28">
      <div className="text-center">
        <span className="pill">Set new password</span>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
          Choose a new password
        </h1>
      </div>

      <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
        {done ? (
          <p className="text-sm text-cyan">Password updated. Redirecting…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-pink/40 bg-pink/5 px-4 py-2.5 text-sm text-pink">
                {error}
              </div>
            )}
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet/60"
            />
            <input
              required
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet/60"
            />
            <button disabled={busy} type="submit" className="btn-primary w-full">
              {busy ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
