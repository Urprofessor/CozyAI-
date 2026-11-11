'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { MemoryPerson } from '@/lib/cozy/memory-profile-demo';
import { Portrait } from './Portrait';

// The pose numbers below are px for a 358px-wide orbit (375pt phone, 8px
// gutters) and scale with the orbit's actual width.
const REF_WIDTH = 358;
const FRAME = 0.345; // centre frame size, as a fraction of the orbit width
const ORBIT_SECONDS = 36;
const DRAG_START_PX = 8;

/** Pose for a relative slot (0 = centre, ±1 = neighbours; fractional while
 *  dragging). Frames ride a tilted circle, 60° apart: the front one is full
 *  size, the ones going round the back shrink, dim and rise. */
export function getPortraitPose(slot: number) {
  const angle = slot * (Math.PI / 3);
  const depth = (1 + Math.cos(angle)) / 2;
  return {
    x: Math.sin(angle) * 112,
    y: (Math.cos(angle) - 1) * 32,
    scale: 0.46 + depth ** 3 * 0.54,
    opacity: 0.45 + depth * 0.55,
    zIndex: Math.round(depth * 100),
  };
}

/** Horizontal px per slot near the front, for turning a drag into slots. */
const STEP_PX = 112 * Math.sin(Math.PI / 3);

/** Orbit layout for a given width: frame size, the front frame's centre, the
 *  decorative orbit line and the overall height. */
function layout(w: number) {
  const k = w / REF_WIDTH;
  const size = FRAME * w;
  // Leave room above the front frame for one riding round the back.
  const backTop = 64 * k + (0.46 * size) / 2;
  const cy = Math.max(size / 2, backTop) + 10;
  const ecy = cy - 16 * k + size * 0.15;
  const ery = cy + size / 2 + 0.06 * w - ecy;
  return { k, size, cx: w / 2, cy, ecy, erx: 0.47 * w, ery, height: ecy + ery + 10 };
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

  const L = layout(w);
  const step = STEP_PX * L.k || 1;
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

  const { cx: ecx, ecy, erx, ery } = L;
  // Starts at the left end and travels the front (lower) arc first.
  const d = `M ${ecx - erx} ${ecy} A ${erx} ${ery} 0 1 0 ${ecx + erx} ${ecy} A ${erx} ${ery} 0 1 0 ${ecx - erx} ${ecy}`;
  const restAngle = (50 * Math.PI) / 180;
  const restDot = { x: ecx + erx * Math.cos(restAngle), y: ecy + ery * Math.sin(restAngle) };

  return (
    <div
      ref={rootRef}
      className={cn('mp-orbit', dragDx !== null && 'is-dragging')}
      style={{ height: L.height || undefined }}
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
        <svg ref={svgRef} className="mp-orbit__track" width={w} height={L.height} aria-hidden>
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
          const pose = getPortraitPose(r);
          // 60° apart, a short family doesn't close the circle: fade frames
          // out before they reach the seam at the back, where they would
          // jump from one side to the other.
          const seam = circular ? Math.min(1, Math.max(0, (n / 2 - Math.abs(r)) * 2)) : 1;
          const opacity = pose.opacity * seam;
          const hidden = opacity < 0.05;
          const selected = i === index;
          // Names belong to the neighbours, not the front or back frames.
          const label = Math.max(0, 1 - Math.abs(Math.abs(r) - 1) * 2) * seam;
          return (
            <div
              key={person.key}
              className="mp-orbit__item"
              style={{
                left: L.cx + pose.x * L.k,
                top: L.cy + pose.y * L.k,
                zIndex: pose.zIndex,
                visibility: hidden ? 'hidden' : undefined,
              }}
            >
              <button
                type="button"
                className={cn('mp-frame', selected && 'is-selected')}
                style={{
                  width: L.size,
                  height: L.size,
                  opacity,
                  transform: `translate(-50%, -50%) scale(${pose.scale})`,
                }}
                aria-label={person.name}
                aria-current={selected ? 'true' : undefined}
                tabIndex={hidden ? -1 : 0}
                onClick={() => !selected && onSelect(i)}
              >
                <Portrait name={person.name} personKey={person.key} src={person.portraitUrl} />
              </button>
              <span
                className="mp-orbit__name"
                style={{ top: (L.size * pose.scale) / 2 + 8, opacity: label }}
                aria-hidden
              >
                {person.name}
              </span>
            </div>
          );
        })}
    </div>
  );
}
