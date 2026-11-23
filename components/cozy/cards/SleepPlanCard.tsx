'use client';

import { useState } from 'react';
import { deviceOf, type DemoAccount } from '@/lib/cozy/account-demo';
import { fmtMinutes, sleepSummary } from '@/lib/cozy/first-guidance';
import { showToast } from '../ui';
import { StoryCard } from './StoryCard';

/* The sleep direction's first-guidance card: help the longest stretch land at
 * night with a simple evening rhythm, worked out from her BM04 monitor. Saved
 * state is remembered so it stays done after a reload. */

const SAVED_KEY = 'cozySleepPlan';

export function SleepPlanCard({ account, onCheckup }: { account: DemoAccount; onCheckup: () => void }) {
  const [saved, setSaved] = useState(() => {
    try {
      return localStorage.getItem(SAVED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const s = sleepSummary(account);
  const baby = account.baby.name;
  const monitor = deviceOf(account, 'monitor')?.name.replace('Momcozy ', '');

  const steps = [
    'Keep the hour before the last feed calm and dim — low lights, quiet, slow.',
    'Make that last evening feed the fullest, so the long stretch starts at bedtime.',
    `Handle night wakings dark and low-key — quick, no play — so ${baby} learns night from day.`,
  ];

  function save() {
    if (saved) return;
    try {
      localStorage.setItem(SAVED_KEY, '1');
    } catch {
      /* private mode */
    }
    setSaved(true);
    showToast('Saved to your sleep rhythm.');
  }

  if (saved) {
    return (
      <StoryCard tone="lavender" eyebrow="Done" title="Your evening rhythm is set" art="sleep" className="sc--chat ft">
        <p className="ft__done">
          <span aria-hidden>✓</span> Saved — I’ll help you hold it, and nudge gently if the nights slip.
        </p>
      </StoryCard>
    );
  }

  return (
    <StoryCard
      tone="lavender"
      eyebrow="Let’s do one thing"
      title={`Help ${baby}’s long sleep land at night`}
      art="sleep"
      source={s && monitor ? `Built from your ${monitor} monitor · last 7 days` : undefined}
      className="sc--chat ft"
    >
      <p className="sc__note">
        {s
          ? `His longest stretch is already up to ${fmtMinutes(s.longestNow)}. Let’s aim it at night with a simple rhythm:`
          : 'Let’s aim his longest stretch at night with a simple rhythm:'}
      </p>
      <ol className="sc__panel sc__steps">
        {steps.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      <div className="ft__actions">
        <button type="button" className="ft__primary" onClick={save}>
          Save this rhythm
        </button>
      </div>
      <div className="ft__others">
        <span>Or</span>
        <button type="button" onClick={onCheckup}>
          Get ready for the check-up
        </button>
      </div>
    </StoryCard>
  );
}
