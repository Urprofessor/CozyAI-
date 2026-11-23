import { daysUntil, deviceOf, fmtMinutes, pumpSummary, sleepSummary, type DemoAccount } from './account-demo';

/* The first guidance card Cozie offers after the letter, one per direction
 * (lib/cozy/focus.ts): the pump plan for a pump user, a night-sleep rhythm for
 * a monitor user, a gentle check-in when there's no device yet. The check-up
 * checklist (growth) isn't a landing card — it's opened on demand from the
 * "Get ready for the check-up" action on the other cards. Each card does one
 * concrete thing and remembers that it's done. */

export type GuidanceKind = 'pump-plan' | 'sleep-plan' | 'checkup' | 'mood';

const ALL: GuidanceKind[] = ['pump-plan', 'sleep-plan', 'checkup', 'mood'];

/** The card that lands after the letter, by her devices. Growth is reached
 *  from the check-up action, so it's never the landing card. */
export function guidanceKind(a: DemoAccount): GuidanceKind {
  if (deviceOf(a, 'pump')) return 'pump-plan';
  if (deviceOf(a, 'monitor')) return 'sleep-plan';
  return 'mood';
}

/* ---------- Sentinels (system messages in the chat stream) ---------- */

const PREFIX = '__GUIDE__:';
export const guidanceSentinel = (kind: GuidanceKind) => `${PREFIX}${kind}`;
export function guidanceKindOf(content: string): GuidanceKind | null {
  if (!content.startsWith(PREFIX)) return null;
  const kind = content.slice(PREFIX.length) as GuidanceKind;
  return ALL.includes(kind) ? kind : null;
}

/* ---------- Cozie's opener, matched to the landing card ---------- */

export function guidanceOpener(a: DemoAccount): { content: string; suggestions: string[] } {
  const baby = a.baby.name;
  switch (guidanceKind(a)) {
    case 'pump-plan':
      return {
        content: 'Your 3 a.m. session is doing a lot of work. Let’s set your day around it — I can do it now:',
        suggestions: [],
      };
    case 'sleep-plan': {
      const s = sleepSummary(a);
      return {
        content: s
          ? `${baby}’s longest stretch is up to ${fmtMinutes(s.longestNow)} now — a good moment to help it land at night. I can set a simple evening rhythm:`
          : `Let’s help ${baby}’s longest stretch land at night. I can set a simple evening rhythm to aim for:`,
        suggestions: [],
      };
    }
    case 'mood':
      return {
        content: `I’m glad you’re here. Before anything about ${baby} — how are you, really? And if it helps, I can find you a small pocket of time for yourself.`,
        suggestions: ['Honestly, exhausted', 'Up and down'],
      };
    case 'checkup':
      return {
        content: `${baby}’s check-up is in ${daysUntil(a.nextCheckup.date)} days. I can put together a short checklist so nothing slips:`,
        suggestions: [],
      };
  }
}

/* ---------- Shared bits for the cards ---------- */

export { pumpSummary, sleepSummary, daysUntil, fmtMinutes };
