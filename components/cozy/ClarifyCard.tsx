'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { summarizeAnswers, type ClarifyAnswer, type ClarifyAsk } from '@/lib/cozy/clarify';

export interface ClarifyCardHandle {
  /** Text typed in the input answers the current question ("other"). */
  answerWithText: (text: string) => void;
}

/** Clarifying questions, docked above the input while open. One question at a
 *  time: a single choice moves on by itself, several choices take Next, the
 *  last question takes Submit. Skip leaves a question blank. The answers go
 *  back as one user message (lib/cozy/clarify.ts summarizeAnswers). */
export const ClarifyCard = forwardRef<ClarifyCardHandle, { ask: ClarifyAsk; onSubmit: (summary: string) => void }>(
  function ClarifyCard({ ask, onSubmit }, ref) {
    const qs = ask.questions;
    const [step, setStep] = useState(0);
    // Furthest question reached: the progress bar lets her jump back to any of them.
    const [reached, setReached] = useState(0);
    const [answers, setAnswers] = useState<Record<string, ClarifyAnswer>>({});
    const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => clearTimeout(advanceTimer.current ?? undefined), []);

    const q = qs[step];
    const last = step === qs.length - 1;
    const answer = answers[q.id] ?? { picked: [] };
    const answered = answer.picked.length > 0 || !!answer.typed?.trim();

    function go(to: number) {
      clearTimeout(advanceTimer.current ?? undefined);
      setStep(to);
      setReached((r) => Math.max(r, to));
    }

    function finish(next: Record<string, ClarifyAnswer>) {
      clearTimeout(advanceTimer.current ?? undefined);
      onSubmit(summarizeAnswers(qs, next));
    }

    function pick(option: string) {
      const picked = q.multi
        ? answer.picked.includes(option)
          ? answer.picked.filter((o) => o !== option)
          : [...answer.picked, option]
        : [option];
      setAnswers((a) => ({ ...a, [q.id]: { picked } }));
      // A single choice moves on by itself, after the selection has shown.
      if (!q.multi && !last) {
        clearTimeout(advanceTimer.current ?? undefined);
        advanceTimer.current = setTimeout(() => go(step + 1), 260);
      }
    }

    function skip() {
      const next = { ...answers, [q.id]: { picked: [] } };
      setAnswers(next);
      if (last) finish(next);
      else go(step + 1);
    }

    function primary() {
      if (last) finish(answers);
      else go(step + 1);
    }

    useImperativeHandle(ref, () => ({
      answerWithText(text: string) {
        const next = { ...answers, [q.id]: { picked: [], typed: text.trim() } };
        setAnswers(next);
        if (last) finish(next);
        else go(step + 1);
      },
    }));

    // Single choice before the last question advances on tap; Next only shows
    // when she came back to an answered one.
    const showPrimary = last || q.multi || answered;

    return (
      <section className="cz-clarify" aria-label="Cozie’s questions">
        <header className="cz-clarify__head">
          {step > 0 ? (
            <button type="button" className="cz-clarify__back" onClick={() => go(step - 1)} aria-label="Previous question">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
                <path d="M10 3.5 5.5 8l4.5 4.5" />
              </svg>
            </button>
          ) : null}
          <span className="cz-clarify__count">
            {step + 1} of {qs.length}
          </span>
          {qs.length > 1 && (
            <div className="cz-clarify__progress">
              {qs.map((x, i) => (
                <button
                  key={x.id}
                  type="button"
                  className={cn(i <= step && 'is-on')}
                  disabled={i > reached || i === step}
                  onClick={() => go(i)}
                  aria-label={`Question ${i + 1}`}
                />
              ))}
            </div>
          )}
        </header>

        <div key={q.id} className="cz-clarify__body">
          <h3 className="cz-clarify__title">{q.text}</h3>
          {q.multi && <p className="cz-clarify__hint">Choose all that apply</p>}

          <div className="cz-clarify__options" role={q.multi ? 'group' : 'radiogroup'} aria-label={q.text}>
            {q.options.map((o) => {
              const on = answer.picked.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  role={q.multi ? 'checkbox' : 'radio'}
                  aria-checked={on}
                  className={cn('cz-clarify__opt', on && 'is-on')}
                  onClick={() => pick(o)}
                >
                  <span className={q.multi ? 'cz-clarify__check' : 'cz-clarify__radio'} aria-hidden>
                    {q.multi && (
                      <svg viewBox="0 0 16 16">
                        <path d="M4 8.4 6.8 11 12 5" />
                      </svg>
                    )}
                  </span>
                  <span>{o}</span>
                </button>
              );
            })}
          </div>

          {answer.typed && (
            <p className="cz-clarify__typed">
              You wrote: <em>{answer.typed}</em>
            </p>
          )}
        </div>

        <footer className="cz-clarify__foot">
          <button type="button" className="cz-clarify__skip" onClick={skip}>
            Skip
          </button>
          {showPrimary && (
            <button
              type="button"
              className="cz-clarify__primary"
              onClick={primary}
              disabled={!answered}
            >
              {last ? 'Submit' : 'Next'}
            </button>
          )}
        </footer>
      </section>
    );
  }
);
