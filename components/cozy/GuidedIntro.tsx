'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useCozyVisible } from '@/components/shell/cozyClose';
import { CZ, showToast, ToastHost } from './ui';

interface Props {
  onStart: () => void;
  onClose: () => void;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Steps through `count` phases every `ms`, looping. Reduced motion parks on
 *  `rest`. Drives the hero animations so their beats stay in sync. */
function usePhase(count: number, ms: number, rest = 0) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (reducedMotion()) {
      setPhase(rest);
      return;
    }
    const id = window.setInterval(() => setPhase((p) => (p + 1) % count), ms);
    return () => window.clearInterval(id);
  }, [count, ms, rest]);
  return phase;
}

/* ───────────── Mini phone ───────────── */

function MiniPhone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('cz-guide-phone', className)} aria-hidden="true">
      {children}
    </div>
  );
}

function Skel({ w, tone }: { w: string; tone?: 'dark' | 'soft' }) {
  return <span className={cn('cz-guide-skel', tone && `is-${tone}`)} style={{ width: w }} />;
}

/* Ring chart drawn as stroked circles; each arc animates its dash in. */
function Ring({
  r,
  color,
  frac,
  start = 0,
  width = 9,
  delay = 0,
  track = true,
}: {
  r: number;
  color: string;
  frac: number;
  start?: number;
  width?: number;
  delay?: number;
  track?: boolean;
}) {
  const c = 2 * Math.PI * r;
  return (
    <>
      {track && <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeOpacity="0.16" strokeWidth={width} />}
      <circle
        className="cz-guide-arc"
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
        style={{ ['--len' as string]: c * frac, animationDelay: `${delay}ms` }}
        transform={`rotate(${-90 + start * 360} 60 60)`}
      />
    </>
  );
}

/* Step 1 hero — the "Today" screen with three metrics swiping past:
 * feeds → sleep → Cozie, and back. */
const METRICS = ['feeds', 'sleep', 'cozie'] as const;
const PINGPONG = [0, 1, 2, 1];

function WelcomeHero() {
  const beat = usePhase(PINGPONG.length, 2400);
  const slide = PINGPONG[beat];
  return (
    <MiniPhone>
      <div className="cz-guide-chips">
        {METRICS.map((m, i) => (
          <span key={m} className={cn('cz-guide-chip', i === slide && 'is-on')}>
            <i className={`cz-guide-chip__dot is-${m}`} />
            <span className="cz-guide-chip__lines">
              <Skel w="22px" tone="soft" />
              <Skel w="30px" />
            </span>
          </span>
        ))}
      </div>

      <div className="cz-guide-track" style={{ transform: `translateX(${slide * -100}%)` }}>
        <div className={cn('cz-guide-slide', slide === 0 && 'is-on')}>
          <svg viewBox="0 0 120 120" className="cz-guide-ringsvg">
            <Ring r={48} color="var(--colors-brands-mom-700)" frac={0.6} width={14} />
            <Ring r={48} color="var(--colors-brands-mom-500)" frac={0.22} start={0.66} width={14} delay={250} track={false} />
            <Ring r={48} color="var(--colors-brands-parenting-300)" frac={0.06} start={0.92} width={14} delay={400} track={false} />
          </svg>
          <span className="cz-guide-metric">
            <b>6</b>
            <small>feeds</small>
          </span>
        </div>

        <div className={cn('cz-guide-slide', slide === 1 && 'is-on')}>
          <svg viewBox="0 0 120 120" className="cz-guide-ringsvg">
            <Ring r={50} color="var(--colors-brands-care-500)" frac={0.78} width={10} />
            <Ring r={37} color="var(--colors-brands-family-500)" frac={0.56} width={10} delay={120} />
            <Ring r={24} color="var(--colors-brands-parenting-500)" frac={0.88} width={10} delay={240} />
          </svg>
          <span className="cz-guide-metric cz-guide-metric--sm">
            <b>14h</b>
          </span>
        </div>

        <div className={cn('cz-guide-slide', slide === 2 && 'is-on')}>
          <span className="cz-guide-halo">
            <i />
            <i />
            <i />
            <img src={`${CZ}/ip/Cozy_Magic_Light.webp`} alt="" draggable={false} />
          </span>
        </div>
      </div>

      <div className="cz-guide-copy">
        <Skel w="44%" tone="dark" />
        <Skel w="86%" />
        <Skel w="70%" />
      </div>

      <div className="cz-guide-split">
        <span className="cz-guide-bars">
          {[38, 62, 30, 84, 56, 92, 48].map((h, i) => (
            <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
          ))}
        </span>
        <span className="cz-guide-stripes">
          <i className="is-mom" />
          <i className="is-care" />
          <i className="is-family" />
          <i className="is-parenting" />
        </span>
      </div>
      <div className="cz-guide-copy">
        <Skel w="58%" tone="dark" />
        <Skel w="90%" />
      </div>
    </MiniPhone>
  );
}

/* Step 2 hero — a question asked at night, Cozie typing, replying, and a
 * plan card lifting out of the phone. */
const PLAN = [
  ['9:00 pm', 'Feed', true],
  ['12:30 am', 'Pump', true],
  ['3:00 am', 'Feed', false],
] as const;

