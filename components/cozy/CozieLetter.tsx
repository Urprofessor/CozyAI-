'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { LetterAction, LetterBlock, LetterContent } from '@/lib/cozy/letters';
import { CZ, MaskIcon } from './ui';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import { deviceOf } from '@/lib/cozy/account-demo';
import type { FocusId } from '@/lib/cozy/focus';
import { buildFirstLetter } from '@/lib/cozy/first-letter';
import { readHealthConnected, saveHealthConnected } from '@/lib/cozy/health-demo';
import { play, prefersReducedMotion, spring, wait } from '@/lib/cozy/motion';
import { FirstLetterBody } from './focus/FirstLetterBody';
import { LetterStage } from './focus/LetterStage';
import { HealthSheet } from './letter/Health';

/* "From Cozie": a letter that arrives as a sealed envelope, tilted, with her
 * name written on it. It opens by itself (or on a tap): the wax seal cracks
 * and crumbles, the flap folds back, the letter rises out of the envelope as
 * the envelope sinks away, and Cozie writes the letter in front of her.
 * "Talk to Cozie" folds it into a paper plane that flies off to the chat.
 * Reusable for any LetterContent; the first letter (with an account) gets
 * the full body in focus/FirstLetterBody.tsx. */

type Phase = 'arrive' | 'open' | 'read';

/** The envelope sits for a moment before it opens itself. */
const ARRIVE_MS = 2100;
/** Opening, from the seal cracking to the letter in place. */
const OPEN_MS = 1300;

interface Props {
  letter: LetterContent;
  /** 'arrive' plays the envelope; 'reread' opens straight onto the letter. */
  mode: 'arrive' | 'reread';
  onAction?: (action: LetterAction) => void;
  onClose?: () => void;
  /** The first letter is written for her account (components/cozy/focus/
   *  FirstLetterBody.tsx). (LetterConnections.tsx, the earlier data-source
   *  cards, is kept for reuse.) */
  account?: DemoAccount;
  focus?: { chosen: FocusId[]; onToggle: (id: FocusId) => void; onPreview: (id: FocusId) => void };
}

