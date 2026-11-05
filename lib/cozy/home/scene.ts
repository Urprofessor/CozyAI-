// Layout of Cozie's room, measured on the generated room art
// (public/cozie/home/room). Units: the afternoon background is 300 wide and
// 620 tall; every layer is placed in that space. Swapping art means
// re-measuring the numbers here.

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
  { id: 'shelf', label: '书架', hit: { x: 6, y: 150, w: 104, h: 168 }, dot: { x: 98, y: 168 }, stand: { x: 122, y: 352 } },
  { id: 'fridge', label: '便签板', hit: { x: 120, y: 147, w: 58, h: 54 }, dot: { x: 174, y: 150 }, stand: { x: 150, y: 342 } },
  { id: 'calendar', label: '日历', hit: { x: 126, y: 206, w: 48, h: 48 }, dot: { x: 170, y: 210 }, stand: { x: 152, y: 344 } },
  { id: 'mailbox', label: '窗台', hit: { x: 226, y: 226, w: 74, h: 36 }, dot: { x: 282, y: 236 }, stand: { x: 204, y: 356 } },
  { id: 'crib', label: 'Mila 的小床', hit: { x: 186, y: 262, w: 114, h: 86 }, dot: { x: 288, y: 270 }, stand: { x: 178, y: 366 } },
  { id: 'table', label: '吸奶器小凳', hit: { x: 44, y: 280, w: 66, h: 70 }, dot: { x: 102, y: 286 }, stand: { x: 128, y: 366 } },
];

export const SPOT_BY_ID = Object.fromEntries(SPOTS.map((s) => [s.id, s])) as Record<SpotId, SpotDef>;

/** Every place Cozie can be: the tappable spots plus a few of her own. */
export type Place = SpotId | 'window' | 'rug' | 'sofa';

export const PLACES: Record<Place, Point> = {
  ...(Object.fromEntries(SPOTS.map((s) => [s.id, s.stand])) as Record<SpotId, Point>),
  window: { x: 206, y: 356 },
  rug: { x: 172, y: 374 },
  sofa: { x: 40, y: 334 },
};

/** Cozie's frame width (square), in room units; her body is ~47% of it. */
export const COZIE_W = 150;

/** What she does on her own, by part of the day. She drifts between these
 *  while nobody is talking to her. */
export const ROUTINES: Record<Slot, Array<{ place: Place; anim: CozieAnim; ms: number }>> = {
  morning: [
    { place: 'window', anim: 'idle', ms: 9000 },
    { place: 'rug', anim: 'fold', ms: 12000 },
    { place: 'shelf', anim: 'look', ms: 8000 },
  ],
  afternoon: [
    { place: 'rug', anim: 'journal', ms: 14000 },
    { place: 'calendar', anim: 'look', ms: 8000 },
    { place: 'sofa', anim: 'sit', ms: 12000 },
  ],
  night: [
    { place: 'crib', anim: 'tend', ms: 12000 },
    { place: 'sofa', anim: 'sit', ms: 12000 },
    { place: 'rug', anim: 'fold', ms: 10000 },
  ],
};

const ROOM = '/cozie/home/room';

/** Background per part of the day. The night render has extra ceiling, so it
 *  is drawn taller and shifted up to line up with the others. */
export const BACKGROUNDS: Record<Slot, { src: string; top: number; h: number }> = {
  morning: { src: `${ROOM}/bg_morning.webp`, top: 0, h: 620 },
  afternoon: { src: `${ROOM}/bg_afternoon.webp`, top: 0, h: 620 },
  night: { src: `${ROOM}/bg_night.webp`, top: -75, h: 781 },
};

export const CRIB_FRONT = { x: 184.5, y: 282, w: 118.5, h: 59.25, src: (s: Slot) => `${ROOM}/crib_${s}.webp` };

/** Foreground (plant, pouf): full width, sitting on the bottom edge. */
export const FOREGROUND = { h: 450, src: (s: Slot) => `${ROOM}/fg_${s}.webp` };

export type MilaMood = 'sleep' | 'awake' | 'smile';
/** Mila peeking over the crib rail: centre x, bottom y, frame width. */
export const MILA = { x: 241.5, y: 304, w: 90, foot: 0.73, src: (m: MilaMood, s: Slot) => `${ROOM}/mila_${m}_${s}.webp` };

/** Props that appear when something new arrives. */
export const PROPS = {
  letter: { x: 236, y: 238, w: 46, src: `${ROOM}/letter.webp` },
  note: { x: 150, y: 160, w: 20, src: `${ROOM}/note.webp` },
};

export const FACES = { cozie: `${ROOM}/cozie_face.webp`, mila: `${ROOM}/mila_face.webp` };

export const pct = {
  x: (v: number) => `${(v / ROOM_W) * 100}%`,
  y: (v: number) => `${(v / ROOM_H) * 100}%`,
  h: (v: number) => `${(v / ROOM_H) * 100}%`,
};

/** Halloween dressing: decorations in the room and Cozie in her witch hat
 *  and cape. Positions in room units; `y` is the top edge. */
const HW = '/cozie/home/halloween';
export const HALLOWEEN = {
  bunting: { x: 28, y: 78, w: 204, src: `${HW}/bunting.webp`, aspect: 0.283 },
  ghost: { x: 246, y: 96, w: 34, src: `${HW}/ghost.webp`, aspect: 2.429 },
  pumpkins: { x: 234, y: 344, w: 62, src: `${HW}/pumpkins.webp`, aspect: 0.833 },
  cozie: {
    idle: { src: `${HW}/cozie_witch_idle.webp`, top: 0.169 },
    phone: { src: `${HW}/cozie_witch_phone.webp`, top: 0.169 },
  },
};

/** Halloween dressing is on by default around Halloween (Oct 20 – Nov 10). */
export function isHalloweenSeason(d = new Date()) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return (m === 10 && day >= 20) || (m === 11 && day <= 10);
}

/** The Momcozy device the mom has bound. A pump user sees the pumps on the
 *  stool (baked into the room art); a prenatal-device user sees the 胎教仪. */
export type BoundDevice = 'pump' | 'prenatal';

const DEV = '/cozie/home/device';
/** The prenatal device. Until the room art has an empty-stool variant it
 *  sits on the armchair seat. `y` is the top edge. */
export const PRENATAL = {
  x: 13,
  y: 302,
  w: 42,
  aspect: 0.64,
  src: { off: `${DEV}/prenatal_off.webp`, on: `${DEV}/prenatal_on.webp` },
  spot: { hit: { x: 0, y: 288, w: 62, h: 50 }, dot: { x: 52, y: 294 }, stand: { x: 80, y: 356 } },
};
