// Today's pumping sessions for a lactation plan, and the display model for the
// App-style plan / schedule cards (mirrors AgentLactationPlanCardMapper).
// Sessions are stored as local "HH:mm" for one local day (`sessionsDate`).

import type { LactationPlan, LactationSession } from './profile';

const DAY_START_MIN = 6 * 60; // first session 06:00
const DAY_END_MIN = 22 * 60; // last session by 22:00

export function todayKey(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Spread `dailyFreq` sessions evenly over the waking day, on 30-min steps. */
export function generateSessions(dailyFreq = 6, durationMin = 20): LactationSession[] {
  const n = Math.max(1, Math.min(12, Math.round(dailyFreq)));
  const step = n === 1 ? 0 : Math.floor((DAY_END_MIN - DAY_START_MIN) / (n - 1) / 30) * 30;
  return Array.from({ length: n }, (_, i) => ({
    time: fmt24(DAY_START_MIN + i * step),
    state: 'upcoming' as const,
    durationMin,
  }));
}

/** Plan fields for a fresh day of sessions (used on plan creation / new day). */
export function freshDay(plan: LactationPlan): Partial<LactationPlan> {
  return {
    sessions: generateSessions(plan.dailyFreq, plan.durationMin),
    sessionsDate: todayKey(),
    todayVolumeOz: 0,
  };
}

/** Today's sessions — regenerated when the stored day is stale. */
export function todaySessions(plan: LactationPlan): LactationSession[] {
  if (plan.sessionsDate === todayKey() && plan.sessions?.length) return plan.sessions;
  return generateSessions(plan.dailyFreq, plan.durationMin);
}

/** Record a pumped amount: fills the session nearest to `time` (default now)
 *  that isn't logged yet, else adds to the nearest one. */
export function logPump(plan: LactationPlan, oz: number, time?: string): Partial<LactationPlan> {
  const sessions = todaySessions(plan).map((s) => ({ ...s }));
  const at = time && /^\d{1,2}:\d{2}$/.test(time) ? toMin(time) : nowMin();
  const byDistance = sessions
    .map((s, i) => ({ i, d: Math.abs(toMin(s.time) - at), logged: s.volumeOz != null }))
    .sort((a, b) => Number(a.logged) - Number(b.logged) || a.d - b.d);
  const target = sessions[byDistance[0].i];
  target.volumeOz = round1((target.volumeOz ?? 0) + oz);
  target.state = 'done';
  target.loggedAt = fmt24(Math.min(at, nowMin()));
  return {
    sessions,
    sessionsDate: todayKey(),
    todayVolumeOz: round1(sessions.reduce((sum, s) => sum + (s.volumeOz ?? 0), 0)),
  };
}

/** Toggle a session's completion from the schedule card. */
export function toggleSession(plan: LactationPlan, index: number): Partial<LactationPlan> {
  const now = nowMin();
  const sessions = todaySessions(plan).map((s, i) => {
    if (i !== index) return s;
    if (s.state === 'done') return { ...s, state: 'upcoming' as const, loggedAt: undefined };
    // Checked off: count it as pumped at its slot, or now if the slot is ahead.
    return { ...s, state: 'done' as const, loggedAt: fmt24(Math.min(toMin(s.time), now)) };
  });
  return { sessions, sessionsDate: todayKey() };
}

// ---------- plan card display model ----------

export type BarStyle = 'record' | 'backfill' | 'unfinished' | 'add';

export interface PlanBar {
  key: string;
  time: string;
  volumeText: string;
  heightRatio: number; // of the record-bar max height
  style: BarStyle;
}

export interface PlanCardModel {
  lastPump: string;
  nextSession: string;
  nextDayOffset: string | null;
  sessions: string;
  todayVolume: string;
  bars: PlanBar[];
}

const DEFAULT_CHART_MAX_OZ = 20;
const MAX_BARS = 5;

export function planCardModel(plan: LactationPlan, now = new Date()): PlanCardModel {
  const sessions = todaySessions(plan);
  const nowM = now.getHours() * 60 + now.getMinutes();
  const done = sessions.filter((s) => s.state === 'done');

  const pumpedAt = done
    .map((s) => toMin(s.loggedAt ?? s.time))
    .filter((m) => m <= nowM)
    .sort((a, b) => b - a)[0];
  const lastPump = pumpedAt != null ? agoText(nowM - pumpedAt) : '--';

  const next = sessions.find((s) => s.state !== 'done' && toMin(s.time) > nowM);
  const nextSession = next ? fmtClock(toMin(next.time)) : sessions[0] ? fmtClock(toMin(sessions[0].time)) : '--';
  const nextDayOffset = !next && sessions[0] ? '+1' : null;

  const total = round1(done.reduce((sum, s) => sum + (s.volumeOz ?? 0), 0));
  const maxOz = Math.max(DEFAULT_CHART_MAX_OZ, ...done.map((s) => s.volumeOz ?? 0));

  // Up to 4 past sessions + the next one; fill with later sessions if fewer.
  const past = sessions.filter((s) => toMin(s.time) <= nowM || s.state === 'done');
  const future = sessions.filter((s) => !past.includes(s));
  const shown = [...past.slice(-(MAX_BARS - Math.min(1, future.length))), ...future].slice(0, MAX_BARS);

  const bars: PlanBar[] = shown.map((s) => {
    const key = s.time;
    const time = fmtClock(toMin(s.time));
    if (s.state === 'done') {
      return {
        key,
        time,
        volumeText: s.volumeOz != null ? String(round1(s.volumeOz)) : '',
        heightRatio: s.volumeOz ? Math.min(1, s.volumeOz / maxOz) : 0.08,
        style: 'record',
      };
    }
    const isPast = toMin(s.time) <= nowM;
    return { key, time, volumeText: '', heightRatio: 1, style: isPast ? 'backfill' : 'unfinished' };
  });
  bars.push({ key: 'add', time: '', volumeText: '', heightRatio: 1, style: 'add' });

  return {
    lastPump,
    nextSession,
    nextDayOffset,
    sessions: done.length ? String(done.length) : '--',
    todayVolume: total > 0 ? `${total.toFixed(1)} OZ` : '--',
    bars,
  };
}

// ---------- schedule card ----------

export interface ScheduleRow {
  index: number;
  timeRange: string;
  completed: boolean;
  highlighted: boolean;
}

const GOAL_TEXT: Record<string, string> = {
  increase: 'Increase milk supply',
  maintain: 'Maintain milk supply',
  wean: 'Wean gradually',
};

export function scheduleModel(plan: LactationPlan, now = new Date()) {
  const sessions = todaySessions(plan);
  const nowM = now.getHours() * 60 + now.getMinutes();
  const nextIdx = sessions.findIndex((s) => s.state !== 'done' && toMin(s.time) + (s.durationMin ?? 20) > nowM);
  const rows: ScheduleRow[] = sessions.map((s, i) => {
    const start = toMin(s.time);
    const end = start + (s.durationMin ?? plan.durationMin ?? 20);
    return {
      index: i,
      timeRange: timeRange(start, end),
      completed: s.state === 'done',
      highlighted: i === nextIdx,
    };
  });
  const date = now.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  const count = `${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`;
  const goal = GOAL_TEXT[plan.goal ?? 'increase'] ?? GOAL_TEXT.increase;
  return { rows, subtitle: `${date} | ${count} · ${goal}` };
}

// ---------- helpers ----------

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function nowMin() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function fmt24(min: number) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
}

/** App formatAppClockTime (12-hour): "9:30AM". */
function fmtClock(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = String(min % 60).padStart(2, '0');
  return `${h % 12 || 12}:${m}${h < 12 ? 'AM' : 'PM'}`;
}

/** App schedule range: "09:30 - 10:00 am", start keeps am/pm only if it differs. */
function timeRange(start: number, end: number) {
  const part = (min: number) => {
    const h = Math.floor(min / 60) % 24;
    return { hm: `${String(h % 12 || 12).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`, ap: h < 12 ? 'am' : 'pm' };
  };
  const a = part(start);
  const b = part(end);
  return `${a.ap === b.ap ? a.hm : `${a.hm} ${a.ap}`} - ${b.hm} ${b.ap}`;
}

/** App agentLactationLastPumpText: "2h 5m ago" / "2h ago" / "5m ago". */
function agoText(elapsedMin: number) {
  if (elapsedMin < 0) return '--';
  const h = Math.floor(elapsedMin / 60);
  const m = elapsedMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m ago`;
  if (h > 0) return `${h}h ago`;
  return `${Math.max(1, m)}m ago`;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
