'use client';

import { useEffect, useState } from 'react';
import type { DemoAccount } from './account-demo';
import type { GuidanceKind } from './first-guidance';
import { todayKey } from './lactation';

/* What happens after the first task — the reason to come back.
 *
 * When she finishes her first-task card (saves the pump plan, the evening
 * rhythm or the check-up list, or asks for a check-in on the feelings card),
 * Cozie promises two things with a date: something tomorrow, and a first
 * pattern on day 3. The card's Done state shows that timeline and offers a
 * reminder. The next time she opens Cozie on or after that day, Cozie posts
 * the promised card (components/cozy/cards/NextStepCard.tsx).
 *
 * Every promise here must be kept: each step has a card that delivers it.
 * Feelings get only the one gentle check-in — moods aren't tracked.
 *
 * The demo can move the clock forward (Demo panel → "Skip to tomorrow"). */

export type StepDay = 1 | 3;

interface Started {
  /** Local day (YYYY-MM-DD) the task was done. */
  start: string;
  delivered: StepDay[];
  remind: boolean;
}

type State = Partial<Record<GuidanceKind, Started>>;

const KEY = 'cozyNextSteps';
const OFFSET_KEY = 'cozyDayOffset';
export const NEXT_STEPS_EVENT = 'cozie:next-steps';
const DAY_MS = 86_400_000;

function read(): State {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as State;
  } catch {
    return {};
  }
}

function write(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode: the promise lasts this visit only */
  }
  window.dispatchEvent(new Event(NEXT_STEPS_EVENT));
}