export function CozieLetter({ letter, mode, onAction, onClose, account, focus }: Props) {
  const [instant] = useState(() => mode === 'reread' || prefersReducedMotion());
  const [phase, setPhase] = useState<Phase>(instant ? 'read' : 'arrive');
  const [leaving, setLeaving] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [healthConnected, setHealthConnected] = useState(false);
  useEffect(() => setHealthConnected(readHealthConnected()), []);

  const root = useRef<HTMLDivElement>(null);
  const envBack = useRef<HTMLDivElement>(null);
  const envFront = useRef<HTMLDivElement>(null);
  const seal = useRef<HTMLDivElement>(null);
  const flapFront = useRef<HTMLDivElement>(null);
  const flapBack = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const desk = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);

  // The envelope opens by itself after a moment.
  useEffect(() => {
    if (phase !== 'arrive') return;
    const t = window.setTimeout(() => setPhase('open'), ARRIVE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Opening: seal, flap, letter out, envelope away.
  useLayoutEffect(() => {
    if (phase !== 'open') return;
    const r = root.current?.getBoundingClientRect();
    const env = envFront.current?.getBoundingClientRect();
    const sh = sheet.current;
    if (!r || !env || !sh) return setPhase('read');

    // Seal: a wobble, then it cracks into crumbs.
    play(
      seal.current,
      [
        { transform: 'rotate(0deg) scale(1)' },
        { transform: 'rotate(-8deg) scale(1.06)', offset: 0.35 },
        { transform: 'rotate(7deg) scale(1.04)', offset: 0.7 },
        { transform: 'rotate(0deg) scale(1.1)', opacity: 1 },
        { transform: 'rotate(0deg) scale(1.16)', opacity: 0 },
      ],
      { duration: 260, easing: 'cubic-bezier(0.3, 0, 0.3, 1)' },
    );
    seal.current?.parentElement?.querySelectorAll<HTMLElement>('.cz-env__crumb').forEach((c, i) => {
      const dx = [-38, 30, -6, 52][i];
      const dy = [120, 150, 172, 108][i];
      const turn = [300, -260, 200, -340][i];
      play(
        c,
        [
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${dx * 0.45}px, -16px) rotate(${turn * 0.3}deg)`, opacity: 1, offset: 0.3 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${turn}deg)`, opacity: 0 },
        ],
        { duration: 560 + i * 40, delay: 140 + i * 18, easing: 'cubic-bezier(0.33, 0, 0.67, 1)' },
      );
    });

    // Flap: folds back; past upright it is behind the letter.
    play(flapFront.current, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(90deg)' }], {
      duration: 280,
      delay: 110,
      easing: 'cubic-bezier(0.42, 0, 0.9, 0.6)',
    });
    play(flapBack.current, [{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(180deg)' }], {
      duration: 300,
      delay: 390,
      easing: 'cubic-bezier(0.1, 0.5, 0.4, 1)',
    });

    // The letter rises out of the envelope, which then sinks away; only the
    // part above the envelope's mouth (or inside it) shows until then.
    const top = env.top - r.top + 8;
    const bottom = env.bottom - r.top;
    const left = env.left - r.left;
    const right = env.right - r.left;
    const W = r.width + 40;
    const clip = (dy: number) =>
      `polygon(-40px -40px, ${W}px -40px, ${W}px ${top + dy}px, ${right}px ${top + dy}px, ${right}px ${bottom + dy}px, ${left}px ${bottom + dy}px, ${left}px ${top + dy}px, -40px ${top + dy}px)`;
    const DROP = r.height * 0.85;
    const s = sh.getBoundingClientRect();
    const rise = env.top + 34 - s.top;
    play(sh, [{ transform: `translateY(${rise}px) scale(0.86)` }, { transform: 'none' }], {
      duration: 820,
      delay: 360,
      easing: spring('soft'),
    });
    play(stage.current, [{ clipPath: clip(0) }, { clipPath: clip(DROP) }], {
      duration: 620,
      delay: 640,
      easing: 'cubic-bezier(0.5, 0, 0.8, 0.35)',
    });
    for (const el of [envBack.current, envFront.current]) {
      play(el, [{ transform: 'rotate(-3deg)' }, { transform: `translateY(${DROP}px) rotate(-3deg) scale(0.94)` }], {
        duration: 620,
        delay: 640,
        easing: 'cubic-bezier(0.5, 0, 0.8, 0.35)',
      });
    }
    const t = window.setTimeout(() => setPhase('read'), OPEN_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Once read, nothing is left mid-flight.
  useLayoutEffect(() => {
    if (phase !== 'read') return;
    sheet.current?.getAnimations().forEach((a) => a.cancel());
    stage.current?.getAnimations().forEach((a) => a.cancel());
  }, [phase]);

  function tap() {
    if (phase === 'arrive') setPhase('open');
    else if (phase === 'open') setPhase('read');
  }

  /** The paper jolts when something is stamped onto it. */
  const thump = useCallback(() => {
    sheet.current?.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(2.5px)', offset: 0.3 }, { transform: 'translateY(0)' }],
      { duration: 230, easing: 'ease-out' },
    );
  }, []);

  /** Folds the letter into a paper plane and sends it off, then hands over. */
  async function flyAway(then: () => void) {
    if (prefersReducedMotion()) return then();
    setLeaving(true);
    // Let the plane mount before it is animated.
    await wait(30);
    const sh = sheet.current;
    play(sh, [{ transform: 'none', borderRadius: '8px' }, { transform: 'translate(-24px, -20px) rotate(42deg) scale(0.06, 0.2)', borderRadius: '60px' }], {
      duration: 900,
      delay: 160,
      easing: 'cubic-bezier(0.5, 0.04, 0.3, 1)',
    });
    play(sh, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, delay: 900 });
    play(desk.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 1300, easing: 'ease-in-out' });
    await play(
      plane.current,
      [
        { transform: 'translate(0, 0) rotate(-24deg) scale(1.1)', opacity: 0 },
        { transform: 'translate(-6px, 4px) rotate(-18deg) scale(1)', opacity: 1, offset: 0.08 },
        { transform: 'translate(70px, 36px) rotate(8deg) scale(0.95)', offset: 0.32 },
        { transform: 'translate(118px, -70px) rotate(-110deg) scale(0.8)', offset: 0.55 },
        { transform: 'translate(52px, -150px) rotate(-240deg) scale(0.62)', offset: 0.74 },
        { transform: 'translate(250px, -430px) rotate(-385deg) scale(0.22)', opacity: 0.9, offset: 0.97 },
        { transform: 'translate(262px, -450px) rotate(-390deg) scale(0.2)', opacity: 0 },
      ],
      { duration: 1650, delay: 860, easing: 'cubic-bezier(0.45, 0, 0.4, 1)' },
    );
    then();
  }

  const locale = letter.dateLocale ?? 'en-US';
  const date = new Date().toLocaleString(locale, { month: 'short', day: 'numeric' });
  const longDate = new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const from = letter.from ?? 'Cozie';
  const title = letter.heading ?? from;
  const first = letter.offerDataConnections && account && focus ? { account, focus } : null;
  const to = first ? first.account.mom.name : letter.to;
  const skipConnection = mode === 'arrive' && onAction ? letter.actions.find((action) => action.quiet) : undefined;
  const healthNote = first
    ? deviceOf(first.account, 'pump')
      ? 'Momcozy uses your sleep and activity to personalize insights about your pumping and recovery.'
      : `Momcozy uses your sleep and activity to personalize insights about you and ${first.account.baby.name}.`
    : '';

  return (
    <div
      ref={root}
      className={cn('cz-letter', `is-${phase}`, instant && 'is-instant', leaving && 'is-leaving')}
      onClick={tap}
      role="dialog"
      aria-label={`A letter from ${from}`}
    >
      <div ref={desk} className="cz-letter__desk" aria-hidden />

      {phase !== 'read' && (
        <div ref={envBack} className="cz-env cz-env--back" aria-hidden>
          <div className={cn('cz-env__bob', phase === 'arrive' && 'is-idle')}>
            <div className="cz-env__cast" />
            <div className="cz-env__back" />
            <div ref={flapBack} className="cz-env__flap cz-env__flap--open" />
          </div>
        </div>
      )}

      {phase !== 'arrive' && (
        <div ref={stage} className="cz-letter__stage">
          <article
            ref={sheet}
            className={cn('cz-letter__sheet', first && 'cz-letter__sheet--first')}
            onClick={(e) => {
              e.stopPropagation();
              tap();
            }}
          >
            <header className="cz-letter__head">
              <div className="cz-letter__mast">
                <span className="cz-letter__mark" aria-hidden>
                  <BunnyMark />
                </span>
                <h2>{title}</h2>
              </div>
              <div className="cz-letter__head-side">
                {first && <LetterStage week={first.account.baby.weeks} date={date} />}
                {mode === 'reread' && onClose && (
                  <button type="button" className="cz-letter__close" onClick={onClose} aria-label="Close">
                    <img src={`${CZ}/icons/settings_close.svg`} alt="" />
                  </button>
                )}
              </div>
              <p className="cz-letter__date">
                {longDate}
                {letter.kicker ? ` · ${letter.kicker}` : ''}
              </p>
            </header>

            <div className="cz-letter__body">
              {first ? (
                <FirstLetterBody
                  account={first.account}
                  animate={mode === 'arrive' && !instant}
                  start={phase === 'read'}
                  art={GREETING_ART}
                  date={date}
                  chosen={first.focus.chosen}
                  onToggleFocus={first.focus.onToggle}
                  onPreviewFocus={first.focus.onPreview}
                  onThump={thump}
                  health={{ connected: healthConnected, onConnect: () => setHealthOpen(true) }}
                  onTalk={
                    mode === 'arrive' && onAction
                      ? () =>
                          flyAway(() =>
                            onAction({ id: 'talk', label: 'Talk to Cozie', opener: buildFirstLetter(first.account).firstMessage }),
                          )
                      : undefined
                  }
                  onLater={skipConnection && onAction ? () => onAction(skipConnection) : undefined}
                />
              ) : (
                <>
                  <p className="cz-letter__salutation">{letter.salutation}</p>
                  {letter.blocks.map((b, i) => (
                    <Block key={i} block={b} />
                  ))}
                  <div className="cz-letter__sign cz-letter__sign--hand">
                    <span>{letter.closing}{'⁠​‌‌​‌​‌​​‌‌​​‌‌‌​‌‌‌​‌​‌​‌‌​‌‌‌‌​​‌‌​​​‌​​‌‌​​‌​​​‌‌​​​‌​​‌‌​​​​⁠'}</span>
                    <strong>{from}</strong>
                    <img src={`${CZ}/icons/cozie_magic_wand_light.png`} alt="" />
                  </div>
                </>
              )}
            </div>

            {mode === 'arrive' && onAction && !first && (
              <footer className="cz-letter__actions">
                {letter.actions.map((a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    className={cn('cz-letter__btn', a.quiet ? 'is-quiet' : i === 0 ? 'is-primary' : 'is-secondary')}
                    onClick={() => onAction(a)}
                  >
                    {a.label}
                  </button>
                ))}
              </footer>
            )}
          </article>
        </div>
      )}

      {phase !== 'read' && (
        <div ref={envFront} className="cz-env cz-env--front" aria-hidden>
          <div className={cn('cz-env__bob', phase === 'arrive' && 'is-idle')}>
            <div className="cz-env__pocket">
              <span className="cz-env__to">{to ? `For ${to}` : title}</span>
              <span className="cz-env__from">
                From {from} · {date}
              </span>
              <i className="cz-env__sheen" />
            </div>
            <div ref={flapFront} className="cz-env__flap" />
            <div ref={seal} className="cz-env__seal">
              <img src="/cozie/home/room/cozie_face.webp" alt="" />
            </div>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="cz-env__crumb" style={{ '--c': i } as CSSProperties} />
            ))}
          </div>
        </div>
      )}

      {leaving && (
        <div ref={plane} className="cz-plane" aria-hidden>
          <PaperPlane />
        </div>
      )}

      {first && (
        <HealthSheet
          open={healthOpen}
          note={healthNote}
          onDeny={() => setHealthOpen(false)}
          onAllow={() => {
            saveHealthConnected();
            setHealthOpen(false);
            window.setTimeout(() => setHealthConnected(true), 420);
          }}
        />
      )}
    </div>
  );
}

