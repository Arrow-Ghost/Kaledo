import { ensureGsap } from '../lib/gsapSetup';

function init() {
  const { gsap, ScrollTrigger } = ensureGsap();

  // Re-running on astro:page-load (client-side nav) — clear prior page's triggers
  // first so they don't pile up or fire against elements that no longer exist.
  ScrollTrigger.getAll().forEach((t) => t.kill());

  const groups = new Map<string, HTMLElement[]>();
  document.querySelectorAll<HTMLElement>('[data-fade-up]').forEach((el) => {
    const group = el.dataset.fadeGroup || el.id || Math.random().toString(36);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(el);
  });

  groups.forEach((els) => {
    // A little 3D pop on top of the plain fade-up — rotateX + scale read as "crazier"
    // than a flat translate alone, without becoming illegible or slow.
    gsap.set(els, { opacity: 0, y: 36, scale: 0.94, rotateX: -6, transformPerspective: 800 });
    ScrollTrigger.batch(els, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          duration: 0.9,
          ease: 'power3.out',
          stagger: { each: 0.09, from: 'start' },
        }),
    });
  });

  // Word-by-word reveal for plain-text headings (data-split-reveal). Only used on
  // elements with no nested markup — splitting around inner <span>s reliably would
  // need a proper SplitText-style implementation, which isn't worth it for a handful
  // of static headings.
  //
  // `astro:page-load` also fires once on the very first load (in addition to the
  // DOMContentLoaded listener below), so init() runs twice back-to-back — the second
  // run's ScrollTrigger.getAll().kill() above wipes the trigger the first run just
  // made. The word-wrap itself must stay idempotent (re-running it would nest spans
  // inside spans), but the ScrollTrigger has to be recreated every run or it's gone
  // for good.
  document.querySelectorAll<HTMLElement>('[data-split-reveal]').forEach((el) => {
    if (!el.dataset.splitDone) {
      const words = el.textContent?.trim().split(/\s+/) ?? [];
      el.innerHTML = words
        .map((w) => `<span class="word">${w}</span>`)
        .join(' ');
      el.dataset.splitDone = 'true';
    }

    const wordEls = el.querySelectorAll<HTMLElement>('.word');
    gsap.set(wordEls, { opacity: 0, y: '0.6em', rotateZ: 4, transformPerspective: 600 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () =>
        gsap.to(wordEls, {
          opacity: 1,
          y: 0,
          rotateZ: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.035,
        }),
    });
  });

  // Progress line that draws in as you scroll through its section, instead of a
  // one-shot reveal — tied directly to scroll position (scrub), not a threshold.
  document.querySelectorAll<HTMLElement>('[data-draw-line]').forEach((el) => {
    const section = el.closest('section') ?? el.parentElement!;
    gsap.fromTo(
      el,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top 75%',
          end: 'bottom 60%',
          scrub: 0.6,
        },
      }
    );
  });

  ScrollTrigger.refresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
document.addEventListener('astro:page-load', init);
