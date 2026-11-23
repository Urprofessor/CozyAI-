'use client';

import { useEffect, useState } from 'react';

/* What the Momcozy app already knows when mom first opens Cozie — the cold-
 * start advantage no general AI has. Demo only: there is no real account
 * behind this. Four presets (picked in the desktop demo panel) stand in for
 * the main kinds of Momcozy users; every date is counted back from today so
 * Noah is always six weeks old and the logs never go stale. Wherever the UI
 * or Cozie uses this data it names the source ("From your M5 pump"). */

export type AccountPreset = 'pump' | 'monitor' | 'both' | 'none';
export type DeviceKind = 'pump' | 'monitor' | 'whiteNoise';

export interface Device {
  kind: DeviceKind;
  /** Product name shown as the source of its data. */
  name: string;
}

export interface PumpDay {
  date: string; // YYYY-MM-DD
  sessions: { time: string; ml: number }[];
}

export interface SleepDay {
  date: string;
  /** Longest unbroken stretch, minutes. */
  longestMin: number;
  /** Sleep across the 24 hours, minutes. */
  totalMin: number;
  /** Times Noah woke between 7 p.m. and 7 a.m. */
  nightWakes: number;
}

export interface GrowthEntry {
  date: string;
  label: string;
  weightKg?: number;
  lengthCm?: number;
}

export interface DemoAccount {
  preset: AccountPreset;
  mom: { name: string };
  baby: { name: string; birthDate: string; weeks: number };
  devices: Device[];
  /** Last 7 days, oldest first. Only with a pump. */
  pumping?: PumpDay[];
  /** Last 7 days, oldest first. Only with a monitor. */
  sleep?: SleepDay[];
  /** Logged in the Momcozy app's baby profile (CareLog). */
  growth: GrowthEntry[];
  vaccines: { date: string; label: string }[];
  nextCheckup: { date: string; label: string };
}

export const ACCOUNT_PRESETS: { id: AccountPreset; label: string; note: string }[] = [
  { id: 'both', label: 'Pump + monitor', note: 'M5 pump and BM04 monitor' },
  { id: 'pump', label: 'Pump user', note: 'M5 wearable pump' },
  { id: 'monitor', label: 'Monitor user', note: 'BM04 monitor and white noise' },
  { id: 'none', label: 'No device', note: 'Momcozy app only' },
];

const PUMP: Device = { kind: 'pump', name: 'Momcozy M5 pump' };
const MONITOR: Device = { kind: 'monitor', name: 'Momcozy BM04 monitor' };
const WHITE_NOISE: Device = { kind: 'whiteNoise', name: 'Momcozy white noise machine' };

const DEVICES: Record<AccountPreset, Device[]> = {
  both: [PUMP, MONITOR],
  pump: [PUMP],
  monitor: [MONITOR, WHITE_NOISE],
  none: [],
};

const DAY_MS = 86_400_000;
const BABY_AGE_DAYS = 42;

const iso = (t: number) => {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Small fixed wobble so the logs look lived-in but never change between loads. */
const wobble = (seed: number) => ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1;

export function buildAccount(preset: AccountPreset, now = Date.now()): DemoAccount {
  const born = now - BABY_AGE_DAYS * DAY_MS;
  const devices = DEVICES[preset];
  const has = (k: DeviceKind) => devices.some((d) => d.kind === k);
  const lastWeek = Array.from({ length: 7 }, (_, i) => now - (6 - i) * DAY_MS);

  const pumping = has('pump')
    ? lastWeek.map((t, day) => {
        // Six sessions most days; the 3 a.m. one is the fullest and never skipped.
        const times = ['03:10', '06:40', '10:20', '13:50', '17:30', '21:00'];
        const skip = day === 2 || day === 5 ? 3 : -1;
        return {
          date: iso(t),
          sessions: times
            .filter((_, k) => k !== skip)
            .map((time, k) => ({
              time,
              ml: Math.round((k === 0 ? 112 : 84) + day * 1.5 + wobble(day * 7 + k) * 14),
            })),
        };
      })
    : undefined;

  const sleep = has('monitor')
    ? lastWeek.map((t, day) => ({
        date: iso(t),
        // The longest stretch grows from about 3 h to 4.5 h over the week.
        longestMin: Math.round(180 + day * 15 + wobble(day + 40) * 12),
        totalMin: Math.round(14.2 * 60 + wobble(day + 60) * 50),
        nightWakes: day < 3 ? 3 : 2,
      }))
    : undefined;

  return {
    preset,
    mom: { name: 'Clara' },
    baby: { name: 'Noah', birthDate: iso(born), weeks: Math.floor(BABY_AGE_DAYS / 7) },
    devices,
    pumping,
    sleep,
    growth: [
      { date: iso(born), label: 'Birth', weightKg: 3.4, lengthCm: 50 },
      { date: iso(born + 14 * DAY_MS), label: '2-week check-up', weightKg: 3.7, lengthCm: 52 },
      { date: iso(born + 35 * DAY_MS), label: 'Home weigh-in', weightKg: 4.6 },
    ],
    vaccines: [{ date: iso(born), label: 'Hepatitis B, dose 1' }],
    nextCheckup: { date: iso(born + 61 * DAY_MS), label: '2-month check-up and vaccines' },
  };
}

/* ---------- Summaries shared by the letter cards, hubs and chat ---------- */

export function pumpSummary(a: DemoAccount) {
  if (!a.pumping) return null;
  const sessions = a.pumping.flatMap((d) => d.sessions);
  const perDay = sessions.length / a.pumping.length;
  const avgMl = sessions.reduce((s, x) => s + x.ml, 0) / sessions.length;
  const night = sessions.filter((s) => s.time.startsWith('03'));
  const nightMl = night.reduce((s, x) => s + x.ml, 0) / night.length;
  const perDayMl = a.pumping.map((d) => d.sessions.reduce((s, x) => s + x.ml, 0));
  return {
    perDay: Math.round(perDay * 10) / 10,
    avgMl: Math.round(avgMl),
    nightMl: Math.round(nightMl),
    nightsPumped: night.length,
    perDayMl,
    firstDayMl: perDayMl[0],
    lastDayMl: perDayMl[perDayMl.length - 1],
  };
}

export function sleepSummary(a: DemoAccount) {
  if (!a.sleep) return null;
  const first = a.sleep[0];
  const last = a.sleep[a.sleep.length - 1];
  const avgTotal = a.sleep.reduce((s, d) => s + d.totalMin, 0) / a.sleep.length;
  return {
    longestNow: last.longestMin,
    longestWeekAgo: first.longestMin,
    avgTotalMin: Math.round(avgTotal),
    wakesNow: last.nightWakes,
    wakesWeekAgo: first.nightWakes,
    longest: a.sleep.map((d) => d.longestMin),
  };
}

export function daysUntil(date: string, now = Date.now()) {
  return Math.max(0, Math.round((new Date(`${date}T12:00:00`).getTime() - now) / DAY_MS));
}

export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}

