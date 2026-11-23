import { daysUntil, deviceOf, type DemoAccount } from './account-demo';
import { focusInsight, type FocusId, type Insight } from './focus';
import { hasFirstTask } from './first-task';

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

  const checkup = `${new Date(`${a.nextCheckup.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  const hasPump = !!deviceOf(a, 'pump');

  // With a pump, the first message is one line: the first-task card that
  // follows it holds the main action (plan her pumping) and the quieter ones.
  const firstMessage: FirstLetter['firstMessage'] = hasFirstTask(a)
    ? {
        content:
          focus === 'sleep'
            ? `${baby}’s long stretch is getting longer — a good moment to set your pumping around it. I can do it now:`
            : 'Your 3 a.m. session is doing a lot of work. Let’s set your day around it — I can do it now:',
        suggestions: [],
      }
    : focus === 'sleep'
      ? {
          content: `Since ${baby}’s long stretch is growing, want help making it land at night? I can also get you ready for his ${checkup} check-up${hasPump ? ', or look over your pumping week' : ''}.`,
          suggestions: [
            `Help ${baby}’s long sleep land at night`,
            'Make my check-up checklist',
            ...(hasPump ? ['Review my pumping week'] : []),
          ],
        }
      : focus === 'lactation'
        ? {
            content: `Your 3 a.m. session is doing a lot of work. Want me to look at whether it could shift later or get shorter? I can also get you ready for ${baby}’s ${checkup} check-up.`,
            suggestions: ['Review my pumping week', 'Can I drop the 3 a.m. pump?', 'Make my check-up checklist'],
          }
        : {
            content: `${baby}’s 2-month check-up is on ${checkup}, ${daysUntil(a.nextCheckup.date)} days from now. Want a short checklist so nothing slips? I can also tell you what’s typical at six weeks.`,
            suggestions: ['Make my check-up checklist', 'What’s typical at six weeks?', 'I just want to talk'],
          };

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
