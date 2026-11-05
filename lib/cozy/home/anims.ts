// Cozie's IP animations (from the design team's PNG sequences, re-encoded as
// looping animated WebP at 320px / 12fps). `foot` is how far down the square
// frame her lowest point sits, so every animation stands on the same spot;
// `top` is where her ears start, for anchoring the speech bubble.

export type CozieAnim =
  | 'neutral'
  | 'happy'
  | 'thinking'
  | 'listening'
  | 'journal'
  | 'discovery'
  | 'empathy'
  | 'encourage'
  | 'celebrate'
  | 'stars';

export const ANIMS: Record<CozieAnim, { src: string; foot: number; top: number }> = {
  neutral: { src: '/cozie/home/anim/neutral.webp', foot: 0.897, top: 0.15 },
  happy: { src: '/cozie/home/anim/happy.webp', foot: 0.916, top: 0.087 },
  thinking: { src: '/cozie/home/anim/thinking.webp', foot: 0.853, top: 0.125 },
  listening: { src: '/cozie/home/anim/listening.webp', foot: 0.863, top: 0.119 },
  journal: { src: '/cozie/home/anim/journal.webp', foot: 0.928, top: 0.113 },
  discovery: { src: '/cozie/home/anim/discovery.webp', foot: 0.878, top: 0.178 },
  empathy: { src: '/cozie/home/anim/empathy.webp', foot: 0.912, top: 0.166 },
  encourage: { src: '/cozie/home/anim/encourage.webp', foot: 0.966, top: 0.153 },
  celebrate: { src: '/cozie/home/anim/celebrate.webp', foot: 0.963, top: 0.094 },
  stars: { src: '/cozie/home/anim/stars.webp', foot: 0.906, top: 0.147 },
};
