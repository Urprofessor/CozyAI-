'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { HealthInsight, HealthSeries } from '@/lib/cozy/health-demo';
import { play, spring, wait } from '@/lib/cozy/motion';
import { Ink } from './Ink';

/* ---------- The Health permission sheet ----------
 * Slides up over the letter when she taps "Connect Apple Health": four data
 * types, "Turn On All", and Allow once anything is on. Demo only. */

const KINDS = [
  { id: 'sleep', label: 'Sleep', color: '#5ac8fa' },
  { id: 'steps', label: 'Steps', color: '#ff9500' },
  { id: 'heart', label: 'Heart Rate', color: '#ff2d55' },
  { id: 'mindful', label: 'Mindful Minutes', color: '#30b0c7' },
] as const;

export function HealthSheet({
  open,
  note,
  onAllow,
  onDeny,
}: {
  open: boolean;
  /** Why Momcozy asks, under the list. */
  note: string;
  onAllow: () => void;
  onDeny: () => void;
}) {
  const [mounted, setMounted] = useState(open);
  const [up, setUp] = useState(false);
  const [on, setOn] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setMounted(true);
      setOn({});
      // A timer rather than rAF, so it still opens in a background tab.
      const t = window.setTimeout(() => setUp(true), 30);
      return () => window.clearTimeout(t);
    }
    setUp(false);
    const t = window.setTimeout(() => setMounted(false), 460);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!mounted) return null;
  const any = Object.values(on).some(Boolean);
  return (
    <div className={cn('cz-hs-layer', up && 'is-up')} onClick={(e) => e.stopPropagation()}>
      <div className="cz-hs-scrim" onClick={onDeny} />
      <div className="cz-hs" role="dialog" aria-label="Health Access">
        <div className="cz-hs__bar">
          <button type="button" onClick={onDeny}>
            Don’t Allow
          </button>
          <strong>Health Access</strong>
          <button type="button" disabled={!any} onClick={onAllow}>
            Allow
          </button>
        </div>
        <span className="cz-hs__app" aria-hidden>
          <HeartTile />
        </span>
        <p className="cz-hs__ask">“Momcozy” would like to access and update your Health data.</p>
        <button type="button" className="cz-hs__all" onClick={() => setOn(Object.fromEntries(KINDS.map((k) => [k.id, true])))}>
          Turn On All
        </button>
        <p className="cz-hs__label">Allow “Momcozy” to read</p>
        <ul className="cz-hs__list">
          {KINDS.map((k) => (
            <li key={k.id}>
              <span className="cz-hs__ic" style={{ background: k.color }} aria-hidden>
                <KindIcon id={k.id} />
              </span>
              <span>{k.label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={!!on[k.id]}
                aria-label={k.label}
                className={cn('cz-hs__tg', on[k.id] && 'is-on')}
                onClick={() => setOn((cur) => ({ ...cur, [k.id]: !cur[k.id] }))}
              />
            </li>
          ))}
        </ul>
        <p className="cz-hs__note">{note}</p>
      </div>
    </div>
  );
}

export function HeartTile() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" rx="10" fill="#fff" />
      <path
        d="M20 30.5s-9.5-5.6-9.5-12.3c0-3.1 2.4-5.4 5.1-5.4 1.9 0 3.4 1 4.4 2.6 1-1.6 2.5-2.6 4.4-2.6 2.7 0 5.1 2.3 5.1 5.4 0 6.7-9.5 12.3-9.5 12.3z"
        fill="#ff3b5c"
      />
    </svg>
  );
}

function KindIcon({ id }: { id: string }) {
  const p = {
    sleep: 'M4 13V8h12v5M4 11h12M6 8V6.5h3.5V8',
    steps: 'M7 4.5c1.4 0 2 1.6 1.6 3.6L8 10.5H5.6L5 8.1C4.6 6.1 5.6 4.5 7 4.5zM5.8 12h2.4v1.3a1.2 1.2 0 0 1-2.4 0zM13 6.5c1.4 0 2.4 1.6 2 3.6l-.6 2.4H12l-.6-2.4C11 8.1 11.6 6.5 13 6.5zM12.2 14h2.4v1.3a1.2 1.2 0 0 1-2.4 0z',
    heart: 'M10 15.5S4.5 12.2 4.5 8.4c0-1.8 1.4-3.1 2.9-3.1 1.1 0 2 .6 2.6 1.5.6-.9 1.5-1.5 2.6-1.5 1.5 0 2.9 1.3 2.9 3.1 0 3.8-5.5 7.1-5.5 7.1z',
    mindful: 'M10 5c1.6 1.4 1.6 4.4 0 6-1.6-1.6-1.6-4.6 0-6zM5 8.5c2 0 4 1.6 5 3.5-2 .4-4.4-.6-5-3.5zM15 8.5c-2 0-4 1.6-5 3.5 2 .4 4.4-.6 5-3.5zM6 14.5h8',
  }[id];
  return (
    <svg viewBox="0 0 20 20" fill={id === 'heart' || id === 'steps' ? '#fff' : 'none'} stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={p} />
    </svg>
  );
}

