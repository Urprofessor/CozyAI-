// Layout of Cozie's room. Furniture coordinates are in the original 300×400
// room drawing; the full-screen art adds ART_Y of wall above it and more floor
// below, for a 300×620 canvas that covers a phone screen. Swapping the
// placeholder SVG for painted layers only means updating the numbers here.

import type { Slot, SpotId } from '../life/script';
import type { CozieAnim } from './anims';

export const ROOM_W = 300;
export const ROOM_H = 620;
/** Wall added above the original drawing. */
export const ART_Y = 150;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A place Cozie stands: feet at (x, y). */
export interface Point {
  x: number;
  y: number;
}

export interface SpotDef {
  id: SpotId;
  label: string;
  hit: Rect; // tappable area
  dot: Point; // red dot
  stand: Point; // where Cozie walks to for it
}

export const SPOTS: SpotDef[] = [
  { id: 'shelf', label: '书架', hit: { x: 12, y: 90, w: 66, h: 162 }, dot: { x: 72, y: 118 }, stand: { x: 106, y: 282 } },
  { id: 'calendar', label: '日历', hit: { x: 204, y: 52, w: 52, h: 64 }, dot: { x: 250, y: 60 }, stand: { x: 196, y: 276 } },
  { id: 'fridge', label: '冰箱便条', hit: { x: 232, y: 124, w: 64, h: 144 }, dot: { x: 284, y: 182 }, stand: { x: 204, y: 296 } },
  { id: 'crib', label: 'Mila 的小床', hit: { x: 14, y: 270, w: 104, h: 88 }, dot: { x: 112, y: 280 }, stand: { x: 150, y: 352 } },
  { id: 'table', label: '小边桌', hit: { x: 184, y: 270, w: 74, h: 88 }, dot: { x: 252, y: 280 }, stand: { x: 170, y: 372 } },
  { id: 'mailbox', label: '信箱', hit: { x: 244, y: 350, w: 52, h: 46 }, dot: { x: 290, y: 356 }, stand: { x: 222, y: 400 } },
];

export const SPOT_BY_ID = Object.fromEntries(SPOTS.map((s) => [s.id, s])) as Record<SpotId, SpotDef>;

/** Every place Cozie can be: the tappable spots plus a few of her own. */
export type Place = SpotId | 'window' | 'rug' | 'sofa';

export const PLACES: Record<Place, Point> = {
  ...(Object.fromEntries(SPOTS.map((s) => [s.id, s.stand])) as Record<SpotId, Point>),
  window: { x: 150, y: 266 },
  rug: { x: 150, y: 346 },
  sofa: { x: 92, y: 430 },
};

/** Cozie's image width (square frames), in room units. */
export const COZIE_W = 116;

/** What she does on her own, by part of the day. She drifts between these
 *  while nobody is talking to her. */
export const ROUTINES: Record<Slot, Array<{ place: Place; anim: CozieAnim; ms: number }>> = {
  morning: [
    { place: 'window', anim: 'neutral', ms: 9000 },
    { place: 'shelf', anim: 'discovery', ms: 8000 },
    { place: 'rug', anim: 'journal', ms: 12000 },
  ],
  afternoon: [
    { place: 'rug', anim: 'journal', ms: 14000 },
    { place: 'calendar', anim: 'discovery', ms: 8000 },
    { place: 'sofa', anim: 'neutral', ms: 10000 },
  ],
  night: [
    { place: 'crib', anim: 'empathy', ms: 12000 },
    { place: 'sofa', anim: 'journal', ms: 12000 },
    { place: 'window', anim: 'neutral', ms: 8000 },
  ],
};

/** Mila in her crib (static render, tinted, until she has her own). */
export const MILA = { x: 66, y: 324, w: 56, src: '/cozie/home/cozie_neutral.png', foot: 0.72 };

export const pct = {
  x: (v: number) => `${(v / ROOM_W) * 100}%`,
  y: (v: number) => `${((v + ART_Y) / ROOM_H) * 100}%`,
  /** A height (no offset). */
  h: (v: number) => `${(v / ROOM_H) * 100}%`,
};
