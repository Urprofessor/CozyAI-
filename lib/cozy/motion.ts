'use client';

/* Motion helpers for script-driven animation (Web Animations API). The
 * curves are the same springs as app/motion.css, read from its custom
 * properties so there is one source. */

export type Spring = 'smooth' | 'snappy' | 'soft' | 'bouncy';

const FALLBACK: Record<Spring, string> = {
  smooth: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  snappy: 'cubic-bezier(0.25, 1, 0.5, 1)',
  soft: 'cubic-bezier(0.34, 1.3, 0.64, 1)',
  bouncy: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

const cache: Partial<Record<Spring, string>> = {};

/** The CSS easing for a spring, usable as a WAAPI `easing`. */
export function spring(name: Spring): string {
  if (cache[name]) return cache[name]!;
  if (typeof window === 'undefined') return FALLBACK[name];
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--spring-${name}`).trim();
  const ok = v && (!v.startsWith('linear(') || CSS.supports('transition-timing-function', v));
  return (cache[name] = ok ? v : FALLBACK[name]);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Runs an animation and resolves when it ends, is cancelled, or (as a
 *  safety net) shortly after it should have ended. Never rejects. */
export function play(
  el: Element | null | undefined,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: KeyframeAnimationOptions,
): Promise<void> {
  if (!el) return Promise.resolve();
  const anim = el.animate(keyframes, { fill: 'both', ...options });
  const total = Number(options.duration ?? 0) + Number(options.delay ?? 0);
  return new Promise((resolve) => {
    const t = window.setTimeout(resolve, total + 120);
    const done = () => {
      window.clearTimeout(t);
      resolve();
    };
    anim.finished.then(done, done);
  });
}

export const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
