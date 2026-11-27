'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import { buildFirstLetter } from '@/lib/cozy/first-letter';
import type { FocusId } from '@/lib/cozy/focus';
import { healthInsight } from '@/lib/cozy/health-demo';
import { prefersReducedMotion } from '@/lib/cozy/motion';
import { FocusCards, stampOrder } from './LetterFocus';
import { Ink } from '../letter/Ink';
import { HeartTile, SharpInsight } from '../letter/Health';

/* Body of the first letter. On arrival Cozie writes it in front of her: the
 * greeting by hand, then the opening word by word with its figures stamped
 * on, the observation with a hand underline, the stamps of what Cozie will
 * keep an eye on dropping onto the paper, the closing, the sign-off, and a
 * handwritten P.S. asking for Apple Health. The letter scrolls along as it
 * writes. A tap anywhere shows everything at once; rereading, or "reduce
 * motion", shows it all straight away.
 *
 * When she connects Health, the space under the observation opens and Cozie
 * writes what it can now see, with a small drawn chart. */

type Step = 'salutation' | 'opening' | 'noticed' | 'focus' | 'emphasis' | 'sign' | 'ps' | 'end';
const ORDER: Step[] = ['salutation', 'opening', 'noticed', 'focus', 'emphasis', 'sign', 'ps', 'end'];
const ALL = ORDER.length;

/** Pause after a block before the next one starts. */
const GAP_MS = 260;
/** Stamps drop this far apart (matches .cz-stampcard in CSS). */
const STAMP_GAP_MS = 430;

interface Props {
  account: DemoAccount;
  /** Write it out (first arrival only). */
  animate: boolean;
  /** The sheet has landed: start writing. */
  start: boolean;
  /** Line drawing beside the greeting. */
  art: ReactNode;
  /** "Nov 27", for the stamps' postmarks. */
  date: string;
  chosen: FocusId[];
  onToggleFocus: (id: FocusId) => void;
  onPreviewFocus: (id: FocusId) => void;
  /** Something was stamped onto the paper. */
  onThump?: () => void;
  health: { connected: boolean; onConnect: () => void };
  /** First arrival: into the chat, where Cozie offers a first action. */
  onTalk?: () => void;
  onLater?: () => void;
}

