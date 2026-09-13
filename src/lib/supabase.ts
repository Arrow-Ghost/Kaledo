import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.'
  );
}

const REMEMBER_KEY = 'kaledo.auth.remember';

function browser() {
  return typeof window !== 'undefined';
}

/** Defaults to true — matches how sessions behaved before the toggle existed. */
export function getRememberMe(): boolean {
  if (!browser()) return true;
  try {
    return window.localStorage.getItem(REMEMBER_KEY) !== 'false';
  } catch {
    return true;
  }
}

function activeStore(): Storage | null {
  if (!browser()) return null;
  try {
    return getRememberMe() ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Supabase picks its storage once, at createClient() time — long before the user
 * ticks "Remember me" — so this adapter defers the choice to each read/write instead.
 * On: tokens live in localStorage and survive closing the browser. Off: they live in
 * sessionStorage and die with the tab. The preference flag itself always stays in
 * localStorage so it's readable on a cold start, before any session is looked up.
 */
const rememberAwareStorage = {
  getItem: (key: string) => activeStore()?.getItem(key) ?? null,
  setItem: (key: string, value: string) => {
    activeStore()?.setItem(key, value);
  },
  removeItem: (key: string) => {
    // Clear both stores on sign-out, so a token left in the inactive one can never
    // resurrect a session the user just ended.
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable (private mode / blocked cookies) — nothing to clear */
    }
  },
};

/** Call before signing in, so the session tokens land in the right store. */
export function setRememberMe(remember: boolean) {
  if (!browser()) return;
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
    // Purge any Supabase token from the store that is no longer the active one.
    // Without this, unticking the box on a shared computer would leave the previous
    // session's tokens sitting in localStorage.
    const stale = remember ? window.sessionStorage : window.localStorage;
    for (let i = stale.length - 1; i >= 0; i--) {
      const key = stale.key(i);
      if (key && key.startsWith('sb-')) stale.removeItem(key);
    }
  } catch {
    /* storage unavailable — the session simply won't persist */
  }
}

export const supabase = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: rememberAwareStorage,
  },
});
