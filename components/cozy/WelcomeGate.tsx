'use client';

import { useEffect, useRef, useState } from 'react';

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

/** Draggable stacked card deck — press-drag left/right to cycle which widget is
 *  in front. */
/** Auto-advance cadence before the user takes over. */
const AUTO_MS = 1500;

function WidgetDeck() {
  const n = WIDGETS.length;
  const [front, setFront] = useState(0);
  const [dragDx, setDragDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  // 'auto' until the user first touches the deck; then permanently 'manual'.
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const startX = useRef<number | null>(null);
  const dxRef = useRef(0); // synchronous delta, read on release

  // Auto-play: advance one card every AUTO_MS while in 'auto' mode. Skipped for
  // reduced-motion users, and paused while the tab is hidden so we don't jump
  // several cards at once after the phone unlocks.
  useEffect(() => {
    if (mode !== 'auto') return;
    if (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const id = setInterval(() => {
      if (document.hidden) return;
      setFront((f) => (f + 1) % n);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [mode, n]);

  function onDown(e: React.PointerEvent) {
    setMode('manual'); // user took over — auto-play stops for good
    startX.current = e.clientX;
    dxRef.current = 0;
    setDragging(true);
  }
  function onMove(e: React.PointerEvent) {
    if (startX.current == null) return;
    dxRef.current = e.clientX - startX.current;
    setDragDx(dxRef.current);
  }
  function onUp() {
    if (startX.current == null) return;
    const dx = dxRef.current;
    if (Math.abs(dx) > 48) {
      setFront((f) => (dx < 0 ? (f + 1) % n : (f - 1 + n) % n));
    }
    startX.current = null;
    dxRef.current = 0;
    setDragging(false);
    setDragDx(0);
  }

  // Back-of-deck offsets by depth (0 = front).
  const REST = ['translate(0,0) rotate(0deg) scale(1)', 'translate(20%,-5%) rotate(6deg) scale(0.9)', 'translate(-20%,-2%) rotate(-6deg) scale(0.88)'];

  return (
    <div
      className="widget-deck"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {WIDGETS.map((src, i) => {
        const depth = (i - front + n) % n;
        const isFront = depth === 0;
        const transform =
          isFront && dragDx ? `translate(${dragDx}px,0) rotate(${dragDx / 26}deg)` : REST[depth];
        return (
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            className="widget-card"
            style={{
              transform,
              zIndex: n - depth,
              transition: dragging && isFront ? 'none' : 'transform 300ms cubic-bezier(0.32,0.72,0,1)',
            }}
          />
        );
      })}
    </div>
  );
}
