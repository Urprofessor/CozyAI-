'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { StageTaskSpec, TaskBody } from '@/lib/cozy/recommend';
import { showToast } from '../ui';
import { StoryCard } from './StoryCard';

/* The main task card for every stage except postpartum 1–3 m (that one is the
 * data-driven FirstTaskCard). One card, driven by the StageTaskSpec in
 * lib/cozy/recommend.ts: Cozie offers to do one thing — set out the red lines,
 * translate a report, pack a bag, turn on quick-logging, lay out milestones,
 * plan a step-down — and saving it closes the loop. Saved state is remembered
 * per kind so it stays done after a reload, like the pump-plan card. */

const savedKey = (kind: string) => `cozyStageTask:${kind}`;

export function StageTaskCard({ spec }: { spec: StageTaskSpec }) {
  const [saved, setSaved] = useState(() => {
    try {
      return localStorage.getItem(savedKey(spec.kind)) === '1';
    } catch {
      return false;
    }
  });

  function save() {
    if (saved) return;
    try {
      localStorage.setItem(savedKey(spec.kind), '1');
    } catch {
      /* private mode — still flips for this view */
    }
    setSaved(true);
    showToast(spec.primary.toast);
  }

  if (saved) {
    return (
      <StoryCard tone={spec.tone} eyebrow="Done" title={spec.primary.savedTitle} art={spec.art} className="sc--chat ft">
        <p className="ft__done">
          <span aria-hidden>✓</span> {spec.primary.savedNote}
        </p>
        {/* A translation is the payoff itself, so reveal it in the done state. */}
        {spec.body.kind === 'translate' && <TaskBodyView body={spec.body} revealed />}
      </StoryCard>
    );
  }

  return (
    <StoryCard tone={spec.tone} eyebrow={spec.eyebrow} title={spec.title} art={spec.art} className="sc--chat ft">
      <p className="sc__note">{spec.intro}</p>
      <TaskBodyView body={spec.body} revealed={spec.body.kind !== 'translate'} />
      {spec.note && <p className="ft__foot">{spec.note}</p>}
      <div className="ft__actions">
        <button type="button" className="ft__primary" onClick={save}>
          {spec.primary.label}
        </button>
      </div>
    </StoryCard>
  );
}

function TaskBodyView({ body, revealed }: { body: TaskBody; revealed: boolean }) {
  if (body.kind === 'sections') {
    return (
      <div className="sc__panel ft__sections">
        {body.sections.map((s) => (
          <div key={s.heading} className={cn('ft__section', s.tone === 'alert' && 'ft__section--alert')}>
            <p className="ft__section-head">{s.heading}</p>
            <ul className="ft__section-list">
              {s.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }
  if (body.kind === 'steps') {
    return (
      <ol className="sc__panel ft__steps">
        {body.items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ol>
    );
  }
  return (
    <ul className={cn('sc__panel ft__translate', !revealed && 'is-folded')}>
      {body.pairs.map(([term, plain]) => (
        <li key={term}>
          <code>{term}</code>
          {revealed && <span>{plain}</span>}
        </li>
      ))}
    </ul>
  );
}
