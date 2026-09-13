import { useEffect, useState } from 'react';
import { useSession } from '../lib/useSession';
import { signOut, updateMyProfile, updatePassword } from '../lib/auth';

function AccountSettingsInner() {
  const { user, roles, verification } = useSession();
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [savedProfile, setSavedProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  const [signOutBusy, setSignOutBusy] = useState(false);

  async function saveProfile() {
    await updateMyProfile({ phone, city, state });
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  }

  async function changePassword() {
    setPwError('');
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    try {
      await updatePassword(newPassword);
      setPwSaved(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSaved(false), 2000);
    } catch {
      setPwError('Could not update your password.');
    }
  }

  async function handleSignOutEverywhere() {
    setSignOutBusy(true);
    await signOut('global');
    window.location.href = '/';
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 pb-28 pt-32">
      <span className="pill">Account</span>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">Settings</h1>

      <div className="glass mt-8 rounded-2xl p-6">
        <h3 className="font-display text-sm font-semibold text-fg-muted">Profile</h3>
        <div className="mt-4 space-y-3">
          <p className="text-sm text-fg-muted">
            {user.name} · {user.email}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
            />
          </div>
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
          />
          <button onClick={saveProfile} className="btn-primary">
            {savedProfile ? 'Saved ✓' : 'Save profile'}
          </button>
        </div>
      </div>

      {roles.some((r) => r === 'student' || r === 'faculty') && (
        <div className="glass mt-6 rounded-2xl p-6">
          <h3 className="font-display text-sm font-semibold text-fg-muted">Verification</h3>
          <p className="mt-2 text-sm text-fg-muted capitalize">Status: {verification}</p>
          <a href="/verification/status" className="btn-ghost mt-3 inline-flex">
            View details
          </a>
        </div>
      )}

      <div className="glass mt-6 rounded-2xl p-6">
        <h3 className="font-display text-sm font-semibold text-fg-muted">Password</h3>
        <div className="mt-4 space-y-3">
          {pwError && <p className="text-sm text-pink">{pwError}</p>}
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
          />
          <button onClick={changePassword} className="btn-primary">
            {pwSaved ? 'Updated ✓' : 'Update password'}
          </button>
        </div>
      </div>

      <div className="glass mt-6 rounded-2xl p-6">
        <h3 className="font-display text-sm font-semibold text-fg-muted">Sessions</h3>
        <p className="mt-2 text-sm text-fg-muted">
          Sign out of this device only, or every device you're currently signed in on.
        </p>
        <div className="mt-3 flex gap-3">
          <button
            onClick={async () => {
              await signOut('local');
              window.location.href = '/';
            }}
            className="btn-ghost"
          >
            Sign out
          </button>
          <button disabled={signOutBusy} onClick={handleSignOutEverywhere} className="btn-ghost">
            Sign out of all devices
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountSettings() {
  const { user, ready } = useSession();

  useEffect(() => {
    if (ready && !user) window.location.href = '/auth/sign-in';
  }, [ready, user]);

  if (!ready || !user) return <span data-app-loading="true" className="hidden" />;
  return <AccountSettingsInner />;
}
