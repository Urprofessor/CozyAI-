import {
  daysUntil,
  deviceOf,
  fmtMinutes,
  pumpSummary,
  sleepSummary,
  type DemoAccount,
} from './account-demo';

/* The four directions mom can pick at the end of the first letter. Each opens
 * a hub page (components/cozy/focus/FocusHub.tsx) that shows what Cozie
 * already knows for that direction, what it noticed, questions to start with
 * and what would make answers sharper — and from there, the chat.
 *
 * Helpers follow the product's agents: lactation, sleep, CareLog (health &
 * growth log, under every direction) and companion chat. */

const nights = (n: number) => (n >= 7 ? 'every night this week' : `${n} of the last 7 nights`);

export type FocusId = 'lactation' | 'sleep' | 'growth' | 'mood';

export interface FocusDef {
  id: FocusId;
  title: string;
  /** One-line name for the letter card. */
  short: string;
  /** What Cozie can do here, listed on the letter card. */
  can: string[];
  /** Which of Cozie's helpers this brings. */
  helpers: string;
}

export const FOCUS_LIST: FocusDef[] = [
  {
    id: 'lactation',
    title: 'Pumping & breastfeeding',
    short: 'Pumping',
    can: ['Smart pumping schedule', 'AI lactation plan', 'Expert answers, day or night'],
    helpers: 'Lactation coach · CareLog',
  },
  {
    id: 'sleep',
    title: 'Sleep',
    short: 'Sleep',
    can: ['Sleep patterns from your monitor', 'Nap and bedtime rhythm', 'Help with night wakings'],
    helpers: 'Sleep coach · CareLog',
  },
  {
    id: 'growth',
    title: 'Health & growth log',
    short: 'Growth log',
    can: ['Weight and length in one log', 'Check-up and vaccine reminders', 'Reads reports you upload'],
    helpers: 'CareLog',
  },
  {
    id: 'mood',
    title: 'How you’re feeling',
    short: 'Feelings',
    can: ['Talk anytime, no judgment', 'Gentle mood check-ins', 'Small ideas for time for you'],
    helpers: 'Companion · CareLog',
  },
];

export const focusDef = (id: FocusId) => FOCUS_LIST.find((f) => f.id === id)!;

/** Directions that match her devices, shown first with a "For your …" tag. */
export function recommendedFor(a: DemoAccount, id: FocusId): string | null {
  if (id === 'lactation' && deviceOf(a, 'pump')) return 'For your M5 pump';
  if (id === 'sleep' && deviceOf(a, 'monitor')) return 'For your BM04 monitor';
  // No device: nothing to measure yet, so the growth log (the coming
  // check-up) is where to start — the same as the letter's own insight.
  if (id === 'growth' && !a.devices.length) return 'A good place to start';
  return null;
}

/** Ticked to begin with: whatever matches her devices (the growth log
 *  without any). She can change it on the letter. */
export function defaultFocus(a: DemoAccount): FocusId[] {
  return FOCUS_LIST.filter((f) => recommendedFor(a, f.id)).map((f) => f.id);
}

const CHOSEN_KEY = 'cozyFocus';

/** Remember what she picked, so later chats lean that way. */
export function saveChosenFocus(ids: FocusId[]) {
  try {
    localStorage.setItem(CHOSEN_KEY, JSON.stringify(ids));
  } catch {
    /* private mode: only this visit knows */
  }
}

export function chosenFocusContext(): string {
  try {
    const ids = JSON.parse(localStorage.getItem(CHOSEN_KEY) ?? '[]') as FocusId[];
    const titles = ids.map((id) => FOCUS_LIST.find((f) => f.id === id)?.title).filter(Boolean);
    return titles.length ? `She asked Cozie to focus on: ${titles.join(', ')}.` : '';
  } catch {
    return '';
  }
}

