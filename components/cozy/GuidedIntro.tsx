'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useCozyVisible } from '@/components/shell/cozyClose';
import { CZ, showToast } from './ui';
import { MiniPhone, Skel, usePhase, WelcomeHero } from './IntroHeroes';

interface Props {
  /** Called after the checkmark: the From Cozie letter arrives next. */
  onStart: () => void;
  onClose: () => void;
}

/* ───────────── Step 2 hero: what Cozie remembers ───────────── */

const KNOWN = [
  ['baby', 'Baby', 'Noah · 6 weeks'],
  ['feed', 'Feeding', 'Mixed'],
  ['pump', 'Pumping', '~6× a day'],
  ['device', 'Pump', 'Momcozy M5'],
  ['sleep', 'Sleep', 'Short naps lately'],
] as const;

function MemoryHero() {
  // 0 empty · 1–5 rows fill in · 6–8 hold with "Updated" pill
  const phase = usePhase(9, 900, 8);
  return (
    <MiniPhone className="cz-steps-mem">
      <div className="cz-steps-mem__head">
        <img src={`${CZ}/ip/Cozy_Magic_Light.webp`} alt="" draggable={false} />
        <span>
          <b>What Cozie knows</b>
          <Skel w="64px" tone="soft" />
        </span>
      </div>
      <ul className="cz-steps-mem__list">
        {KNOWN.map(([icon, label, value], i) => (
          <li key={icon} className={cn(phase > i && 'is-in')}>
            <i className={`cz-steps-mem__icon is-${icon}`} />
            <span className="cz-steps-mem__label">{label}</span>
            <span className="cz-steps-mem__value">{value}</span>
            <i className="cz-steps-mem__check" />
          </li>
        ))}
      </ul>
      <span className={cn('cz-steps-mem__pill', phase >= 6 && 'is-in')}>Updated just now</span>
      <div className="cz-guide-copy cz-steps-mem__tail">
        <Skel w="40%" tone="dark" />
        <Skel w="88%" />
        <Skel w="72%" />
      </div>
    </MiniPhone>
  );
}

/* ───────────── Step 3 hero: asks before assuming ───────────── */

const CHIPS = ['Wakes a lot', 'Hard to settle', 'Something seems off'];

function HonestHero() {
  // 0 empty · 1 question · 2 Cozie asks · 3 chips · 4 chip picked · 5 reply · 6–7 hold
  const phase = usePhase(8, 1050, 6);
  const at = (n: number) => phase >= n;
  return (
    <MiniPhone className="cz-guide-phone--chat">
      <div className="cz-guide-chathead">
        <img src={`${CZ}/ip/Cozy_Magic_Light.webp`} alt="" draggable={false} />
        <span>Cozie</span>
      </div>
      <div className="cz-guide-thread">
        <p className={cn('cz-guide-msg is-me', at(1) && 'is-in')}>Noah&apos;s been sleeping badly</p>
        <p className={cn('cz-guide-msg is-cozie', at(2) && 'is-in')}>
          I&apos;d love to help. What&apos;s been happening at night?
        </p>
        <div className={cn('cz-steps-chips', at(3) && 'is-in')}>
          {CHIPS.map((c, i) => (
            <span key={c} className={cn(i === 1 && at(4) && 'is-picked')} style={{ transitionDelay: `${i * 70}ms` }}>
              {c}
            </span>
          ))}
        </div>
        <p className={cn('cz-guide-msg is-cozie', at(5) && 'is-in')}>
          Thanks — that helps. Let&apos;s find what settles him tonight.
        </p>
      </div>
    </MiniPhone>
  );
}

/* ───────────── Icons ───────────── */

const PROMISES: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: (
      <>
        <path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 5 4.5Z" />
        <path d="M10 9.2a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.3M12 14.3h.01" />
      </>
    ),
    title: 'Asks first',
    text: 'Clarifies what’s going on before giving advice.',
  },
  {
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
    title: 'Knows its limits',
    text: 'Tells you plainly when something needs a doctor.',
  },
  {
    icon: (
      <>
        <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
        <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      </>
    ),
    title: 'Private by default',
    text: 'Your chats and data stay yours.',
  },
];

function LineIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

/* ───────────── Step 4: permissions ───────────── */

type PermState = 'off' | 'working' | 'on';

function PermissionCards() {
  const [health, setHealth] = useState<PermState>('off');
  const [remind, setRemind] = useState<PermState>('off');

  function connectHealth() {
    if (health !== 'off') return;
    setHealth('working');
    window.setTimeout(() => setHealth('on'), 900);
  }

  async function turnOnReminders() {
    if (remind !== 'off') return;
    setRemind('working');
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch {
      /* unsupported (e.g. iOS Safari outside a home-screen app) */
    }
    setRemind('on');
    showToast('Reminders are on. Cozie will nudge you gently.');
  }

  return (
    <div className="cz-steps-perms">
      <div className="cz-steps-perm">
        <span className="cz-steps-perm__icon is-health" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 20s-7-4.4-7-9.6C5 7.9 6.9 6 9.2 6c1.2 0 2.2.6 2.8 1.5C12.6 6.6 13.6 6 14.8 6 17.1 6 19 7.9 19 10.4 19 15.6 12 20 12 20Z" fill="currentColor" />
          </svg>
        </span>
        <div className="cz-steps-perm__copy">
          <strong>Connect Apple Health &amp; devices</strong>
          <span>Sleep, feeds and pump sessions come in on their own — no typing.</span>
        </div>
        <PermButton state={health} onClick={connectHealth} label="Connect" doneLabel="Connected" />
      </div>

      <div className="cz-steps-perm cz-steps-perm--remind">
        <div className="cz-steps-banner" aria-hidden="true">
          <img src={`${CZ}/icons/cozie_tab.png`} alt="" />
          <span>
            <b>Cozie</b>
            <em>now</em>
            <span>Pump session in 10 min. You&apos;re on track today.</span>
          </span>
        </div>
        <div className="cz-steps-perm__row">
          <span className="cz-steps-perm__icon is-remind" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" />
              <path d="M10 20.5a2 2 0 0 0 4 0" />
            </svg>
          </span>
          <div className="cz-steps-perm__copy">
            <strong>Turn on gentle reminders</strong>
            <span>Pump times, and a heads-up when Noah&apos;s sleep changes.</span>
          </div>
          <PermButton state={remind} onClick={turnOnReminders} label="Turn on" doneLabel="On" />
        </div>
      </div>
    </div>
  );
}

function PermButton({ state, onClick, label, doneLabel }: { state: PermState; onClick: () => void; label: string; doneLabel: string }) {
  return (
    <button
      type="button"
      className={cn('cz-steps-perm__btn', state !== 'off' && `is-${state}`)}
      onClick={onClick}
      disabled={state !== 'off'}
      aria-live="polite"
    >
      {state === 'working' ? <i className="cz-steps-spin" aria-label="Working" /> : state === 'on' ? `✓ ${doneLabel}` : label}
    </button>
  );
}

/* ───────────── Flow ───────────── */

const TOTAL = 4;

/** B · Guided intro: three Apple-style steps (animated mini phone, title,
 *  body), a permissions page and a checkmark, then the From Cozie letter —
 *  the same ending as the intro film. A progress bar shows the four steps. */
