'use client';

import { useState } from 'react';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import { clock12, proposePumpPlan } from '@/lib/cozy/first-task';
import { NextStepsOffer, NextStepsPanel } from './NextSteps';
import { StoryCard } from './StoryCard';

/* The first task Cozie finishes with mom, in one card that moves on as she
 * goes (lib/cozy/first-task.ts):
 *   offer  → one main action, two quieter ones
 *   plan   → tomorrow's pumping, worked out from her own M5 sessions
 *   saved  → in her lactation plan, with what comes tomorrow and on day 3
 *            (lib/cozy/next-steps.ts)
 * Saving is what closes the loop; the card shows it's done whenever the
 * plan exists, even after a reload. */

type Stage = 'offer' | 'plan';

interface Props {
  account: DemoAccount;
  /** She already has a lactation plan (saved here or elsewhere). */
  saved: boolean;
  onSave: () => void;
  /** Send one of the quieter options as her message. */
  onSend: (text: string) => void;
  /** Open the check-up checklist card (growth direction). */
  onCheckup: () => void;
}

export function FirstTaskCard({ account, saved, onSave, onSend, onCheckup }: Props) {
  const [stage, setStage] = useState<Stage>('offer');
  const plan = proposePumpPlan(account);
  if (!plan) return null;
  const baby = account.baby.name;
  const fmt = clock12;

  if (saved) {
    return (
      <StoryCard tone="pink" eyebrow="Done" title="Your pumping plan is set" art="lactation" className="sc--chat ft">
        <p className="ft__done">
          <span aria-hidden>✓</span> Saved to your lactation plan · {plan.times.length} sessions a day
        </p>
        <NextStepsPanel account={account} kind="pump-plan" />
      </StoryCard>
    );
  }

  if (stage === 'plan') {
    return (
      <StoryCard
        tone="pink"
        eyebrow="Your pumping plan"
        title={`${plan.times.length} sessions, around ${baby}’s sleep`}
        art="lactation"
        source={`Built from your ${account.devices.find((d) => d.kind === 'pump')?.name.replace('Momcozy ', '')} sessions this week`}
        className="sc--chat ft"
      >
        <ol className="sc__panel ft__times">
          {plan.times.map((t) => (
            <li key={t}>
              <time>{fmt(t)}</time>
              {plan.tags[t] && <em>{plan.tags[t]}</em>}
              <span>{plan.durationMin} min</span>
            </li>
          ))}
        </ol>
        <ul className="ft__notes">
          {plan.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <NextStepsOffer account={account} kind="pump-plan" />
        <div className="ft__actions">
          <button type="button" className="ft__primary" onClick={onSave}>
            Save this plan
          </button>
          <button type="button" className="ft__quiet" onClick={() => onSend('Can we change some of the times?')}>
            Change a time
          </button>
        </div>
      </StoryCard>
    );
  }

  return (
    <StoryCard tone="pink" eyebrow="Let’s do one thing" title={`Plan my pumping around ${baby}’s sleep`} art="lactation" className="sc--chat ft">
      <p className="sc__note">
        I’ll set your day from your M5 sessions this week and {baby}’s sleep. It takes a few seconds, and you can change
        anything.
      </p>
      <div className="ft__actions">
        <button type="button" className="ft__primary" onClick={() => setStage('plan')}>
          Plan my pumping
        </button>
      </div>
      <div className="ft__others">
        <span>Or</span>
        <button type="button" onClick={onCheckup}>
          Make my check-up checklist
        </button>
        <button type="button" onClick={() => onSend('I just want to talk')}>
          Just talk
        </button>
      </div>
    </StoryCard>
  );
}
