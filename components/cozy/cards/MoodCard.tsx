'use client';

import type { DemoAccount } from '@/lib/cozy/account-demo';
import { pumpSummary } from '@/lib/cozy/first-guidance';
import { StoryCard } from './StoryCard';

/* The feelings direction's first-guidance card. Not a task to save — a gentle
 * invitation. Mood stays off the data on purpose: guessing her state from
 * device times would feel like being watched (lib/cozy/focus.ts). The buttons
 * just open the conversation. */

export function MoodCard({ account, onSend }: { account: DemoAccount; onSend: (text: string) => void }) {
  const baby = account.baby.name;
  const upAtNight = !!pumpSummary(account);

  return (
    <StoryCard tone="yellow" eyebrow="For you" title="How are you, really?" art="mood" className="sc--chat ft">
      <p className="sc__note">
        {upAtNight
          ? `Your pump has you up at 3 a.m. most nights, and that wears on anyone. I’m here for the hard parts too — not just ${baby}.`
          : `The early weeks ask everything of you. I’m here for the hard parts too — not just ${baby}.`}
      </p>
      <div className="ft__actions">
        <button type="button" className="ft__primary" onClick={() => onSend('I just want to talk')}>
          Let’s talk
        </button>
      </div>
      <div className="ft__others">
        <span>Or</span>
        <button type="button" onClick={() => onSend('Help me find a bit of time for me')}>
          Find me a little time
        </button>
      </div>
    </StoryCard>
  );
}
