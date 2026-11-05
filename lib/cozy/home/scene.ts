// Layout of Cozie's room (the warm attic from the room concept), in the room
// art's 300×620 canvas, which covers a phone screen. Swapping the placeholder
// SVG for rendered layers only means updating the numbers here.

import type { Slot, SpotId } from '../life/script';
import type { CozieAnim } from './anims';

export const ROOM_W = 300;
export const ROOM_H = 620;

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
  { id: 'shelf', label: '书架', hit: { x: 10, y: 236, w: 104, h: 196 }, dot: { x: 106, y: 272 }, stand: { x: 132, y: 470 } },
  { id: 'fridge', label: '便签板', hit: { x: 116, y: 258, w: 58, h: 52 }, dot: { x: 168, y: 264 }, stand: { x: 150, y: 466 } },
  { id: 'calendar', label: '日历', hit: { x: 122, y: 312, w: 44, h: 42 }, dot: { x: 160, y: 318 }, stand: { x: 152, y: 468 } },
  { id: 'mailbox', label: '窗台', hit: { x: 222, y: 336, w: 60, h: 34 }, dot: { x: 268, y: 344 }, stand: { x: 196, y: 484 } },
  { id: 'crib', label: 'Mila 的小床', hit: { x: 198, y: 398, w: 102, h: 92 }, dot: { x: 286, y: 412 }, stand: { x: 186, y: 500 } },
  { id: 'table', label: '吸奶器小凳', hit: { x: 84, y: 430, w: 58, h: 78 }, dot: { x: 136, y: 436 }, stand: { x: 152, y: 516 } },
];

export const SPOT_BY_ID = Object.fromEntries(SPOTS.map((s) => [s.id, s])) as Record<SpotId, SpotDef>;

/** Every place Cozie can be: the tappable spots plus a few of her own. */
export type Place = SpotId | 'window' | 'rug' | 'sofa';

export const PLACES: Record<Place, Point> = {
  ...(Object.fromEntries(SPOTS.map((s) => [s.id, s.stand])) as Record<SpotId, Point>),
  window: { x: 206, y: 478 },
  rug: { x: 164, y: 514 },
  sofa: { x: 52, y: 468 },
};

/** Cozie's image width (square frames), in room units. */
export const COZIE_W = 136;

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
export const MILA = { x: 252, y: 452, w: 58, src: '/cozie/home/cozie_neutral.png', foot: 0.72 };

export const pct = {
  x: (v: number) => `${(v / ROOM_W) * 100}%`,
  y: (v: number) => `${(v / ROOM_H) * 100}%`,
  h: (v: number) => `${(v / ROOM_H) * 100}%`,
};
