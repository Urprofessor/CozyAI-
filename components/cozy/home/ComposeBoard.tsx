'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ANIMS } from '@/lib/cozy/home/anims';
import { COMPOSE_ART, STAFF } from '@/lib/cozy/home/scene';
import { STEPS, audio, pluck, playSong, type Instrument, type Mood, type Playback, type Song } from '@/lib/cozy/home/music';
import { showToast } from '../ui';

// Full-screen compose page for the prenatal device's 作曲. The mom draws a
// line across the staff from left to right; each of the 16 steps the line
// crosses becomes a note on the nearest staff line (pentatonic, so it always
// sounds sweet). She can pick an instrument and a mood, add a soft beat, and
// record up to 15 seconds of humming. On save Cozie adds a closing chord.

const INSTRUMENTS: Array<{ id: Instrument; label: string }> = [
  { id: 'musicbox', label: '音乐盒' },
  { id: 'harp', label: '竖琴' },
  { id: 'piano', label: '钢琴' },
];
const MOODS: Array<{ id: Mood; label: string }> = [
  { id: 'sleep', label: '安睡' },
  { id: 'happy', label: '开心' },
  { id: 'miss', label: '想你' },
];
const MAX_VOICE_SEC = 15;
const CHEERS = ['好好听呀', '宝宝在肚子里也能听见', '这一段好温柔', '再划一段试试？'];

type SongDraft = Omit<Song, 'id' | 'createdAt' | 'day'>;

interface Props {
  defaultTitle: string;
  halloween: boolean;
  onClose: () => void;
  onSave: (song: SongDraft) => void;
}

const empty = () => Array<number | null>(STEPS).fill(null);
const stepX = (i: number) => STAFF.x0 + ((i + 0.5) * (STAFF.x1 - STAFF.x0)) / STEPS;
const pitchAt = (y: number) => {
  let best = 0;
  STAFF.lines.forEach((ly, k) => {
    if (Math.abs(ly - y) < Math.abs(STAFF.lines[best] - y)) best = k;
  });
  return STAFF.lines.length - 1 - best; // top line = highest pitch
};
const lineY = (pitch: number) => STAFF.lines[STAFF.lines.length - 1 - pitch];

