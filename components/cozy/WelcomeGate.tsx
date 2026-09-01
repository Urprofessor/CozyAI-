'use client';

import { memo, useEffect, useRef, useState } from 'react';

interface Props {
  onStart: () => void;
}

const WIDGETS = [
  '/images/cozyaichat/Widget_Pumping.png',
  '/images/cozyaichat/Widget_Feeding.png',
  '/images/cozyaichat/Widget_Sleep.png',
];

/** First-run welcome shown when there's no chat history yet. Lives inside the
 *  tab shell (tab bar stays), so no full-screen mask / back arrow. */
export function WelcomeGate({ onStart }: Props) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="cozy-welcome">
      <div className="cozy-welcome__body">
        <img
          className="cozy-welcome__mascot"
          src="/images/IP_%E9%AB%98%E5%85%B4.png"
          alt=""
          draggable={false}
        />
        <h1 className="cozy-welcome__title">How can I help today ?</h1>
        <p className="cozy-welcome__subtitle">
          Warm answers for feeding, sleep, device support, and everyday baby care.
        </p>

        <WidgetDeck />
      </div>

      <div className="cozy-welcome__foot">
        <div className="cozy-welcome__agreerow">
          <label className="cozy-welcome__agree">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              I agree to{' '}
              <a role="button" tabIndex={0}>
                Privacy Statement
              </a>
            </span>
          </label>
          {/* Both links open policy dialogs later — no-op for now. */}
          <a className="cozy-welcome__policy" role="button" tabIndex={0}>
            Medical Disclaimer
          </a>
        </div>

        <button
          type="button"
          className="mc-button mc-button--lg cozy-welcome__start"
          disabled={!agreed}
          onClick={onStart}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

// Slot geometry by depth (0 = front, then two peekers): {x,y in % of card width, rot in deg}.
const SLOTS = [
  { x: 0, y: 2, rot: 0 }, // front — centered, nudged down so peekers show above
  { x: -22, y: -3, rot: -8 }, // middle — back-left, tilted counter-clockwise
  { x: 27, y: -13, rot: 9 }, // back — back-right and up, tilted clockwise
];
// Farthest position of the outgoing front card: swung out to the right, clear of
// the stack (~one card width) before it recycles into the back slot.
const FAR = { x: 112, y: 0, rot: 5 };

const COMMIT_FINGER_RATIO = 0.5; // drag this fraction of deck width → reach farthest / commit
const PHASE1_MS = 460; // front swings out to the farthest (ease-out)
const PHASE2_MS = 520; // front recycles into the back, peekers finish (linear / constant speed)
const SPRING_MS = 300; // release-short spring-back
const HANDOFF_P = 0.75; // progress at which the outgoing card drops behind
const AUTO_START_MS = 800; // delay before the first auto rotation
const AUTO_DWELL_MS = 1300; // rest between auto rotations (≈ 2s / card)
const IDLE_RESUME_MS = 2000; // no interaction this long → resume auto-play

type Slot = { x: number; y: number; rot: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const mix = (a: Slot, b: Slot, t: number): Slot => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  rot: lerp(a.rot, b.rot, t),
});

const NSLOTS = SLOTS.length;

/** Transform of a card at `depth` (0 front, 1 middle, 2 back) at rotation
 *  progress p∈[0,1], for direction `dir` (+1 forward / right-swipe, −1 reverse /
 *  left-swipe). Each card interpolates SLOTS[depth] → SLOTS[target] where the
 *  target is one slot round the ring in `dir`. The front card takes the swing-
 *  out detour through FAR (mirrored left for reverse). */
function slotAt(depth: number, p: number, dir: number): Slot {
  const target = (depth - dir + NSLOTS) % NSLOTS;
  if (depth === 0) {
    const far = { x: FAR.x * dir, y: FAR.y, rot: FAR.rot * dir };
    return p <= 0.5 ? mix(SLOTS[0], far, p / 0.5) : mix(far, SLOTS[target], (p - 0.5) / 0.5);
  }
  return mix(SLOTS[depth], SLOTS[target], p);
}
/** Layer order: the outgoing front card stays on top until the hand-off, then
 *  drops behind; the incoming card (the one heading to the front slot) takes
 *  over the top. Which card is incoming depends on `dir`. */
