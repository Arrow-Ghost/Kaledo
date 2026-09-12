import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Callback() {
  const [error, setError] = useState('');

  useEffect(() => {
    // supabase-js (detectSessionInUrl: true) exchanges the PKCE code / confirmation
    // token in the URL for a session automatically on client init; we just wait for it.
    let settled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !settled) {
        settled = true;
        window.location.href = '/onboarding';
      }
    });

    const timeout = setTimeout(async () => {
      if (settled) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        settled = true;
        window.location.href = '/onboarding';
      } else {
        setError('Sign-in could not be completed. The link may have expired — please try again.');
      }
    }, 4000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-sm text-pink">{error}</p>
            <a href="/auth/sign-in" className="btn-primary mt-6 inline-flex">
              Back to sign in
            </a>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-fg-muted">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-cyan" />
            <p className="font-display text-sm tracking-wide">Finishing sign-in…</p>
          </div>
        )}
      </div>
    </div>
  );
}
