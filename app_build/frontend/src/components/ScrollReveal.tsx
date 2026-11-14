'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Scroll reveal for every public page: blocks below the first screen rise into place as they scroll into view.
 * Nothing is hidden by the server markup, so the page reads fine without JavaScript; only blocks that start below the
 * fold are hidden, so nothing on the first screen flickers. Off entirely under reduced motion.
 */
const WRAPS = 'main section, main > article, main > div, footer';
const INNER = ':scope > :is(.pg-wrap, .frame, .genres-wrap, .footer-grid, .footer-base)';
const SKIP = '.ph, .hero, .ph *, .hero *, .gold-band, [data-no-reveal]';
const STEP_MS = 90;
const MAX_STAGGER = 6;

function targets(root: ParentNode): HTMLElement[] {
  const out: HTMLElement[] = [];
  root.querySelectorAll<HTMLElement>(WRAPS).forEach((sec) => {
    if (sec.matches(SKIP)) return;
    const inners = sec.querySelectorAll<HTMLElement>(INNER);
    const blocks: Element[] = inners.length ? [...inners].flatMap((w) => [...w.children]) : [...sec.children];
    for (const b of blocks as HTMLElement[]) {
      if (b.matches(SKIP) || b.tagName === 'SECTION') continue;
      // A grid or row of cards reveals card by card; anything else moves as one block.
      const d = getComputedStyle(b).display;
      const many = b.children.length >= 3 && /grid|flex/.test(d);
      out.push(...(many ? ([...b.children] as HTMLElement[]) : [b]));
    }
  });
  return out;
}

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

    const show = (el: HTMLElement) => {
      io.unobserve(el);
      el.classList.add('rv-in');
      // Drop the transform once settled so sticky or fixed children behave normally afterwards.
      el.addEventListener('transitionend', () => el.classList.remove('rv', 'rv-in'), { once: true });
    };
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) show(e.target as HTMLElement); },
      { rootMargin: '0px 0px -40px 0px', threshold: 0 },
    );
    // The last blocks on a page (the footer's bottom row) may never cross the trigger line: the page ends first.
    const onScroll = () => {
      if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 80) return;
      document.querySelectorAll<HTMLElement>('.rv:not(.rv-in)').forEach(show);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const scan = () => {
      const fold = window.innerHeight;
      const seen = new Map<Element, number>();
      for (const el of targets(document)) {
        if (el.dataset.rv) continue;
        el.dataset.rv = '1';
        if (el.getBoundingClientRect().top < fold) continue; // already on screen: leave it alone
        const parent = el.parentElement!;
        const i = seen.get(parent) ?? 0;
        seen.set(parent, i + 1);
        el.style.setProperty('--rv-delay', `${Math.min(i, MAX_STAGGER) * STEP_MS}ms`);
        el.classList.add('rv');
        io.observe(el);
      }
    };

    // A timer, not requestAnimationFrame: a page opened in a background tab never gets a frame, and would never be scanned.
    const raf = window.setTimeout(scan, 30);
    // Streamed or client-rendered sections arrive after the first scan.
    let t: ReturnType<typeof setTimeout> | undefined;
    const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 120); });
    const main = document.getElementById('main');
    if (main) mo.observe(main, { childList: true, subtree: true });

    return () => {
      clearTimeout(raf); clearTimeout(t); mo.disconnect(); io.disconnect();
      window.removeEventListener('scroll', onScroll);
      // Nothing may stay hidden once its observer is gone (the footer outlives a client-side navigation).
      document.querySelectorAll<HTMLElement>('[data-rv]').forEach((el) => {
        el.classList.remove('rv', 'rv-in');
        delete el.dataset.rv;
      });
    };
  }, [pathname]);

  return null;
}
