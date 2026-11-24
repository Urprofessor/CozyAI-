import { daysUntil, deviceOf, fmtMinutes, pumpSummary, sleepSummary, type DemoAccount } from './account-demo';
import type { FocusId } from './focus';

/* The first guidance card Cozie offers after the letter, one per direction
 * (lib/cozy/focus.ts): the pump plan for a pump user, a night-sleep rhythm for
 * a monitor user, and — with no device bound — the check-up checklist (growth),
 * which is the default concern when there's nothing to measure yet. The mood
 * card lands when she narrows the letter's focus to feelings alone. Each card
 * does one concrete thing and remembers that it's done. */

export type GuidanceKind = 'pump-plan' | 'sleep-plan' | 'checkup' | 'mood';

const ALL: GuidanceKind[] = ['pump-plan', 'sleep-plan', 'checkup', 'mood'];

/** The card that lands after the letter. By her devices — and with no device
 *  bound, growth (the check-up) is the default concern, matching the letter's
 *  default tick. If she keeps only feelings ticked in the letter, the mood
 *  card leads instead. */
export function guidanceKind(a: DemoAccount, chosenFocus?: FocusId[]): GuidanceKind {
  if (chosenFocus && chosenFocus.length === 1 && chosenFocus[0] === 'mood') return 'mood';
  if (deviceOf(a, 'pump')) return 'pump-plan';
  if (deviceOf(a, 'monitor')) return 'sleep-plan';
  return 'checkup';
}

/* ---------- Sentinels (system messages in the chat stream) ---------- */

const PREFIX = '__GUIDE__:';
export const guidanceSentinel = (kind: GuidanceKind) => `${PREFIX}${kind}`;
export function guidanceKindOf(content: string): GuidanceKind | null {
  if (!content.startsWith(PREFIX)) return null;
  const kind = content.slice(PREFIX.length) as GuidanceKind;
  return ALL.includes(kind) ? kind : null;
}

/* ---------- Cozie's opener, matched to the landing card ----------
 * The chips shown under the card are written by the model each time
 * (lib/cozy/first-suggest.ts). The three here are the fallback when it can't
 * be reached: questions moms in her situation ask most at this age, picked so
 * the answer can draw on her own data (the chat model gets it via
 * accountContext). */

export function guidanceOpener(
  a: DemoAccount,
  kind: GuidanceKind = guidanceKind(a),
): { content: string; suggestions: string[] } {
  const baby = a.baby.name;
  const weeks = a.baby.weeks;
  switch (kind) {
    case 'pump-plan':
      return {
        content: 'Your 3 a.m. session is doing a lot of work. Let’s set your day around it — I can do it now:',
        suggestions: [
          'Is my milk supply on track?',
          'Can I drop the 3 a.m. pump yet?',
          `How much should ${baby} eat per feed?`,
        ],
      };
    case 'sleep-plan': {
      const s = sleepSummary(a);
      return {
        content: s
          ? `${baby}’s longest stretch is up to ${fmtMinutes(s.longestNow)} now — a good moment to help it land at night. I can set a simple evening rhythm:`
          : `Let’s help ${baby}’s longest stretch land at night. I can set a simple evening rhythm to aim for:`,
        suggestions: [
          `When will ${baby} sleep through the night?`,
          `Why does ${baby} still wake at night?`,
          `What wake windows suit ${weeks} weeks?`,
        ],
      };
    }
    case 'mood':
      return {
        content: `I’m glad you’re here. Before anything about ${baby} — how are you, really? And if it helps, I can find you a small pocket of time for yourself.`,
        suggestions: ['Honestly, I’m exhausted', 'Could this be the baby blues?', 'How do I ask for more help?'],
      };
    case 'checkup':
      return {
        content: `${baby}’s check-up is in ${daysUntil(a.nextCheckup.date)} days. I can put together a short checklist so nothing slips:`,
        suggestions: [
          `Is ${baby} gaining enough weight?`,
          'Which vaccines are next?',
          `What should ${baby} do at ${weeks} weeks?`,
        ],
      };
  }
}

/* ---------- Shared bits for the cards ---------- */

export { pumpSummary, sleepSummary, daysUntil, fmtMinutes };
