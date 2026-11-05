// Layout of Cozie's room. All coordinates are in the room art's 300×400
// viewBox (3:4), so swapping the placeholder SVG for painted layers only means
// updating the numbers here.

import type { CoziePose, Slot, SpotId } from '../life/script';

export const ROOM_W = 300;
export const ROOM_H = 400;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where Cozie stands: feet at (x, y), image `w` wide. */
export interface Stand {
  x: number;
  y: number;
  w: number;
}

export interface SpotDef {
  id: SpotId;
  label: string; // accessible name and "something new" chip
  hit: Rect; // tappable area
  dot: { x: number; y: number }; // red dot
  stand: Stand; // where Cozie walks to when the spot is opened
}

export const SPOTS: SpotDef[] = [
  { id: 'shelf', label: '书架', hit: { x: 12, y: 100, w: 66, h: 152 }, dot: { x: 72, y: 118 }, stand: { x: 104, y: 276, w: 80 } },
  { id: 'calendar', label: '日历', hit: { x: 204, y: 52, w: 52, h: 64 }, dot: { x: 250, y: 60 }, stand: { x: 196, y: 272, w: 80 } },
  { id: 'fridge', label: '冰箱便条', hit: { x: 232, y: 124, w: 64, h: 144 }, dot: { x: 284, y: 182 }, stand: { x: 206, y: 290, w: 80 } },
  { id: 'crib', label: 'Mila 的小床', hit: { x: 14, y: 270, w: 104, h: 88 }, dot: { x: 112, y: 280 }, stand: { x: 148, y: 352, w: 84 } },
  { id: 'table', label: '小边桌', hit: { x: 184, y: 280, w: 74, h: 78 }, dot: { x: 252, y: 286 }, stand: { x: 160, y: 366, w: 84 } },
  { id: 'mailbox', label: '信箱', hit: { x: 244, y: 350, w: 52, h: 46 }, dot: { x: 290, y: 356 }, stand: { x: 216, y: 396, w: 80 } },
];

export const SPOT_BY_ID = Object.fromEntries(SPOTS.map((s) => [s.id, s])) as Record<SpotId, SpotDef>;

/** Where Cozie is, and what she's doing, in each part of the day. */
export const SLOT_STAGE: Record<Slot, { stand: Stand; pose: CoziePose }> = {
  morning: { stand: { x: 150, y: 262, w: 88 }, pose: 'neutral' },
  afternoon: { stand: { x: 150, y: 344, w: 96 }, pose: 'journal' },
  night: { stand: { x: 150, y: 336, w: 88 }, pose: 'empathy' },
};

/** Mila in her crib. */
export const MILA: Stand = { x: 66, y: 324, w: 40 };

/** Placeholder IP renders from the C4D package. They're framed differently:
 *  `scale` evens out the character's size across renders, and `foot` is how
 *  far down the (square) image the character's lowest point sits, so every
 *  pose stands on the same spot. */
export const POSES: Record<CoziePose, { src: string; scale: number; foot: number }> = {
  neutral: { src: '/cozie/home/cozie_neutral.png', scale: 1.4, foot: 0.72 },
  rest: { src: '/cozie/home/cozie_plugs.png', scale: 1.45, foot: 0.78 },
  journal: { src: '/cozie/home/cozie_journal.png', scale: 1, foot: 0.95 },
  empathy: { src: '/cozie/home/cozie_empathy.png', scale: 1.05, foot: 0.97 },
  celebrate: { src: '/cozie/home/cozie_celebrate.png', scale: 1.1, foot: 0.86 },
  discover: { src: '/cozie/home/cozie_discover.png', scale: 1.05, foot: 0.96 },
  encourage: { src: '/cozie/home/cozie_encourage.png', scale: 1.05, foot: 0.84 },
  listen: { src: '/cozie/home/cozie_listen.png', scale: 1, foot: 0.93 },
};

export const pct = {
  x: (v: number) => `${(v / ROOM_W) * 100}%`,
  y: (v: number) => `${(v / ROOM_H) * 100}%`,
};