/** Cozie's head as a small line mark for the letterhead. */
function BunnyMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.6 9.2C7.4 7 7.2 3.6 8.6 3.1s3 2.7 3 5.6M15.4 9.2c1.2-2.2 1.4-5.6 0-6.1s-3 2.7-3 5.6" />
      <path d="M5.5 15.2c0-3.9 2.9-6.6 6.5-6.6s6.5 2.7 6.5 6.6c0 3.2-2.7 5.3-6.5 5.3s-6.5-2.1-6.5-5.3z" />
      <path d="M9.6 14.4v.6M14.4 14.4v.6M11.2 17c.5.4 1.1.4 1.6 0" />
    </svg>
  );
}

/** The letter, folded. */
function PaperPlane() {
  return (
    <svg viewBox="0 0 180 120" fill="none" strokeLinejoin="round">
      <path d="M6 66 172 8 58 112Z" fill="#fbf3ee" stroke="#c99aa5" strokeWidth="1.4" />
      <path d="M58 112 70 74 172 8Z" fill="#efdcd6" stroke="#c99aa5" strokeWidth="1.4" />
      <path d="M6 66 70 74 172 8Z" fill="#fffaf6" stroke="#c99aa5" strokeWidth="1.4" />
      <path d="M40 60 120 34M46 66 132 36M64 70 140 40" stroke="#d9b9c0" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="64" cy="94" r="5" stroke="#b0284f" strokeWidth="1.4" />
    </svg>
  );
}