export function FirstLetterBody({
  account,
  animate,
  start,
  art,
  date,
  chosen,
  onToggleFocus,
  onPreviewFocus,
  onThump,
  health,
  onTalk,
  onLater,
}: Props) {
  const letter = useMemo(() => buildFirstLetter(account), [account]);
  const sharp = useMemo(() => healthInsight(account), [account]);
  // -1: waiting for the sheet to land.
  const [step, setStep] = useState(() => (animate && !prefersReducedMotion() ? -1 : ALL));
  const at = (s: Step) => ORDER.indexOf(s);
  const next = (from: Step) => setStep((cur) => (cur === at(from) ? cur + 1 : cur));
  const writing = step < ALL;
  const runs = (s: Step) => step === at(s);
  const past = (s: Step) => step > at(s);

  useEffect(() => {
    if (step === -1 && start) setStep(0);
  }, [step, start]);

  // P.S. in three beats: the line, the sticker, the promise under it.
  const [ps, setPs] = useState(0);

  // Health: connected before this letter opened shows the insight as written.
  const [wasConnected] = useState(health.connected);
  const [sharpDone, setSharpDone] = useState(wasConnected);
  const sharpRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!health.connected || wasConnected) return;
    const el = sharpRef.current;
    if (el) reveal(el, 'top');
  }, [health.connected, wasConnected]);

  // Keep what's being written on screen.
  const refs: Record<Step, RefObject<HTMLDivElement | null>> = {
    salutation: useRef(null),
    opening: useRef(null),
    noticed: useRef(null),
    focus: useRef(null),
    emphasis: useRef(null),
    sign: useRef(null),
    ps: useRef(null),
    end: useRef(null),
  };
  const current = ORDER[step] as Step | undefined;
  useEffect(() => {
    if (!current || step < 2) return;
    const el = refs[current].current;
    if (el) reveal(el, 'bottom');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, step, ps]);

  // Timed steps.
  useEffect(() => {
    if (!current) return;
    let ms = 0;
    const ts: number[] = [];
    if (current === 'focus') {
      // Each stamp lands, then the chosen ones get their postmark.
      const order = stampOrder(account);
      for (let i = 0; i < order.length; i++) {
        ts.push(window.setTimeout(() => onThump?.(), 520 + i * STAMP_GAP_MS));
        if (chosen.includes(order[i])) ts.push(window.setTimeout(() => onThump?.(), 980 + i * STAMP_GAP_MS));
      }
      ms = 680 + 3 * STAMP_GAP_MS + 720;
    } else if (current === 'sign') ms = 520;
    else if (current === 'end') ms = 0;
    else return;
    ts.push(window.setTimeout(() => next(current), ms + GAP_MS));
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // The sticker lands, then the promise is written.
  useEffect(() => {
    if (ps !== 1) return;
    const a = window.setTimeout(() => onThump?.(), 240);
    const b = window.setTimeout(() => setPs(2), 620);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ps]);

  const finishAll = () => {
    setStep(ALL);
    setPs(3);
    setSharpDone(true);
  };

  const ink = (s: Step) => ({
    run: runs(s),
    done: past(s),
    onDone: () => window.setTimeout(() => next(s), GAP_MS),
    onThump,
  });

  return (
    <div className={cn('cz-first', writing && 'is-writing')} onClick={writing ? finishAll : undefined}>
      <div ref={refs.salutation} className="cz-letter__greeting">
        <Ink as="span" hand text={letter.salutation} className="cz-letter__salutation" {...ink('salutation')} />
        {art}
      </div>

      <div ref={refs.opening}>
        <Ink text={letter.opening} className="cz-first__opening" {...ink('opening')} />
      </div>

      <div ref={refs.noticed} className="cz-first__noticed">
        <Ink text={letter.noticed} {...ink('noticed')} />
        {health.connected && (wasConnected ? past('noticed') : true) && (
          <div ref={sharpRef}>
            <SharpInsight insight={sharp} run={!wasConnected} done={sharpDone} onDone={() => setSharpDone(true)} />
          </div>
        )}
      </div>

      <div ref={refs.focus} className={cn('cz-first__block cz-first__focus', (runs('focus') || past('focus')) && 'is-in', past('focus') && 'is-settled')}>
        <p className="cz-first__lead">I’ll keep an eye on these for you:</p>
        <FocusCards account={account} chosen={chosen} date={date} onToggle={onToggleFocus} onPreview={onPreviewFocus} onThump={onThump} />
        <p className="cz-first__hint">Stamp the ones you want me to watch. Tap a stamp to see more.</p>
      </div>

      <div ref={refs.emphasis}>
        <Ink text={letter.emphasis} className="cz-letter__emphasis" {...ink('emphasis')} />
      </div>

      <div ref={refs.sign} className={cn('cz-first__block', (runs('sign') || past('sign')) && 'is-in')}>
        <div className="cz-letter__sign cz-letter__sign--hand">
          <span>{letter.closing}</span>
          <strong>Cozie</strong>
        </div>
      </div>

      <div ref={refs.ps} className="cz-first__ps">
        <Ink
          hand
          text={letter.ps}
          run={runs('ps') && ps === 0}
          done={past('ps') || ps > 0}
          onDone={() => setPs(1)}
          onThump={onThump}
        />
        <div className={cn('cz-sticker-wrap', (ps >= 1 || past('ps')) && 'is-in', ps === 1 && runs('ps') && 'is-stamping')}>
          <button
            type="button"
            className={cn('cz-sticker', health.connected && 'is-done')}
            disabled={health.connected}
            onClick={(e) => {
              e.stopPropagation();
              if (writing) finishAll();
              health.onConnect();
            }}
          >
            <HeartTile />
            <span>{health.connected ? 'Apple Health connected' : 'Connect Apple Health'}</span>
            {health.connected && (
              <i className="cz-sticker__check" aria-hidden>
                <svg viewBox="0 0 16 16">
                  <path d="m3.8 8.4 2.7 2.7 5.7-6" />
                </svg>
              </i>
            )}
          </button>
        </div>
        <Ink
          hand
          text={letter.trust}
          className="cz-first__trust"
          run={runs('ps') && ps === 2}
          done={past('ps') || ps > 2}
          onDone={() => {
            setPs(3);
            window.setTimeout(() => next('ps'), GAP_MS);
          }}
        />
      </div>

      <div ref={refs.end} className={cn('cz-first__block cz-first__end', (runs('end') || past('end')) && 'is-in')}>
        {onTalk && (
          <div className="cz-first__actions">
            <button
              type="button"
              className="cz-letter__btn cz-first__talk"
              onClick={(e) => {
                e.stopPropagation();
                onTalk();
              }}
            >
              Talk to Cozie
            </button>
            {onLater && (
              <button
                type="button"
                className="cz-letter__btn is-quiet"
                onClick={(e) => {
                  e.stopPropagation();
                  onLater();
                }}
              >
                Maybe later
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Scrolls the letter so the block being written is in view: its bottom
 *  while it writes, or its top for something that just opened. */
function reveal(el: HTMLElement, edge: 'top' | 'bottom') {
  const box = el.closest<HTMLElement>('.cz-letter__body');
  if (!box) return;
  const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
  const want =
    edge === 'top' ? top - 120 : Math.min(top - 24, top + el.offsetHeight - box.clientHeight + 48);
  if (edge === 'top' ? Math.abs(want - box.scrollTop) > 8 : want > box.scrollTop + 4) {
    box.scrollTo({ top: Math.max(0, want), behavior: 'smooth' });
  }
}
