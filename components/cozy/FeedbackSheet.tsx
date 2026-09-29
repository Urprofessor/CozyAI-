'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { BottomSheet, CZ } from './ui';

// Categories and reasons from the App's AssistantFeedbackReason.
const CATEGORIES = [
  { title: 'Issues', reasons: ['Misunderstood', 'Missed context', "Didn't answer the question"] },
  {
    title: 'Answer',
    reasons: [
      'Incorrect facts',
      'Flawed reasoning',
      'Missing information',
      'Gave medical advice',
      'Incorrect calculation',
      'Illegal or harmful content',
    ],
  },
  { title: 'Format', reasons: ['Formatting issue', 'Repeated content', 'Should have included a chart'] },
];

/** App AssistantFeedbackView: opened by thumbs-down; multi-select reasons,
 *  submit enabled once one is picked. Demo-only — nothing is sent. */
export function FeedbackSheet({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reasons: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) setSelected([]);
  }, [open]);

  function toggle(r: string) {
    setSelected((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  }

  return (
    <BottomSheet open={open} onClose={onClose} label="Response feedback" className="cz-feedback">
      <div className="cz-sheet__grabber" />
      <div className="cz-feedback__scroll">
        <h2 className="cz-feedback__title">
          Thanks for helping
          <br />
          make Cozie better.
        </h2>
        <p className="cz-feedback__subtitle">Select all that apply to this response.</p>
        {CATEGORIES.map((c) => (
          <div key={c.title} className="cz-feedback__group">
            <h3>{c.title}</h3>
            {c.reasons.map((r) => {
              const on = selected.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  className={cn('cz-feedback__reason', on && 'is-on')}
                  onClick={() => toggle(r)}
                  aria-pressed={on}
                >
                  <img src={`${CZ}/icons/feedback_${on ? 'checked' : 'unchecked'}.svg`} alt="" />
                  <span>{r}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="cz-feedback__foot">
        <button
          type="button"
          className="cz-primary-btn"
          disabled={!selected.length}
          onClick={() => onSubmit(selected)}
        >
          Submit feedback
        </button>
      </div>
    </BottomSheet>
  );
}