export const deviceOf = (a: DemoAccount, kind: DeviceKind) => a.devices.find((d) => d.kind === kind);

/** Everything above in plain lines, for the chat model. */
export function accountContext(a: DemoAccount): string {
  const lines = [
    `Mom: ${a.mom.name}. Baby: ${a.baby.name}, born ${a.baby.birthDate} (${a.baby.weeks} weeks old).`,
    `Momcozy devices: ${a.devices.map((d) => d.name).join(', ') || 'none'}.`,
  ];
  const p = pumpSummary(a);
  if (p) {
    lines.push(
      `Pumping, last 7 days (${deviceOf(a, 'pump')!.name}): ${p.perDay} sessions a day, about ${p.avgMl} ml each; the 3 a.m. session is the fullest (about ${p.nightMl} ml) and she did it ${p.nightsPumped} of 7 nights; daily total went from ${p.firstDayMl} ml to ${p.lastDayMl} ml.`,
    );
  }
  const s = sleepSummary(a);
  if (s) {
    lines.push(
      `Baby sleep, last 7 days (${deviceOf(a, 'monitor')!.name}): longest stretch grew from ${fmtMinutes(s.longestWeekAgo)} to ${fmtMinutes(s.longestNow)}; about ${fmtMinutes(s.avgTotalMin)} of sleep a day; night wakes went from ${s.wakesWeekAgo} to ${s.wakesNow}.`,
    );
  }
  // The growth log and check-ups can be switched off in Data sources.
  if (a.growth.length) lines.push(
    `Growth log (Momcozy app): ${a.growth
      .map((g) => `${g.label} ${g.date}${g.weightKg ? ` ${g.weightKg} kg` : ''}${g.lengthCm ? ` ${g.lengthCm} cm` : ''}`)
      .join('; ')}.`,
    `Vaccines: ${a.vaccines.map((v) => `${v.label} (${v.date})`).join('; ')}. Next: ${a.nextCheckup.label} on ${a.nextCheckup.date}.`,
  );
  return lines.join('\n');
}

/* ---------- Which preset the demo is showing ---------- */

const KEY = 'cozyAccountPreset';
const CHANGE_EVENT = 'cozie:account-preset';
const DEFAULT: AccountPreset = 'both';

export function readPreset(): AccountPreset {
  try {
    const v = localStorage.getItem(KEY);
    return ACCOUNT_PRESETS.some((p) => p.id === v) ? (v as AccountPreset) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setAccountPreset(preset: AccountPreset) {
  try {
    localStorage.setItem(KEY, preset);
  } catch {
    /* private mode — the event below still updates this tab */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: preset }));
}

/** The demo account for the current preset; follows the demo panel. */
export function useDemoAccount(): DemoAccount {
  const [preset, setPreset] = useState<AccountPreset>(DEFAULT);
  useEffect(() => {
    setPreset(readPreset());
    const onChange = (e: Event) => setPreset((e as CustomEvent<AccountPreset>).detail);
    const onStorage = () => setPreset(readPreset());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  // Rebuilt per render is cheap, but keep it stable for effects.
  const [account, setAccount] = useState(() => buildAccount(DEFAULT));
  useEffect(() => setAccount(buildAccount(preset)), [preset]);
  return account;
}
