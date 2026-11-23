'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SOURCE_SHARE, knownPercent, statusOf, type Connections, type SourceId } from '@/lib/cozy/connections';

/* How well Cozie knows the family, as a small sky over the "Make it personal"
 * cards. One star is 5%: each source lights its own group, joined by thin
 * lines, and the percentage counts up. Stars still dark are what chatting or
 * a Momcozy device would add. */

const SOURCES: { id: SourceId; name: string; color: string; stars: number[] }[] = [
  { id: 'health', name: 'Apple Health', color: '#e0607e', stars: [0, 1, 2] },
  { id: 'files', name: 'Files', color: '#c9973a', stars: [3, 4, 5] },
  { id: 'ai', name: 'Your AI', color: '#8a73c4', stars: [6, 7, 8, 9, 10, 11, 12, 13, 14] },
];

/** 20 stars in a 320×150 sky; 15–19 stay dark (chat and devices). */
const STARS: [number, number][] = [
  [40, 40], [78, 26], [64, 70],
  [250, 30], [288, 52], [262, 84],
  [128, 36], [160, 62], [120, 92], [176, 104], [214, 124], [150, 128], [96, 122], [56, 108], [230, 70],
  [20, 86], [200, 34], [300, 118], [24, 134], [110, 64],
];

const COUNT_MS = 900;
/** Connections load just after mount; don't celebrate what was already there. */
const SETTLE_MS = 600;

export function ConnectionsSky({ connections }: { connections: Connections }) {
  const percent = knownPercent(connections);
  const on = (id: SourceId) => statusOf(connections, id) === 'done';

  const [shown, setShown] = useState(percent);
  const [fresh, setFresh] = useState<{ ids: SourceId[]; gen: number }>({ ids: [], gen: 0 });
  const [caption, setCaption] = useState<string | null>(null);
  const mountedAt = useRef(0);
  const prev = useRef<Record<SourceId, boolean> | null>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  // Light the sources that just connected, and say what changed.
  useEffect(() => {
    const now = { health: on('health'), files: on('files'), ai: on('ai') };
    const before = prev.current;
    prev.current = now;
    if (!before || Date.now() - mountedAt.current < SETTLE_MS) return;
    const lit = SOURCES.filter((s) => now[s.id] && !before[s.id]);
    const dimmed = SOURCES.filter((s) => !now[s.id] && before[s.id]);
    if (lit.length) {
      setFresh((f) => ({ ids: lit.map((s) => s.id), gen: f.gen + 1 }));
      const added = lit.reduce((n, s) => n + SOURCE_SHARE[s.id], 0);
      setCaption(`${lit.map((s) => s.name).join(' and ')} lit up ${added / 5} stars · +${added}%`);
    } else if (dimmed.length) {
      setFresh((f) => ({ ids: [], gen: f.gen + 1 }));
      setCaption(`${dimmed.map((s) => s.name).join(' and ')} disconnected`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections]);

  // Count the number up (or down) to the new percentage.
  const shownRef = useRef(shown);
  shownRef.current = shown;
  useEffect(() => {
    const from = shownRef.current;
    if (from === percent) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || Date.now() - mountedAt.current < SETTLE_MS) {
      setShown(percent);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / COUNT_MS);
      setShown(Math.round(from + (percent - from) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [percent]);

  const sourceOf = (i: number) => SOURCES.find((s) => s.stars.includes(i));

  return (
    <div className="cz-sky">
      <div className="cz-sky__head">
        <strong className="cz-sky__percent">{shown}%</strong>
        <span className="cz-sky__label">of what Cozie would love to know about you and your baby</span>
      </div>

      <svg className="cz-sky__map" viewBox="0 0 320 150" role="img" aria-label={`Cozie knows ${percent}% so far`}>
        {SOURCES.filter((s) => on(s.id)).map((s) => {
          const isFresh = fresh.ids.includes(s.id);
          return s.stars.slice(1).map((star, k) => {
            const [x1, y1] = STARS[s.stars[k]];
            const [x2, y2] = STARS[star];
            return (
              <line
                key={`l-${star}-${isFresh ? fresh.gen : 0}`}
                className={cn('cz-sky__line', isFresh && 'is-fresh')}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={s.color}
                pathLength={1}
                style={isFresh ? { animationDelay: `${k * 0.12 + 0.2}s` } : undefined}
              />
            );
          });
        })}
        {STARS.map(([x, y], i) => {
          const s = sourceOf(i);
          if (!s || !on(s.id)) {
            return <circle key={`s-${i}`} className="cz-sky__star is-dark" cx={x} cy={y} r={3.5} />;
          }
          const isFresh = fresh.ids.includes(s.id);
          const delay = isFresh ? { animationDelay: `${s.stars.indexOf(i) * 0.12}s` } : undefined;
          return (
            <Fragment key={`s-${i}-${isFresh ? fresh.gen : 0}`}>
              {isFresh && <circle className="cz-sky__burst" cx={x} cy={y} r={5} stroke={s.color} style={delay} />}
              <circle className={cn('cz-sky__star', isFresh && 'is-fresh')} cx={x} cy={y} r={4.5} fill={s.color} style={delay} />
            </Fragment>
          );
        })}
      </svg>

      <ul className="cz-sky__legend">
        {SOURCES.map((s) => (
          <li key={s.id} className={cn(!on(s.id) && 'is-off')}>
            <span style={{ background: s.color }} aria-hidden />
            {s.name} <em>+{SOURCE_SHARE[s.id]}%</em>
          </li>
        ))}
      </ul>
      <p className="cz-sky__caption" aria-live="polite">
        {caption ?? (percent ? 'Chatting with Cozie lights up the rest.' : 'Each thing you connect lights up more of Cozie’s sky.')}
      </p>
    </div>
  );
}