export function ComposeBoard({ defaultTitle, halloween, onClose, onSave }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState<Array<number | null>>(empty);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const [trail, setTrail] = useState<Array<[number, number]>>([]);
  const drawingRef = useRef<{ last: [number, number] } | null>(null);
  const [instrument, setInstrument] = useState<Instrument>('musicbox');
  const [mood, setMood] = useState<Mood>('sleep');
  const [beat, setBeat] = useState(false);
  const [playingStep, setPlayingStep] = useState<number | null>(null);
  const playbackRef = useRef<Playback | null>(null);
  const [cheer, setCheer] = useState<string | null>('来，给宝宝写一首歌吧～');
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Humming.
  const [rec, setRec] = useState<'idle' | 'recording' | 'done'>('idle');
  const [recSec, setRecSec] = useState(0);
  const [voice, setVoice] = useState<{ src: string; sec: number } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const voicePlayer = useRef<HTMLAudioElement | null>(null);

  const hasNotes = notes.some((n) => n !== null);
  const playing = playingStep !== null;

  useEffect(
    () => () => {
      playbackRef.current?.stop();
      recorderRef.current?.state === 'recording' && recorderRef.current.stop();
      voicePlayer.current?.pause();
    },
    []
  );

  useEffect(() => {
    if (!cheer || saving) return;
    const t = setTimeout(() => setCheer(null), 2600);
    return () => clearTimeout(t);
  }, [cheer, saving]);

  // Recording timer, with the 15-second cap.
  useEffect(() => {
    if (rec !== 'recording') return;
    const started = Date.now();
    const t = setInterval(() => {
      const s = (Date.now() - started) / 1000;
      setRecSec(Math.min(MAX_VOICE_SEC, Math.floor(s)));
      if (s >= MAX_VOICE_SEC) recorderRef.current?.stop();
    }, 250);
    return () => clearInterval(t);
  }, [rec]);

  // ---------- Drawing the melody ----------

  function point(e: React.PointerEvent): [number, number] {
    const r = boardRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  /** Set every step whose centre lies between two points of the line. */
  function cross(a: [number, number], b: [number, number]) {
    const next = [...notesRef.current];
    let changed = false;
    const [lo, hi] = a[0] <= b[0] ? [a, b] : [b, a];
    for (let i = 0; i < STEPS; i++) {
      const sx = stepX(i);
      if (sx < lo[0] || sx > hi[0]) continue;
      const t = hi[0] === lo[0] ? 0 : (sx - lo[0]) / (hi[0] - lo[0]);
      const p = pitchAt(lo[1] + (hi[1] - lo[1]) * t);
      if (next[i] !== p) {
        next[i] = p;
        changed = true;
        pluck(p, instrument, mood); // hear it as you draw
      }
    }
    if (changed) {
      notesRef.current = next;
      setNotes(next);
    }
  }

  function down(e: React.PointerEvent<HTMLDivElement>) {
    if (saving) return;
    playbackRef.current?.stop();
    setPlayingStep(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    drawingRef.current = { last: p };
    notesRef.current = empty();
    setNotes(notesRef.current);
    setTrail([p]);
    cross(p, p);
  }

  function move(e: React.PointerEvent<HTMLDivElement>) {
    const d = drawingRef.current;
    if (!d) return;
    const p = point(e);
    cross(d.last, p);
    d.last = p;
    setTrail((t) => [...t, p]);
  }

  function up() {
    if (!drawingRef.current) return;
    drawingRef.current = null;
    if (notesRef.current.some((n) => n !== null)) setCheer(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
  }

  function redo() {
    playbackRef.current?.stop();
    setPlayingStep(null);
    setNotes(empty());
    setTrail([]);
  }

  // ---------- Playing ----------

  function togglePlay() {
    if (playing) {
      playbackRef.current?.stop();
      setPlayingStep(null);
      return;
    }
    if (!hasNotes) return;
    setPlayingStep(-1);
    playbackRef.current = playSong({ notes, instrument, mood, beat, outro: false, voice: voice?.src }, (i) =>
      setPlayingStep(i === -1 ? null : i)
    );
  }

  // ---------- Humming ----------

  async function toggleRecord() {
    if (rec === 'recording') {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showToast('这个浏览器不支持录音');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const started = Date.now();
      recorder.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const sec = Math.max(1, Math.min(MAX_VOICE_SEC, Math.round((Date.now() - started) / 1000)));
        const reader = new FileReader();
        reader.onload = () => {
          setVoice({ src: String(reader.result), sec });
          setRec('done');
          setCheer('好温柔的声音');
        };
        reader.readAsDataURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorderRef.current = recorder;
      setRecSec(0);
      setRec('recording');
      recorder.start();
    } catch {
      setRec('idle');
      showToast('需要麦克风权限才能录音');
    }
  }

  function playVoice() {
    if (!voice) return;
    voicePlayer.current?.pause();
    voicePlayer.current = new Audio(voice.src);
    void voicePlayer.current.play().catch(() => {});
  }

  // ---------- Saving ----------

  function save() {
    if (!hasNotes || saving) return;
    playbackRef.current?.stop();
    setPlayingStep(null);
    setSaving(true);
    setCheer('我帮你加了个结尾～');
    // Cozie's closing chord, rolled gently.
    const t0 = audio().currentTime;
    [0, 2, 3].forEach((p, k) => pluck(p, instrument, mood, t0 + 0.05 + k * 0.12));
    setTimeout(() => {
      onSave({ title: defaultTitle, notes, instrument, mood, beat, outro: true, voice: voice?.src, voiceSec: voice?.sec });
    }, 1300);
  }

  const trailPath = trail.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * 100).toFixed(2)} ${(y * 100).toFixed(2)}`).join(' ');

  return (
    <div className="ch-cmp" role="dialog" aria-label="作曲" style={{ backgroundImage: `url(${COMPOSE_ART.bg})` }}>
      <header className="ch-draw__top">
        <button
          type="button"
          className="cz-glass-btn"
          onClick={() => (hasNotes || voice ? setConfirmLeave(true) : onClose())}
          aria-label="关闭作曲"
        >
          <X size={22} strokeWidth={1.8} />
        </button>
        <strong>给宝宝写一首歌</strong>
        <button type="button" className="ch-draw__save" onClick={save} disabled={!hasNotes || saving}>
          保存
        </button>
      </header>

      <div className="ch-cmp__scroll">
        <div className="ch-cmp__boardwrap">
          <div
            ref={boardRef}
            className="ch-cmp__board"
            style={{ backgroundImage: `url(${COMPOSE_ART.board})`, aspectRatio: `1 / ${STAFF.aspect}` }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            aria-label="旋律小路：从左往右划"
          >
            <svg className="ch-cmp__trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {trailPath && <path d={trailPath} />}
            </svg>
            {notes.map((n, i) =>
              n === null ? null : (
                <img
                  key={`${i}-${n}`}
                  className={cn('ch-cmp__note', playingStep === i && 'is-on')}
                  src={COMPOSE_ART.note(n, playingStep === i)}
                  alt=""
                  style={{ left: `${stepX(i) * 100}%`, top: `${lineY(n) * 100}%` }}
                />
              )
            )}
          </div>
          <div className="ch-cmp__cozie" aria-live="polite">
            <img src={cheer || playing ? COMPOSE_ART.peekHappy : COMPOSE_ART.peek} alt="" />
            {cheer && <span key={cheer}>{cheer}</span>}
          </div>
        </div>

        <div className="ch-cmp__transport">
          <button type="button" className="ch-cmp__icon" onClick={redo} disabled={!hasNotes} aria-label="重画">
            <img src={COMPOSE_ART.ctl('btn_redo', hasNotes ? '' : 'off')} alt="" />
          </button>
          <button type="button" className="ch-cmp__play" onClick={togglePlay} disabled={!hasNotes} aria-label={playing ? '暂停' : '播放'}>
            <img src={COMPOSE_ART.ctl(playing ? 'btn_pause' : 'btn_play', hasNotes ? '' : 'off')} alt="" />
          </button>
          <button
            type="button"
            className="ch-cmp__icon"
            onClick={() => setBeat((b) => !b)}
            aria-label="节拍"
            aria-pressed={beat}
          >
            <img src={COMPOSE_ART.ctl('btn_beat', beat ? 'on' : '')} alt="" />
          </button>
        </div>

        <div className="ch-cmp__row">
          {INSTRUMENTS.map((it) => (
            <button
              key={it.id}
              type="button"
              className={cn('ch-cmp__tile', instrument === it.id && 'is-on')}
              onClick={() => {
                setInstrument(it.id);
                pluck(2, it.id, mood);
              }}
              aria-pressed={instrument === it.id}
            >
              <img src={COMPOSE_ART.ctl(`inst_${it.id}`, instrument === it.id ? 'on' : '')} alt="" />
              <span>{it.label}</span>
            </button>
          ))}
        </div>

        <div className="ch-cmp__row">
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={cn('ch-cmp__pill', mood === m.id && 'is-on')}
              onClick={() => setMood(m.id)}
              aria-pressed={mood === m.id}
            >
              <img src={COMPOSE_ART.ctl(`mood_${m.id}`, mood === m.id ? 'on' : '')} alt="" />
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        <div className={cn('ch-cmp__voice', rec === 'recording' && 'is-recording')}>
          {rec === 'done' && voice ? (
            <div className="ch-cmp__chip" style={{ backgroundImage: `url(${COMPOSE_ART.voiceChip})` }}>
              <span className="ch-cmp__wave" aria-hidden>
                {Array.from({ length: 18 }, (_, i) => (
                  <i key={i} style={{ height: `${30 + ((i * 37) % 60)}%` }} />
                ))}
              </span>
              <span className="ch-cmp__sec">0:{String(voice.sec).padStart(2, '0')}</span>
              <button type="button" onClick={playVoice} aria-label="试听哼唱">
                <img src={COMPOSE_ART.ctl('btn_voice_play')} alt="" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoice(null);
                  setRec('idle');
                }}
                aria-label="删除哼唱"
              >
                <img src={COMPOSE_ART.ctl('btn_voice_delete')} alt="" />
              </button>
            </div>
          ) : (
            <>
              <button type="button" className="ch-cmp__mic" onClick={toggleRecord} aria-label={rec === 'recording' ? '停止录音' : '录一段哼唱'}>
                <img src={COMPOSE_ART.ctl('btn_mic', rec === 'recording' ? 'on' : '')} alt="" />
              </button>
              <div className="ch-cmp__voicetext">
                <strong>{rec === 'recording' ? `正在听你哼… 0:${String(recSec).padStart(2, '0')}` : '也可以哼一小段'}</strong>
                <span>{rec === 'recording' ? '再点一下停止，最长 15 秒' : '把你的声音，一起送给宝宝'}</span>
              </div>
              {rec === 'recording' && (
                <img
                  className="ch-cmp__listener"
                  src={ANIMS[halloween ? 'hum_halloween' : 'record_listen'].src}
                  alt=""
                  aria-hidden
                />
              )}
            </>
          )}
        </div>

        <p className="ch-cmp__hint">{hasNotes ? '点播放听听看，或者再划一段' : '从左往右轻轻划，让旋律慢慢长出来'}</p>
      </div>

      {confirmLeave && (
        <div className="cz-alert-scrim" onClick={() => setConfirmLeave(false)}>
          <div className="cz-alert" role="alertdialog" aria-label="不保存就离开吗？" onClick={(e) => e.stopPropagation()}>
            <strong>不保存就离开吗？</strong>
            <p>这首歌还没保存，离开后就没有了。</p>
            <div className="cz-alert__actions">
              <button type="button" onClick={() => setConfirmLeave(false)}>
                继续写
              </button>
              <button type="button" className="is-destructive" onClick={onClose}>
                离开
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
