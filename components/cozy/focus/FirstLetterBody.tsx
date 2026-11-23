'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import { buildFirstLetter } from '@/lib/cozy/first-letter';
import type { FocusId } from '@/lib/cozy/focus';
import { InsightStoryCard, insightFigures } from '../cards/StoryCard';
import { InsightMoment } from './InsightMoment';
import { LetterStory } from './LetterStory';
import { storyPages } from '@/lib/cozy/letter-story';
import { useLetterVariant } from '@/lib/cozy/letterVariant';
import { FocusCards } from './LetterFocus';

/* Body of the first letter. On arrival it is "written" in front of her:
 * the greeting and opening appear line by line, the observation rises with
 * its chart, the focus cards rise in, the closing line appears, then
 * the sign-off and buttons fade in. Anything below the fold waits until she
 * scrolls to it. A tap anywhere shows everything at once; rereading, or
 * "reduce motion", shows it all straight away. */

type Step = 'salutation' | 'opening' | 'insight' | 'focus' | 'emphasis' | 'sign' | 'end';
const ORDER: Step[] = ['salutation', 'opening', 'insight', 'focus', 'emphasis', 'sign', 'end'];
const ALL = ORDER.length;

/** Each line starts this long after the one above it. */
const LINE_MS = 300;
/** How long one line takes to fade up. */
const LINE_FADE_MS = 520;
/** The header settles first; then the writing starts. */
const START_DELAY_MS = 650;
/** Pause after a block finishes before the next one starts. */
const GAP_MS = 220;
/** Fade-in blocks hold this long before handing over. */
const FADE_MS = { insight: 950, focus: 520, sign: 420, end: 0 };

interface Props {
  account: DemoAccount;
  /** Play the writing animation (first arrival only). */
  animate: boolean;
  /** Line drawing beside the greeting. */
  art: ReactNode;
  chosen: FocusId[];
  onToggleFocus: (id: FocusId) => void;
  onPreviewFocus: (id: FocusId) => void;
  /** First arrival: into the chat, where Cozie offers a first action. */
  onTalk?: () => void;
  onLater?: () => void;
}

