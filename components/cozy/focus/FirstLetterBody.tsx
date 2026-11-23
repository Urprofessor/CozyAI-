'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import { buildFirstLetter } from '@/lib/cozy/first-letter';
import { FOCUS_LIST, recommendedFor, type FocusId } from '@/lib/cozy/focus';
import { InsightCard } from './FocusHub';

/* Body of the first letter. On arrival it is "written" in front of her:
 * the greeting and opening type out letter by letter, the observation rises
 * with its chart, the focus tags pop in, the closing line types out, then
 * the sign-off and buttons fade in. Anything below the fold waits until she
 * scrolls to it. A tap anywhere shows everything at once; rereading, or
 * "reduce motion", shows it all straight away. */

type Step = 'salutation' | 'opening' | 'insight' | 'focus' | 'emphasis' | 'sign' | 'end';
const ORDER: Step[] = ['salutation', 'opening', 'insight', 'focus', 'emphasis', 'sign', 'end'];
const ALL = ORDER.length;

/** How long each typed piece takes, whatever its length. */
const TYPE_MS = { salutation: 450, opening: 2600, emphasis: 750 };
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

  // Fade-in steps hand over on a timer once they're on screen.
  useEffect(() => {
    if (!current || !(current in FADE_MS) || !ready) return;
    const t = window.setTimeout(() => next(current), FADE_MS[current as keyof typeof FADE_MS] + GAP_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, ready]);

  const finishAll = () => setStep(ALL);
  const writing = step < ALL;

  return (
    <div className={cn('cz-first', writing && 'is-writing')} onClick={writing ? finishAll : undefined}>
      <div className="cz-letter__greeting">
        <p className="cz-letter__salutation">
          <Typed text={letter.salutation} run={step === at('salutation')} done={step > at('salutation')} ms={TYPE_MS.salutation} onDone={() => next('salutation')} />
        </p>
        {art}
      </div>

      <p className="cz-first__opening">
        <Typed text={letter.opening} run={step === at('opening')} done={step > at('opening')} ms={TYPE_MS.opening} onDone={() => next('opening')} />
      </p>

      <div ref={insightRef} className={cn('cz-first__block', isIn(step, at('insight'), ready) && 'is-in')}>
        {/* Remounted when it appears, so the chart grows in front of her. */}
        <InsightCard key={isIn(step, at('insight'), ready) ? 'in' : 'wait'} account={account} id={letter.insightFocus} eyebrow="I noticed" />
      </div>

      <div ref={focusRef} className={cn('cz-first__block cz-first__focus', isIn(step, at('focus'), ready) && 'is-in')}>
        <p className="cz-first__lead">I’ll keep an eye on these for you:</p>
        <ul className="cz-ftags" aria-label="What Cozie keeps an eye on">
          {[...FOCUS_LIST]
            .sort((a, b) => Number(!!recommendedFor(account, b.id)) - Number(!!recommendedFor(account, a.id)))
            .map((f) => {
              const on = chosen.includes(f.id);
              return (
                <li key={f.id} className={cn('cz-ftag', on && 'is-on')} data-focus={f.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={`Keep an eye on ${f.short}`}
                    className="cz-ftag__check"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFocus(f.id);
                    }}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden>
                      <path d="m3.8 8.4 2.7 2.7 5.7-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="cz-ftag__name"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewFocus(f.id);
                    }}
                  >
                    {f.short}
                    <span aria-hidden>›</span>
                  </button>
                </li>
              );
            })}
        </ul>
        <p className="cz-first__hint">Tap a name to see what Cozie can do there.</p>
      </div>

      <p ref={emphasisRef} className="cz-letter__emphasis cz-first__emphasis">
        <Typed
          text={letter.emphasis}
          run={step === at('emphasis') && ready}
          done={step > at('emphasis')}
          ms={TYPE_MS.emphasis}
          onDone={() => next('emphasis')}
        />
      </p>

      <div ref={signRef} className={cn('cz-first__block', isIn(step, at('sign'), ready) && 'is-in')}>
        <div className="cz-letter__sign">
          <span>{letter.closing}</span>
          <strong>Cozie</strong>
        </div>
        <p className="cz-first__next">{letter.nextLetter}</p>
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

/** Text written out letter by letter. The untyped rest is laid out but
 *  invisible, so nothing below jumps while it types; screen readers get the
 *  whole text at once. */
function Typed({ text, run, done, ms, onDone }: { text: string; run: boolean; done: boolean; ms: number; onDone: () => void }) {
  const [n, setN] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!run) return;
    setN(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const count = Math.min(text.length, Math.ceil(((now - start) / ms) * text.length));
      setN(count);
      if (count < text.length) raf = requestAnimationFrame(tick);
      else window.setTimeout(() => doneRef.current(), GAP_MS);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, text, ms]);

  const count = done ? text.length : run ? n : 0;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, count)}
        {run && count < text.length && <i className="cz-caret" />}
        <span className="cz-typed__rest">{text.slice(count)}</span>
      </span>
    </>
  );
}
