import { daysUntil, deviceOf, fmtMinutes, pumpSummary, sleepSummary, type DemoAccount } from './account-demo';
import { focusInsight, type FocusId, type Insight } from './focus';
import { guidanceOpener } from './first-guidance';

/* The first "From Cozie" letter, written for the account she has.
 *
 * Its job in onboarding: warmth, the numbers she has quietly built up, one
 * real observation (the "first insight"), what Cozie will keep an eye on,
 * and a P.S. asking for her own sleep (Apple Health) so it can see more.
 * The "first action" lives in the chat: "Talk to Cozie" posts Cozie's
 * follow-up with a few things it can do right away.
 *
 * Text uses a small markup the letter knows how to write out
 * (components/cozy/letter/Ink.tsx):
 *   [[738 sessions]]  a figure stamped onto the paper
 *   **600**           a figure in bold
 *   {pump}            a small drawn icon (pump, bottle, calendar, sun, moon, scale, heart)
 *   __first pump__    underlined by hand
 *   ((35 ml))         circled by hand
 *   blank line        a new paragraph */

export interface FirstLetter {
  stageWeek: number;
  to: string;
  salutation: string;
  /** Age and the figures she has built up. */
  opening: string;
  /** Which direction the observation comes from. */
  insightFocus: FocusId;
  insight: Insight;
  /** "Something I noticed: …" */
  noticed: string;
  emphasis: string;
  closing: string;
  /** Asks for Apple Health. */
  ps: string;
  trust: string;
  /** Cozie's first chat message after "Talk to Cozie": the first actions. */
  firstMessage: { content: string; suggestions: string[] };
}

/** Device trend first (what she can't easily see herself), then a dated
 *  event from the Momcozy app. */
function pickInsight(a: DemoAccount): FocusId {
  if (deviceOf(a, 'monitor')) return 'sleep';
  if (deviceOf(a, 'pump')) return 'lactation';
  return 'growth';
}

const BOTTLE_ML = 120;

function opening(a: DemoAccount): string {
  const baby = a.baby.name;
  const age = `${baby} turned six weeks old this week.`;
  const p = pumpSummary(a);
  if (a.pumping && p) {
    const sessions = a.pumping.reduce((n, d) => n + d.sessions.length, 0);
    const ml = p.perDayMl.reduce((s, x) => s + x, 0);
    const liters = (ml / 1000).toFixed(1);
    const hours = Math.floor((sessions * 20) / 60);
    return `${age}\n\nIn the last seven days your pump logged [[${sessions} sessions]] {pump} and [[${liters} liters]] of milk. That’s about **${Math.round(ml / BOTTLE_ML)}** of ${baby}’s bottles {bottle}, and more than **${hours} hours** {calendar}, many of them before sunrise.`;
  }
  const s = sleepSummary(a);
  if (a.sleep && s) {
    const hours = Math.round(a.sleep.reduce((n, d) => n + d.totalMin, 0) / 60);
    return `${age}\n\nYour monitor kept watch over [[7 nights]] {moon} and [[${hours} hours]] of ${baby}’s sleep. Night wakes went from **${s.wakesWeekAgo}** to **${s.wakesNow}** {calendar}, and every one of them, you were there.`;
  }
  const weighed = a.growth.filter((g) => g.weightKg);
  const birth = weighed[0];
  const latest = weighed[weighed.length - 1];
  const grams = Math.round(((latest.weightKg ?? 0) - (birth.weightKg ?? 0)) * 1000);
  const weeks = Math.round((new Date(latest.date).getTime() - new Date(birth.date).getTime()) / (7 * 86_400_000));
  return `${age}\n\nHis profile shows [[${birth.weightKg} kg]] {scale} at birth and [[${latest.weightKg} kg]] at the last weigh-in. That’s **${grams.toLocaleString('en-US')} grams** {calendar} in ${weeks} weeks, one feed at a time.`;
}

function noticed(a: DemoAccount, focus: FocusId): string {
  const baby = a.baby.name;
  if (focus === 'sleep') {
    const s = sleepSummary(a)!;
    return `Something I noticed: __${baby}’s longest sleep__ {moon} is getting longer. It grew from ${fmtMinutes(s.longestWeekAgo)} to **${fmtMinutes(s.longestNow)}** this week. Many babies start stretching one sleep out around now.`;
  }
  if (focus === 'lactation') {
    const p = pumpSummary(a)!;
    return `Something I noticed: __your 3 a.m. session__ {moon} is your fullest of the day. About **${p.nightMl} ml**, against ${p.avgMl} on average, and you haven’t missed it once this week.`;
  }
  return `Something I noticed: __${baby}’s 2-month check-up__ {calendar} is in **${daysUntil(a.nextCheckup.date)} days**. Next on the list: ${a.nextCheckup.label.toLowerCase()}.`;
}

function ps(a: DemoAccount): string {
  if (deviceOf(a, 'pump')) return 'P.S. Let me see your sleep and I can see a lot more.';
  if (deviceOf(a, 'monitor')) return `P.S. Let me see your sleep too, not just ${a.baby.name}’s, and I can see a lot more.`;
  return 'P.S. Let me see your sleep and steps, and I can see a lot more.';
}

export function buildFirstLetter(a: DemoAccount): FirstLetter {
  const focus = pickInsight(a);

  // The first chat message introduces the guidance card that follows it, so
  // opener and card always speak to the same direction (lib/cozy/first-guidance.ts).
  const firstMessage: FirstLetter['firstMessage'] = guidanceOpener(a);

  return {
    stageWeek: a.baby.weeks,
    to: a.mom.name,
    salutation: `Dear ${a.mom.name},`,
    opening: opening(a),
    insightFocus: focus,
    insight: focusInsight(a, focus)!,
    noticed: noticed(a, focus),
    emphasis: 'You’re doing more than you think.',
    closing: 'With you,',
    ps: ps(a),
    trust: 'I only see what you connect, I remember what you tell me, and you can change either anytime in Settings.',
    firstMessage,
  };
}