export function FirstLetterBody({ account, animate, art, chosen, onToggleFocus, onPreviewFocus, onTalk, onLater }: Props) {
  const letter = buildFirstLetter(account);
  // -1: waiting for the sheet to settle before the first letter is written.
  const [step, setStep] = useState(() => (animate && !prefersReducedMotion() ? -1 : ALL));
  useEffect(() => {
    if (step !== -1) return;
    const t = window.setTimeout(() => setStep(0), START_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [step]);
  const at = (s: Step) => ORDER.indexOf(s);
  const next = (from: Step) => setStep((cur) => (cur === at(from) ? cur + 1 : cur));

  // Blocks after the opening wait until they're on screen.
  const insightRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const emphasisRef = useRef<HTMLParagraphElement>(null);
  const signRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const refs: Partial<Record<Step, RefObject<HTMLElement | null>>> = {
    insight: insightRef,
    focus: focusRef,
    emphasis: emphasisRef,
    sign: signRef,
    end: endRef,
  };
  const current = ORDER[step] as Step | undefined;
  const ready = useInView(current ? refs[current] : undefined, step < ALL);

  // The observation gets its full-screen moment on first arrival (when it
  // has a number to show); it hands over when the moment has closed in.
  // 'story': the year-in-review pages play first (Story letter style), then
  // the moment; the letter underneath is already fully shown.
  const [moment, setMoment] = useState<'off' | 'story' | 'playing' | 'landed'>('off');
  const momentOn = animate && !!insightFigures(account, letter.insightFocus).hero;
  const variant = useLetterVariant();
  const storyMode = momentOn && variant === 'story' && !prefersReducedMotion();
  const pages = storyPages(account, letter.insightFocus);
  useEffect(() => {
    // The setting is read after mount; switch over before anything is written.
    if (storyMode && moment === 'off' && step <= 0) {
      setStep(ALL);
      setMoment('story');
    }
  }, [storyMode, moment, step]);
  useEffect(() => {
    if (momentOn && current === 'insight' && ready && moment === 'off') setMoment('playing');
  }, [momentOn, current, ready, moment]);

  // Fade-in steps hand over on a timer once they're on screen.
  useEffect(() => {
    if (!current || !(current in FADE_MS) || !ready) return;
    if (current === 'insight' && momentOn) return; // the moment hands over instead
    const t = window.setTimeout(() => next(current), FADE_MS[current as keyof typeof FADE_MS] + GAP_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, ready]);

  const finishAll = () => {
    setStep(ALL);
    setMoment((m) => (m === 'off' ? m : 'landed'));
  };
  const writing = step < ALL;

  return (
    <div className={cn('cz-first', writing && 'is-writing')} onClick={writing ? finishAll : undefined}>
      <div className="cz-letter__greeting">
        <p className="cz-letter__salutation">
          <Lines text={letter.salutation} run={step === at('salutation')} done={step > at('salutation')} onDone={() => next('salutation')} />
        </p>
        {art}
      </div>

      <p className="cz-first__opening">
        <Lines text={letter.opening} run={step === at('opening')} done={step > at('opening')} onDone={() => next('opening')} />
      </p>

      <div
        ref={insightRef}
        className={cn(
          'cz-first__block',
          (moment === 'story' || moment === 'playing') && 'is-holding',
          moment === 'landed' ? 'is-in is-landed' : !momentOn && isIn(step, at('insight'), ready) && 'is-in',
          momentOn && moment !== 'landed' && step > at('insight') && 'is-in',
        )}
      >
        {/* Remounted when it appears, so the trend line draws in front of her. */}
        <InsightStoryCard key={isIn(step, at('insight'), ready) ? 'in' : 'wait'} account={account} id={letter.insightFocus} />
      </div>
      {moment === 'story' && (
        <LetterStory
          pages={pages}
          total={pages.length + 1}
          anchor={() => insightRef.current}
          onDone={() => setMoment('playing')}
          onSkip={() => setMoment('landed')}
        />
      )}
      {moment === 'playing' && (storyMode || step === at('insight')) && (
        <InsightMoment
          account={account}
          id={letter.insightFocus}
          target={() => insightRef.current?.querySelector<HTMLElement>('.sc') ?? null}
          fromStory={storyMode ? { total: pages.length + 1 } : undefined}
          onDone={() => {
            setMoment('landed');
            if (!storyMode) next('insight');
          }}
        />
      )}

      <div ref={focusRef} className={cn('cz-first__block cz-first__focus', isIn(step, at('focus'), ready) && 'is-in')}>
        <p className="cz-first__lead">I’ll keep an eye on these for you:</p>
        <FocusCards account={account} chosen={chosen} onToggle={onToggleFocus} onPreview={onPreviewFocus} />
        <p className="cz-first__hint">
          {account.devices.length > 0 ? 'Ticked to match your Momcozy devices. ' : ''}Tap a card to see what Cozie can do
          there.
        </p>
      </div>

      <p ref={emphasisRef} className="cz-letter__emphasis cz-first__emphasis">
        <Lines
          text={letter.emphasis}
          run={step === at('emphasis') && ready}
          done={step > at('emphasis')}
          onDone={() => next('emphasis')}
        />
      </p>

      <div ref={signRef} className={cn('cz-first__block', isIn(step, at('sign'), ready) && 'is-in')}>
        <div className="cz-letter__sign">
          <span>{letter.closing}</span>
          <strong>Cozie</strong>
        </div>
      </div>

      <div ref={endRef} className={cn('cz-first__block cz-first__end', isIn(step, at('end'), ready) && 'is-in')}>
        <p className="cz-first__source">
          Based on your Momcozy account. Everything Cozie knows is in your memory profile, where you can change it.
        </p>
        {onTalk && (
          <div className="cz-first__actions">
            <button type="button" className="cz-letter__btn cz-letter__connect cz-first__talk" onClick={onTalk}>
              Talk to Cozie
            </button>
            {onLater && (
              <button type="button" className="cz-letter__btn is-quiet" onClick={onLater}>
                Maybe later
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** A block is visible once its step has started and it's on screen, or once
 *  the writing has moved past it. */
function isIn(step: number, index: number, readyNow: boolean) {
  return step > index || (step === index && readyNow);
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** True once the element has been on screen (while `active`). */
function useInView(ref: RefObject<HTMLElement | null> | undefined, active: boolean) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    setInView(false);
    const el = ref?.current;
    if (!active || !el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setInView(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, active]);
  return inView;
}

/** Text that appears line by line as it is laid out: each word knows which
 *  line it landed on, and lines fade up one after another. The text keeps its
 *  place while hidden, so nothing below jumps. */
function Lines({ text, run, done, onDone }: { text: string; run: boolean; done: boolean; onDone: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [lineOf, setLineOf] = useState<number[]>([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const tokens = text.split(/(\s+)/).filter(Boolean);

  // Which line each word sits on, from where it was laid out.
  useLayoutEffect(() => {
    const words = ref.current?.querySelectorAll<HTMLElement>('[data-w]');
    if (!words) return;
    const out: number[] = [];
    let line = -1;
    let top = -Infinity;
    words.forEach((w) => {
      if (w.offsetTop > top + 2) {
        line++;
        top = w.offsetTop;
      }
      out.push(line);
    });
    setLineOf(out);
  }, [text]);

  const lines = lineOf.length ? lineOf[lineOf.length - 1] + 1 : 1;
  useEffect(() => {
    if (!run) return;
    const t = window.setTimeout(() => doneRef.current(), (lines - 1) * LINE_MS + LINE_FADE_MS + GAP_MS);
    return () => window.clearTimeout(t);
  }, [run, lines]);

  let w = -1;
  return (
    <span ref={ref} className={cn('cz-lines', (run || done) && 'is-run', done && 'is-done')}>
      {tokens.map((t, i) => {
        if (/^\s+$/.test(t)) return t;
        w++;
        return (
          <span key={i} data-w="" style={{ '--l': lineOf[w] ?? 0 } as CSSProperties}>
            {t}
          </span>
        );
      })}
    </span>
  );
}
