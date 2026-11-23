import { daysUntil, deviceOf, pumpSummary, type DemoAccount } from './account-demo';
import type { FocusId } from './focus';
import type { CardTone } from './story-card';
import type { IllustrationTopic } from './illustrations';

/* The "story" way of opening the first letter: a few full-screen pages in the
 * spirit of a year-in-review, one fact each, before the letter. The last page
 * is always the letter's "I noticed" (played by InsightMoment, which settles
 * into its card), so it is not listed here.
 *
 * Every number comes from the account as it is — the last 7 days of device
 * data and the growth log. Nothing is extrapolated to the whole six weeks. */

export interface StoryPage {
  id: string;
  tone: CardTone | 'night';
  eyebrow?: string;
  /** The big line: a number, a date or a short title. */
  big: string;
  title?: string;
  sub?: string;
  /** One warm line under the facts. */
  line?: string;
  art?: IllustrationTopic;
}

/** "03:10" → "3:10 a.m." */
const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`;
};

const fmtDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function storyPages(a: DemoAccount, insightFocus: FocusId): StoryPage[] {
  const baby = a.baby.name;
  const today = new Date().toISOString().slice(0, 10);
  const pages: StoryPage[] = [
    {
      id: 'cover',
      tone: 'cream',
      eyebrow: 'From Cozie',
      big: `${baby}’s first six weeks`,
      sub: `${fmtDay(a.baby.birthDate)} – ${fmtDay(today)}`,
      art: 'mood',
    },
    {
      id: 'arrival',
      tone: 'pink',
      eyebrow: 'The day it all began',
      big: fmtDay(a.baby.birthDate),
      title: `${baby} arrived.`,
      line: `Forty-two days later, here you both are — with more nights behind you than anyone counted.`,
    },
  ];

  const p = pumpSummary(a);
  if (p && a.pumping) {
    const sessions = a.pumping.reduce((n, d) => n + d.sessions.length, 0);
    const liters = p.perDayMl.reduce((s, ml) => s + ml, 0) / 1000;
    pages.push({
      id: 'pump-week',
      tone: 'pink',
      eyebrow: `This week, from your ${deviceOf(a, 'pump')!.name.replace('Momcozy ', '')}`,
      big: `${sessions} sessions`,
      sub: `About ${liters.toFixed(1)} liters — roughly ${Math.round((liters * 1000) / 120)} bottles of 120 ml`,
      line: 'Steady, quiet work. It adds up.',
      art: 'lactation',
    });
    // The 3 a.m. page, unless the letter's insight already tells it.
    if (insightFocus !== 'lactation') {
      const earliest = a.pumping.flatMap((d) => d.sessions.map((x) => x.time)).sort()[0];
      pages.push({
        id: 'night',
        tone: 'night',
        eyebrow: p.nightsPumped >= 7 ? 'Every night this week' : `${p.nightsPumped} nights this week`,
        big: clock(earliest),
        line: 'The house was asleep. You weren’t.',
      });
    }
  }

  if (insightFocus !== 'growth') {
    const weights = a.growth.flatMap((g) => (g.weightKg ? [g.weightKg] : []));
    pages.push({
      id: 'growth',
      tone: 'green',
      eyebrow: `${baby} is growing`,
      big: `${weights[0]} → ${weights[weights.length - 1]} kg`,
      sub: `His 2-month check-up is in ${daysUntil(a.nextCheckup.date)} days`,
      line: 'Small, steady gains, week by week.',
      art: 'growth',
    });
  }
  return pages;
}
