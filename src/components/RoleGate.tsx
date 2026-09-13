import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from '../lib/useSession';
import { ensureFeatureProfile } from '../lib/db';
import type { Role } from '../lib/types';

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}

export default function RoleGate({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { user, verification, hasAuthSession, ready, roleProfile } = useSession();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!hasAuthSession) {
      setRedirecting(true);
      window.location.href = '/auth/sign-in';
      return;
    }
    if (!user) {
      // Signed in, but no role claimed yet — still mid-onboarding.
      setRedirecting(true);
      window.location.href = '/onboarding';
      return;
    }
    if (user.role !== role) {
      setRedirecting(true);
      window.location.href = `/${user.role}/dashboard`;
    }
  }, [ready, hasAuthSession, user, role]);

  const unlocked = verification !== 'none' && verification !== 'pending' && verification !== 'rejected';

  // All hooks must run unconditionally before any early return below (Rules of Hooks).
  useEffect(() => {
    if (user && user.role === role && unlocked) ensureFeatureProfile(user, roleProfile);
  }, [user, role, unlocked, roleProfile]);

  if (!ready || redirecting) {
    return (
      // data-app-loading tells the full-screen PageLoader (src/components/PageLoader.astro)
      // to keep covering the page — this spinner resolves well after Astro's own
      // page-load event fires, so without this marker the site-wide loader would
      // hide too early and briefly expose this + the footer underneath it.
      <div data-app-loading="true">
        <Centered>
          <div className="flex flex-col items-center gap-4 text-fg-muted">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-cyan" />
            <p className="font-display text-sm tracking-wide">Loading your workspace…</p>
          </div>
        </Centered>
      </div>
    );
  }

  if (!user || user.role !== role) return null;

  if (verification === 'none') {
    return (
      <Centered>
        <span className="pill">Verification required</span>
        <h1 className="mt-4 font-display text-2xl font-semibold">
          Verify your institution to continue
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          You haven't started institution verification yet. This confirms you're really
          affiliated with your college before you can access your dashboard.
        </p>
        <a href="/onboarding" className="btn-primary mt-6 inline-flex">
          Start verification →
        </a>
      </Centered>
    );
  }

  if (verification === 'pending') {
    return (
      <Centered>
        <span className="pill">Pending review</span>
        <h1 className="mt-4 font-display text-2xl font-semibold">
          Your verification is being reviewed
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          We've received your verification request. Domain-based requests are usually
          instant once you enter the emailed code; document uploads are reviewed by an
          institution or platform admin.
        </p>
        <a href="/verification/status" className="btn-ghost mt-6 inline-flex">
          Check status
        </a>
      </Centered>
    );
  }

  if (verification === 'rejected') {
    return (
      <Centered>
        <span className="pill">Verification rejected</span>
        <h1 className="mt-4 font-display text-2xl font-semibold">
          We couldn't verify your institution
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          An admin reviewed your request and couldn't confirm your affiliation. You can
          submit a new request with corrected details or documents.
        </p>
        <a href="/verification/status" className="btn-primary mt-6 inline-flex">
          View details & retry
        </a>
      </Centered>
    );
  }

  return <>{children}</>;
}
