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

const MAX_RATIO = 0.4; // hard drag limit — the top card can't be pulled past this
const COMMIT_RATIO = 0.32; // pulled at least this far on release → requeue to back

/** Rubber-band clamp: free travel up to `max`, then stiff resistance so the
 *  card feels like it hits a wall rather than following the finger off-screen. */
function clampDrag(raw: number, max: number) {
  const a = Math.abs(raw);
  if (a <= max) return raw;
  return Math.sign(raw) * (max + (a - max) * 0.12);
}

/** Stacked card deck. The top card is draggable but can only be pulled so far
 *  (it meets resistance at the limit — it does NOT fly off). Release past the
 *  commit point and it slides from where it is straight into the back of the
 *  stack, revealing the next card; release short and it springs back to front. */
function WidgetDeck() {
  const n = WIDGETS.length;
  const [front, setFront] = useState(0);
  const [dragDx, setDragDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const dxRef = useRef(0); // synchronous clamped delta, read on release
  const maxRef = useRef(120); // px drag limit, measured on grab
  const commitRef = useRef(96); // px commit point, measured on grab

  function onDown(e: React.PointerEvent) {
    const w = wrapRef.current?.clientWidth || 300;
    maxRef.current = w * MAX_RATIO;
    commitRef.current = w * COMMIT_RATIO;
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
    dxRef.current = clampDrag(e.clientX - startX.current, maxRef.current);
    setDragDx(dxRef.current);
  }

  function onUp() {
    if (startX.current == null) return;
    const dx = dxRef.current;
    startX.current = null;
    dxRef.current = 0;
    setDragging(false);
    setDragDx(0);
    // Pulled to (or near) the limit → advance the stack: the old front card
    // slides from its dragged position into the back slot. Otherwise it just
    // springs back to the front. Both are driven by the CSS transition below.
    if (Math.abs(dx) >= commitRef.current) {
      setFront((f) => (f + 1) % n);
    }
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
        let transition: string;

        if (isFront && dragging) {
          // Follows the finger (within the clamp); no transition so it tracks 1:1.
          transform = dragDx
            ? `translate(${dragDx}px, 0) rotate(${dragDx / 28}deg) scale(1)`
            : REST[0];
          transition = 'none';
        } else {
          // Rest — and the card just requeued eases here from its drag position.
          transform = REST[depth];
          transition = 'transform 340ms cubic-bezier(0.32,0.72,0,1)';
        }

        return (
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            className="widget-card"
            style={{ transform, zIndex: n - depth, transition }}
          />
        );
      })}
    </div>
  );
}