/* ---------- What the letter writes once Health is connected ----------
 * The space opens under "Something I noticed", the sources she allowed fly
 * in and dissolve into ink, then Cozie writes the new insight by hand and
 * draws the two weeks it compared. */

export function SharpInsight({
  insight,
  run,
  done,
  onDone,
}: {
  insight: HealthInsight;
  run: boolean;
  done: boolean;
  onDone?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const [write, setWrite] = useState(false);
  const [draw, setDraw] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useLayoutEffect(() => {
    if (!run || done) return;
    const el = box.current;
    if (!el) return;
    let cancelled = false;
    const h = el.scrollHeight;
    el.style.height = '0px';
    (async () => {
      await play(el, [{ height: '0px', marginTop: '0px' }, { height: `${h}px`, marginTop: '16px' }], {
        duration: 420,
        easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)',
      });
      if (cancelled) return;
      el.getAnimations().forEach((a) => a.cancel());
      el.style.height = '';
      const pills = [...(chips.current?.children ?? [])] as HTMLElement[];
      await Promise.all(
        pills.map((p, i) =>
          play(p, [{ transform: 'translateX(120%) scale(0.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
            duration: 460,
            delay: i * 140,
            easing: spring('soft'),
          }),
        ),
      );
      await wait(420);
      if (cancelled) return;
      await Promise.all(
        pills.map((p, i) =>
          play(
            p,
            [
              { transform: 'none', filter: 'blur(0px)', opacity: 1 },
              { transform: 'translateY(10px) scale(0.3)', filter: 'blur(5px)', opacity: 0 },
            ],
            { duration: 620, delay: i * 150, easing: 'cubic-bezier(0.5, 0, 0.4, 1)' },
          ),
        ),
      );
      if (!cancelled) setWrite(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [run, done]);

  useEffect(() => {
    if (!draw || done) return;
    const t = window.setTimeout(() => doneRef.current?.(), 1700);
    return () => window.clearTimeout(t);
  }, [draw, done]);

  const shown = done || run;
  return (
    <div ref={box} className={cn('cz-sharp', shown && 'is-shown', (draw || done) && 'is-drawn', done && 'is-done')}>
      {!done && (
        <div ref={chips} className="cz-sharp__chips" aria-hidden>
          {insight.sources.map((s) => (
            <span key={s.kind} className="cz-sharp__chip">
              <i data-kind={s.kind}>
                <KindIcon id={s.kind} />
              </i>
              {s.label}
            </span>
          ))}
        </div>
      )}
      <Ink text={insight.text} hand run={write} done={done} onDone={() => setDraw(true)} className="cz-sharp__text" />
      <Chart series={insight.series} days={insight.days} />
    </div>
  );
}

function smooth(points: [number, number][]) {
  return points
    .map(([x, y], i) => {
      if (i === 0) return `M${x} ${y}`;
      const [px, py] = points[i - 1];
      const cx = (px + x) / 2;
      return `C${cx} ${py} ${cx} ${y} ${x} ${y}`;
    })
    .join(' ');
}

function Chart({ series, days }: { series: [HealthSeries, HealthSeries]; days: [string, string] }) {
  const W = 168;
  const line = (s: HealthSeries, top: number) => {
    const lo = Math.min(...s.values);
    const hi = Math.max(...s.values);
    const pts = s.values.map((v, i): [number, number] => [
      6 + (i * (W - 14)) / (s.values.length - 1),
      top + 22 - ((v - lo) / Math.max(1, hi - lo)) * 22,
    ]);
    return { d: smooth(pts), end: pts[pts.length - 1] };
  };
  const a = line(series[0], 4);
  const b = line(series[1], 22);
  return (
    <div className="cz-sharp__chart">
      <svg viewBox={`0 0 ${W} 64`} aria-hidden>
        <path className="cz-sharp__axis" pathLength={1} d={`M2 54H${W - 2}`} />
        <path className="cz-sharp__line" pathLength={1} d={a.d} style={{ stroke: series[0].color, '--d': '220ms' } as CSSProperties} />
        <path className="cz-sharp__line" pathLength={1} d={b.d} style={{ stroke: series[1].color, '--d': '520ms' } as CSSProperties} />
        <circle className="cz-sharp__dot" cx={a.end[0]} cy={a.end[1]} r="2.2" fill={series[0].color} style={{ '--d': '1040ms' } as CSSProperties} />
        <circle className="cz-sharp__dot" cx={b.end[0]} cy={b.end[1]} r="2.2" fill={series[1].color} style={{ '--d': '1340ms' } as CSSProperties} />
        <text className="cz-sharp__day" x="4" y="63">
          {days[0]}
        </text>
        <text className="cz-sharp__day" x={W - 4} y="63" textAnchor="end">
          {days[1]}
        </text>
      </svg>
      <ul className="cz-sharp__legend">
        {series.map((s, i) => (
          <li key={s.label} style={{ '--c': s.color, '--d': `${700 + i * 300}ms` } as CSSProperties}>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