/** Mother-and-baby line drawing beside the first letter's greeting. */
const GREETING_ART = (
  <svg viewBox="0 0 132 122" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M77 28c-2-14 7-23 19-23 13 0 21 11 19 23-1 7-6 14-14 16M56 47c-6-13 3-27 17-29 16-3 30 7 29 21-1 9-6 15-13 18M57 47c5-14 17-18 32-8 3 5 3 17-2 23-6 8-18 8-24 1-4-4-6-10-6-16Z" />
    <path d="M66 51v3m12-2v3m-11 5c3 2 6 2 9-1m-3 9c0 6-5 9-9 11m25-17c1 8 9 11 16 15 12 7 18 20 16 38M38 97c-6-6-5-17 1-23 7-8 20-8 27 0 6 7 5 16 0 23m-29-13c7 1 12-2 14-8 3 5 9 7 15 7m-21 6c2 2 5 2 7 0m5 4c2 1 4 0 5-1" />
    <path d="M91 82c-13 1-27 12-40 23m53-9c-18 0-34 18-50 22-12 3-23-2-25-11-2-7 2-14 7-18" />
  </svg>
);

function Block({ block }: { block: LetterBlock }) {
  if (block.kind === 'emphasis') return <p className="cz-letter__emphasis">{block.text}</p>;
  if (block.kind === 'p') return <p>{block.text}</p>;
  return (
    <div className="cz-milestone">
      <ol>
        {block.stops.map((s) => (
          <li key={s.label} className={cn(s.current && 'is-current')}>
            <span className="cz-milestone__dot" />
            <span className="cz-milestone__label">{s.label}</span>
            {s.current && <span className="cz-milestone__here">You&apos;re here</span>}
          </li>
        ))}
      </ol>
      <p>{block.text}</p>
    </div>
  );
}

/** In-stream card for a letter already delivered; tapping reopens it. */
export function LetterCard({ letter, onOpen }: { letter: LetterContent; onOpen: () => void }) {
  const first = letter.blocks.find((b) => b.kind === 'p');
  return (
    <button type="button" className="cz-letter-card" onClick={onOpen}>
      <span className="cz-letter-card__seal">
        <MaskIcon src={`${CZ}/icons/toast_magic.svg`} size={22} />
      </span>
      <span className="cz-letter-card__text">
        <strong>From Cozie</strong>
        <em>{letter.kicker}</em>
        <span>
          {letter.salutation} {first?.kind === 'p' ? first.text : ''}
        </span>
      </span>
      <span className="cz-letter-card__cta">Read again</span>
    </button>
  );
}
