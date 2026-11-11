'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { MemoryPerson } from '@/lib/cozy/memory-profile-demo';
import { Portrait } from './Portrait';

// Geometry, as fractions of the orbit's width (from the Memory profile design).
const G = {
  height: 0.47,
  center: { size: 0.345, y: 0.185 },
  side: { size: 0.17, y: 0.17, dx: 0.335 },
  back: { size: 0.12, y: 0.12 },
  ellipse: { cy: 0.29, rx: 0.47, ry: 0.14 },
};
const ORBIT_SECONDS = 36;
const DRAG_START_PX = 8;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where a frame sits for a relative slot r (0 = centre, ±1 = sides, beyond
 *  that it slips behind the orbit and fades out). */
function slot(r: number, w: number) {
  const a = Math.abs(r);
  const x = w / 2 + Math.sin((Math.max(-2, Math.min(2, r)) * Math.PI) / 2) * G.side.dx * w;
  if (a <= 1) {
    return {
      x,
      y: lerp(G.center.y, G.side.y, a) * w,
      size: lerp(G.center.size, G.side.size, a) * w,
      opacity: 1,
      label: a,
    };
  }
  const t = Math.min(a - 1, 1);
  const opacity = Math.max(0, 1 - t * 2);
  return {
    x,
    y: lerp(G.side.y, G.back.y, t) * w,
    size: lerp(G.side.size, G.back.size, t) * w,
    opacity,
    label: opacity,
  };
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Horizontal orbit of portrait frames: the selected person large in the
 *  middle, neighbours small at the ends. Tap a side frame, swipe, or use the
 *  arrow keys; a released swipe snaps to the nearest person. */
export function MemoryOrbit({
  people,
  index,
  onSelect,
}: {
  people: Pick<MemoryPerson, 'key' | 'name' | 'portraitUrl'>[];
  index: number;
  onSelect: (index: number) => void;
}) {
  const n = people.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [w, setW] = useState(0);
  const [pathLen, setPathLen] = useState(0);
  const [dragDx, setDragDx] = useState<number | null>(null);
  const gesture = useRef<{ x: number; y: number; id: number; active: boolean } | null>(null);
  const justDragged = useRef(false);
  const reduced = usePrefersReducedMotion();
  const pathId = useId().replace(/:/g, '');

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, [w]);

  // The light point rests while a frame is being dragged.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || reduced) return;
    if (dragDx !== null) svg.pauseAnimations();
    else svg.unpauseAnimations();
  }, [dragDx, reduced]);

  const step = G.side.dx * w || 1;
  const circular = n >= 3;

  // Selection changes rotate the orbit the short way round, from wherever it
  // is on screen (mid-swipe included), instead of cutting across it.
  const [tween, setTween] = useState<number | null>(null);
  const posRef = useRef(index);
  const prevIndex = useRef(index);
  useEffect(() => {
    if (prevIndex.current === index) return;
    prevIndex.current = index;
    if (reduced) {
      setTween(null);
      return;
    }
    let delta = index - posRef.current;
    if (circular) {
      delta = ((delta % n) + n) % n;
      if (delta > n / 2) delta -= n;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 420);
      const eased = 1 - Math.pow(1 - k, 3);
      if (k < 1) {
        setTween(index - delta * (1 - eased));
        raf = requestAnimationFrame(tick);
      } else {
        setTween(null);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, reduced, circular, n]);

  // Continuous position of the orbit, in people.
  let p: number;
  if (dragDx !== null) p = index - dragDx / step;
  else if (index !== prevIndex.current) p = posRef.current; // tween starts next frame
  else p = tween ?? index;
  if (!circular) p = Math.max(-0.25, Math.min(n - 0.75, p));
  posRef.current = p;

  function rel(i: number) {
    if (!circular) return i - p;
    let r = (((i - p) % n) + n) % n;
    if (r >= n / 2) r -= n;
    return r;
  }

  function wrap(i: number) {
    return circular ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
  }

  function onPointerDown(e: React.PointerEvent) {
    if (n < 2) return;
    gesture.current = { x: e.clientX, y: e.clientY, id: e.pointerId, active: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.active) {
      if (Math.abs(dy) > DRAG_START_PX && Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null; // a vertical scroll; leave it to the page
        return;
      }
      if (Math.abs(dx) < DRAG_START_PX) return;
      g.active = true;
      rootRef.current?.setPointerCapture(e.pointerId);
    }
    setDragDx(dx);
  }

  function onPointerEnd(e: React.PointerEvent) {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.id !== e.pointerId || !g.active) return;
    justDragged.current = true;
    const dx = e.clientX - g.x;
    // A short flick still moves one person; otherwise snap to the nearest.
    let moved = Math.round(dx / step);
    if (moved === 0 && Math.abs(dx) > step * 0.18) moved = dx > 0 ? 1 : -1;
    setDragDx(null);
    onSelect(wrap(index - moved));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = wrap(index + (e.key === 'ArrowRight' ? 1 : -1));
      if (next !== index) onSelect(next);
    }
  }

  const { cy, rx, ry } = G.ellipse;
  const ecx = w / 2;
  const ecy = cy * w;
  const erx = rx * w;
  const ery = ry * w;
  // Starts at the left end and travels the front (lower) arc first.
  const d = `M ${ecx - erx} ${ecy} A ${erx} ${ery} 0 1 0 ${ecx + erx} ${ecy} A ${erx} ${ery} 0 1 0 ${ecx - erx} ${ecy}`;
  const restAngle = (50 * Math.PI) / 180;
  const restDot = { x: ecx + erx * Math.cos(restAngle), y: ecy + ery * Math.sin(restAngle) };

  return (
    <div
      ref={rootRef}
      className={cn('mp-orbit', dragDx !== null && 'is-dragging')}
      style={{ height: G.height * w || undefined }}
      role="group"
      aria-label="People Cozie remembers. Use the left and right arrow keys to switch."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
      onClickCapture={(e) => {
        if (justDragged.current) {
          justDragged.current = false;
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      {w > 0 && (
        <svg ref={svgRef} className="mp-orbit__track" width={w} height={G.height * w} aria-hidden>
          <defs>
            <radialGradient id={`${pathId}-glow`}>
              <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffd98a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path ref={pathRef} id={pathId} d={d} className="mp-orbit__line" />
          {!reduced && pathLen > 0 && (
            <g className="mp-orbit__trail">
              {[
                { t: 64, width: 1.2, opacity: 0.35 },
                { t: 32, width: 1.8, opacity: 0.6 },
              ].map(({ t, width, opacity }) => (
                <path
                  key={t}
                  d={d}
                  strokeWidth={width}
                  strokeOpacity={opacity}
                  strokeDasharray={`${t} ${pathLen - t}`}
                  strokeDashoffset={t}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from={t}
                    to={t - pathLen}
                    dur={`${ORBIT_SECONDS}s`}
                    repeatCount="indefinite"
                  />
                </path>
              ))}
            </g>
          )}
          {reduced ? (
            <g transform={`translate(${restDot.x} ${restDot.y})`}>
              <circle r="8" fill={`url(#${pathId}-glow)`} />
              <circle r="3" className="mp-orbit__dot" />
            </g>
          ) : (
            <g>
              <circle r="8" fill={`url(#${pathId}-glow)`} />
              <circle r="3" className="mp-orbit__dot" />
              <animateMotion dur={`${ORBIT_SECONDS}s`} repeatCount="indefinite">
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </g>
          )}
        </svg>
      )}

      {w > 0 &&
        people.map((person, i) => {
          const r = rel(i);
          const s = slot(r, w);
          const selected = i === index;
          const hidden = s.opacity < 0.05;
          return (
            <div
              key={person.key}
              className="mp-orbit__item"
              style={{
                left: s.x,
                top: s.y - s.size / 2,
                opacity: s.opacity,
                zIndex: 100 - Math.round(Math.abs(r) * 10),
                visibility: hidden ? 'hidden' : undefined,
              }}
            >
              <button
                type="button"
                className={cn('mp-frame', selected && 'is-selected')}
                style={{ width: s.size, height: s.size }}
                aria-label={person.name}
                aria-current={selected ? 'true' : undefined}
                tabIndex={hidden ? -1 : 0}
                onClick={() => !selected && onSelect(i)}
              >
                <Portrait name={person.name} personKey={person.key} src={person.portraitUrl} />
              </button>
              <span className="mp-orbit__name" style={{ opacity: s.label }} aria-hidden>
                {person.name}
              </span>
            </div>
          );
        })}
    </div>
  );
}