/** Third line on the letter card: where Cozie's knowledge comes from, and
 *  one plain sentence of it. Feelings stays general on purpose — guessing her
 *  mood from device times on a first screen would feel like being watched. */
export function cardSummary(a: DemoAccount, id: FocusId): { source: string; text: string } {
  const p = pumpSummary(a);
  const s = sleepSummary(a);
  const baby = a.baby.name;
  switch (id) {
    case 'lactation':
      return p
        ? { source: 'M5 pump', text: `About ${Math.round(p.perDay)} sessions a day, fullest at 3 a.m.` }
        : { source: 'No pump paired', text: 'Works from what you tell Cozie, too.' };
    case 'sleep':
      return s
        ? { source: 'BM04 monitor', text: `Longest stretch now ${fmtMinutes(s.longestNow)}.` }
        : { source: 'No monitor paired', text: `Tell Cozie about ${baby}’s nights to start.` };
    case 'growth':
      return {
        source: 'Momcozy app',
        text: `${a.growth[a.growth.length - 1].weightKg} kg now, check-up in ${daysUntil(a.nextCheckup.date)} days.`,
      };
    case 'mood':
      return { source: 'Just for you', text: 'Private, and here whenever you need it.' };
  }
}

export interface Insight {
  /** Short headline, e.g. "Your 3 a.m. session is your fullest". */
  title: string;
  text: string;
  source: string;
}

/** What Cozie noticed. Observations only — never a diagnosis. */
export function focusInsight(a: DemoAccount, id: FocusId): Insight | null {
  const p = pumpSummary(a);
  const s = sleepSummary(a);
  const baby = a.baby.name;
  if (id === 'lactation' && p) {
    return {
      title: 'Your 3 a.m. session is your fullest',
      text: `About ${p.nightMl} ml, compared with ${p.avgMl} ml on average — and you haven’t missed it once this week. Your daily total went from ${p.firstDayMl} ml to ${p.lastDayMl} ml.`,
      source: deviceOf(a, 'pump')!.name,
    };
  }
  if (id === 'sleep' && s) {
    return {
      title: `${baby}’s longest sleep is getting longer`,
      text: `It grew from ${fmtMinutes(s.longestWeekAgo)} to ${fmtMinutes(s.longestNow)} this week, and night wakes dropped from ${s.wakesWeekAgo} to ${s.wakesNow}. Many babies start stretching one sleep out around six weeks.`,
      source: deviceOf(a, 'monitor')!.name,
    };
  }
  if (id === 'growth') {
    const [birth, , latest] = a.growth;
    return {
      title: `${baby}’s 2-month check-up is in ${daysUntil(a.nextCheckup.date)} days`,
      text: `He’s gone from ${birth.weightKg} kg at birth to ${latest.weightKg} kg at the last weigh-in. Next on the list: ${a.nextCheckup.label.toLowerCase()}.`,
      source: 'Noah’s profile in the Momcozy app',
    };
  }
  if (id === 'mood' && p) {
    return {
      title: 'You’ve been up at 3 a.m. most nights',
      text: `Your pump logged a 3 a.m. session ${nights(p.nightsPumped)}. That’s a lot of broken sleep — how you’re doing matters too.`,
      source: deviceOf(a, 'pump')!.name,
    };
  }
  return null;
}

/** Questions to start with; tapping one sends it in the chat. */
export function focusQuestions(a: DemoAccount, id: FocusId): string[] {
  const baby = a.baby.name;
  switch (id) {
    case 'lactation':
      return [
        'Is my milk supply on track?',
        pumpSummary(a) ? 'Can I drop the 3 a.m. session?' : 'How often should I feed or pump at six weeks?',
        'Help me plan pumping for going back to work',
      ];
    case 'sleep':
      return [
        `Is ${baby} waking up too often at night?`,
        'How do I make the long stretch happen at night?',
        'What does a six-week nap rhythm look like?',
      ];
    case 'growth':
      return [
        `Is ${baby} gaining weight well?`,
        'What happens at the 2-month check-up?',
        'Which vaccines are coming up?',
      ];
    case 'mood':
      return ['I’m exhausted and need to vent', 'Is it normal to feel this low?', 'Help me find a bit of time for me'];
  }
}

