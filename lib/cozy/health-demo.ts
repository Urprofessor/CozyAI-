import { deviceOf, pumpSummary, sleepSummary, type DemoAccount } from './account-demo';

/* Apple Health, as the first letter's P.S. asks for it. Demo only: her own
 * sleep (and steps) for the same seven days as the account, made to line up
 * with what the account already holds, so the letter can say what it now
 * sees. Nothing here leaves the page. */

export const HEALTH_KEY = 'cozyHealthConnected';

export function readHealthConnected(): boolean {
  try {
    return localStorage.getItem(HEALTH_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveHealthConnected() {
  try {
    localStorage.setItem(HEALTH_KEY, '1');
  } catch {
    /* private mode: only this visit knows */
  }
}

export interface HealthSeries {
  label: string;
  color: string;
  values: number[];
}

export interface HealthInsight {
  /** Handwritten in the letter. ((x)) is circled. */
  text: string;
  series: [HealthSeries, HealthSeries];
  /** First and last day under the chart, e.g. "Thu" and "Wed". */
  days: [string, string];
  /** What was read, flown in before the insight is written. */
  sources: { kind: 'sleep' | 'steps' | 'heart'; label: string }[];
}

const wobble = (seed: number) => ((Math.sin(seed * 78.233) * 43758.5453) % 1 + 1) % 1;
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
const weekday = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });

/** Rank of each value, 0 for the smallest. */
function ranks(xs: number[]) {
  const sorted = [...xs].sort((a, b) => a - b);
  return xs.map((x) => sorted.indexOf(x));
}

const SOURCES: HealthInsight['sources'] = [
  { kind: 'sleep', label: 'Sleep · 7 nights' },
  { kind: 'steps', label: 'Steps · 7 days' },
  { kind: 'heart', label: 'Heart rate · 7 days' },
];

export function healthInsight(a: DemoAccount): HealthInsight {
  const baby = a.baby.name;

  // Pump: how much she pumps in a day against how long she slept the night before.
  const p = pumpSummary(a);
  if (a.pumping && p && deviceOf(a, 'pump')) {
    const daily = p.perDayMl;
    const sleepMin = ranks(daily).map((r, i) => 300 + r * 20 + Math.round(wobble(i) * 8));
    const long = daily.filter((_, i) => sleepMin[i] >= 360);
    const short = daily.filter((_, i) => sleepMin[i] < 360);
    const diff = Math.max(10, Math.round((avg(long) - avg(short)) / 10) * 10);
    return {
      text: `Now I can see why. After nights you sleep 6 hours or more, you pump about ((${diff} ml)) more the next day than after your short ones.`,
      series: [
        { label: 'your sleep', color: '#6b5bc4', values: sleepMin },
        { label: 'milk that day', color: '#8e0e33', values: daily },
      ],
      days: [weekday(a.pumping[0].date), weekday(a.pumping[a.pumping.length - 1].date)],
      sources: SOURCES,
    };
  }

  // Monitor: her sleep follows his longest stretch.
  const s = sleepSummary(a);
  if (a.sleep && s) {
    const mine = a.sleep.map((d, i) => Math.round(250 + (d.longestMin - 180) * 1.1 + wobble(i + 9) * 10));
    const longNights = mine.filter((_, i) => a.sleep![i].longestMin >= 240);
    const shortNights = mine.filter((_, i) => a.sleep![i].longestMin < 240);
    const diff = Math.round((avg(longNights) - avg(shortNights)) / 5) * 5;
    return {
      text: `Now I can see it. On nights ${baby}’s longest stretch passes 4 hours, you sleep about ((${diff} min)) more yourself.`,
      series: [
        { label: `${baby}’s longest`, color: '#6b5bc4', values: a.sleep.map((d) => d.longestMin) },
        { label: 'your sleep', color: '#8e0e33', values: mine },
      ],
      days: [weekday(a.sleep[0].date), weekday(a.sleep[a.sleep.length - 1].date)],
      sources: SOURCES,
    };
  }

  // No device: steps and sleep from Health alone.
  const steps = [2100, 3400, 1900, 3800, 2600, 4200, 3100];
  const mine = steps.map((st, i) => Math.round(320 + (st > 3000 ? 40 : 0) + wobble(i + 21) * 14));
  const diff = Math.round((avg(mine.filter((_, i) => steps[i] > 3000)) - avg(mine.filter((_, i) => steps[i] <= 3000))) / 5) * 5;
  const now = Date.now();
  const first = new Date(now - 6 * 86_400_000).toISOString().slice(0, 10);
  const last = new Date(now).toISOString().slice(0, 10);
  return {
    text: `Now I can see it. On days you walk more than 3,000 steps, you sleep about ((${diff} min)) longer that night.`,
    series: [
      { label: 'your steps', color: '#6b5bc4', values: steps },
      { label: 'your sleep', color: '#8e0e33', values: mine },
    ],
    days: [weekday(first), weekday(last)],
    sources: SOURCES,
  };
}
