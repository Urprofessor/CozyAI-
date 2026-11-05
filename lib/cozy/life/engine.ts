// Decides what Cozie's world looks like right now: which day of her week it
// is, which part of the day, and which events have "arrived". Pure functions —
// the same state and clock always give the same scene, so a refresh never
// reshuffles anything.
//
// Delivery follows a simple rule: every event has a day and a time; it shows
// once that moment has passed. Nothing runs in the background — opening the
// page simply catches up on whatever happened while the mom was away.

import type { CozyProfile } from '../profile';
import type { LetterContent } from '../letters';
import {
  DAYS,
  LIFE_EVENTS,
  LIFE_LETTERS,
  SLOT_LINES,
  SPOT_IDLE,
  type LifeEvent,
  type Slot,
  type SpotId,
} from './script';

export interface LifeState {
  /** First visit; day 1 of Cozie's week. */
  startedAt?: number;
  /** Demo fast-forward, in days. */
  dayOffset?: number;
  /** Ask/invite id → chosen option id. */
  answers?: Record<string, string>;
  /** Event ids the mom has opened. */
  seen?: string[];
}

export interface LifePersona {
  mom: string;
  /** False when we only have the 'friend' fallback. */
  momKnown: boolean;
  baby: string;
  babyWeeks: number;
  milaWeeks: number;
}

export interface LifeClock {
  day: number; // 1..DAYS
  minutes: number; // minutes into the (logical) day; may exceed 24h before 5 am
  slot: Slot;
}

export interface SpotView {
  spot: SpotId;
  event: LifeEvent | null;
  title: string;
  text: string;
  unread: boolean;
}

const DAY_MS = 86_400_000;
const DAY_STARTS_AT = 5 * 60; // the small hours still belong to last night

/** Representative time when the demo jumps to a part of the day. */
export const SLOT_MINUTES: Record<Slot, number> = {
  morning: 9 * 60 + 30,
  afternoon: 16 * 60,
  night: 23 * 60 + 30,
};

export const SLOT_LABELS: Record<Slot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
};

export function slotOf(minutes: number): Slot {
  const m = minutes % (24 * 60);
  if (m >= DAY_STARTS_AT && m < 12 * 60) return 'morning';
  if (m >= 12 * 60 && m < 18 * 60) return 'afternoon';
  return 'night';
}

function logicalDayStart(t: number) {
  const d = new Date(t);
  const shifted = d.getHours() * 60 + d.getMinutes() < DAY_STARTS_AT ? new Date(t - DAY_MS) : d;
  return new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate()).getTime();
}

export function clockFor(state: LifeState, now: number, slotOverride?: Slot | null): LifeClock {
  const d = new Date(now);
  let minutes = d.getHours() * 60 + d.getMinutes();
  if (minutes < DAY_STARTS_AT) minutes += 24 * 60;
  const elapsed = Math.max(
    0,
    Math.round((logicalDayStart(now) - logicalDayStart(state.startedAt ?? now)) / DAY_MS)
  );
  const day = ((elapsed + (state.dayOffset ?? 0)) % DAYS) + 1;
  if (slotOverride) minutes = SLOT_MINUTES[slotOverride];
  return { day, minutes, slot: slotOverride ?? slotOf(minutes) };
}

export function personaFrom(profile: CozyProfile): LifePersona {
  const babyWeeks = weeksOld(profile) ?? 6;
  return {
    mom: profile.name?.trim() || 'friend',
    momKnown: Boolean(profile.name?.trim()),
    baby: profile.baby?.name?.trim() || 'your little one',
    babyWeeks,
    milaWeeks: babyWeeks + 1,
  };
}

function weeksOld(p: CozyProfile): number | null {
  const birth = p.baby?.birthDate ? Date.parse(p.baby.birthDate) : NaN;
  if (!Number.isNaN(birth)) return Math.max(0, Math.floor((Date.now() - birth) / (7 * DAY_MS)));
  const m = p.baby?.ageText?.match(/(\d+)\s*(week|wk|month|mo)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return /^m/i.test(m[2]) ? n * 4 : n;
}

export function fill(text: string, p: LifePersona) {
  return text
    // 'Auntie friend' reads oddly; without a name Mila just says 'Auntie'.
    .replaceAll('Auntie {mom}', p.momKnown ? `Auntie ${p.mom}` : 'Auntie')
    .replaceAll('{mom}', p.mom)
    .replaceAll('{baby}', p.baby)
    .replaceAll('{babyWeeks}', String(p.babyWeeks))
    .replaceAll('{milaWeeks}', String(p.milaWeeks));
}

function isDelivered(e: LifeEvent, clock: LifeClock, answers: Record<string, string>) {
  if (e.requires && !answers[e.requires]) return false;
  if (e.day < clock.day) return true;
  return e.day === clock.day && e.at <= clock.minutes;
}

/** Event text with the follow-up's per-answer opening, placeholders filled. */
export function eventText(e: LifeEvent, state: LifeState, p: LifePersona) {
  const answer = e.requires ? state.answers?.[e.requires] : undefined;
  return fill((answer && e.textByChoice?.[answer]) || e.text, p);
}

export function isUnread(e: LifeEvent, state: LifeState) {
  const asked = e.choices?.length && (e.kind === 'ask' || e.kind === 'invite');
  if (asked && !state.answers?.[e.id]) return true;
  return !state.seen?.includes(e.id);
}

/** What each spot in the room shows right now: today's latest event there. */
export function spotViews(state: LifeState, clock: LifeClock, p: LifePersona): Record<SpotId, SpotView> {
  const answers = state.answers ?? {};
  const out = {} as Record<SpotId, SpotView>;
  for (const spot of Object.keys(SPOT_IDLE) as SpotId[]) {
    const today = LIFE_EVENTS.filter(
      (e) => e.spot === spot && e.day === clock.day && isDelivered(e, clock, answers)
    ).sort((a, b) => b.at - a.at);
    const event = today[0] ?? null;
    out[spot] = event
      ? { spot, event, title: fill(event.title, p), text: eventText(event, state, p), unread: isUnread(event, state) }
      : { spot, event: null, title: fill(SPOT_IDLE[spot].title, p), text: fill(SPOT_IDLE[spot].text, p), unread: false };
  }
  return out;
}

export function unreadSpots(views: Record<SpotId, SpotView>): SpotId[] {
  return (Object.values(views) as SpotView[]).filter((v) => v.unread).map((v) => v.spot);
}

export function cozieLine(clock: LifeClock, p: LifePersona) {
  return fill(SLOT_LINES[clock.day]?.[clock.slot] ?? SLOT_LINES[1][clock.slot], p);
}

export interface CollectedLetter {
  eventId: string;
  day: number;
  letter: LetterContent;
}

/** Letters that have arrived so far this week, oldest first. */
export function collectedLetters(state: LifeState, clock: LifeClock, p: LifePersona): CollectedLetter[] {
  const answers = state.answers ?? {};
  return LIFE_EVENTS.filter((e) => e.kind === 'letter' && e.letterId && isDelivered(e, clock, answers))
    .map((e) => ({ eventId: e.id, day: e.day, letter: fillLetter(LIFE_LETTERS[e.letterId!], p) }))
    .filter((l) => Boolean(l.letter));
}

export function fillLetter(letter: LetterContent | undefined, p: LifePersona): LetterContent {
  if (!letter) return letter as unknown as LetterContent;
  return {
    ...letter,
    kicker: fill(letter.kicker, p),
    salutation: fill(letter.salutation, p),
    closing: fill(letter.closing, p),
    blocks: letter.blocks.map((b) => ({ ...b, text: fill(b.text, p) })),
  };
}
