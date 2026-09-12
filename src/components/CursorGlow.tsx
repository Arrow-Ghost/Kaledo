import { useEffect, useRef } from 'react';

/** A soft violet spotlight that follows the pointer across the whole site — pure CSS
 * variables updated on mousemove, no layout cost. Fades in only once the pointer has
 * actually moved (avoids a stray glow at 50/50 before the user does anything), and
 * turns itself off for touch devices where there's no persistent pointer. */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--x', `${e.clientX}px`);
        el.style.setProperty('--y', `${e.clientY}px`);
        el.classList.add('is-active');
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="cursor-glow" aria-hidden="true" />;
}
