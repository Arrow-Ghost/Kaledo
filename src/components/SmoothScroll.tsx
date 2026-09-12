import { useEffect } from 'react';
import Lenis from 'lenis';
import { ensureGsap } from '../lib/gsapSetup';

export default function SmoothScroll() {
  useEffect(() => {
    const { gsap, ScrollTrigger } = ensureGsap();

    const isFine = window.matchMedia('(pointer: fine)').matches;
    if (!isFine) return; // let touch devices use native scroll

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    const onPageLoad = () => ScrollTrigger.refresh();
    document.addEventListener('astro:page-load', onPageLoad);

    return () => {
      document.removeEventListener('astro:page-load', onPageLoad);
      lenis.destroy();
    };
  }, []);

  return null;
}
