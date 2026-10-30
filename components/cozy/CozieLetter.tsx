'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { LetterAction, LetterBlock, LetterContent } from '@/lib/cozy/letters';
import { CZ, MaskIcon } from './ui';

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
}

/** "From Cozie": a letter that arrives sealed, opens itself and unfolds to a
 *  full sheet. Reusable for any LetterContent. */
export function CozieLetter({ letter, mode, onAction, onClose }: Props) {
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

  const date = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      className={cn('cz-letter', `is-${phase}`, instant && 'is-instant')}
      onClick={skip}
      role="dialog"
      aria-label="A letter from Cozie"
    >
      {!instant && (
        <div className="cz-env" aria-hidden>
          <div className="cz-env__back" />
          <div ref={paperRef} className="cz-env__paper">
            <span>From Cozie</span>
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
        <article ref={sheetRef} className="cz-letter__sheet" onClick={(e) => e.stopPropagation()}>
          <header className="cz-letter__head">
            <div>
              <h2>From Cozie</h2>
              <span>{letter.kicker}</span>
            </div>
            {mode === 'reread' && onClose ? (
              <button type="button" className="cz-letter__close" onClick={onClose} aria-label="Close">
                <img src={`${CZ}/icons/settings_close.svg`} alt="" />
              </button>
            ) : (
              <time>{date}</time>
            )}
          </header>

          <div className="cz-letter__body">
            <p className="cz-letter__salutation">{letter.salutation}</p>
            {letter.blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
            <div className="cz-letter__sign">
              <span>{letter.closing}</span>
              <strong>Cozie</strong>
              <img src={`${CZ}/icons/cozie_magic_wand_light.png`} alt="" />
            </div>
          </div>

          {mode === 'arrive' && onAction && (
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
