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
import { URGENT_REPLY, parseAction, topicOf, type Mood } from '@/lib/cozy/life/topics';
import { ANIMS, FOOT, type CozieAnim } from '@/lib/cozy/home/anims';
import {
  BACKGROUNDS,
  COZIE_W,
  CRIB_FRONT,
  FACES,
  FOREGROUND,
  MILA,
  PLACES,
  PROPS,
  ROOM_H,
  ROUTINES,
  SPOTS,
  pct,
  type MilaMood,
  type Place,
} from '@/lib/cozy/home/scene';
import { CozieLetter } from '../CozieLetter';
import { BottomSheet, showToast } from '../ui';

interface Props {
  life: CozieLife;
  profile: CozyProfile;
  onBack: () => void;
}

type Bubble = { kind: 'cozie' } | { kind: 'spot'; spot: SpotId } | { kind: 'talk' };

interface Talk {
  id: number;
  you: string;
  reply: string;
  /** walking → thinking (thought cloud) → reading (phone up, bubble) →
   *  done (still on the phone) → after (phone down, reacting); or failed */
  phase: 'walking' | 'thinking' | 'reading' | 'done' | 'after' | 'failed';
  place: Place;
  mood: Mood;
  urgent: boolean;
}

interface Line {
  who: 'you' | 'cozie';
  text: string;
}

