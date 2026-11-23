import { deviceOf, type DemoAccount } from './account-demo';
import { focusInsight, type FocusId, type Insight } from './focus';
import { recommendedForStage } from './recommend';

/* The first "From Cozie" letter, written for the account she has.
 *
 * Its job in onboarding: warmth, one real observation (the "first insight"),
 * and what Cozie will keep an eye on. The "first action" lives in the chat:
 * "Talk to Cozie" posts Cozie's follow-up to the observation with a few
 * things it can do right away.
 *
 * The opening keeps the original letter's voice; only the line about her
 * routine changes with her devices, and it carries no numbers — those belong
 * to the observation, so nothing is said twice. */

export interface FirstLetter {
  stageWeek: number;
  salutation: string;
  opening: string;
  /** Which direction the observation comes from, for its chart. */
  insightFocus: FocusId;
  insight: Insight;
  emphasis: string;
  closing: string;
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

export function buildFirstLetter(a: DemoAccount): FirstLetter {
  const baby = a.baby.name;
  const focus = pickInsight(a);
  const routine = deviceOf(a, 'pump')
    ? 'including the early pumps before sunrise. That’s steady, quiet work, and it adds up.'
    : deviceOf(a, 'monitor')
      ? `and all the times you checked on ${baby} while he slept. That’s steady, quiet care, and it adds up.`
      : 'and every small thing you’ve figured out along the way. That’s steady, quiet work, and it adds up.';

  // The first chat message (and its recommended questions) is stage-aware and
  // lives in one place now (lib/cozy/recommend.ts). For postpartum 1–3 m this
  // is the pump opener, and the pump-plan card follows it.
  const firstMessage: FirstLetter['firstMessage'] = recommendedForStage(a).opener;

  return {
    stageWeek: a.baby.weeks,
    salutation: `Dear ${a.mom.name},`,
    opening: `${baby} turned six weeks old this week. That’s about forty-two days of feeds, and more nights than anyone counted — ${routine} Many babies share their first real smile around now.`,
    insightFocus: focus,
    insight: focusInsight(a, focus)!,
    emphasis: 'You’re doing more than you think.',
    closing: 'With you,',
    firstMessage,
  };
}
