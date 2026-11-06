'use client';

// Tiny music engine for the prenatal device's 作曲. Everything is synthesised
// with the Web Audio API — no audio files. Melodies use a major pentatonic
// scale, so whatever line the mom draws, it sounds sweet.

export type Instrument = 'musicbox' | 'harp' | 'piano';
export type Mood = 'sleep' | 'happy' | 'miss';

/** A melody: one pitch index (0 = lowest … 4 = highest) per step, or null
 *  for a rest. 16 steps at most. */
export interface Song {
  id: string;
  title: string;
  day: number;
  createdAt: number;
  notes: Array<number | null>;
  instrument: Instrument;
  mood: Mood;
  beat: boolean;
  /** Cozie's soft closing chord, added on save. */
  outro: boolean;
  /** Mom's humming, as a data URL (optional). */
  voice?: string;
  voiceSec?: number;
}

export const STEPS = 16;

// C major pentatonic; the music box sits an octave higher.
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0]; // C4 D4 E4 G4 A4
const OCTAVE: Record<Instrument, number> = { musicbox: 2, harp: 1, piano: 1 };
const TEMPO: Record<Mood, number> = { sleep: 0.42, happy: 0.26, miss: 0.36 }; // seconds per step

let ctx: AudioContext | null = null;

/** The shared audio context, created / resumed on a user gesture. */
export function audio(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function echoBus(ac: AudioContext, out: AudioNode) {
  const delay = ac.createDelay(1);
  delay.delayTime.value = 0.32;
  const fb = ac.createGain();
  fb.gain.value = 0.32;
  const wet = ac.createGain();
  wet.gain.value = 0.35;
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(out);
  return delay;
}

/** One plucked note. */
export function pluck(pitch: number, instrument: Instrument, mood: Mood, when = 0, chordOffset = 0) {
  const ac = audio();
  const t = (when || ac.currentTime) + 0.005;
  const freq = PENTA[Math.max(0, Math.min(4, pitch))] * OCTAVE[instrument] * Math.pow(2, chordOffset / 12);
  const master = ac.createGain();
  master.gain.value = 0.22;
  master.connect(ac.destination);
  const dest: AudioNode = mood === 'miss' ? (() => {
    const bus = echoBus(ac, ac.destination);
    master.connect(bus);
    return master;
  })() : master;

  const env = ac.createGain();
  env.connect(dest);
  const decay = instrument === 'musicbox' ? 1.3 : instrument === 'harp' ? 1.6 : 1.1;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(1, t + (instrument === 'piano' ? 0.008 : 0.004));
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);

  const voices: Array<[OscillatorType, number, number]> =
    instrument === 'musicbox'
      ? [['sine', 1, 0.8], ['sine', 2, 0.25], ['triangle', 3, 0.06]]
      : instrument === 'harp'
        ? [['triangle', 1, 0.8], ['sine', 2, 0.18]]
        : [['triangle', 1, 0.6], ['sine', 1, 0.4], ['sine', 2, 0.15]];

  let node: AudioNode = env;
  if (instrument !== 'musicbox') {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = instrument === 'harp' ? 2600 : 1800;
    lp.connect(env);
    node = lp;
  }
  for (const [type, mult, gain] of voices) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * mult;
    const g = ac.createGain();
    g.gain.value = gain;
    osc.connect(g).connect(node);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
}

/** A soft heartbeat-like thump for the optional beat. */
function thump(when: number) {
  const ac = audio();
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(90, when);
  osc.frequency.exponentialRampToValueAtTime(48, when + 0.18);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.35, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
  osc.connect(g).connect(ac.destination);
  osc.start(when);
  osc.stop(when + 0.25);
}

export interface Playback {
  stop: () => void;
  /** Seconds until the melody (and outro) finish. */
  duration: number;
}

/** Play a melody. `onStep` fires as each step sounds (index, or -1 at the end). */
export function playSong(
  song: Pick<Song, 'notes' | 'instrument' | 'mood' | 'beat' | 'outro' | 'voice'>,
  onStep?: (i: number) => void
): Playback {
  const ac = audio();
  const step = TEMPO[song.mood];
  const start = ac.currentTime + 0.08;
  const timers: Array<ReturnType<typeof setTimeout>> = [];
  let voiceEl: HTMLAudioElement | null = null;
  const last = song.notes.reduce<number>((acc, n, i) => (n === null ? acc : i), -1);
  song.notes.forEach((n, i) => {
    const at = start + i * step;
    if (n !== null) pluck(n, song.instrument, song.mood, at);
    if (song.beat && i % 2 === 0 && i <= last) thump(at);
    timers.push(setTimeout(() => onStep?.(i), (at - ac.currentTime) * 1000));
  });
  let end = start + (last + 1) * step;
  if (song.outro && last >= 0) {
    // Cozie's ending: a gentle rolled tonic chord.
    [0, 2, 3].forEach((p, k) => pluck(p, song.instrument, song.mood, end + k * 0.12));
    end += 1.4;
  }
  timers.push(
    setTimeout(() => {
      if (song.voice) {
        voiceEl = new Audio(song.voice);
        void voiceEl.play().catch(() => {});
        voiceEl.onended = () => onStep?.(-1);
      } else onStep?.(-1);
    }, (end - ac.currentTime) * 1000)
  );
  return {
    duration: end - ac.currentTime,
    stop: () => {
      timers.forEach(clearTimeout);
      voiceEl?.pause();
    },
  };
}

/** Seconds a song lasts (melody + outro + voice). */
export function songLength(song: Song) {
  const last = song.notes.reduce<number>((acc, n, i) => (n === null ? acc : i), -1);
  return Math.round((last + 1) * TEMPO[song.mood] + (song.outro ? 1.4 : 0) + (song.voiceSec ?? 0));
}
