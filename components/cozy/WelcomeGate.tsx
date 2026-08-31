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

const DWELL_MS = 1200; // pause on each card before the deck rotates one notch
const EASE_TAU = 130; // easing time-constant (ms); smaller = snappier settle

/** Cover-Flow card deck. A single continuous `pos` (float) is eased toward an
 *  integer target every frame with requestAnimationFrame; each card's
 *  transform / opacity / z-index is derived from its cyclic distance to `pos`,
 *  so the front card recedes side-and-back while shrinking as the next grows
 *  into place — one seamless loop, no snap. Press-drag scrubs `pos` directly
 *  and hands back to auto-play on release. */
function WidgetDeck() {
  const n = WIDGETS.length;
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLImageElement | null)[]>([]);
  const posRef = useRef(0); // current position (float), driven every frame
  const targetRef = useRef(0); // integer we're easing toward
  const draggingRef = useRef(false);
  const autoRef = useRef(true); // auto-play until the first touch
  const startXRef = useRef(0);
  const startPosRef = useRef(0);
  const lastAdvanceRef = useRef(0);

  // Write each card's transform from the current `pos`. Called every frame and
  // on every pointer move — never triggers a React re-render.
  function paint() {
    const pos = posRef.current;
    for (let i = 0; i < n; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      // Cyclic offset in (-n/2, n/2]: shortest way round the ring to the front.
      let off = ((i - pos) % n + n) % n;
      if (off > n / 2) off -= n;
      const a = Math.abs(off);
      const x = off * 20; // % — fan out to the sides
      const y = -a * 4; // slight lift toward the back
      const rot = off * 6;
      const scale = 1 - 0.1 * a;
      // Back cards stay readable (0.85 at rest); the one crossing the wrap
      // boundary (a→n/2) fades fully so its horizontal jump is invisible.
      const op = a <= 1 ? 1 - 0.15 * a : Math.max(0, 0.85 - (0.85 / (n / 2 - 1)) * (a - 1));
      el.style.transform = `translate3d(${x}%, ${y}%, 0) rotate(${rot}deg) scale(${scale})`;
      el.style.opacity = String(op);
      // z from proximity to front; changes exactly at the crossover point, so
      // layers swap when two cards are equidistant — no visible pop.
      el.style.zIndex = String(Math.round((n / 2 - a) * 1000));
    }
  }

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      autoRef.current = false; // respect reduced-motion: rest, drag-only
    }
    let raf = 0;
    let last = performance.now();
    lastAdvanceRef.current = last;
    const loop = (t: number) => {
      const dt = Math.min(t - last, 64); // clamp after tab-switch stalls
      last = t;
      if (!draggingRef.current) {
        const d = targetRef.current - posRef.current;
        // Frame-rate-independent exponential ease toward the target.
        posRef.current =
          Math.abs(d) < 0.0005 ? targetRef.current : posRef.current + d * (1 - Math.exp(-dt / EASE_TAU));
        if (autoRef.current && !document.hidden && Math.abs(d) < 0.01 && t - lastAdvanceRef.current > DWELL_MS) {
          targetRef.current += 1;
          lastAdvanceRef.current = t;
        }
      }
      paint();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  function onDown(e: React.PointerEvent) {
    autoRef.current = false; // user took over — auto-play stops for good
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startPosRef.current = posRef.current;
    wrapRef.current?.setPointerCapture?.(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const w = wrapRef.current?.clientWidth || 300;
    posRef.current = startPosRef.current - (e.clientX - startXRef.current) / w;
    paint();
  }
  function onUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    targetRef.current = Math.round(posRef.current); // ease to the nearest card
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
      {WIDGETS.map((src, i) => (
        <img
          key={src}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          src={src}
          alt=""
          draggable={false}
          className="widget-card"
        />
      ))}
    </div>
  );
}