/** Days the demo clock is ahead. */
function offsetDays(): number {
  try {
    return Number(localStorage.getItem(OFFSET_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

/** Today on the (demo) clock. */
export const stepToday = () => todayKey(new Date(Date.now() + offsetDays() * DAY_MS));

const daysSince = (start: string) =>
  Math.round((new Date(`${stepToday()}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / DAY_MS);

/** Start the timeline when she finishes the first task. Doing it again later
 *  doesn't restart it. */
export function startNextSteps(kind: GuidanceKind) {
  const s = read();
  if (s[kind]) return;
  write({ ...s, [kind]: { start: stepToday(), delivered: [], remind: false } });
}

export function setStepReminder(kind: GuidanceKind, on: boolean) {
  const s = read();
  const k = s[kind];
  if (k) write({ ...s, [kind]: { ...k, remind: on } });
}

export interface NextStepsStatus {
  started: boolean;
  remind: boolean;
  /** Which promised days have come (and been delivered). */
  delivered: StepDay[];
}

/** One card's timeline, kept current. */
export function useNextSteps(kind: GuidanceKind): NextStepsStatus {
  const [status, setStatus] = useState<NextStepsStatus>({ started: false, remind: false, delivered: [] });
  useEffect(() => {
    const sync = () => {
      const k = read()[kind];
      setStatus({ started: !!k, remind: !!k?.remind, delivered: k?.delivered ?? [] });
    };
    sync();
    window.addEventListener(NEXT_STEPS_EVENT, sync);
    return () => window.removeEventListener(NEXT_STEPS_EVENT, sync);
  }, [kind]);
  return status;
}

/** Steps whose day has come and that she hasn't seen. If she's away past
 *  day 3, only the day-3 card comes (it covers the days before). */
export function dueSteps(): { kind: GuidanceKind; day: StepDay; remind: boolean }[] {
  const out: { kind: GuidanceKind; day: StepDay; remind: boolean }[] = [];
  for (const [kind, k] of Object.entries(read()) as [GuidanceKind, Started][]) {
    const days = STEP_DAYS[kind];
    const since = daysSince(k.start);
    const due = days.filter((d) => since >= d && !k.delivered.includes(d));
    if (due.length) out.push({ kind, day: due[due.length - 1], remind: k.remind });
  }
  return out;
}

/** Mark a step delivered (and any earlier one it stands in for). */
export function markDelivered(kind: GuidanceKind, day: StepDay) {
  const s = read();
  const k = s[kind];
  if (!k) return;
  const done = STEP_DAYS[kind].filter((d) => d <= day);
  write({ ...s, [kind]: { ...k, delivered: [...new Set([...k.delivered, ...done])] } });
}

/** A step whose reminder is on, ready to show as a notification. */
export const NOTIFY_EVENT = 'cozie:notify';
export type NotifyDetail = { kind: GuidanceKind; day: StepDay };

/** Demo: move the clock forward to `day` days after the first task. Steps
 *  that come due with their reminder on show as a notification; the rest
 *  wait until she opens Cozie. Returns null if no first task is done yet. */
export function skipToDay(day: StepDay): ReturnType<typeof dueSteps> | null {
  const s = read();
  const starts = Object.values(s).map((k) => k!.start);
  if (!starts.length) return null;
  const start = starts.sort()[0];
  const real = todayKey();
  const target = new Date(`${start}T12:00:00`).getTime() + day * DAY_MS;
  const offset = Math.round((target - new Date(`${real}T12:00:00`).getTime()) / DAY_MS);
  try {
    localStorage.setItem(OFFSET_KEY, String(Math.max(0, offset)));
  } catch {
    /* ignore */
  }
  // Read before announcing: an open Cozie delivers them on the event below.
  const due = dueSteps();
  for (const d of due) {
    if (d.remind) window.dispatchEvent(new CustomEvent<NotifyDetail>(NOTIFY_EVENT, { detail: { kind: d.kind, day: d.day } }));
  }
  window.dispatchEvent(new Event(NEXT_STEPS_EVENT));
  return due;
}

/** Demo: back to the real day, timelines cleared. */
export function resetNextSteps() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(OFFSET_KEY);
    localStorage.removeItem(QUICK_LOG_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(NEXT_STEPS_EVENT));
}

/* ---------- What each card promises ---------- */

const STEP_DAYS: Record<GuidanceKind, StepDay[]> = {
  'pump-plan': [1, 3],
  'sleep-plan': [1, 3],
  checkup: [1, 3],
  mood: [1],
};

export interface StepPromise {
  day: StepDay;
  title: string;
  text: string;
}

export interface NextStepsPlan {
  /** One line on the card before she acts: what she'll get for it. */
  offer?: string;
  steps: StepPromise[];
  /** What the reminder says it will do. */
  remind: string;
  /** Opening line of the notification and of Cozie's message, per day. */
  opener: Record<StepDay, string>;
  /** Chips under the delivered card, when it has no buttons of its own. */
  chips?: Partial<Record<StepDay, string[]>>;
}

export function nextStepsPlan(a: DemoAccount, kind: GuidanceKind): NextStepsPlan {
  const baby = a.baby.name;
  switch (kind) {
    case 'pump-plan':
      return {
        offer: 'Save it, and tomorrow I’ll show you how day one went.',
        steps: [
          { day: 1, title: 'How day one went', text: 'From your M5: the sessions you did, and your total.' },
          { day: 3, title: 'Is your supply holding?', text: 'Three days on the new times, side by side.' },
        ],
        remind: 'Tell me when it’s ready',
        opener: {
          1: 'Good morning. Here’s how day one on your plan went:',
          3: 'Three days in. Here’s how your supply is doing on the new times:',
        },
        chips: { 1: ['Keep these times', 'Move one session'], 3: ['Can I drop the 3 a.m. pump?', 'How do I boost supply?'] },
      };
    case 'sleep-plan':
      return {
        offer: `Save it, and tomorrow morning I’ll tell you how ${baby}’s night went.`,
        steps: [
          { day: 1, title: 'How last night went', text: `From your BM04: ${baby}’s longest stretch and night wakes.` },
          { day: 3, title: 'Three nights compared', text: 'Night by night, so you can see if the rhythm is working.' },
        ],
        remind: 'Tell me when it’s ready',
        opener: {
          1: 'Good morning. Here’s last night, from your BM04:',
          3: 'Three nights on the evening rhythm — here they are side by side:',
        },
        chips: { 1: ['Why does he still wake?', 'Tweak the evening rhythm'], 3: [`When will ${baby} sleep through?`, 'What comes next?'] },
      };
    case 'checkup':
      return {
        offer: 'Save it, and over the next three days I’ll help you fill in the last line.',
        steps: [
          { day: 1, title: '30 seconds on yesterday', text: `Two taps: how often ${baby} fed, and his longest sleep.` },
          { day: 3, title: 'A note for the doctor', text: 'What you logged, in one short note to bring along.' },
        ],
        remind: 'Remind me tomorrow',
        opener: {
          1: `Good morning. Thirty seconds on yesterday, for ${baby}’s check-up note:`,
          3: `Here’s ${baby}’s note for the doctor:`,
        },
        chips: { 3: ['What should I ask the doctor?', 'Which vaccines are next?'] },
      };
    case 'mood':
      return {
        steps: [{ day: 1, title: 'A quick check-in', text: 'One question, no forms. Skip it anytime.' }],
        remind: 'Remind me tomorrow',
        opener: { 1: 'Morning. Just checking in, like I said I would:', 3: '' },
      };
  }
}

/* ---------- The no-device quick log (check-up direction) ---------- */

const QUICK_LOG_KEY = 'cozyQuickLog';

export interface QuickLog {
  feeds?: string;
  sleep?: string;
}

export function readQuickLog(): QuickLog {
  try {
    return JSON.parse(localStorage.getItem(QUICK_LOG_KEY) ?? '{}') as QuickLog;
  } catch {
    return {};
  }
}

export function saveQuickLog(log: QuickLog) {
  try {
    localStorage.setItem(QUICK_LOG_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
}

/* ---------- Payoff cards in the chat stream ---------- */

const PREFIX = '__NEXT__:';
export const nextStepSentinel = (kind: GuidanceKind, day: StepDay) => `${PREFIX}${kind}:${day}`;
export function nextStepOf(content: string): { kind: GuidanceKind; day: StepDay } | null {
  if (!content.startsWith(PREFIX)) return null;
  const [kind, day] = content.slice(PREFIX.length).split(':');
  const d = Number(day) as StepDay;
  if (!(kind in STEP_DAYS) || (d !== 1 && d !== 3)) return null;
  return { kind: kind as GuidanceKind, day: d };
}
