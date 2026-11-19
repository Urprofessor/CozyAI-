'use client';

/** Shared pieces of the guided intro's animated heroes: the mini phone, skeleton
 *  lines, ring charts, the phase clock that drives them, and the first-step
 *  "Today" hero (three metrics swiping past). */

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CZ } from './ui';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Steps through `count` phases every `ms`, looping. Reduced motion parks on
 *  `rest`. Drives the hero animations so their beats stay in sync. */
export function usePhase(count: number, ms: number, rest = 0) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (reducedMotion()) {
      setPhase(rest);
      return;
    }
    const id = window.setInterval(() => setPhase((p) => (p + 1) % count), ms);
    return () => window.clearInterval(id);
  }, [count, ms, rest]);
  return phase;
}

/* ───────────── Mini phone ───────────── */

export function MiniPhone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('cz-guide-phone', className)} aria-hidden="true">
      {children}
    </div>
  );
}

export function Skel({ w, tone }: { w: string; tone?: 'dark' | 'soft' }) {
  return <span className={cn('cz-guide-skel', tone && `is-${tone}`)} style={{ width: w }} />;
}

/* Ring chart drawn as stroked circles; each arc animates its dash in. */
function Ring({
  r,
  color,
  frac,
  start = 0,
  width = 9,
  delay = 0,
  track = true,
}: {
  r: number;
  color: string;
  frac: number;
  start?: number;
  width?: number;
  delay?: number;
  track?: boolean;
}) {
  const c = 2 * Math.PI * r;
  return (
    <>
      {track && <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeOpacity="0.16" strokeWidth={width} />}
      <circle
        className="cz-guide-arc"
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
        style={{ ['--len' as string]: c * frac, animationDelay: `${delay}ms` }}
        transform={`rotate(${-90 + start * 360} 60 60)`}
      />
    </>
  );
}

/* Step 1 hero — the "Today" screen with three metrics swiping past:
 * feeds → sleep → Cozie, and back. */
const METRICS = ['feeds', 'sleep', 'cozie'] as const;
const PINGPONG = [0, 1, 2, 1];

export function WelcomeHero() {
  const beat = usePhase(PINGPONG.length, 2400);
  const slide = PINGPONG[beat];
  return (
    <MiniPhone>
      <div className="cz-guide-chips">
        {METRICS.map((m, i) => (
          <span key={m} className={cn('cz-guide-chip', i === slide && 'is-on')}>
            <i className={`cz-guide-chip__dot is-${m}`} />
            <span className="cz-guide-chip__lines">
              <Skel w="22px" tone="soft" />
              <Skel w="30px" />
            </span>
          </span>
        ))}
      </div>

      <div className="cz-guide-track" style={{ transform: `translateX(${slide * -100}%)` }}>
        <div className={cn('cz-guide-slide', slide === 0 && 'is-on')}>
          <svg viewBox="0 0 120 120" className="cz-guide-ringsvg">
            <Ring r={48} color="var(--colors-brands-mom-700)" frac={0.6} width={14} />
            <Ring r={48} color="var(--colors-brands-mom-500)" frac={0.22} start={0.66} width={14} delay={250} track={false} />
            <Ring r={48} color="var(--colors-brands-parenting-300)" frac={0.06} start={0.92} width={14} delay={400} track={false} />
          </svg>
          <span className="cz-guide-metric">
            <b>6</b>
            <small>feeds</small>
          </span>
        </div>

        <div className={cn('cz-guide-slide', slide === 1 && 'is-on')}>
          <svg viewBox="0 0 120 120" className="cz-guide-ringsvg">
            <Ring r={50} color="var(--colors-brands-care-500)" frac={0.78} width={10} />
            <Ring r={37} color="var(--colors-brands-family-500)" frac={0.56} width={10} delay={120} />
            <Ring r={24} color="var(--colors-brands-parenting-500)" frac={0.88} width={10} delay={240} />
          </svg>
          <span className="cz-guide-metric cz-guide-metric--sm">
            <b>14h</b>
          </span>
        </div>

        <div className={cn('cz-guide-slide', slide === 2 && 'is-on')}>
          <span className="cz-guide-halo">
            <i />
            <i />
            <i />
            <img src={`${CZ}/ip/Cozy_Magic_Light.webp`} alt="" draggable={false} />
          </span>
        </div>
      </div>

      <div className="cz-guide-copy">
        <Skel w="44%" tone="dark" />
        <Skel w="86%" />
        <Skel w="70%" />
      </div>

      <div className="cz-guide-split">
        <span className="cz-guide-bars">
          {[38, 62, 30, 84, 56, 92, 48].map((h, i) => (
            <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
          ))}
        </span>
        <span className="cz-guide-stripes">
          <i className="is-mom" />
          <i className="is-care" />
          <i className="is-family" />
          <i className="is-parenting" />
        </span>
      </div>
      <div className="cz-guide-copy">
        <Skel w="58%" tone="dark" />
        <Skel w="90%" />
      </div>
    </MiniPhone>
  );
}

