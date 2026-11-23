'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import { focusInsight, type FocusId } from '@/lib/cozy/focus';
import { ILLUSTRATIONS } from '@/lib/cozy/illustrations';
import { TrendLine, insightFigures } from '../cards/StoryCard';

/* The first letter's one big moment: when the writing reaches "I noticed",
 * the observation fills the screen — its number counts up from where it was a
 * week ago, the trend line draws, the illustration drifts — then the screen
 * closes in on the card's place in the letter (same colour, so it reads as
 * the card settling) and the letter carries on.
 *
 * Shown over the whole letter (portalled to .cz-letter). A tap anywhere skips
 * it; the caller doesn't mount it for rereads or "reduce motion". */

const IN_MS = 420;
const COUNT_DELAY_MS = 450;
const COUNT_MS = 1300;
const HOLD_MS = 3000; // from fully in to starting to close
const OUT_MS = 720;

type Phase = 'in' | 'hold' | 'out';

interface Props {
  account: DemoAccount;
  id: FocusId;
  /** The card in the letter, where the moment closes in. */
  target: () => HTMLElement | null;
  onDone: () => void;
}

export function InsightMoment({ account, id, target, onDone }: Props) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [phase, setPhase] = useState<Phase>('in');
  const boxRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const insight = focusInsight(account, id);
  const figures = insightFigures(account, id);
  const value = useCountUp(figures.hero?.from ?? 0, figures.hero?.to ?? 0);

  // The getter is new every render; read it through a ref so effects run once.
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    setRoot((targetRef.current()?.closest('.cz-letter') as HTMLElement | null) ?? null);
  }, []);

  /** The card's rect as a clip-path inset of the full-screen box. */
  const cardClip = () => {
    const card = targetRef.current();
    if (!card || !root) return null;
    const r = card.getBoundingClientRect();
    const R = root.getBoundingClientRect();
    const radius = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 18;
    return `inset(${r.top - R.top}px ${R.right - r.right}px ${R.bottom - r.bottom}px ${r.left - R.left}px round ${radius}px)`;
  };
  const FULL = 'inset(0px 0px 0px 0px round 0px)';

  // in → hold → out → done
  useEffect(() => {
    if (!root) return;
    const t1 = window.setTimeout(() => setPhase('hold'), IN_MS);
    const t2 = window.setTimeout(() => setPhase('out'), IN_MS + HOLD_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [root]);

  // Open out from the card…
  useEffect(() => {
    const box = boxRef.current;
    const from = cardClip();
    if (!box || !from) return;
    const anim = box.animate([{ clipPath: from }, { clipPath: FULL }], {
      duration: IN_MS,
      easing: 'cubic-bezier(0.3, 0, 0.2, 1)',
    });
    return () => anim.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  // While the screen is covered, bring the whole card into view so the
  // moment closes in on all of it, not a card half below the fold.
  useEffect(() => {
    if (phase !== 'hold') return;
    const card = targetRef.current();
    const body = card?.closest<HTMLElement>('.cz-letter__body');
    if (!card || !body) return;
    const r = card.getBoundingClientRect();
    const b = body.getBoundingClientRect();
    if (r.top < b.top || r.bottom > b.bottom) body.scrollTop += r.top - b.top - 16;
  }, [phase]);

  // …and close back in on it.
  useEffect(() => {
    if (phase !== 'out') return;
    const box = boxRef.current;
    const to = cardClip();
    if (!box || !to) {
      doneRef.current();
      return;
    }
    const anim = box.animate([{ clipPath: FULL }, { clipPath: to }], {
      duration: OUT_MS,
      easing: 'cubic-bezier(0.55, 0, 0.2, 1)',
      fill: 'forwards',
    });
    anim.onfinish = () => doneRef.current();
    return () => anim.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!root || !insight || !figures.hero) return null;
  const art = ILLUSTRATIONS[id];

  return createPortal(
    <div
      ref={boxRef}
      className={cn('sc im', `sc--${figures.tone}`, `is-${phase}`)}
      role="img"
      aria-label={`${insight.title}: ${figures.hero.format(figures.hero.to)}`}
    >
      <div className="im__content">
        <p className="im__eyebrow">I noticed</p>
        <h2 className="im__title">{insight.title}</h2>
        <p className="im__number">{figures.hero.format(value)}</p>
        <p className="im__sub">{figures.hero.sub}</p>
        {figures.trend && (
          <div className="im__trend">
            <TrendLine values={figures.trend.values} label={figures.trend.label} />
          </div>
        )}
        {art && <img className="im__art" src={art} alt="" />}
        <p className="im__source">From {insight.source.replace(/^Momcozy /, 'your ')}</p>
      </div>
    </div>,
    root,
  );
}

/** Count from `from` to `to`, easing out, after a short delay. */
function useCountUp(from: number, to: number) {
  const [v, setV] = useState(from);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const delay = window.setTimeout(() => {
      const tick = (now: number) => {
        if (!start) start = now;
        const t = Math.min(1, (now - start) / COUNT_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        setV(from + (to - from) * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, COUNT_DELAY_MS);
    return () => {
      window.clearTimeout(delay);
      cancelAnimationFrame(raf);
    };
  }, [from, to]);
  return v;
}
