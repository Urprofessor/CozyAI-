'use client';

import { useState } from 'react';
import type { DemoAccount } from '@/lib/cozy/account-demo';
import { daysUntil } from '@/lib/cozy/first-guidance';
import { showToast } from '../ui';
import { StoryCard } from './StoryCard';

/* The growth direction's first-guidance card: a short, saveable checklist so
 * nothing slips at the next check-up. Opened from the "Get ready for the
 * check-up" action on the other cards (it isn't a landing card). */

const SAVED_KEY = 'cozyCheckupList';

export function CheckupCard({ account }: { account: DemoAccount }) {
  const [saved, setSaved] = useState(() => {
    try {
      return localStorage.getItem(SAVED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const baby = account.baby.name;
  const days = daysUntil(account.nextCheckup.date);

  const items = [
    'Bring your ID, records and any reports',
    'Ask about weight and length percentiles',
    'Ask which vaccines are due today',
    `Note how ${baby} is feeding and sleeping this week`,
  ];

  function save() {
    if (saved) return;
    try {
      localStorage.setItem(SAVED_KEY, '1');
    } catch {
      /* private mode */
    }
    setSaved(true);
    showToast('Saved to your check-up list.');
  }

  if (saved) {
    return (
      <StoryCard tone="green" eyebrow="Done" title="Your check-up list is ready" art="checklist" className="sc--chat ft">
        <p className="ft__done">
          <span aria-hidden>✓</span> Saved — {account.nextCheckup.label} in {days} days. I’ll remind you the day before.
        </p>
      </StoryCard>
    );
  }

  return (
    <StoryCard
      tone="green"
      eyebrow="Coming up"
      title={`Get ready for ${baby}’s check-up`}
      art="checklist"
      source={`${account.nextCheckup.label} · in ${days} days`}
      className="sc--chat ft"
    >
      <p className="sc__note">A short list so nothing slips on the day:</p>
      <ul className="sc__panel sc__list sc__list--check">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <div className="ft__actions">
        <button type="button" className="ft__primary" onClick={save}>
          Save this checklist
        </button>
      </div>
    </StoryCard>
  );
}