export function GuidedIntro({ onStart, onClose }: Props) {
  const visible = useCozyVisible();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [done, setDone] = useState(false);
  const doneTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (visible) {
      setStep(0);
      setDir(1);
      setDone(false);
    }
  }, [visible]);
  useEffect(() => () => window.clearTimeout(doneTimer.current), []);

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  const finish = () => {
    setDone(true);
    // The checkmark stays up under the letter, which rises over it.
    doneTimer.current = window.setTimeout(onStart, 1100);
  };
  const comingSoon = (label: string) => showToast(`${label} is coming soon.`);
  const runKey = `${step}-${visible}`;

  return (
    <div className={cn('cz-guide cz-steps', step === 3 && 'is-plain', step === 2 && 'is-tall-body')}>
      <div className="cz-steps-progress" aria-label={`Step ${step + 1} of ${TOTAL}`}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <i key={i} className={cn(i <= step && 'is-on')} />
        ))}
      </div>
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

      {step < 3 && (
        <div className="cz-guide__hero" key={`hero-${runKey}`}>
          {step === 0 && <WelcomeHero />}
          {step === 1 && <MemoryHero />}
          {step === 2 && <HonestHero />}
        </div>
      )}

      <div className={cn('cz-guide__body', dir < 0 && 'is-back')} key={`body-${runKey}`} aria-live="polite">
        {step === 0 && (
          <>
            <h2 className="cz-guide__title">Here for you, even at 3 a.m.</h2>
            <p className="cz-guide__text">
              Cozie keeps an eye on feeds, sleep and pumping, and checks in when you need it.
            </p>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="cz-guide__title">You never have to start over</h2>
            <p className="cz-guide__text">
              Cozie remembers Noah, your routine and your devices, so every chat picks up where you left off.
            </p>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="cz-guide__title">Honest when it matters</h2>
            <ul className="cz-steps-promises">
              {PROMISES.map((p) => (
                <li key={p.title}>
                  <span className="cz-steps-promises__icon">
                    <LineIcon>{p.icon}</LineIcon>
                  </span>
                  <span>
                    <b>{p.title}</b>
                    {p.text}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="cz-guide__title">Let Cozie help a little more</h2>
            <p className="cz-guide__text">Both are optional. You can change them anytime in Settings.</p>
            <PermissionCards />
          </>
        )}
      </div>

      <div className="cz-guide__footer">
        {step === 1 && (
          <p className="cz-guide__fine">You can see, edit or delete what Cozie remembers anytime in Settings.</p>
        )}
        {step === 2 && (
          <p className="cz-guide__fine">
            Cozie offers general guidance, not medical advice. By continuing, you agree to the{' '}
            <button type="button" className="cz-guide__morelink" onClick={() => comingSoon('Privacy statement')}>
              Privacy statement
            </button>{' '}
            and{' '}
            <button type="button" className="cz-guide__morelink" onClick={() => comingSoon('Medical disclaimer')}>
              Medical disclaimer
            </button>
            .
          </p>
        )}
        <button
          type="button"
          className="cz-consent__start cz-guide__cta"
          onClick={() => (step < 3 ? go(step + 1) : finish())}
        >
          {step === 2 ? 'Agree & continue' : step === 3 ? 'Get started' : 'Continue'}
        </button>
        {step === 3 && (
          <button type="button" className="cz-steps-skip" onClick={finish}>
            Not now
          </button>
        )}
      </div>

      {done && (
        <div className="cz-steps-done" role="status" aria-label="You're all set">
          <span className="cz-steps-done__check">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path d="M14 25l7 7 14-15" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p>You&apos;re all set</p>
        </div>
      )}

    </div>
  );
}

/** B shown as an iOS-style sheet: pulled up to 75% of the screen over the
 *  dimmed Cozie page, rising each time Cozie is opened. */
export function GuidedIntroSheet(props: Props) {
  const visible = useCozyVisible();
  const [up, setUp] = useState(false);

  useEffect(() => {
    if (!visible) {
      setUp(false);
      return;
    }
    // Two frames so the closed position paints first and the sheet slides.
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setUp(true));
    });
    return () => cancelAnimationFrame(id);
  }, [visible]);

  return (
    <div className={cn('cz-intro-sheet', up && 'is-up')}>
      <div className="cz-intro-sheet__scrim" aria-hidden="true" />
      <div className="cz-intro-sheet__panel" role="dialog" aria-modal="true" aria-label="Welcome to Cozie">
        <span className="cz-intro-sheet__grabber" aria-hidden="true" />
        <GuidedIntro {...props} />
      </div>
    </div>
  );
}