const MOOD_ANIM: Record<Mood, CozieAnim> = {
  happy: 'happy',
  empathy: 'empathy',
  celebrate: 'celebrate',
  encourage: 'encourage',
  stars: 'stars',
  neutral: 'idle',
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cozie's home: a full-screen picture-book room. She goes about her day;
 *  when you talk to her she walks to whatever the message is about, thinks,
 *  picks up her phone and answers in a glass bubble over her head. */
export function CozieHomePage({ life, profile, onBack }: Props) {
  const persona = useMemo(() => personaFrom(profile), [profile]);
  const [now, setNow] = useState(() => Date.now());
  const [slotOverride, setSlotOverride] = useState<Slot | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [talk, setTalk] = useState<Talk | null>(null);
  const [reaction, setReaction] = useState<CozieAnim | null>(null);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [echo, setEcho] = useState<{ text: string; key: number } | null>(null);
  const [history, setHistory] = useState<Line[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [routineIdx, setRoutineIdx] = useState(0);
  const [letter, setLetter] = useState<{ content: LetterContent; mode: 'arrive' | 'reread'; eventId?: string } | null>(
    null
  );
  const [mailOpen, setMailOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const cozieImgRef = useRef<HTMLImageElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const talkSeq = useRef(0);
  const talkRef = useRef<Talk | null>(null);
  talkRef.current = talk;
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
  const unread = unreadSpots(views);
  const letters = collectedLetters(life.state, clock, persona);
  const routine = ROUTINES[clock.slot][routineIdx % ROUTINES[clock.slot].length];

  // ---------- Where she is and what she's doing ----------

  const talking = talk !== null;
  const [walkingNow, setWalkingNow] = useState(false);
  const place: Place = talk ? talk.place : bubble?.kind === 'spot' ? bubble.spot : routine.place;
  const holdingPhone = !reaction && (talk?.phase === 'reading' || talk?.phase === 'done');
  const anim: CozieAnim =
    reaction ??
    (walkingNow
      ? 'hop'
      : talk?.phase === 'walking' || ((typing || draft.length > 0) && !talking)
        ? 'listen'
        : talk?.phase === 'thinking'
          ? 'think'
          : holdingPhone
            ? 'phone'
            : talk?.phase === 'after'
              ? 'idle'
              : bubble?.kind === 'spot'
                ? 'look'
                : routine.anim);
  const art = ANIMS[anim];
  const at = PLACES[place];
  const bgArt = BACKGROUNDS[clock.slot];
  const milaMood: MilaMood =
    bubble?.kind === 'spot' && bubble.spot === 'crib' ? 'smile' : clock.slot === 'morning' ? 'awake' : 'sleep';
  const milaVisible = true;

  // She lifts the phone (a short transition) the moment a reply comes in.
  const lastPhase = useRef<Talk['phase'] | null>(null);
  useEffect(() => {
    const phase = talk?.phase ?? null;
    const before = lastPhase.current;
    if ((phase === 'reading' || phase === 'done') && (before === 'walking' || before === 'thinking')) {
      setReaction('phoneup');
      later('react', 650, () => setReaction(null));
    }
    lastPhase.current = phase;
  }, [talk?.phase, later]);

  // Hop while walking, leaning the way she goes.
  const [walk, setWalk] = useState<{ dir: number; key: number } | null>(null);
  const lastX = useRef(at.x);
  const lastPlace = useRef(place);
  useEffect(() => {
    if (lastPlace.current === place) return;
    const dir = Math.sign(at.x - lastX.current) || 1;
    lastPlace.current = place;
    lastX.current = at.x;
    setWalk({ dir, key: Date.now() });
    setWalkingNow(true);
    later('walk', 800, () => {
      setWalk(null);
      setWalkingNow(false);
    });
  }, [place, at.x, later]);

  // Drift through her routine while nobody's talking to her.
  const busy = talking || typing || bubble !== null || letter !== null;
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

  const bubbleVisible =
    bubble !== null &&
    (bubble.kind !== 'talk' || (talk !== null && talk.phase !== 'walking'));
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
        const top = r.top - p.top + r.height * ANIMS[anim].top;
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.setProperty('--tail', `${Math.min(Math.max(cx - left, 22), w - 22)}px`);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [bubbleVisible, anim]);

  // ---------- Talking ----------

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void talkTo(text);
  }

  /** One message: she walks over and thinks while the reply is generated in
   *  parallel; the phone comes up as soon as the words arrive. */
  async function talkTo(text: string, retry = false) {
    setHistoryOpen(false);
    abortRef.current?.abort();
    clearTimeout(timers.current.close);
    clearTimeout(timers.current.phoneDown);
    setReaction(null);

    const id = ++talkSeq.current;
    const alive = () => talkSeq.current === id;
    const urgent = detectDangerSignal(text);
    const topic = topicOf(text);
    const lines = retry ? history : [...history, { who: 'you' as const, text }];
    if (!retry) setHistory(lines);
    setEcho({ text, key: id });
    later('echo', 3800, () => setEcho(null));
    setBubble({ kind: 'talk' });
    setTalk({
      id,
      you: text,
      reply: '',
      phase: 'walking',
      place: urgent ? 'fridge' : topic.place,
      mood: urgent ? 'empathy' : topic.mood,
      urgent,
    });
    const patch = (p: Partial<Talk>) => alive() && setTalk((t) => (t && t.id === id ? { ...t, ...p } : t));

    // The walk is just animation: the request starts right away.
    const t0 = Date.now();
    const WALK_MS = 650;
    later('think', WALK_MS, () => alive() && setTalk((t) => (t && t.id === id && t.phase === 'walking' ? { ...t, phase: 'thinking' } : t)));
    const arrived = () => Date.now() - t0 >= WALK_MS;

    let reply = '';
    let demo = false;
    if (urgent) {
      reply = URGENT_REPLY;
    } else {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            mode: 'life',
            context: `Day ${clock.day} of your week, ${clock.slot}. ${cozieLine(clock, persona)} Mila is ${persona.milaWeeks} weeks old. The user is ${persona.mom}; her baby ${persona.baby} is ${persona.babyWeeks} weeks old.`,
            messages: lines.slice(-8).map((l) => ({ role: l.who === 'you' ? 'user' : 'assistant', content: l.text })),
          }),
        });
        if (!res.ok || !res.body) {
          // No model key (local demo): Cozie answers from her script instead.
          const body = await res.text().catch(() => '');
          if (res.status === 500 && /not configured/i.test(body)) demo = true;
          else throw new Error(String(res.status));
        } else {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          let raw = '';
          let moved = false;
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const parts = buf.split('\n');
            buf = parts.pop() ?? '';
            for (const l of parts) {
              if (!l.startsWith('0:')) continue;
              raw += JSON.parse(l.slice(2)) as string;
              const act = parseAction(raw);
              if (act.pending) continue;
              if (!moved) {
                moved = true;
                if (act.place || act.mood) patch({ ...(act.place && { place: act.place }), ...(act.mood && { mood: act.mood }) });
              }
              reply = act.text;
              if (reply && arrived()) patch({ phase: 'reading', reply });
            }
          }
          if (!reply.trim()) throw new Error('empty');
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError' || !alive()) return;
        clearTimeout(timers.current.think);
        patch({ phase: 'failed' });
        react('think', 1800);
        return;
      }
      if (demo) reply = topic.fallback;
    }

    // Let her reach the spot before the phone comes up (no longer than the walk).
    if (!arrived()) await wait(WALK_MS - (Date.now() - t0));
    if (!alive()) return;
    reply = reply.trim();
    patch({ phase: 'reading', reply });

    if (!alive()) return;
    setHistory((h) => [...h, { who: 'cozie', text: reply }]);
    patch({ phase: 'done' });
    // Phone down after a moment, then react.
    later('phoneDown', 1600, () => {
      if (!alive()) return;
      const t = talkRef.current;
      if (t && t.id === id) {
        patch({ phase: 'after' });
        react(MOOD_ANIM[t.mood], 2800);
      }
    });
    const readMs = Math.min(Math.max(reply.length * 160, 5000), 15000);
    later('close', readMs, () => {
      if (!alive()) return;
      setTalk(null);
      setBubble(null);
    });
  }

  // ---------- Her own things ----------

  function openSpot(spot: SpotId) {
    if (talking) return;
    setBubble({ kind: 'spot', spot });
    const ev = views[spot].event;
    if (ev && ev.kind !== 'letter') life.markSeen(ev.id);
  }

  function choose(eventId: string, c: LifeChoice) {
    life.answer(eventId, c.id);
    react(c.pose === 'discover' ? 'look' : c.pose === 'journal' ? 'journal' : MOOD_ANIM[poseMood(c.pose)]);
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
  const cozieWidth = COZIE_W;

  return (
    <div ref={pageRef} className={cn('ch-page', `is-${clock.slot}`)}>
      <div className="ch-stage">
        <button
          type="button"
          className="ch-backdrop"
          aria-label="收起对话"
          tabIndex={-1}
          onClick={() => {
            if (bubble && bubble.kind !== 'talk') setBubble(null);
            setHistoryOpen(false);
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

        {milaVisible && (
          <img
            className="ch-mila"
            src={MILA.src(milaMood, clock.slot)}
            alt=""
            aria-hidden
            style={{ left: pct.x(MILA.x), top: pct.y(MILA.y), width: pct.x(MILA.w), ['--foot' as string]: MILA.foot }}
          />
        )}
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

        {SPOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={cn('ch-spot', bubble?.kind === 'spot' && bubble.spot === s.id && 'is-active')}
            style={{ left: pct.x(s.hit.x), top: pct.y(s.hit.y), width: pct.x(s.hit.w), height: pct.h(s.hit.h) }}
            onClick={() => openSpot(s.id)}
            aria-label={views[s.id].unread ? `${s.label}，有新内容` : s.label}
          />
        ))}
        {SPOTS.filter((s) => views[s.id].unread).map((s) => (
          <span key={`dot-${s.id}`} className="ch-dot" style={{ left: pct.x(s.dot.x), top: pct.y(s.dot.y) }} aria-hidden />
        ))}

        <button
          type="button"
          className={cn('ch-cozie', walk && 'is-walking')}
          style={{
            left: pct.x(at.x),
            top: pct.y(at.y),
            width: pct.x(cozieWidth),
            ['--foot' as string]: FOOT,
            ['--lean' as string]: walk ? `${walk.dir * 6}deg` : '0deg',
          }}
          onClick={() => {
            if (talking) return;
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
          className={cn(
            'ch-bubble',
            bubble?.kind === 'talk' && talk?.urgent && 'is-urgent',
            bubble?.kind === 'talk' && talk?.phase === 'thinking' && 'is-compact'
          )}
          role="status"
          aria-live="polite"
        >
          {renderBubble()}
        </div>
      )}

      {echo && !historyOpen && (
        <p key={echo.key} className="ch-echo">
          {echo.text}
        </p>
      )}

      {historyOpen && (
        <section className="ch-history" aria-label="聊天记录">
          {history.length === 0 ? (
            <p className="ch-history__empty">还没聊过。和 Cozie 说点什么吧。</p>
          ) : (
            history.map((l, i) => (
              <p key={i} className={cn('ch-history__line', l.who === 'you' ? 'is-you' : 'is-cozie')}>
                {l.text}
              </p>
            ))
          )}
        </section>
      )}

      <form
        className="ch-input"
        onSubmit={send}
        onPointerDown={(e) => (e.currentTarget.dataset.y = String(e.clientY))}
        onPointerUp={(e) => {
          const dy = e.clientY - Number(e.currentTarget.dataset.y ?? e.clientY);
          if (dy < -30) setHistoryOpen(true);
          if (dy > 30) setHistoryOpen(false);
        }}
      >
        <button
          type="button"
          className={cn('ch-input__history', historyOpen && 'is-on')}
          onClick={() => setHistoryOpen((o) => !o)}
          aria-label="聊天记录"
          aria-expanded={historyOpen}
        >
          <MessageCircleMore size={20} strokeWidth={1.7} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          placeholder="和 Cozie 说点什么"
          enterKeyHint="send"
          aria-label="和 Cozie 说点什么"
        />
        <button type="submit" className="ch-input__send" disabled={!draft.trim()} aria-label="发送">
          <img src="/cozie/icons/send_arrow.svg" alt="" />
        </button>
      </form>

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
        <div className="ch-clock-actions">
          <button
            type="button"
            className="is-primary"
            onClick={() => {
              life.skipDay();
              setSlotOverride('morning');
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
              setBubble(null);
              setHistory([]);
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
    if (bubble?.kind === 'talk' && talk) {
      if (talk.phase === 'thinking') {
        return (
          <p className="ch-bubble__typing" aria-label="Cozie 正在回复">
            <i />
            <i />
            <i />
          </p>
        );
      }
      if (talk.phase === 'failed') {
        return (
          <>
            <p className="ch-bubble__text">刚才信号不太好，你的消息没发出去。</p>
            <div className="ch-chips">
              <button type="button" className="ch-chip is-primary" onClick={() => void talkTo(talk.you, true)}>
                重试
              </button>
            </div>
          </>
        );
      }
      const short = talk.urgent ? talk.reply : clip(talk.reply);
      return (
        <>
          <p className="ch-bubble__text">
            {short}
            {short !== talk.reply && (
              <button type="button" className="ch-bubble__more" onClick={() => setHistoryOpen(true)}>
                展开
              </button>
            )}
          </p>
          {talk.urgent && (talk.phase === 'done' || talk.phase === 'after') && (
            <div className="ch-chips">
              <button type="button" className="ch-chip is-primary" onClick={() => showToast('演示：这里会拨打你的医生电话')}>
                联系医生
              </button>
            </div>
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
                {newLabel(id)}
              </button>
            ))}
          </div>
        )}
      </>
    );
  }
}

/** Near her head only a short line; the full reply lives in the chat history. */
function clip(text: string, max = 64) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(...['。', '！', '？', '.', '!', '?'].map((p) => cut.lastIndexOf(p)));
  return end > 20 ? text.slice(0, end + 1) : cut + '…';
}

function poseMood(p: LifeChoice['pose']): Mood {
  switch (p) {
    case 'empathy':
      return 'empathy';
    case 'celebrate':
      return 'celebrate';
    case 'encourage':
      return 'encourage';
    default:
      return 'happy';
  }
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
