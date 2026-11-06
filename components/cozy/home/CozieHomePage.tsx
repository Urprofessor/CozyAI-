'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ChevronLeft, Clock3, Mail, MessageCircleMore, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CozieLife } from '@/hooks/useCozieLife';
import type { CozyProfile } from '@/lib/cozy/profile';
import type { LetterContent } from '@/lib/cozy/letters';
import { detectDangerSignal } from '@/lib/cozy/keywords';
import {
  SLOT_LABELS,
  clockFor,
  collectedLetters,
  cozieLine,
  fill,
  personaFrom,
  spotViews,
  unreadSpots,
  type LifeClock,
} from '@/lib/cozy/life/engine';
import { LIFE_LETTERS, type LifeChoice, type Slot, type SpotId } from '@/lib/cozy/life/script';
import { URGENT_REPLY, parseAction, topicOf } from '@/lib/cozy/life/topics';
import { ANIMS, FOOT, type CozieAnim } from '@/lib/cozy/home/anims';
import {
  BACKGROUNDS,
  BOARD_PIN,
  COMPOSE_ART,
  DRAW_ART,
  COZIE_W,
  CRIB_FRONT,
  FACES,
  FOREGROUND,
  HALLOWEEN,
  MILA,
  MOBILE,
  PLACES,
  PRENATAL,
  PROPS,
  ROOM_H,
  ROUTINES,
  SPOTS,
  isHalloweenSeason,
  pct,
  type BoundDevice,
  type MilaMood,
  type Place,
} from '@/lib/cozy/home/scene';
import { useDrawings, type Drawing } from '@/hooks/useDrawings';
import { CozieLetter } from '../CozieLetter';
import { DrawingBoard, Framed } from './DrawingBoard';
import { ComposeBoard } from './ComposeBoard';
import { useSongs } from '@/hooks/useSongs';
import { playSong, songLength, type Playback, type Song } from '@/lib/cozy/home/music';
import { BottomSheet, showToast } from '../ui';

interface Props {
  life: CozieLife;
  profile: CozyProfile;
  onBack: () => void;
}

/** Glass bubble over her head: her current line, or a spot in the room. */
type Bubble = { kind: 'cozie' } | { kind: 'spot'; spot: SpotId };

interface Msg {
  id: number;
  /** 'note' = a quiet status line in the thread ("Cozie put her phone down"). */
  who: 'you' | 'cozie' | 'note';
  text: string;
  /** Your messages: sent → read (she picked them up) or failed. */
  status?: 'sent' | 'read' | 'failed';
  urgent?: boolean;
  /** Her check-in after you went quiet; she only sends one. */
  nudge?: boolean;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** How long you wait after your last message before she answers — long
 *  enough to send a second line, like texting a person. */
const REPLY_AFTER_MS = 1100;

/** Going quiet: how long before she checks in or puts the phone down. */
const QUIET_MS = 22_000;
const QUIET_AFTER_NUDGE_MS = 18_000;
const QUIET_EMPTY_MS = 25_000;

/** What she goes back to, by routine animation, for the thread note. */
const ACTIVITY: Partial<Record<CozieAnim, string>> = {
  fold: '去叠小衣服',
  journal: '去写日记',
  look: '去翻翻书架',
  sit: '去沙发上歇会儿',
  tend: '去看看 Mila',
  idle: '去窗边站会儿',
};

const NUDGES = [
  '还在吗？不着急，忙完再回我就好',
  '是不是{baby}醒了？你先去吧',
  '你那边还好吗？',
  '我先不吵你啦，想聊随时叫我',
];

function nudgeLine(persona: ReturnType<typeof personaFrom>) {
  return fill(NUDGES[Math.floor(Math.random() * NUDGES.length)], persona);
}

/** Cozie's home: a full-screen room where she goes about her day. Chatting
 *  pulls up a glass thread from the bottom; she stays where she is, picks up
 *  her phone and texts back in a few short messages, like a person would. */
export function CozieHomePage({ life, profile, onBack }: Props) {
  const persona = useMemo(() => personaFrom(profile), [profile]);
  const [now, setNow] = useState(() => Date.now());
  const [slotOverride, setSlotOverride] = useState<Slot | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [reaction, setReaction] = useState<CozieAnim | null>(null);
  const [draft, setDraft] = useState('');
  const [thread, setThread] = useState<Msg[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [cozieTyping, setCozieTyping] = useState(false);
  const [unseen, setUnseen] = useState(0);
  /** Her latest text, also shown over her head for a while. */
  const [headMsg, setHeadMsg] = useState<{ id: number; text: string } | null>(null);
  const [chatPlace, setChatPlace] = useState<Place | null>(null);
  /** Chat is open but she has put the phone down. */
  const [away, setAway] = useState(false);
  const [routineIdx, setRoutineIdx] = useState(0);
  const [letter, setLetter] = useState<{ content: LetterContent; mode: 'arrive' | 'reread'; eventId?: string } | null>(
    null
  );
  const [mailOpen, setMailOpen] = useState(false);
  const [halloween, setHalloween] = useState(() => isHalloweenSeason());
  const [deviceOn, setDeviceOn] = useState(false);
  const [deviceReply, setDeviceReply] = useState<string | null>(null);
  // Drawings (作画): made on a full-screen board, pinned to the wall board.
  const drawingStore = useDrawings();
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [viewing, setViewing] = useState<Drawing | null>(null);
  const [newDrawing, setNewDrawing] = useState(false);
  const [justPinned, setJustPinned] = useState(false);
  const latestDrawing = drawingStore.drawings[0] ?? null;
  // Songs (作曲): written on a full-screen staff, hung on the crib mobile.
  const songStore = useSongs();
  const [composeOpen, setComposeOpen] = useState(false);
  const [songsOpen, setSongsOpen] = useState(false);
  const [newSong, setNewSong] = useState(false);
  const [flyNote, setFlyNote] = useState<number | null>(null);
  const [mobileSpin, setMobileSpin] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<{ id: string; toBaby: boolean } | null>(null);
  const playbackRef = useRef<Playback | null>(null);
  const [clockOpen, setClockOpen] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const cozieImgRef = useRef<HTMLImageElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const threadElRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<Msg[]>([]);
  threadRef.current = thread;
  const chatOpenRef = useRef(false);
  chatOpenRef.current = chatOpen;
  const msgSeq = useRef(0);
  const replySeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const later = useCallback((key: string, ms: number, fn: () => void) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, ms);
  }, []);

