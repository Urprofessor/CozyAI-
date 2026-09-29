'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { CZ, showToast, ToastHost } from './ui';

interface Props {
  onStart: () => void;
}

// ---------- Capability card motion (App AgentChatCapabilityMotion) ----------

const CARD_W = 200;
const CARD_H = 260;
const DESIGN_W = 402; // slot poses are laid out on a 402pt-wide container
const LOOP = 6000; // ms: 1s hold + 1s transition, three times
type Pose = { left: number; top: number; rot: number };
const SLOT_POSES: Pose[] = [
  { left: 143, top: 16, rot: 10 }, // back right
  { left: 59, top: 36, rot: -10 }, // back left
  { left: 101, top: 52, rot: 0 }, // front
];
const SLOT_Z = [0, 2, 4];
const FRONT = 2;
const BACK_RIGHT = 0;
// states[s][card] = slot of that card in state s.
const STATES = [
  [0, 1, 2],
  [1, 2, 0],
  [2, 0, 1],
];
const OUTSIDE: Pose = {
  left: SLOT_POSES[FRONT].left + CARD_W * 1.12,
  top: SLOT_POSES[FRONT].top + CARD_H * -0.02,
  rot: 5,
};

const CARDS = [
  {
    key: 'verified',
    title: 'Certified experts',
    subtitle: 'Backed by 3 certified IBCLCs',
    topInset: 24,
  },
  { key: 'trusted', title: '1M+', subtitle: 'Trusted by 1M+ moms', topInset: 24 },
  {
    key: 'personalized',
    title: 'Made for you',
    subtitle: 'Your AI parenting assistant',
    topInset: 32,
  },
];

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);

/** Ease each half of the move separately so the front card's out-and-back
 *  excursion turns smoothly (AgentChatCapabilityMotion.autoplayProgress). */
function autoplayProgress(p: number) {
  if (p <= 0.5) return 0.5 * easeInOutCubic(p / 0.5);
  return 0.5 + 0.5 * easeInOutCubic((p - 0.5) / 0.5);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  left: lerp(a.left, b.left, t),
  top: lerp(a.top, b.top, t),
  rot: lerp(a.rot, b.rot, t),
});

function poseFor(from: number, to: number, t: number): Pose {
  if (from === to) return SLOT_POSES[from];
  // The front card swings out to the right, then tucks in behind.
  if (from === FRONT && to === BACK_RIGHT) {
    return t <= 0.5
      ? lerpPose(SLOT_POSES[FRONT], OUTSIDE, t / 0.5)
      : lerpPose(OUTSIDE, SLOT_POSES[BACK_RIGHT], (t - 0.5) / 0.5);
  }
  return lerpPose(SLOT_POSES[from], SLOT_POSES[to], t);
}

function CapabilityDeck() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const start = performance.now();

    function render(now: number) {
      const container = containerRef.current;
      if (!container) return;
      const offsetX = (container.clientWidth - DESIGN_W) / 2;
      const cycle = reduce ? 0 : (now - start) % LOOP;
      const stage = Math.floor(cycle / 2000); // 0..2
      const inStage = cycle - stage * 2000;
      const fromState = stage;
      const moving = inStage >= 1000;
      const toState = moving ? (stage + 1) % 3 : stage;
      const t = moving ? autoplayProgress((inStage - 1000) / 1000) : 0;

      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const fromSlot = STATES[fromState][i];
        const toSlot = STATES[toState][i];
        const pose = poseFor(fromSlot, toSlot, t);
        card.style.transform = `translate(${pose.left + offsetX}px, ${pose.top}px) rotate(${pose.rot}deg)`;
        card.style.zIndex = String(SLOT_Z[t < 0.5 ? fromSlot : toSlot]);
      });
      if (!reduce) raf = requestAnimationFrame(render);
    }

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={containerRef} className="cz-consent__deck" aria-label="What Cozie offers">
      {CARDS.map((c, i) => (
        <div
          key={c.key}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          className="cz-cap-card"
          style={{
            backgroundImage: `url(${CZ}/icons/capability_${c.key}_background.png)`,
            transform: `translate(${SLOT_POSES[i].left}px, ${SLOT_POSES[i].top}px) rotate(${SLOT_POSES[i].rot}deg)`,
            zIndex: SLOT_Z[i],
          }}
        >
          <img src={`${CZ}/icons/capability_${c.key}.svg`} alt="" style={{ marginTop: c.topInset }} />
          <strong>{c.title}</strong>
          <span>{c.subtitle}</span>
        </div>
      ))}
    </div>
  );
}

/** App AgentChatConsentViewController: first-run activation page with the
 *  rotating capability deck, the privacy agreement and "Get started". */
export function WelcomeGate({ onStart }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [prompt, setPrompt] = useState(false);

  function comingSoon(label: string) {
    showToast(`${label} is coming soon.`);
  }

  return (
    <div className="cz-consent">
      <img className="cz-page__wash" src={`${CZ}/icons/header_background.png`} alt="" aria-hidden />

      <div className="cz-consent__scroll">
        <img
          className="cz-consent__hero"
          src={`${CZ}/icons/cozie_magic_wand_light.png`}
          alt=""
          draggable={false}
        />
        <h1 className="cz-consent__title">How can I help today?</h1>
        <p className="cz-consent__subtitle">
          Warm answers for feeding, sleep, device support, and everyday baby care.
        </p>
        <CapabilityDeck />
      </div>

      <div className="cz-consent__agree">
        <button
          type="button"
          role="checkbox"
          aria-checked={agreed}
          aria-label="I agree to the privacy statement"
          onClick={() => setAgreed((v) => !v)}
        >
          <img src={`${CZ}/icons/${agreed ? 'consent_checked' : 'consent_unchecked'}.svg`} alt="" />
        </button>
        <span>
          I agree to{' '}
          <button type="button" className="cz-link" onClick={() => comingSoon('Privacy statement')}>
            Privacy statement
          </button>
          <span className="cz-consent__gap" />
          <button type="button" className="cz-link" onClick={() => comingSoon('Medical disclaimer')}>
            Medical disclaimer
          </button>
        </span>
      </div>

      <button
        type="button"
        className="cz-consent__start"
        onClick={() => (agreed ? onStart() : setPrompt(true))}
      >
        Get started
      </button>

      {prompt && (
        <div className="cz-alert-scrim" onClick={() => setPrompt(false)}>
          <div
            className="cz-consent-prompt"
            role="alertdialog"
            aria-label="Agree to the privacy statement"
            onClick={(e) => e.stopPropagation()}
          >
            <strong>Agree to the privacy statement</strong>
            <p>
              Please review and agree to our{' '}
              <button type="button" className="cz-link" onClick={() => comingSoon('Privacy statement')}>
                Privacy statement
              </button>{' '}
              before getting started.
            </p>
            <button
              type="button"
              className={cn('cz-consent-prompt__btn', 'is-primary')}
              onClick={() => {
                setAgreed(true);
                setPrompt(false);
                onStart();
              }}
            >
              Agree and continue
            </button>
            <button type="button" className="cz-consent-prompt__btn" onClick={() => setPrompt(false)}>
              Not now
            </button>
          </div>
        </div>
      )}

      <ToastHost />
    </div>
  );
}