function zAt(depth: number, p: number, dir: number): number {
  if (depth === 0) return p < HANDOFF_P ? 40 : 5;
  const incoming = (dir + NSLOTS) % NSLOTS; // forward → depth 1, reverse → depth 2
  return depth === incoming ? 30 : 20;
}

/** Card deck driven by a single rotation progress `p` (rAF), matching the mp4:
 *  the front card swings out to the right while the layers behind advance part-
 *  way, then it recycles into the back (constant speed) as they finish. Manual:
 *  the finger drives the swing-out; crossing the farthest point commits and the
 *  card recycles on its own. Auto: the same rotation plays every ~2s. Memoized
 *  (no props) so it renders once — all motion is imperative via refs + rAF. */
const WidgetDeck = memo(function WidgetDeck() {
  const n = WIDGETS.length;
  const wrapRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]); // z-index carriers
  const cardRefs = useRef<(HTMLImageElement | null)[]>([]);
  const frontRef = useRef(0); // index of the current front card
  const pRef = useRef(0); // rotation progress 0..1
  const modeRef = useRef<'auto' | 'manual'>('auto');
  const noAutoRef = useRef(false); // reduced-motion → no auto-play
  const draggingRef = useRef(false);
  const committedRef = useRef(false); // crossed the farthest point mid-drag
  const startXRef = useRef(0);
  const commitPxRef = useRef(120); // finger px to reach the farthest, measured on grab
  const dirRef = useRef(1); // rotation direction: +1 forward (right), −1 reverse (left)
  const dirLockedRef = useRef(false); // has this drag committed to a direction yet
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef<{ kind: string; t0: number; from?: number }>({ kind: 'rest', t0: 0 });
  const lastNow = useRef(0);

  function paint() {
    const front = frontRef.current;
    const p = pRef.current;
    const dir = dirRef.current;
    for (let i = 0; i < n; i++) {
      const img = cardRefs.current[i];
      const slot = slotRefs.current[i];
      if (!img || !slot) continue;
      const depth = (i - front + n) % n;
      const s = slotAt(depth, p, dir);
      img.style.transform = `translate(${s.x}%, ${s.y}%) rotate(${s.rot}deg)`;
      slot.style.zIndex = String(zAt(depth, p, dir)); // z on the wrapper, not the transformed img
    }
  }

  function armIdleResume() {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => {
      modeRef.current = 'auto';
    }, IDLE_RESUME_MS);
  }

  useEffect(() => {
    noAutoRef.current = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const frame = (now: number) => {
      const gap = now - (lastNow.current || now);
      lastNow.current = now;
      const a = anim.current;
      if (gap > 250 && a.t0) a.t0 += gap; // absorb stalls (hidden tab) so nothing jumps

      if (a.kind === 'rest') {
        if (modeRef.current === 'auto' && !noAutoRef.current && !draggingRef.current) {
          a.kind = 'autowait';
          a.t0 = now;
        }
      } else if (a.kind === 'autowait') {
        if (modeRef.current !== 'auto' || draggingRef.current) a.kind = 'rest';
        else if (now - a.t0 >= AUTO_START_MS) {
          a.kind = 'autorun';
          a.t0 = now;
        }
      } else if (a.kind === 'autorun') {
        dirRef.current = 1; // auto-play is always forward (right)
        const el = now - a.t0;
        if (el < PHASE1_MS) pRef.current = 0.5 * easeOut(el / PHASE1_MS);
        else if (el < PHASE1_MS + PHASE2_MS)
          pRef.current = 0.5 + 0.5 * ((el - PHASE1_MS) / PHASE2_MS);
        else {
          frontRef.current = (frontRef.current + 1) % n;
          pRef.current = 0;
          a.kind = 'autodwell';
          a.t0 = now;
        }
      } else if (a.kind === 'autodwell') {
        if (modeRef.current !== 'auto' || draggingRef.current) a.kind = 'rest';
        else if (now - a.t0 >= AUTO_DWELL_MS) {
          a.kind = 'autorun';
          a.t0 = now;
        }
      } else if (a.kind === 'commit') {
        const frac = Math.min(1, (now - a.t0) / PHASE2_MS);
        pRef.current = 0.5 + 0.5 * frac; // constant-speed recycle from the farthest
        if (frac >= 1) {
          frontRef.current = (frontRef.current + dirRef.current + n) % n; // forward or reverse
          pRef.current = 0;
          a.kind = 'rest';
          armIdleResume();
        }
      } else if (a.kind === 'spring') {
        const frac = Math.min(1, (now - a.t0) / SPRING_MS);
        pRef.current = (a.from ?? 0) * (1 - easeOut(frac));
        if (frac >= 1) {
          pRef.current = 0;
          a.kind = 'rest';
          armIdleResume();
        }
      }

      paint();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      if (idleRef.current) clearTimeout(idleRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  function onDown(e: React.PointerEvent) {
    if (idleRef.current) clearTimeout(idleRef.current);
    modeRef.current = 'manual'; // user took the wheel — stops the auto loop
    anim.current.kind = 'rest'; // cancel any in-flight auto rotation
    draggingRef.current = true;
    committedRef.current = false;
    dirLockedRef.current = false; // decide right/left on the first real move
    startXRef.current = e.clientX;
    commitPxRef.current = COMMIT_FINGER_RATIO * (wrapRef.current?.clientWidth || 300);
    try {
      wrapRef.current?.setPointerCapture?.(e.pointerId);
    } catch {
      /* pointer not capturable — safe to ignore */
    }
  }

  function onMove(e: React.PointerEvent) {
    if (!draggingRef.current || committedRef.current) return;
    const dx = e.clientX - startXRef.current;
    // Lock the direction on the first move past a small dead-zone: right → forward,
    // left → reverse. Until then the deck stays at rest.
    if (!dirLockedRef.current) {
      if (Math.abs(dx) < 6) {
        pRef.current = 0;
        paint();
        return;
      }
      dirRef.current = dx > 0 ? 1 : -1;
      dirLockedRef.current = true;
    }
    // Progress is driven by how far the finger has moved in the locked direction.
    const p = 0.5 * ((dirRef.current * dx) / commitPxRef.current);
    if (p >= 0.5) {
      // Crossed the farthest point → detach from the finger and recycle to back.
      committedRef.current = true;
      draggingRef.current = false;
      pRef.current = 0.5;
      paint(); // snap to the farthest immediately; the commit animation eases on from here
      anim.current = { kind: 'commit', t0: performance.now() };
    } else {
      pRef.current = Math.max(0, p); // dragging back past the start just returns to rest
      paint();
    }
  }

  function onUp() {
    if (committedRef.current) {
      committedRef.current = false; // the commit animation finishes on its own
      return;
    }
    if (!draggingRef.current) return;
    draggingRef.current = false;
    anim.current = { kind: 'spring', t0: performance.now(), from: pRef.current };
  }

  return (
    <div
      ref={wrapRef}
      className="widget-deck"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {WIDGETS.map((src, i) => {
        const s = SLOTS[i]; // initial layout: front index 0 → card i sits at depth i
        return (
          <div
            key={src}
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
            className="widget-slot"
            style={{ zIndex: [40, 30, 20][i] }}
          >
            <img
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              src={src}
              alt=""
              draggable={false}
              className="widget-card"
              style={{
                transform: `translate(${s.x}%, ${s.y}%) rotate(${s.rot}deg)`,
                transition: 'none',
              }}
            />
          </div>
        );
      })}
    </div>
  );
});
