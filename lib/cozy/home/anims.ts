// Cozie's animations, cut from the generated sprite sheets (docs/cozie-home-art)
// into looping animated WebP: 320×320, 12fps. Every animation is normalised so
// her body is the same width and her lowest point sits at `FOOT` of the frame;
// `top` is where her ears (or a prop) start, for anchoring the speech bubble.

export type CozieAnim =
  | 'idle'
  | 'listen'
  | 'think'
  | 'journal'
  | 'look'
  | 'empathy'
  | 'happy'
  | 'celebrate'
  | 'encourage'
  | 'stars'
  | 'sit'
  | 'tend'
  | 'fold'
  | 'phone'
  | 'phoneup'
  | 'hop'
  | 'hum'
  | 'hum_halloween'
  | 'play_crib'
  | 'record_listen';

export const FOOT = 290 / 320;

const TOP: Record<CozieAnim, number> = {
  idle: 0.169,
  listen: 0.156,
  think: 0.122,
  journal: 0.209,
  look: 0.228,
  empathy: 0.2,
  happy: 0.209,
  celebrate: 0.144,
  encourage: 0.163,
  stars: 0.181,
  sit: 0.175,
  tend: 0.172,
  fold: 0.203,
  phone: 0.172,
  phoneup: 0.203,
  hop: 0.119,
  hum: 0.166,
  hum_halloween: 0.172,
  play_crib: 0.169,
  record_listen: 0.172,
};

export const ANIMS = Object.fromEntries(
  (Object.keys(TOP) as CozieAnim[]).map((k) => [k, { src: `/cozie/home/anim/c_${k}.webp`, top: TOP[k] }])
) as Record<CozieAnim, { src: string; top: number }>;