function ChatHero() {
  // 0 empty · 1 question · 2 typing · 3 reply · 4 card · 5–7 card lifted (held)
  const phase = usePhase(8, 1100, 5);
  const at = (n: number) => phase >= n;
  return (
    <MiniPhone className="cz-guide-phone--chat">
      <div className="cz-guide-chathead">
        <img src={`${CZ}/ip/Cozy_Magic_Light.webp`} alt="" draggable={false} />
        <span>Cozie</span>
      </div>

      <div className="cz-guide-thread">
        <p className="cz-guide-msg is-cozie is-in">Good evening, Clara. How was today?</p>
        <p className={cn('cz-guide-msg is-me', at(1) && 'is-in')}>Is 6 feeds a day enough at 6 weeks?</p>
        <p className={cn('cz-guide-typing', phase === 2 && 'is-in')}>
          <i />
          <i />
          <i />
        </p>
        <p className={cn('cz-guide-msg is-cozie', at(3) && 'is-in')}>
          That&apos;s very typical at this stage. Here&apos;s a gentle plan for tonight.
        </p>
        <div className={cn('cz-guide-plan', at(4) && 'is-in', at(5) && 'is-lifted')}>
          <strong>Tonight&apos;s rhythm</strong>
          {PLAN.map(([time, what, done]) => (
            <span key={time} className="cz-guide-plan__row">
              <i className={cn('cz-guide-plan__check', done && 'is-done')} />
              <em>{time}</em>
              <span>{what}</span>
            </span>
          ))}
        </div>
      </div>
    </MiniPhone>
  );
}

/* ───────────── Steps ───────────── */

const STEPS = [
  {
    hero: <WelcomeHero />,
    title: 'Welcome to Cozie',
    body: 'Cozie learns your rhythm — feeds, sleep and pumping — and turns it into gentle suggestions made for you and your baby.',
    cta: 'Continue',
  },
  {
    hero: <ChatHero />,
    title: 'Ask anything, any hour',
    body: 'From 3 a.m. feeds to a new pumping plan, Cozie answers in seconds and remembers what matters, so you never start over.',
    cta: 'Next',
  },
] as const;

function PrivacyIcon() {
  return (
    <svg className="cz-guide-lockicon" viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M32 56S8 41.5 8 23.5C8 15.5 14 10 21 10c4.8 0 8.6 2.6 11 6.4C34.4 12.6 38.2 10 43 10c7 0 13 5.5 13 13.5C56 41.5 32 56 32 56Z"
        fill="var(--colors-brands-mom-700)"
      />
      <rect x="24" y="28" width="16" height="13" rx="3" fill="#fff" />
      <path d="M27 28v-3.5a5 5 0 0 1 10 0V28" fill="none" stroke="#fff" strokeWidth="2.6" />
      <circle cx="32" cy="34.5" r="1.8" fill="var(--colors-brands-mom-700)" />
    </svg>
  );
}

/** B · Guided intro: three first-run steps in the iOS onboarding-sheet style —
 *  an animated mini phone on top, title and body below, one primary button —
 *  ending on the privacy page with the agreement and Get started. */
export function GuidedIntro({ onStart, onClose }: Props) {
  const visible = useCozyVisible();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [agreed, setAgreed] = useState(false);
  const [prompt, setPrompt] = useState(false);

  // Start over from the first step every time Cozie is opened.
  useEffect(() => {
    if (visible) {
      setStep(0);
      setDir(1);
    }
  }, [visible]);

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  const comingSoon = (label: string) => showToast(`${label} is coming soon.`);
  const last = step === STEPS.length;
  const s = STEPS[step as 0 | 1];

  return (
    <div className={cn('cz-guide', last && 'is-plain')}>
      {step > 0 && (
        <button type="button" className="cz-glass-btn cz-guide__back" onClick={() => go(step - 1)} aria-label="Back">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <button type="button" className="cz-glass-btn cz-guide__close" onClick={onClose} aria-label="Close Cozie">
        <img src={`${CZ}/icons/settings_close.svg`} alt="" width={22} height={22} draggable={false} />
      </button>

      {!last && (
        <div className="cz-guide__hero" key={`hero-${step}-${visible}`}>
          {s.hero}
        </div>
      )}

      <div
        className={cn('cz-guide__body', dir < 0 && 'is-back')}
        key={`body-${step}-${visible}`}
        aria-live="polite"
      >
        {last ? (
          <>
            <PrivacyIcon />
            <h2 className="cz-guide__title">Your data stays yours</h2>
            <p className="cz-guide__text">
              What you share with Cozie is encrypted and used only to personalise your guidance.
            </p>
            <p className="cz-guide__text">We never sell your data, and no one reads your chats to advertise to you.</p>
            <p className="cz-guide__text">
              You can see what Cozie remembers, edit it or reset it at any time in Settings.
            </p>
            <button type="button" className="cz-guide__more" onClick={() => comingSoon('Privacy statement')}>
              Learn more
            </button>
          </>
        ) : (
          <>
            <h2 className="cz-guide__title">{s.title}</h2>
            <p className="cz-guide__text">{s.body}</p>
          </>
        )}
      </div>

      <div className="cz-guide__footer">
        {step === 0 && (
          <p className="cz-guide__fine">
            Cozie offers general guidance, not medical advice. For health concerns, talk to your doctor or
            midwife.{' '}
            <button type="button" className="cz-guide__morelink" onClick={() => comingSoon('Medical disclaimer')}>
              Learn more…
            </button>
          </p>
        )}
        {last && (
          <div className="cz-consent__agree cz-guide__agree">
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
        )}
        <button
          type="button"
          className="cz-consent__start cz-guide__cta"
          onClick={() => {
            if (!last) go(step + 1);
            else if (agreed) onStart();
            else setPrompt(true);
          }}
        >
          {last ? 'Get started' : s.cta}
        </button>
      </div>

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
              className="cz-consent-prompt__btn is-primary"
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
