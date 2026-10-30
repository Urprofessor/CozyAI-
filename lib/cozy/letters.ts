// "From Cozie" letters. Content is plain data so the same <CozieLetter> can
// carry the first-run letter now and later, periodic ones.
//
// Demo: the first letter is written for a fixed persona (Clara, Noah at six
// weeks, ~6 pumps a day). What Cozie "knows" is deliberately thin — feeding and
// sleep are left for the conversation the letter invites.

import type { CozyProfile } from './profile';

export type LetterBlock =
  | { kind: 'p'; text: string }
  | { kind: 'emphasis'; text: string }
  | {
      kind: 'milestone';
      /** Left to right; `current` marks where mom and baby are now. */
      stops: Array<{ label: string; current?: boolean }>;
      text: string;
    };

export interface LetterAction {
  id: string;
  label: string;
  /** Cozie's fixed opener once this is tapped (the letter's reply). */
  opener: { content: string; suggestions?: string[] };
  quiet?: boolean; // rendered as a text link rather than a button
}

export interface LetterContent {
  id: string;
  kicker: string; // small line under "From Cozie"
  salutation: string;
  blocks: LetterBlock[];
  closing: string;
  actions: LetterAction[];
}

export const LETTER_CARD = '__LETTER_FROM_COZIE__';

export const FIRST_LETTER: LetterContent = {
  id: 'first',
  kicker: 'Your first letter',
  salutation: 'Dear Clara,',
  blocks: [
    {
      kind: 'p',
      text: "Noah turned six weeks old this week. That's about forty-two days of feeds, and more nights than anyone counted. I've noticed you pump around six times most days — including the ones before sunrise. That's steady, quiet work, and it adds up.",
    },
    {
      kind: 'milestone',
      stops: [{ label: 'Birth' }, { label: 'Week 6', current: true }, { label: 'Week 8' }],
      text: 'Many babies share their first real smile around now. A growth spurt can make feeds feel nonstop for a few days, and some babies start stretching out one longer sleep at night. All very typical for week six.',
    },
    { kind: 'emphasis', text: "You're doing more than you think." },
    {
      kind: 'p',
      text: "I'd love to hear how things really are — how feeding's been going, and how much sleep you're both getting. Whatever you'd like to share.",
    },
  ],
  closing: 'With you,',
  actions: [
    {
      id: 'feeding',
      label: "How feeding's going",
      opener: {
        content:
          "Thank you for wanting to share. Let's start with feeding — right now, is Noah mostly having pumped milk from a bottle, nursing directly, or a mix of both? And how has it been feeling for you lately?",
        suggestions: ['Mostly pumped milk', 'A mix of both'],
      },
    },
    {
      id: 'sleep',
      label: 'Our sleep lately',
      opener: {
        content:
          "I'd love to hear about sleep. What's Noah's longest stretch at night these days — and how much sleep are you managing to get yourself?",
        suggestions: ['About 3 hours', "We're barely sleeping"],
      },
    },
    {
      id: 'later',
      label: 'Maybe later',
      quiet: true,
      opener: {
        content:
          "No rush at all. Your letter is right here whenever you'd like to read it again — and I'm here whenever you feel like talking.",
        suggestions: ["What's typical at 6 weeks?", 'Help me plan pumping'],
      },
    },
  ],
};

/** What the demo persona's letter assumes Cozie already knows. */
export function personaSeed(): Partial<CozyProfile> {
  const born = new Date(Date.now() - 42 * 86_400_000);
  return {
    name: 'Clara',
    baby: { name: 'Noah', birthDate: born.toISOString().slice(0, 10), ageText: '6 weeks' },
    pumping: { note: 'About 6 sessions a day, including early mornings' },
  };
}