  const { begin, ready } = life;
  useEffect(() => {
    if (ready) begin();
  }, [ready, begin]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    const all = timers.current;
    return () => {
      clearInterval(t);
      Object.values(all).forEach(clearTimeout);
      abortRef.current?.abort();
    };
  }, []);

  // Warm the animation cache so switching doesn't flash.
  useEffect(() => {
    const t = setTimeout(() => {
      Object.values(ANIMS).forEach((a) => {
        const img = new Image();
        img.src = a.src;
      });
    }, 800);
    return () => clearTimeout(t);
  }, []);

  // Say hello on arrival.
  useEffect(() => {
    later('hello', 700, () => setBubble((b) => b ?? { kind: 'cozie' }));
  }, [later]);

  const clock: LifeClock = clockFor(life.state, now, slotOverride);
  const views = spotViews(life.state, clock, persona);
  const letters = collectedLetters(life.state, clock, persona);
  const routine = ROUTINES[clock.slot][routineIdx % ROUTINES[clock.slot].length];
  const device: BoundDevice = life.state.device ?? 'pump';
  // With the prenatal device bound, the stool spot becomes the device.
  const spots = SPOTS.map((s) =>
    s.id === 'table' && device === 'prenatal' ? { ...s, label: '胎教仪', ...PRENATAL.spot } : s
  );
  const hasNew = (id: SpotId) =>
    id === 'table' && device === 'prenatal' ? !deviceOn : views[id].unread || (id === 'fridge' && newDrawing);
  const unread = spots.map((s) => s.id).filter(hasNew);

  // ---------- Where she is and what she's doing ----------

  // While chatting she stays exactly where she was.
  // At night, with songs on the mobile, she plays them to Mila by the crib.
  const nightSong = clock.slot === 'night' && songStore.songs.length > 0 && routine.place === 'crib';
  const babyListening = Boolean(nowPlaying?.toBaby) || (nightSong && !chatOpen && bubble === null);
  const place: Place =
    chatOpen && chatPlace && !away
      ? chatPlace
      : nowPlaying?.toBaby
        ? 'crib'
        : bubble?.kind === 'spot'
          ? bubble.spot
          : routine.place;
  const [walk, setWalk] = useState<{ dir: number; key: number } | null>(null);
  const anim: CozieAnim =
    reaction ??
    (walk
      ? 'hop'
      : chatOpen && !away
        ? 'phone'
        : draft.length > 0
          ? 'listen'
          : nowPlaying
            ? nowPlaying.toBaby
              ? 'play_crib'
              : 'hum'
            : bubble?.kind === 'spot'
              ? 'look'
              : nightSong
                ? 'play_crib'
                : routine.anim);
  // In costume she only has two renders: holding the phone, and standing.
  const art = halloween
    ? anim === 'phone' || anim === 'phoneup'
      ? HALLOWEEN.cozie.phone
      : anim === 'hum' || anim === 'hum_halloween'
        ? ANIMS.hum_halloween
        : HALLOWEEN.cozie.idle
    : ANIMS[anim];
  const at = place === 'table' && device === 'prenatal' ? PRENATAL.spot.stand : PLACES[place];
  const bgArt = BACKGROUNDS[clock.slot];
  const milaMood: MilaMood =
    bubble?.kind === 'spot' && bubble.spot === 'crib' ? 'smile' : clock.slot === 'morning' ? 'awake' : 'sleep';

  // Hop while walking, leaning the way she goes.
  const lastX = useRef(at.x);
  const lastPlace = useRef(place);
  useEffect(() => {
    if (lastPlace.current === place) return;
    const dir = Math.sign(at.x - lastX.current) || 1;
    lastPlace.current = place;
    lastX.current = at.x;
    setWalk({ dir, key: Date.now() });
    later('walk', 800, () => setWalk(null));
  }, [place, at.x, later]);

  // Drift through her routine while nobody's with her.
  const busy = (chatOpen && !away) || bubble !== null || letter !== null || draft.length > 0;
  useEffect(() => {
    if (busy) return;
    const t = setTimeout(() => setRoutineIdx((i) => i + 1), routine.ms);
    return () => clearTimeout(t);
  }, [busy, routine.ms, routineIdx]);
  useEffect(() => setRoutineIdx(0), [clock.slot]);

  function react(a: CozieAnim, ms = 2600) {
    setReaction(a);
    later('react', ms, () => setReaction(null));
  }

  // ---------- Bubble follows her head ----------

  // Her latest text wins; the typing dots only show before her first one.
  const textOverHead = !away && bubble === null && headMsg !== null;
  const typingOverHead = !textOverHead && chatOpen && !away && cozieTyping && bubble === null;
  const bubbleVisible = bubble !== null || typingOverHead || textOverHead;
  useLayoutEffect(() => {
    if (!bubbleVisible) return;
    let raf = 0;
    const tick = () => {
      const page = pageRef.current;
      const img = cozieImgRef.current;
      const el = bubbleRef.current;
      if (page && img && el) {
        const p = page.getBoundingClientRect();
        const r = img.getBoundingClientRect();
        const w = el.offsetWidth;
        const cx = r.left - p.left + r.width / 2;
        const left = Math.min(Math.max(cx - w / 2, 12), p.width - w - 12);
        const top = r.top - p.top + r.height * art.top;
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.setProperty('--tail', `${Math.min(Math.max(cx - left, 22), w - 22)}px`);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [bubbleVisible, art.top]);

  // ---------- Chat ----------

  function openChat() {
    if (chatOpenRef.current) return;
    setChatPlace(place);
    setBubble(null);
    setUnseen(0);
    setAway(false);
    setChatOpen(true);
    react('phoneup', 650);
  }

  function closeChat() {
    if (!chatOpenRef.current) return;
    setChatOpen(false);
    setChatPlace(null);
    setAway(false);
    (document.activeElement as HTMLElement | null)?.blur?.();
  }

  // Keep the newest message in view.
  useEffect(() => {
    const el = threadElRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length, cozieTyping, chatOpen]);

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    openChat();
    if (away) {
      // She hears it and picks the phone back up, wherever she is now.
      setAway(false);
      setChatPlace(place);
      react('phoneup', 650);
    }
    setThread((t) => [...t, { id: ++msgSeq.current, who: 'you', text, status: 'sent' }]);
    // A new message cancels a reply in progress; she'll answer everything at once.
    abortRef.current?.abort();
    replySeq.current++;
    setCozieTyping(false);
    later('reply', detectDangerSignal(text) ? 300 : REPLY_AFTER_MS, () => void respond());
  }

  function pushCozie(text: string, urgent = false, nudge = false) {
    const id = ++msgSeq.current;
    setThread((t) => [...t, { id, who: 'cozie', text, urgent, nudge }]);
    // Over her head too, long enough to read, until the next one replaces it.
    setHeadMsg({ id, text });
    later('head', headMs(text, urgent), () => setHeadMsg((h) => (h?.id === id ? null : h)));
    if (!chatOpenRef.current) setUnseen((n) => n + 1);
  }

  /** Answer everything you've said since her last message. */
  async function respond() {
    const rid = ++replySeq.current;
    const alive = () => replySeq.current === rid;
    const all = threadRef.current;
    const lastCozie = all.map((m) => m.who).lastIndexOf('cozie');
    const pending = all.slice(lastCozie + 1).filter((m) => m.who === 'you');
    if (pending.length === 0) return;
    const said = pending.map((m) => m.text).join('\n');

    // She picks them up: read, and starts typing.
    setThread((t) => t.map((m) => (m.who === 'you' && m.status !== 'read' ? { ...m, status: 'read' } : m)));
    setCozieTyping(true);

    // Messages go out one by one, with a beat of typing between them.
    let chain = Promise.resolve();
    let sent = 0;
    const queue = (line: string, urgent = false) => {
      const first = sent === 0;
      sent++;
      chain = chain.then(async () => {
        await wait(first ? 350 : Math.min(Math.max(line.length * 45, 650), 1500));
        if (alive()) pushCozie(line, urgent);
      });
    };
    const finish = async () => {
      await chain;
      if (alive()) setCozieTyping(false);
    };

    if (detectDangerSignal(said)) {
      splitMessages(URGENT_REPLY).forEach((l) => queue(l, true));
      return finish();
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          mode: 'life',
          context: `Day ${clock.day} of your week, ${clock.slot}. ${cozieLine(clock, persona)} Mila is ${persona.milaWeeks} weeks old. The user is ${persona.mom}; her baby ${persona.baby} is ${persona.babyWeeks} weeks old. ${device === 'prenatal' ? 'Her Momcozy device is a prenatal-education device (胎教仪) for drawing and composing music with her baby; she may still be pregnant.' : 'Her Momcozy device is a wearable breast pump.'}`,
          messages: all
            .filter((m) => m.who !== 'note')
            .slice(-16)
            .map((m) => ({ role: m.who === 'you' ? 'user' : 'assistant', content: m.text })),
        }),
      });
      if (!res.ok || !res.body) {
        // No model key (local demo): she answers from her script instead.
        const body = await res.text().catch(() => '');
        if (res.status === 500 && /not configured/i.test(body)) {
          splitMessages(topicOf(said).fallback).forEach((l) => queue(l));
          return finish();
        }
        throw new Error(String(res.status));
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let raw = '';
      let done = 0; // complete lines already queued
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n');
        buf = parts.pop() ?? '';
        for (const l of parts) {
          if (!l.startsWith('0:')) continue;
          raw += JSON.parse(l.slice(2)) as string;
        }
        // Send each finished line as soon as it's written.
        const text = parseAction(raw).text;
        const lines = text.split('\n');
        lines.pop(); // still being written
        for (const line of lines.slice(done)) {
          splitMessages(line).forEach((m) => queue(m));
        }
        done = Math.max(done, lines.length);
      }
      const rest = parseAction(raw).text.split('\n').slice(done).join('\n');
      splitMessages(rest).forEach((m) => queue(m));
      if (sent === 0) throw new Error('empty');
      return finish();
    } catch (err) {
      if ((err as Error).name === 'AbortError' || !alive()) return;
      setCozieTyping(false);
      const ids = new Set(pending.map((m) => m.id));
      setThread((t) => t.map((m) => (ids.has(m.id) ? { ...m, status: 'failed' } : m)));
    }
  }

  function retry() {
    setThread((t) => t.map((m) => (m.status === 'failed' ? { ...m, status: 'sent' } : m)));
    later('reply', 200, () => void respond());
  }

  // ---------- When you go quiet ----------
  // After a while without a reply she either checks in once, or puts the
  // phone down and goes back to what she was doing. Sending again brings her
  // back to the phone.
  const routineRef = useRef(routine);
  routineRef.current = routine;
  useEffect(() => {
    clearTimeout(timers.current.idle);
    if (!chatOpen || away || cozieTyping || draft.length > 0) return;
    const last = [...thread].reverse().find((m) => m.who !== 'note');
    if (last?.who === 'you') return; // she's about to answer
    const ms = !last ? QUIET_EMPTY_MS : last.nudge ? QUIET_AFTER_NUDGE_MS : QUIET_MS;
    later('idle', ms, () => {
      if (last && !last.nudge && Math.random() < 0.6) {
        pushCozie(nudgeLine(persona), false, true);
        return;
      }
      const doing = ACTIVITY[routineRef.current.anim] ?? '忙自己的事';
      setThread((t) => [...t, { id: ++msgSeq.current, who: 'note', text: `Cozie 放下手机，${doing}了` }]);
      setAway(true);
      setHeadMsg(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, away, cozieTyping, draft.length > 0, thread]);

  // ---------- Songs in the room ----------

  function stopSong() {
    playbackRef.current?.stop();
    playbackRef.current = null;
    setNowPlaying(null);
    setMobileSpin(false);
  }

  /** Play a song from the mobile; toBaby also sends it "through" the device. */
  function playSongInRoom(song: Song, toBaby: boolean) {
    playbackRef.current?.stop();
    setNowPlaying({ id: song.id, toBaby });
    setMobileSpin(true);
    if (toBaby) {
      if (device === 'prenatal') setDeviceOn(true);
      setHeadMsg({ id: -3, text: '嘘——我们一起放给宝宝听' });
      later('head', 4000, () => setHeadMsg((h) => (h?.id === -3 ? null : h)));
    }
    playbackRef.current = playSong(song, (i) => {
      if (i === -1) {
        playbackRef.current = null;
        setNowPlaying(null);
        setMobileSpin(false);
      }
    });
  }

  useEffect(() => () => playbackRef.current?.stop(), []);

  // ---------- Her own things ----------

  function openSpot(spot: SpotId) {
    closeChat();
    setBubble({ kind: 'spot', spot });
    // The wall board: with nothing new to read, it opens the drawings.
    if (spot === 'fridge' && !views.fridge.unread && drawingStore.drawings.length > 0) {
      setBubble(null);
      setNewDrawing(false);
      setGalleryOpen(true);
      return;
    }
    if (spot === 'table' && device === 'prenatal') {
      setDeviceReply(null);
      return;
    }
    const ev = views[spot].event;
    if (ev && ev.kind !== 'letter') life.markSeen(ev.id);
  }

  function choose(eventId: string, c: LifeChoice) {
    life.answer(eventId, c.id);
    react(
      c.pose === 'discover'
        ? 'look'
        : c.pose === 'journal'
          ? 'journal'
          : c.pose === 'empathy' || c.pose === 'celebrate' || c.pose === 'encourage'
            ? c.pose
            : 'happy'
    );
    if (c.toast) showToast(c.toast);
  }

  function openArrivingLetter(eventId: string, letterId?: string) {
    const content = letterId ? LIFE_LETTERS[letterId] : undefined;
    if (!content) return;
    const filled = letters.find((l) => l.eventId === eventId)?.letter;
    setBubble(null);
    setLetter({ content: filled ?? content, mode: 'arrive', eventId });
  }

  const title = `Mila · ${persona.milaWeeks} 周 · 第 ${clock.day} 天`;
  const lastYou = thread.map((m) => m.who).lastIndexOf('you');

  return (
    <div ref={pageRef} className={cn('ch-page', `is-${clock.slot}`, chatOpen && 'is-chatting')}>
      <div className="ch-stage">
        <button
          type="button"
          className="ch-backdrop"
          aria-label="收起"
          tabIndex={-1}
          onClick={() => {
            if (chatOpen) closeChat();
            else setBubble(null);
          }}
        >
          <img
            className="ch-bg"
            src={bgArt.src}
            alt=""
            draggable={false}
            style={{ top: pct.y(bgArt.top), height: pct.h(bgArt.h) }}
          />
        </button>

        {halloween && (
          <>
            <img
              className="ch-deco"
              src={HALLOWEEN.bunting.src}
              alt=""
              aria-hidden
              style={{ left: pct.x(HALLOWEEN.bunting.x), top: pct.y(HALLOWEEN.bunting.y), width: pct.x(HALLOWEEN.bunting.w) }}
            />
            <img
              className="ch-deco"
              src={HALLOWEEN.pumpkins.src}
              alt=""
              aria-hidden
              style={{ left: pct.x(HALLOWEEN.pumpkins.x), top: pct.y(HALLOWEEN.pumpkins.y), width: pct.x(HALLOWEEN.pumpkins.w) }}
            />
          </>
        )}
        {/* Crib mobile: arm on the room canvas, toys hanging from it. */}
        <img className="ch-layer ch-mobile-arm" src={MOBILE.arm(clock.slot)} alt="" aria-hidden />
        <img
          className={cn('ch-mobile-toys', mobileSpin && halloween && 'is-wobble')}
          src={halloween ? MOBILE.toysHalloween : mobileSpin ? MOBILE.toysSpin : MOBILE.toys}
          alt=""
          aria-hidden
          style={{ left: pct.x(MOBILE.x), top: pct.y(MOBILE.y), width: pct.x(MOBILE.size) }}
        />
        {flyNote && (
          <img
            key={flyNote}
            className="ch-flynote"
            src={COMPOSE_ART.fly}
            alt=""
            aria-hidden
            style={{ left: pct.x(MOBILE.x + MOBILE.size / 2), top: pct.y(MOBILE.y + 20) }}
          />
        )}
        {babyListening &&
          COMPOSE_ART.float.map((src, i) => (
            <img
              key={src}
              className="ch-floatnote"
              src={src}
              alt=""
              aria-hidden
              style={{
                left: pct.x(MILA.x - 30 + i * 28),
                top: pct.y(MILA.y - 70 - (i % 2) * 14),
                animationDelay: `${i * 0.7}s`,
              }}
            />
          ))}
        {device === 'prenatal' && (
          <img
            className={cn('ch-deco ch-device', deviceOn && 'is-on', nowPlaying?.toBaby && 'is-playing')}
            src={deviceOn ? PRENATAL.src.on : PRENATAL.src.off}
            alt=""
            aria-hidden
            style={{ left: pct.x(PRENATAL.x), top: pct.y(PRENATAL.y), width: pct.x(PRENATAL.w) }}
          />
        )}
        {device === 'prenatal' && deviceOn && bubble?.kind === 'spot' && bubble.spot === 'table' && (
          <div
            className="ch-create-float"
            style={{ left: pct.x(PRENATAL.create.x), top: pct.y(PRENATAL.create.y), width: pct.x(PRENATAL.create.w) }}
          >
            <svg className="ch-create-float__arc" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden>
              <path d="M18 52 V40 Q18 8 50 8 Q82 8 82 40 V52" fill="none" />
            </svg>
            <button
              type="button"
              className="is-left"
              onClick={() => {
                setBubble(null);
                setDrawingOpen(true);
              }}
              aria-label="作画"
            >
              <img src={PRENATAL.buttons.draw} alt="" />
            </button>
            <button
              type="button"
              className="is-right"
              onClick={() => {
                setBubble(null);
                setComposeOpen(true);
              }}
              aria-label="作曲"
            >
              <img src={PRENATAL.buttons.music} alt="" />
            </button>
          </div>
        )}
        {latestDrawing && (
          <span
            key={latestDrawing.id}
            className={cn('ch-pin', justPinned && 'is-new')}
            style={{ left: pct.x(BOARD_PIN.x), top: pct.y(BOARD_PIN.y), width: pct.x(BOARD_PIN.w) }}
            aria-hidden
          >
            <Framed frame={DRAW_ART.pinned} src={latestDrawing.src} pin={DRAW_ART.pin} />
          </span>
        )}
        <img
          className="ch-mila"
          src={MILA.src(milaMood, clock.slot)}
          alt=""
          aria-hidden
          style={{ left: pct.x(MILA.x), top: pct.y(MILA.y), width: pct.x(MILA.w), ['--foot' as string]: MILA.foot }}
        />
        <img
          className="ch-layer ch-layer--crib"
          src={CRIB_FRONT.src(clock.slot)}
          alt=""
          aria-hidden
          style={{ left: pct.x(CRIB_FRONT.x), top: pct.y(CRIB_FRONT.y), width: pct.x(CRIB_FRONT.w), height: pct.h(CRIB_FRONT.h) }}
        />
        {clock.slot === 'night' && (
          <span className="ch-zz" style={{ left: pct.x(MILA.x - 34), top: pct.y(MILA.y - 52) }} aria-hidden>
            z z
          </span>
        )}
        {views.mailbox.unread && (
          <img
            className="ch-prop"
            src={PROPS.letter.src}
            alt=""
            aria-hidden
            style={{ left: pct.x(PROPS.letter.x), top: pct.y(PROPS.letter.y), width: pct.x(PROPS.letter.w) }}
          />
        )}
        {views.fridge.unread && (
          <img
            className="ch-prop"
            src={PROPS.note.src}
            alt=""
            aria-hidden
            style={{ left: pct.x(PROPS.note.x), top: pct.y(PROPS.note.y), width: pct.x(PROPS.note.w) }}
          />
        )}

        {spots.map((s) => (
          <button
            key={s.id}
            type="button"
            className={cn('ch-spot', bubble?.kind === 'spot' && bubble.spot === s.id && 'is-active')}
            style={{ left: pct.x(s.hit.x), top: pct.y(s.hit.y), width: pct.x(s.hit.w), height: pct.h(s.hit.h) }}
            onClick={() => openSpot(s.id)}
            aria-label={hasNew(s.id) ? `${s.label}，有新内容` : s.label}
          />
        ))}
        {!chatOpen &&
          spots.filter((s) => hasNew(s.id)).map((s) => (
            <span key={`dot-${s.id}`} className="ch-dot" style={{ left: pct.x(s.dot.x), top: pct.y(s.dot.y) }} aria-hidden />
          ))}

        <button
          type="button"
          className="ch-spot"
          style={{ left: pct.x(MOBILE.hit.x), top: pct.y(MOBILE.hit.y), width: pct.x(MOBILE.hit.w), height: pct.h(MOBILE.hit.h) }}
          onClick={() => {
            closeChat();
            setBubble(null);
            setNewSong(false);
            setSongsOpen(true);
          }}
          aria-label={newSong ? '床铃：给宝宝的歌，有新歌' : '床铃：给宝宝的歌'}
        />
        {!chatOpen && newSong && (
          <span className="ch-dot" style={{ left: pct.x(MOBILE.dot.x), top: pct.y(MOBILE.dot.y) }} aria-hidden />
        )}
        <button
          type="button"
          className={cn('ch-cozie', walk && 'is-walking', halloween && 'is-costume')}
          style={{
            left: pct.x(at.x),
            top: pct.y(at.y),
            width: pct.x(COZIE_W),
            ['--foot' as string]: FOOT,
            ['--lean' as string]: walk ? `${walk.dir * 6}deg` : '0deg',
          }}
          onClick={() => {
            if (chatOpen) return;
            setBubble({ kind: 'cozie' });
            react('happy', 1800);
          }}
          aria-label="Cozie"
        >
          <span className="ch-cozie__shadow" aria-hidden />
          <span className="ch-cozie__hop" key={walk?.key}>
            <img ref={cozieImgRef} className="ch-cozie__img" src={art.src} alt="" draggable={false} />
          </span>
        </button>
        <img
          className="ch-layer ch-layer--front"
          src={FOREGROUND.src(clock.slot)}
          alt=""
          aria-hidden
          style={{ left: 0, width: '100%', top: pct.y(ROOM_H - FOREGROUND.h), height: pct.h(FOREGROUND.h) }}
        />
      </div>

      <header className="ch-top">
        <button type="button" className="cz-glass-btn" onClick={onBack} aria-label="返回聊天">
          <ChevronLeft size={24} strokeWidth={1.8} />
        </button>
        <div className="ch-top__title">
          <strong>Cozie 的家</strong>
          <span>{title}</span>
          <button type="button" className="ch-clock" onClick={() => setClockOpen(true)}>
            <Clock3 size={12} strokeWidth={2} />
            {SLOT_LABELS[clock.slot]}
          </button>
        </div>
        <button
          type="button"
          className="cz-glass-btn ch-top__mail"
          onClick={() => setMailOpen(true)}
          aria-label={`信箱，${letters.length} 封信`}
        >
          <Mail size={21} strokeWidth={1.7} />
          {letters.length > 0 && <span className="ch-top__count">{letters.length}</span>}
        </button>
      </header>

      {bubbleVisible && (
        <div
          ref={bubbleRef}
          className={cn('ch-bubble', typingOverHead && 'is-compact', textOverHead && 'is-say')}
          role="status"
          aria-live="polite"
          onClick={textOverHead && !chatOpen ? openChat : undefined}
        >
          {renderBubble()}
        </div>
      )}

      {/* The chat: a glass sheet pulled up from the bottom. */}
      <section className={cn('ch-chat', chatOpen && 'is-open')} aria-label="和 Cozie 聊天" aria-hidden={!chatOpen}>
        <button type="button" className="ch-chat__grab" onClick={closeChat} aria-label="收起聊天" tabIndex={chatOpen ? 0 : -1}>
          <span />
        </button>
        <div ref={threadElRef} className="ch-chat__thread">
          {thread.length === 0 && <p className="ch-chat__empty">Cozie 拿起了手机，等你开口～</p>}
          {thread.map((m, i) => {
            const prev = thread[i - 1];
            const firstOfGroup = !prev || prev.who !== m.who;
            if (m.who === 'note') {
              return (
                <p key={m.id} className="ch-note">
                  {m.text}
                </p>
              );
            }
            if (m.who === 'cozie') {
              return (
                <div key={m.id} className={cn('ch-msg is-cozie', firstOfGroup && 'is-first')}>
                  {firstOfGroup ? <img className="ch-msg__avatar" src={FACES.cozie} alt="" /> : <span className="ch-msg__avatar" />}
                  <div className="ch-msg__col">
                    <p className={cn('ch-msg__bubble', m.urgent && 'is-urgent')}>{m.text}</p>
                    {m.urgent && thread[i + 1]?.urgent !== true && (
                      <button type="button" className="ch-chip is-primary" onClick={() => showToast('演示：这里会拨打你的医生电话')}>
                        联系医生
                      </button>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className={cn('ch-msg is-you', firstOfGroup && 'is-first')}>
                <p className="ch-msg__bubble">{m.text}</p>
                {m.status === 'failed' ? (
                  <button type="button" className="ch-msg__status is-failed" onClick={retry}>
                    没发出去 · 重试
                  </button>
                ) : (
                  i === lastYou && m.status === 'read' && <span className="ch-msg__status">已读</span>
                )}
              </div>
            );
          })}
          {cozieTyping && (
            <div className="ch-msg is-cozie is-first">
              <img className="ch-msg__avatar" src={FACES.cozie} alt="" />
              <p className="ch-msg__bubble ch-msg__typing" aria-label="Cozie 正在输入">
                <i />
                <i />
                <i />
              </p>
            </div>
          )}
        </div>
      </section>

      <form
        className="ch-input"
        onSubmit={send}
        onPointerDown={(e) => (e.currentTarget.dataset.y = String(e.clientY))}
        onPointerUp={(e) => {
          const dy = e.clientY - Number(e.currentTarget.dataset.y ?? e.clientY);
          if (dy < -30) openChat();
          if (dy > 30) closeChat();
        }}
      >
        <button
          type="button"
          className={cn('ch-input__history', chatOpen && 'is-on')}
          onClick={() => (chatOpen ? closeChat() : openChat())}
          aria-label={chatOpen ? '收起聊天' : '打开聊天'}
          aria-expanded={chatOpen}
        >
          <MessageCircleMore size={20} strokeWidth={1.7} />
          {unseen > 0 && <span className="ch-input__badge">{unseen}</span>}
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={openChat}
          placeholder="和 Cozie 说点什么"
          enterKeyHint="send"
          aria-label="和 Cozie 说点什么"
        />
        <button type="submit" className="ch-input__send" disabled={!draft.trim()} aria-label="发送">
          <img src="/cozie/icons/send_arrow.svg" alt="" />
        </button>
      </form>

      <BottomSheet open={galleryOpen} onClose={() => setGalleryOpen(false)} label="墙上的画板" className="ch-sheet">
        <h2 className="ch-sheet__title">墙上的画板</h2>
        <p className="ch-sheet__sub">你给宝宝画的画，都钉在这里。</p>
        {drawingStore.drawings.length === 0 ? (
          <div className="ch-gallery-empty">
            <img src={DRAW_ART.empty} alt="" />
            <p className="ch-sheet__empty">还没有画。用胎教仪的「作画」画第一幅吧。</p>
          </div>
        ) : (
          <ul className="ch-gallery">
            {drawingStore.drawings.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => setViewing(d)} aria-label={d.title}>
                  <Framed frame={DRAW_ART.card} src={d.src} caption={d.title} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="ch-clock-actions">
          <button
            type="button"
            className="is-primary"
            onClick={() => {
              setGalleryOpen(false);
              setDrawingOpen(true);
            }}
          >
            再画一幅
          </button>
        </div>
      </BottomSheet>

      {viewing && (
        <div className="ch-viewer" role="dialog" aria-label={viewing.title} onClick={() => setViewing(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            <Framed frame={DRAW_ART.viewer} src={viewing.src} alt={viewing.title} className="ch-viewer__frame" />
            <figcaption>
              <strong>{viewing.title}</strong>
              <span>{new Date(viewing.createdAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
            </figcaption>
            <div className="ch-viewer__actions">
              <button
                type="button"
                onClick={() => {
                  drawingStore.remove(viewing.id);
                  setViewing(null);
                  showToast('已从画板上取下');
                }}
              >
                取下这幅画
              </button>
              <button type="button" className="is-primary" onClick={() => setViewing(null)}>
                好的
              </button>
            </div>
          </figure>
        </div>
      )}

      <BottomSheet open={songsOpen} onClose={() => setSongsOpen(false)} label="给宝宝的歌" className="ch-sheet">
        <h2 className="ch-sheet__title">给宝宝的歌</h2>
        <p className="ch-sheet__sub">你写的歌都挂在床铃上，夜里 Cozie 会放给 Mila 听。</p>
        {songStore.songs.length === 0 ? (
          <div className="ch-gallery-empty">
            <img src={COMPOSE_ART.empty} alt="" />
            <p className="ch-sheet__empty">还没有歌。用胎教仪的「作曲」写第一首吧。</p>
          </div>
        ) : (
          <ul className="ch-songs">
            {songStore.songs.map((s) => {
              const on = nowPlaying?.id === s.id;
              return (
                <li
                  key={s.id}
                  className={cn('ch-song', on && 'is-on')}
                  style={{ backgroundImage: `url(${on ? COMPOSE_ART.songCardOn : COMPOSE_ART.songCard})` }}
                >
                  <button
                    type="button"
                    className="ch-song__play"
                    onClick={() => (on ? stopSong() : playSongInRoom(s, false))}
                    aria-label={on ? '暂停' : '播放'}
                  >
                    <img src={COMPOSE_ART.ctl(on ? 'btn_pause' : 'btn_play')} alt="" />
                  </button>
                  <div className="ch-song__text">
                    <strong>
                      {s.title}
                      {s.voice && <img src={COMPOSE_ART.badgeVoice} alt="含妈妈的哼唱" />}
                    </strong>
                    <span>
                      {INSTRUMENT_LABEL[s.instrument]} · {MOOD_LABEL[s.mood]} · 0:{String(songLength(s)).padStart(2, '0')}
                      <button
                        type="button"
                        className="ch-song__del"
                        onClick={() => {
                          if (on) stopSong();
                          songStore.remove(s.id);
                          showToast('已从床铃上取下');
                        }}
                      >
                        取下
                      </button>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ch-song__device"
                    onClick={() => {
                      setSongsOpen(false);
                      playSongInRoom(s, true);
                    }}
                    aria-label="放给宝宝听"
                  >
                    <img src={COMPOSE_ART.ctl('btn_to_device', on && nowPlaying?.toBaby ? 'on' : '')} alt="" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="ch-clock-actions">
          <button
            type="button"
            className="is-primary"
            onClick={() => {
              setSongsOpen(false);
              setComposeOpen(true);
            }}
          >
            再写一首
          </button>
        </div>
      </BottomSheet>

      {composeOpen && (
        <ComposeBoard
          defaultTitle={`第 ${clock.day} 天 · 给宝宝的歌`}
          halloween={halloween}
          onClose={() => setComposeOpen(false)}
          onSave={(draft) => {
            songStore.add({ ...draft, day: clock.day });
            setComposeOpen(false);
            setBubble(null);
            setNewSong(true);
            setFlyNote(Date.now());
            later('fly', 1100, () => setFlyNote(null));
            setMobileSpin(true);
            later('spin', 4200, () => setMobileSpin(false));
            react(halloween ? 'hum_halloween' : 'hum', 3000);
            setHeadMsg({ id: -2, text: '我把这首歌挂到床铃上啦' });
            later('head', 4500, () => setHeadMsg((h) => (h?.id === -2 ? null : h)));
          }}
        />
      )}

      {drawingOpen && (
        <DrawingBoard
          defaultTitle={`第 ${clock.day} 天 · 给宝宝的画`}
          onClose={() => setDrawingOpen(false)}
          onSave={({ title, src }) => {
            drawingStore.add({ title, src, day: clock.day });
            setDrawingOpen(false);
            setBubble(null);
            setNewDrawing(true);
            setJustPinned(true);
            later('pinned', 1600, () => setJustPinned(false));
            react('celebrate', 2400);
            setHeadMsg({ id: -1, text: '我帮你钉到墙上的画板啦' });
            later('head', 4500, () => setHeadMsg((h) => (h?.id === -1 ? null : h)));
          }}
        />
      )}

      <BottomSheet open={mailOpen} onClose={() => setMailOpen(false)} label="信箱" className="ch-sheet">
        <h2 className="ch-sheet__title">信箱</h2>
        <p className="ch-sheet__sub">Cozie 和 Mila 写给你的信，都收在这里。</p>
        {letters.length === 0 ? (
          <p className="ch-sheet__empty">第一封信今晚就到。</p>
        ) : (
          <ul className="ch-mail">
            {[...letters].reverse().map((l) => (
              <li key={l.eventId}>
                <button
                  type="button"
                  onClick={() => {
                    setMailOpen(false);
                    life.markSeen(l.eventId);
                    setLetter({ content: l.letter, mode: 'reread' });
                  }}
                >
                  <img className="ch-mail__seal" src={l.letter.from === 'Mila' ? FACES.mila : FACES.cozie} alt="" />
                  <span className="ch-mail__text">
                    <strong>{l.letter.heading ?? `来自 ${l.letter.from ?? 'Cozie'}`}</strong>
                    <em>
                      第 {l.day} 天 · {l.letter.kicker}
                    </em>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>

      <BottomSheet open={clockOpen} onClose={() => setClockOpen(false)} label="演示时间" className="ch-sheet">
        <h2 className="ch-sheet__title">演示时间</h2>
        <p className="ch-sheet__sub">
          Cozie 的一天跟着你的时间走。演示时可以在这里快进。现在是第 {clock.day} 天（共 7 天）。
        </p>
        <div className="ch-clock-opts">
          {(['morning', 'afternoon', 'night'] as Slot[]).map((s) => (
            <button
              key={s}
              type="button"
              className={cn(slotOverride === s && 'is-on')}
              onClick={() => {
                setSlotOverride(s);
                setBubble(null);
                setClockOpen(false);
              }}
            >
              {SLOT_LABELS[s]}
            </button>
          ))}
          <button
            type="button"
            className={cn(slotOverride === null && 'is-on')}
            onClick={() => {
              setSlotOverride(null);
              setNow(Date.now());
              setClockOpen(false);
            }}
          >
            实时
          </button>
        </div>
        <div className="ch-seg" role="radiogroup" aria-label="绑定设备">
          <span>绑定设备</span>
          {(
            [
              ['pump', '吸奶器'],
              ['prenatal', '胎教仪'],
            ] as const
          ).map(([d, label]) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={device === d}
              className={cn(device === d && 'is-on')}
              onClick={() => {
                life.setDevice(d);
                setDeviceOn(false);
                setDeviceReply(null);
                setBubble(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={cn('ch-toggle', halloween && 'is-on')}
          onClick={() => setHalloween((h) => !h)}
          aria-pressed={halloween}
        >
          <span>万圣节装扮</span>
          <i aria-hidden />
        </button>
        <div className="ch-clock-actions">
          <button
            type="button"
            className="is-primary"
            onClick={() => {
              life.skipDay();
              setSlotOverride('morning');
              closeChat();
              setBubble({ kind: 'cozie' });
              setClockOpen(false);
            }}
          >
            跳到明天早上
          </button>
          <button
            type="button"
            onClick={() => {
              life.restart();
              setSlotOverride(null);
              closeChat();
              setBubble(null);
              setThread([]);
              setClockOpen(false);
            }}
          >
            从第一天重新开始
          </button>
        </div>
      </BottomSheet>

      {letter && (
        <CozieLetter
          letter={letter.content}
          mode={letter.mode}
          onClose={() => setLetter(null)}
          onAction={() => {
            if (letter.eventId) life.markSeen(letter.eventId);
            setLetter(null);
            react('celebrate');
            showToast('已收进信箱');
          }}
        />
      )}
    </div>
  );

  function renderBubble() {
    if (typingOverHead) {
      return (
        <p className="ch-bubble__typing" aria-label="Cozie 正在输入">
          <i />
          <i />
          <i />
        </p>
      );
    }
    if (textOverHead && headMsg) {
      return <p className="ch-bubble__text">{clip(headMsg.text)}</p>;
    }

    if (bubble?.kind === 'spot' && bubble.spot === 'table' && device === 'prenatal') {
      return (
        <>
          <button type="button" className="ch-bubble__close" onClick={() => setBubble(null)} aria-label="关闭">
            <X size={14} strokeWidth={2} />
          </button>
          <p className="ch-bubble__who">{deviceOn ? '胎教仪 · 已激活' : '胎教仪 · 未激活'}</p>
          {!deviceOn ? (
            <>
              <p className="ch-bubble__text">轻点一下，唤醒它。和宝宝一起画点什么，或者编一段小曲子。</p>
              <div className="ch-chips">
                <button
                  type="button"
                  className="ch-chip is-primary"
                  onClick={() => {
                    setDeviceOn(true);
                    react('stars', 1800);
                  }}
                >
                  轻点胎教仪
                </button>
              </div>
            </>
          ) : (
            <>
              {/* The 作画 / 作曲 buttons float over the device itself. */}
              <p className="ch-bubble__text">{deviceReply ?? '选择你的创作吧，作画还是作曲？'}</p>
            </>
          )}
        </>
      );
    }

    if (bubble?.kind === 'spot') {
      const v = views[bubble.spot];
      const ev = v.event;
      const picked = ev ? life.state.answers?.[ev.id] : undefined;
      const choice = ev?.choices?.find((c) => c.id === picked);
      return (
        <>
          <button type="button" className="ch-bubble__close" onClick={() => setBubble(null)} aria-label="关闭">
            <X size={14} strokeWidth={2} />
          </button>
          <p className="ch-bubble__who">{v.title}</p>
          <p className="ch-bubble__text">{v.text}</p>
          {choice && <p className="ch-bubble__reply">{fill(choice.reply, persona)}</p>}
          {bubble.spot === 'fridge' && drawingStore.drawings.length > 0 && (
            <div className="ch-chips">
              <button
                type="button"
                className="ch-chip is-new"
                onClick={() => {
                  setBubble(null);
                  setNewDrawing(false);
                  setGalleryOpen(true);
                }}
              >
                看看我们的画（{drawingStore.drawings.length}）
              </button>
            </div>
          )}
          {ev?.kind === 'letter' && (
            <div className="ch-chips">
              <button type="button" className="ch-chip is-primary" onClick={() => openArrivingLetter(ev.id, ev.letterId)}>
                拆开这封信
              </button>
            </div>
          )}
          {ev && !choice && ev.choices && ev.choices.length > 0 && (
            <div className="ch-chips">
              {ev.choices.map((c) => (
                <button key={c.id} type="button" className="ch-chip" onClick={() => choose(ev.id, c)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </>
      );
    }

    return (
      <>
        <p className="ch-bubble__text">{cozieLine(clock, persona)}</p>
        {unread.length > 0 && (
          <div className="ch-chips">
            {unread.map((id) => (
              <button key={id} type="button" className="ch-chip is-new" onClick={() => openSpot(id)}>
                {id === 'table' && device === 'prenatal' ? '胎教仪' : newLabel(id)}
              </button>
            ))}
          </div>
        )}
      </>
    );
  }
}

/** How long her latest text stays over her head: about reading speed,
 *  4–9 seconds (urgent ones a little longer). */
function headMs(text: string, urgent = false) {
  return Math.min(Math.max(text.length * 180, 4000), urgent ? 12000 : 9000);
}

/** Over her head only a short line; the full text is in the thread. */
function clip(text: string, max = 36) {
  return text.length <= max ? text : text.slice(0, max - 1) + '…';
}

/** Break a reply into text-message sized pieces: one per line, long lines
 *  split at sentence ends, at most four messages. */
function splitMessages(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    if (line.length <= 48) {
      out.push(line);
      continue;
    }
    const sentences = line.match(/[^。！？!?]+[。！？!?]*/g) ?? [line];
    let cur = '';
    for (const s of sentences) {
      if (cur && (cur + s).length > 48) {
        out.push(cur);
        cur = s;
      } else cur += s;
    }
    if (cur) out.push(cur);
  }
  if (out.length > 4) return [...out.slice(0, 3), out.slice(3).join('')];
  return out;
}

function newLabel(spot: SpotId) {
  switch (spot) {
    case 'fridge':
      return '便签板上的便条';
    case 'crib':
      return 'Mila 有新动态';
    case 'calendar':
      return '日历';
    case 'shelf':
      return '新的读书笔记';
    case 'table':
      return '吸奶器小凳';
    case 'mailbox':
      return '来信了';
  }
}

/** Whether anything in Cozie's home is waiting — for the chat top bar badge. */
export function hasNewAtCozies(life: CozieLife, profile: CozyProfile, now = Date.now()) {
  if (!life.ready) return false;
  // Before the first visit, the welcome itself is the news.
  if (!life.state.startedAt) return true;
  const clock = clockFor(life.state, now);
  return unreadSpots(spotViews(life.state, clock, personaFrom(profile))).length > 0;
}

const INSTRUMENT_LABEL = { musicbox: '音乐盒', harp: '竖琴', piano: '钢琴' } as const;
const MOOD_LABEL = { sleep: '安睡', happy: '开心', miss: '想你' } as const;
