'use client';

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SOURCE_SHARE, knownPercent, statusOf, type Connections, type SourceId } from '@/lib/cozy/connections';

/* How well Cozie knows the family, as the Big Dipper on a night sky over
 * Data sources. Its seven stars are shared out by what each source adds
 * (about 14% a star): Apple Health lights one, a file one, an AI assistant
 * three, and the last two are what chatting or a Momcozy device would add.
 * A connected source's stars light up and join the constellation's lines,
 * and the percentage counts up. */

const SOURCES: { id: SourceId; name: string; color: string; stars: number[] }[] = [
  { id: 'health', name: 'Apple Health', color: '#ff9bb3', stars: [0] },
  { id: 'files', name: 'Files', color: '#ffd27a', stars: [1] },
  { id: 'ai', name: 'Your AI', color: '#c7b5ff', stars: [2, 3, 4] },
];

/** The Big Dipper in a 320×170 sky, bowl on the right; r follows brightness. */
const DIPPER = [
  { name: 'Dubhe', x: 262, y: 50, r: 3.6 },
  { name: 'Merak', x: 270, y: 100, r: 3.2 },
  { name: 'Phecda', x: 214, y: 114, r: 3.0 },
  { name: 'Megrez', x: 202, y: 74, r: 2.6 },
  { name: 'Alioth', x: 150, y: 64, r: 3.6 },
  { name: 'Mizar', x: 106, y: 58, r: 3.3 },
  { name: 'Alkaid', x: 56, y: 88, r: 3.5 },
];
/** The bowl, then the handle. */
const EDGES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]];

/** Faint background stars, the same on every render. */
const BACKDROP = (() => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 70 }, () => ({
    x: rand() * 320,
    y: rand() * 170,
    r: 0.3 + rand() * 0.8,
    o: 0.3 + rand() * 0.6,
    dur: 2 + rand() * 3,
    delay: rand() * 4,
  }));
})();

const COUNT_MS = 900;
/** Connections load just after mount; don't celebrate what was already there. */
const SETTLE_MS = 600;
const STEP_S = 0.18;

export function ConnectionsSky({ connections }: { connections: Connections }) {
  const uid = useId().replace(/:/g, '');
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
      const stars = lit.reduce((n, s) => n + s.stars.length, 0);
      const added = lit.reduce((n, s) => n + SOURCE_SHARE[s.id], 0);
      setCaption(
        `${lit.map((s) => s.name).join(' and ')} lit up ${stars === 1 ? 'a star' : `${stars} stars`} · +${added}%`,
      );
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
  const isLit = (i: number) => {
    const s = sourceOf(i);
    return !!s && on(s.id);
  };
  const isFresh = (i: number) => {
    const s = sourceOf(i);
    return !!s && fresh.ids.includes(s.id);
  };
  /** Order a just-lit star appears in, across everything lit at once. */
  const freshOrder = (i: number) =>
    SOURCES.filter((s) => fresh.ids.includes(s.id))
      .flatMap((s) => s.stars)
      .indexOf(i);
  const unlitCount = DIPPER.length - DIPPER.filter((_, i) => isLit(i)).length;

  return (
    <div className="cz-sky">
      <div className="cz-sky__head">
        <strong className="cz-sky__percent">{shown}%</strong>
        <span className="cz-sky__label">of what Cozie would love to know about you and your baby</span>
      </div>

      <svg className="cz-sky__map" viewBox="0 0 320 170" role="img" aria-label={`Big Dipper, ${7 - unlitCount} of 7 stars lit · Cozie knows ${percent}%`}>
        <defs>
          <radialGradient id={`${uid}-milky`}>
            <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id={`${uid}-glow`} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* The Milky Way, then the background stars. */}
        <ellipse cx="160" cy="95" rx="210" ry="34" fill={`url(#${uid}-milky)`} transform="rotate(-18 160 95)" />
        {BACKDROP.map((b, i) => (
          <circle
            key={`b-${i}`}
            className="cz-sky__twinkle"
            cx={b.x}
            cy={b.y}
            r={b.r}
            fillOpacity={b.o}
            style={{ animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}
          />
        ))}

        {/* The constellation: faint guides, solid where both ends are lit. */}
        {EDGES.map(([a, b]) => {
          const pa = DIPPER[a];
          const pb = DIPPER[b];
          const lit = isLit(a) && isLit(b);
          const fr = lit && (isFresh(a) || isFresh(b));
          const delay = fr ? Math.max(freshOrder(a), freshOrder(b)) * STEP_S + 0.25 : 0;
          return (
            <line
              key={`e-${a}-${b}-${fr ? fresh.gen : 0}`}
              className={cn('cz-sky__edge', lit && 'is-lit', fr && 'is-fresh')}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              pathLength={1}
              style={fr ? { animationDelay: `${delay}s` } : undefined}
            />
          );
        })}

        {DIPPER.map((d, i) => {
          const s = sourceOf(i);
          if (!s || !on(s.id)) {
            return <circle key={`d-${i}`} className="cz-sky__star is-dark" cx={d.x} cy={d.y} r={2.4} />;
          }
          const fr = isFresh(i);
          const delay = fr ? { animationDelay: `${freshOrder(i) * STEP_S}s` } : undefined;
          const len = d.r * 2.6;
          return (
            <Fragment key={`d-${i}-${fr ? fresh.gen : 0}`}>
              {fr && <circle className="cz-sky__burst" cx={d.x} cy={d.y} r={d.r + 2} stroke={s.color} style={delay} />}
              <circle
                className={cn('cz-sky__halo', fr && 'is-fresh')}
                cx={d.x}
                cy={d.y}
                r={d.r * 2.4}
                fill={s.color}
                filter={`url(#${uid}-glow)`}
                style={delay}
              />
              <path
                className={cn('cz-sky__sparkle', fr && 'is-fresh')}
                d={`M${d.x - len} ${d.y}H${d.x + len}M${d.x} ${d.y - len}V${d.y + len}`}
                style={delay}
              />
              <circle className={cn('cz-sky__star', fr && 'is-fresh')} cx={d.x} cy={d.y} r={d.r} style={delay}>
                <title>{d.name}</title>
              </circle>
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
        {caption ??
          (!percent
            ? 'Each thing you connect lights up a star of the Big Dipper.'
            : SOURCES.every((s) => on(s.id))
              ? `Chatting with Cozie lights up the last ${unlitCount === 1 ? 'star' : `${unlitCount} stars`}.`
              : 'Connect more to light up the rest.')}
      </p>
    </div>
  );
}