export interface SharperAsk {
  id: 'file' | 'ai' | 'health';
  title: string;
  /** What she gets for it. */
  gain: string;
}

/** What would make answers in this direction sharper. */
export function focusAsks(a: DemoAccount, id: FocusId): SharperAsk[] {
  const baby = a.baby.name;
  switch (id) {
    case 'lactation':
      return [
        { id: 'file', title: 'Add a feeding or pumping log', gain: 'Cozie can tell a growth spurt from a supply dip.' },
        { id: 'ai', title: 'Bring what your AI knows', gain: 'Pick up from chats about feeding you’ve already had.' },
      ];
    case 'sleep':
      return [
        {
          id: 'file',
          title: 'Add a sleep tracker export',
          gain: `Cozie can compare ${baby}’s naps with his nights — Huckleberry and others work.`,
        },
        { id: 'health', title: 'Share your own sleep', gain: 'Plan around the rest you’re actually getting.' },
      ];
    case 'growth':
      return [
        { id: 'file', title: 'Add a check-up report', gain: 'A PDF or a photo — Cozie keeps the numbers in one log.' },
        { id: 'ai', title: 'Bring what your AI knows', gain: 'Anything you’ve already discussed about his health.' },
      ];
    case 'mood':
      return [
        { id: 'ai', title: 'Bring what your AI knows', gain: 'So you don’t have to tell your story twice.' },
        { id: 'health', title: 'Share your own sleep', gain: 'Cozie can notice when the nights are wearing you down.' },
      ];
  }
}

/** Cozie's first message when mom moves from a hub into the chat. */
export function focusOpener(a: DemoAccount, id: FocusId): { content: string; suggestions: string[] } {
  const p = pumpSummary(a);
  const s = sleepSummary(a);
  const baby = a.baby.name;
  switch (id) {
    case 'lactation':
      return {
        content: p
          ? `Let’s talk pumping. Your M5 shows about ${Math.round(p.perDay)} sessions a day at around ${p.avgMl} ml, with 3 a.m. as your fullest. What would help most right now — more milk, fewer sessions, or fitting pumping around sleep?`
          : `Let’s talk feeding. Is ${baby} mostly nursing, having pumped milk, or a mix? Tell me what’s on your mind and we’ll start there.`,
        suggestions: p ? ['More milk', 'Fewer sessions'] : ['Mostly nursing', 'A mix of both'],
      };
    case 'sleep':
      return {
        content: s
          ? `Let’s talk sleep. Your BM04 shows ${baby}’s longest stretch is up to ${fmtMinutes(s.longestNow)} — good timing for six weeks. Is that stretch happening at night, or during the day?`
          : `Let’s talk sleep. What’s ${baby}’s longest stretch these days, and how much sleep are you getting yourself?`,
        suggestions: s ? ['Mostly at night', 'Often in the day'] : ['About 3 hours', 'We’re barely sleeping'],
      };
    case 'growth':
      return {
        content: `Here’s ${baby}’s log so far: ${a.growth.map((g) => `${g.label.toLowerCase()} ${g.weightKg} kg`).join(', ')}. His 2-month check-up is in ${daysUntil(a.nextCheckup.date)} days. Want me to help you get ready for it, or is something on your mind about his growth?`,
        suggestions: ['Get ready for the check-up', 'Is he gaining well?'],
      };
    case 'mood':
      return {
        content: p
          ? `I’m glad you’re here. Your pump has you up at 3 a.m. most nights, and that wears on anyone. How are you, really — not Noah, you?`
          : 'I’m glad you’re here. How are you, really — not the baby, you?',
        suggestions: ['Honestly, exhausted', 'Up and down'],
      };
  }
}
