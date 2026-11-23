import { deviceOf, fmtMinutes, pumpSummary, sleepSummary, type DemoAccount } from './account-demo';
import { todayKey } from './lactation';
import type { LactationPlan } from './profile';

/* The first task Cozie helps finish (the "first closed loop"). For mom in
 * the 1–3 month stage with a pump, it is: plan her pumping around her
 * baby's sleep. The plan is worked out here from her own device data — the
 * model never writes these times — saved into her lactation plan, and
 * followed up the next time she opens Cozie. */

export const FIRST_TASK_CARD = '__FIRST_TASK__';

export interface ProposedPlan {
  times: string[]; // "03:00"
  durationMin: number;
  /** Why the plan looks like this, in plain lines. */
  notes: string[];
  /** Short labels next to particular times. */
  tags: Record<string, string>;
}

/** "21:00" → "9:00 p.m." */
export function clock12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}

/** Round "HH:mm" to the nearest half hour. */
function roundHalfHour(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.round((h * 60 + m) / 30) * 30;
  const hh = Math.floor(total / 60) % 24;
  return `${String(hh).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Her usual sessions this week, steadied onto half hours. Null without a pump. */
export function proposePumpPlan(a: DemoAccount): ProposedPlan | null {
  const p = pumpSummary(a);
  if (!p || !a.pumping) return null;
  // The fullest day shows her whole routine.
  const day = [...a.pumping].sort((x, y) => y.sessions.length - x.sessions.length)[0];
  const times = day.sessions.map((s) => roundHalfHour(s.time));
  const night = times.find((t) => t < '05:00');
  const last = times[times.length - 1];
  const s = sleepSummary(a);
  const tags: Record<string, string> = {};
  if (night) tags[night] = 'your fullest';
  tags[last] = 'before bed';
  const notes = [
    `The same ${times.length} sessions you already do, on steadier times.`,
    night ? `${clock12(night)} stays — it’s your fullest, about ${p.nightMl} ml.` : '',
    s
      ? `${a.baby.name}’s longest stretch is now about ${fmtMinutes(s.longestNow)}. Pump at ${clock12(last)} before bed, so his long sleep can be yours too.`
      : '',
  ].filter(Boolean);
  return { times, durationMin: 20, notes, tags };
}

/** The proposal as the lactation plan the rest of the app reads. */
export function planFromProposal(p: ProposedPlan): LactationPlan {
  return {
    goal: 'maintain',
    goalLabel: 'Keep supply steady',
    dailyFreq: p.times.length,
    durationMin: p.durationMin,
    applyTo: 'All day',
    status: 'completed',
    trackingStarted: true,
    sessions: p.times.map((time) => ({ time, state: 'upcoming', durationMin: p.durationMin })),
    sessionsDate: todayKey(),
    todayVolumeOz: 0,
    createdAt: Date.now(),
  };
}

export const hasFirstTask = (a: DemoAccount) => !!deviceOf(a, 'pump') && !!a.pumping;

/* ---------- Following up next time ---------- */

const FOLLOW_KEY = 'cozyFollowUp';
export const FOLLOW_UP_EVENT = 'cozie:follow-up';

interface FollowUp {
  kind: 'pump-plan';
  /** Local day (YYYY-MM-DD) from which the check-in is due. */
  due: string;
}

const tomorrowKey = () => todayKey(new Date(Date.now() + 86_400_000));

export function scheduleFollowUp() {
  try {
    localStorage.setItem(FOLLOW_KEY, JSON.stringify({ kind: 'pump-plan', due: tomorrowKey() } satisfies FollowUp));
  } catch {
    /* private mode — no check-in next time */
  }
}

/** The check-in to post now, if one is due; clears it. */
export function takeDueFollowUp(): FollowUp | null {
  try {
    const f = JSON.parse(localStorage.getItem(FOLLOW_KEY) ?? 'null') as FollowUp | null;
    if (!f || f.due > todayKey()) return null;
    localStorage.removeItem(FOLLOW_KEY);
    return f;
  } catch {
    return null;
  }
}

/** Demo panel: make tomorrow's check-in due now. */
export function showFollowUpNow() {
  try {
    localStorage.setItem(FOLLOW_KEY, JSON.stringify({ kind: 'pump-plan', due: todayKey() } satisfies FollowUp));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(FOLLOW_UP_EVENT));
}

export const followUpMessage = (baby: string) => ({
  content: `Welcome back. How did yesterday’s pumping plan go — did the times work for you and ${baby}?`,
  suggestions: ['It went well', 'I missed a few', 'Let’s adjust the times'],
});
