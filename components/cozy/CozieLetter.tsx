'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { LetterAction, LetterBlock, LetterContent } from '@/lib/cozy/letters';
import { CZ, MaskIcon } from './ui';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import type { FocusId } from '@/lib/cozy/focus';
import { buildFirstLetter } from '@/lib/cozy/first-letter';
import { FirstLetterBody } from './focus/FirstLetterBody';

type Phase = 'arrive' | 'seal' | 'open' | 'rise' | 'read';

// When each phase starts (ms after mount). The envelope opens by itself; a tap
// anywhere jumps straight to the letter.
const TIMELINE: Array<[Phase, number]> = [
  ['seal', 750],
  ['open', 1250],
  ['rise', 1800],
  ['read', 2500],
];

interface Props {
  letter: LetterContent;
  /** 'arrive' plays the envelope; 'reread' opens straight onto the letter. */
  mode: 'arrive' | 'reread';
  onAction?: (action: LetterAction) => void;
  onClose?: () => void;
  /** The first letter is written for her account (components/cozy/focus/
   *  FirstLetterBody.tsx): an observation, focus cards with a preview sheet,
   *  and "Talk to Cozie". (LetterConnections.tsx, the earlier data-source
   *  cards, is kept for reuse.) */
  account?: DemoAccount;
  focus?: { chosen: FocusId[]; onToggle: (id: FocusId) => void; onPreview: (id: FocusId) => void };
}

/** "From Cozie": a letter that arrives sealed, opens itself and unfolds to a
 *  full sheet. Reusable for any LetterContent. */
export function CozieLetter({ letter, mode, onAction, onClose, account, focus }: Props) {
  const [phase, setPhase] = useState<Phase>(mode === 'reread' ? 'read' : 'arrive');
  const [instant, setInstant] = useState(mode === 'reread');
  const paperRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mode === 'reread') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInstant(true);
      setPhase('read');
      return;
    }
    const timers = TIMELINE.map(([p, at]) => setTimeout(() => setPhase(p), at));
    return () => timers.forEach(clearTimeout);
  }, [mode]);

  // FLIP the full sheet out of the paper peeking from the envelope.
  useLayoutEffect(() => {
    if (phase !== 'read' || instant) return;
    const sheet = sheetRef.current;
    const paper = paperRef.current;
    if (!sheet || !paper) return;
    const from = paper.getBoundingClientRect();
    const to = sheet.getBoundingClientRect();
    const s = from.width / to.width;
    sheet.style.transition = 'none';
    sheet.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${s})`;
    void sheet.offsetWidth;
    sheet.style.transition = '';
    sheet.style.transform = '';
  }, [phase, instant]);

  function skip() {
    if (phase === 'read') return;
    setPhase('read');
  }

  const date = new Date().toLocaleString(letter.dateLocale ?? 'en-US', { month: 'short', day: 'numeric' });
  const from = letter.from ?? 'Cozie';
  const heading = letter.heading ?? `From ${from}`;
  // The direction cards show when rereading too; "Maybe later" belongs to
  // the first arrival only.
  const first = letter.offerDataConnections && account && focus ? { account, focus } : null;
  const offerConnections = !!first;
  const skipConnection = mode === 'arrive' && onAction ? letter.actions.find((action) => action.quiet) : undefined;

  return (
    <div
      className={cn('cz-letter', `is-${phase}`, instant && 'is-instant')}
      onClick={skip}
      role="dialog"
      aria-label={`A letter from ${from}`}
    >
      {!instant && (
        <div className="cz-env" aria-hidden>
          <div className="cz-env__back" />
          <div ref={paperRef} className="cz-env__paper">
            <span>{heading}</span>
            <strong>{letter.salutation}</strong>
            <i />
            <i />
            <i />
          </div>
          <div className="cz-env__pocket" />
          <div className="cz-env__flap" />
          <div className="cz-env__seal">
            <MaskIcon src={`${CZ}/icons/toast_magic.svg`} size={22} />
          </div>
        </div>
      )}

      {phase === 'read' && (
        <article ref={sheetRef} className={cn('cz-letter__sheet', letter.offerDataConnections && 'cz-letter__sheet--illustrated')} onClick={(e) => e.stopPropagation()}>
          <header className="cz-letter__head">
            <div>
              {letter.offerDataConnections && <span className="cz-letter__brand">momcozy</span>}
              <h2>{heading}</h2>
              <span>{first ? `${letter.kicker} · ${date}` : letter.kicker}</span>
            </div>
            <div className="cz-letter__head-side">
              {first && <Stage week={first.account.baby.weeks} />}
              {mode === 'reread' && onClose ? (
                <button type="button" className="cz-letter__close" onClick={onClose} aria-label="Close">
                  <img src={`${CZ}/icons/settings_close.svg`} alt="" />
                </button>
              ) : (
                !first && <time>{date}</time>
              )}
            </div>
          </header>

          <div className="cz-letter__body">
            {first ? (
              <FirstLetterBody
                account={first.account}
                animate={mode === 'arrive'}
                art={GREETING_ART}
                chosen={first.focus.chosen}
                onToggleFocus={first.focus.onToggle}
                onPreviewFocus={first.focus.onPreview}
                onTalk={
                  mode === 'arrive' && onAction
                    ? () =>
                        onAction({ id: 'talk', label: 'Talk to Cozie', opener: buildFirstLetter(first.account).firstMessage })
                    : undefined
                }
                onLater={skipConnection && onAction ? () => onAction(skipConnection) : undefined}
              />
            ) : (
              <>
                {letter.offerDataConnections ? (
                  <div className="cz-letter__greeting">
                    <p className="cz-letter__salutation">{letter.salutation}</p>
                    {GREETING_ART}
                  </div>
                ) : (
                  <p className="cz-letter__salutation">{letter.salutation}</p>
                )}
                {letter.blocks.map((b, i) => (
                  <Block key={i} block={b} />
                ))}
                <div className="cz-letter__sign">
                  <span>{letter.closing}</span>
                  <strong>{from}</strong>
                  <img src={`${CZ}/icons/cozie_magic_wand_light.png`} alt="" />
                </div>
              </>
            )}
          </div>

          {mode === 'arrive' && onAction && !offerConnections && (
            <footer className="cz-letter__actions">
              {letter.actions.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  className={cn(
                    'cz-letter__btn',
                    a.quiet ? 'is-quiet' : i === 0 ? 'is-primary' : 'is-secondary'
                  )}
                  onClick={() => onAction(a)}
                >
                  {a.label}
                </button>
              ))}
            </footer>
          )}
        </article>
      )}
    </div>
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

/** Where mom and baby are, beside the letter's heading: Birth · now · next. */
function Stage({ week }: { week: number }) {
  return (
    <div className="cz-stage" aria-label={`Week ${week}, between birth and week ${week + 2}`}>
      <span className="cz-stage__label">
        <i aria-hidden />
        Week {week}
      </span>
      <span className="cz-stage__track" aria-hidden>
        <i className="is-past" />
        <i className="is-now" />
        <i />
      </span>
    </div>
  );
}

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
