'use client';

import { useRef, useState } from 'react';

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

// Back-of-deck rest positions by depth (0 = front, then two peekers).
const REST = [
  'translate(0,0) rotate(0deg) scale(1)',
  'translate(20%,-5%) rotate(6deg) scale(0.9)',
  'translate(-20%,-2%) rotate(-6deg) scale(0.88)',
];

const FLING_MS = 320; // how long the top card takes to fly off
const THRESHOLD_RATIO = 0.28; // fraction of deck width the drag must pass to commit

/** Stacked card deck. The top card is draggable: drag it past the threshold to
 *  either side and release, and it flies off in that direction and re-queues to
 *  the back of the stack (revealing the next card). Release short of the
 *  threshold and it springs back to the front. */
function WidgetDeck() {
  const n = WIDGETS.length;
  const [front, setFront] = useState(0);
  const [dragDx, setDragDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  // The card currently flying off, and its direction (-1 left, +1 right).
  const [leaving, setLeaving] = useState<{ index: number; dir: -1 | 1 } | null>(null);
  // The just-requeued card, parked invisibly at the back for one frame so it
  // doesn't visibly fly back in from the side before settling.
  const [entering, setEntering] = useState<number | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const dxRef = useRef(0); // synchronous delta, read on release

  function onDown(e: React.PointerEvent) {
    if (leaving) return; // ignore new grabs while a card is flying off
    startX.current = e.clientX;
    dxRef.current = 0;
    setDragging(true);
    try {
      wrapRef.current?.setPointerCapture?.(e.pointerId);
    } catch {
      /* pointer already released / not capturable — safe to ignore */
    }
  }

  function onMove(e: React.PointerEvent) {
    if (startX.current == null) return;
    dxRef.current = e.clientX - startX.current;
    setDragDx(dxRef.current);
  }

  function onUp() {
    if (startX.current == null) return;
    const dx = dxRef.current;
    const w = wrapRef.current?.clientWidth || 300;
    startX.current = null;
    dxRef.current = 0;
    setDragging(false);
    setDragDx(0);

    if (Math.abs(dx) <= w * THRESHOLD_RATIO) return; // short — springs back

    const idx = front;
    const dir: -1 | 1 = dx < 0 ? -1 : 1;
    setLeaving({ index: idx, dir });
    // After it has flown off: advance the stack (old front → back) and park the
    // requeued card at the back for one frame, then let it settle in.
    window.setTimeout(() => {
      setEntering(idx);
      setFront((f) => (f + 1) % n);
      setLeaving(null);
      // Clear on a timer (not rAF, which pauses while the tab is hidden) so the
      // requeued card can never get stuck with its transition suppressed.
      window.setTimeout(() => setEntering(null), 32);
    }, FLING_MS);
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
        const depth = (i - front + n) % n;
        const isFront = depth === 0;

        let transform: string;
        let opacity = 1;
        let transition: string;
        let zIndex = n - depth;

        if (leaving && i === leaving.index) {
          // Flying off to the side, fading out, above the rest of the stack.
          transform = `translate(${leaving.dir * 140}%, 0) rotate(${leaving.dir * 18}deg) scale(0.96)`;
          opacity = 0;
          transition = `transform ${FLING_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${FLING_MS}ms ease-out`;
          zIndex = n + 1;
        } else if (entering === i) {
          // Just requeued: snap straight to its back slot with no transition, so
          // it doesn't visibly fly back in from the side. Stays fully visible.
          transform = REST[depth];
          transition = 'none';
        } else if (isFront && dragging) {
          transform = dragDx
            ? `translate(${dragDx}px, 0) rotate(${dragDx / 26}deg)`
            : REST[0];
          transition = 'none';
        } else {
          transform = REST[depth];
          transition = 'transform 300ms cubic-bezier(0.32,0.72,0,1), opacity 300ms ease-out';
        }

        return (
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            className="widget-card"
            style={{ transform, opacity, zIndex, transition }}
          />
        );
      })}
    </div>
  );
}
