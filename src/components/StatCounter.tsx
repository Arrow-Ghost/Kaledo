import { useEffect, useRef } from 'react';
import { ensureGsap } from '../lib/gsapSetup';

export default function StatCounter({
  value,
  suffix = '',
  label,
}: {
  value: number;
  suffix?: string;
  label: string;
}) {
  const numRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const { gsap, ScrollTrigger } = ensureGsap();
    const el = numRef.current;
    if (!el) return;
    const counter = { val: 0 };
    const tween = gsap.to(counter, {
      val: value,
      duration: 1.6,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        once: true,
      },
      onUpdate: () => {
        el.textContent = Math.round(counter.val).toLocaleString() + suffix;
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [value, suffix]);

  return (
    <div>
      <div className="font-display text-4xl font-bold sm:text-5xl">
        <span ref={numRef}>0{suffix}</span>
      </div>
      <p className="mt-1 text-sm text-fg-muted">{label}</p>
    </div>
  );
}
