import { useEffect, useState } from 'react';
import { useSession } from '../lib/useSession';
import { signOut } from '../lib/auth';

const ROLE_LINKS: Record<string, { href: string; label: string }[]> = {
  student: [
    { href: '/student/dashboard', label: 'Dashboard' },
    { href: '/student/assessment', label: 'Skill Assessment' },
    { href: '/student/opportunities', label: 'Opportunities' },
    { href: '/student/learning', label: 'Learning' },
    { href: '/student/resume', label: 'Resume' },
    { href: '/student/portfolio', label: 'Portfolio' },
  ],
  industry: [
    { href: '/industry/dashboard', label: 'Dashboard' },
  ],
  academician: [
    { href: '/academician/dashboard', label: 'Dashboard' },
  ],
  institution: [
    { href: '/institution/dashboard', label: 'Dashboard' },
  ],
};

export default function Nav() {
  const { user, roles, ready } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [path, setPath] = useState('');

  useEffect(() => {
    setPath(window.location.pathname);

    // Lenis (smooth-scroll) manages scrolling itself and doesn't reliably fire the
    // native 'scroll' event the same way plain browser scrolling does — a listener
    // here would silently never fire. window.scrollY is just a property, though, so
    // polling it once a frame is unaffected by however the scroll actually happened.
    let raf = 0;
    let last = false;
    const tick = () => {
      const isScrolled = window.scrollY > 12;
      if (isScrolled !== last) {
        last = isScrolled;
        setScrolled(isScrolled);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const isAdmin = roles.includes('institution_admin') || roles.includes('super_admin');
  // ROLE_LINKS[user.role] is a shared, module-level array — mutating it directly with
  // .push() during render corrupted it permanently and grew a duplicate "Verification
  // Queue" entry on every re-render. Copy before appending.
  const links = user ? [...(ROLE_LINKS[user.role] ?? [])] : [];
  if (isAdmin) links.push({ href: '/admin/verification', label: 'Verification Queue' });

  async function handleSignOut() {
    await signOut('local');
    window.location.href = '/';
  }

  return (
    // Fixed size/position at all times — it used to grow/shrink its own margin and
    // padding past the scroll threshold, which visibly shifted the whole bar. Only
    // the shadow deepens on scroll now, which doesn't move anything.
    <header className="fixed inset-x-0 top-0 z-50 px-3 py-3 sm:px-6">
      <div
        className={`glass mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-2 transition-shadow duration-300 sm:px-6 ${
          scrolled ? 'shadow-lg shadow-ink/40' : ''
        }`}
      >
        <a href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan to-violet text-sm font-bold text-ink">
            K
          </span>
          <span>
            Kale<span className="gradient-text">do</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                path === l.href
                  ? 'bg-surface-soft text-fg'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {ready && user ? (
            <>
              <a href="/account/settings" className="pill transition-colors hover:border-fg-faint">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
                {user.name.split(' ')[0]} · {user.role}
              </a>
              <button onClick={handleSignOut} className="btn-ghost !py-2 !text-xs">
                Sign out
              </button>
            </>
          ) : (
            <a href="/auth/sign-up" className="btn-primary !py-2 !text-xs">
              Get started
            </a>
          )}
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span className="font-display text-lg">{open ? '×' : '≡'}</span>
        </button>
      </div>

      {open && (
        <div className="mx-3 mt-2 rounded-2xl glass p-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-soft hover:text-fg"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 border-t border-line pt-3">
            {ready && user ? (
              <button onClick={handleSignOut} className="btn-ghost w-full !text-xs">
                Sign out ({user.name.split(' ')[0]})
              </button>
            ) : (
              <a href="/auth/sign-up" className="btn-primary block w-full !text-xs">
                Get started
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
