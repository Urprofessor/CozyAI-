'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ChevronLeft, Clock3, Mail } from 'lucide-react';
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
import { LIFE_LETTERS, type CoziePose, type LifeChoice, type Slot, type SpotId } from '@/lib/cozy/life/script';
import { MILA, POSES, SLOT_STAGE, SPOTS, SPOT_BY_ID, pct, type Stand } from '@/lib/cozy/home/scene';
import { CozieLetter } from '../CozieLetter';
import { BottomSheet, showToast } from '../ui';
import { RoomArt } from './RoomArt';

interface Props {
  life: CozieLife;
  profile: CozyProfile;
  onBack: () => void;
  /** Continue a conversation in the main chat. */
  onTalk: (text: string) => void;
}

type Focus = { kind: 'cozie' } | { kind: 'spot'; spot: SpotId } | { kind: 'talk' };

interface Talk {
  you: string;
  reply: string;
  status: 'thinking' | 'streaming' | 'done';
  urgent: boolean;
}

/** Cozie's home: a picture-book room you mostly tap around in. Typing is the
 *  side door — a small input under the scene. */
export function CozieHomePage({ life, profile, onBack, onTalk }: Props) {
  const persona = useMemo(() => personaFrom(profile), [profile]);
  const [now, setNow] = useState(() => Date.now());
  const [slotOverride, setSlotOverride] = useState<Slot | null>(null);
  const [focus, setFocus] = useState<Focus>({ kind: 'cozie' });
  const [reaction, setReaction] = useState<CoziePose | null>(null);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [talk, setTalk] = useState<Talk | null>(null);
  const [letter, setLetter] = useState<{ content: LetterContent; mode: 'arrive' | 'reread'; eventId?: string } | null>(
    null
  );
  const [mailOpen, setMailOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const { begin, ready } = life;
  useEffect(() => {
    if (ready) begin();
  }, [ready, begin]);

  // Keep the clock moving so events arrive while the page is open.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(reactionTimer.current);
      abortRef.current?.abort();
    },
    []
  );

  const clock: LifeClock = clockFor(life.state, now, slotOverride);
  const views = spotViews(life.state, clock, persona);
  const unread = unreadSpots(views);
  const letters = collectedLetters(life.state, clock, persona);

  // Where Cozie stands and what she's doing.
  const stage = SLOT_STAGE[clock.slot];
  const stand: Stand = focus.kind === 'spot' ? SPOT_BY_ID[focus.spot].stand : stage.stand;
  const pose: CoziePose = reaction ?? (typing || talk?.status === 'thinking' ? 'listen' : stage.pose);
  const poseArt = POSES[pose];
  const width = stand.w * poseArt.scale;

  function react(p: CoziePose | undefined) {
    if (!p) return;
    clearTimeout(reactionTimer.current);
    setReaction(p);
    reactionTimer.current = setTimeout(() => setReaction(null), 2600);
  }

  function openSpot(spot: SpotId) {
    setFocus({ kind: 'spot', spot });
    const ev = views[spot].event;
    if (ev && ev.kind !== 'letter') life.markSeen(ev.id);
    if (ev?.kind === 'read') react('discover');
  }

  function choose(eventId: string, c: LifeChoice) {
    life.answer(eventId, c.id);
    react(c.pose ?? 'empathy');
    if (c.toast) showToast(c.toast);
  }

  function openArrivingLetter(eventId: string, letterId?: string) {
    const content = letterId ? LIFE_LETTERS[letterId] : undefined;
    if (!content) return;
    const filled = letters.find((l) => l.eventId === eventId)?.letter;
    setLetter({ content: filled ?? content, mode: 'arrive', eventId });
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setFocus({ kind: 'talk' });
    abortRef.current?.abort();

    if (detectDangerSignal(text)) {
      setTalk({
        you: text,
        reply:
          '这件事很重要，我想认真听你说。我们去聊天里好好说吧。如果情况紧急，请马上联系医生或拨打急救电话。',
        status: 'done',
        urgent: true,
      });
      react('empathy');
      return;
    }

    setTalk({ you: text, reply: '', status: 'thinking', urgent: false });
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          mode: 'life',
          context: `Day ${clock.day} of your week, ${SLOT_LABELS[clock.slot].toLowerCase()}. ${cozieLine(clock, persona)} Mila is ${persona.milaWeeks} weeks old. The user is ${persona.mom}; her baby ${persona.baby} is ${persona.babyWeeks} weeks old.`,
          messages: [{ role: 'user', content: text }],
        }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let reply = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const l of lines) {
          if (!l.startsWith('0:')) continue;
          reply += JSON.parse(l.slice(2)) as string;
          setTalk({ you: text, reply: reply.replace(/\[\[[^\]]*\]\]/g, ''), status: 'streaming', urgent: false });
        }
      }
      if (!reply.trim()) throw new Error('empty');
      setTalk({ you: text, reply: reply.replace(/\[\[[^\]]*\]\]/g, '').trim(), status: 'done', urgent: false });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setTalk({
        you: text,
        reply: 'Mila 刚醒，我只听到一半。我们去聊天里坐下来慢慢说？',
        status: 'done',
        urgent: false,
      });
    }
  }

  const title = `Mila · ${persona.milaWeeks} 周 · 第 ${clock.day} 天`;

  return (
    <div className={cn('ch-page', `is-${clock.slot}`)}>
      <header className="ch-top">
        <button type="button" className="cz-glass-btn" onClick={onBack} aria-label="返回聊天">
          <ChevronLeft size={24} strokeWidth={1.8} />
        </button>
        <div className="ch-top__title">
          <strong>Cozie 的家</strong>
          <span>{title}</span>
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

      <div className="ch-stage-wrap">
        <div className="ch-stage">
          <RoomArt slot={clock.slot} />
          <div className="ch-tint" aria-hidden />

          <img
            className="ch-mila"
            src={POSES.neutral.src}
            alt=""
            aria-hidden
            style={{ left: pct.x(MILA.x), top: pct.y(MILA.y), width: pct.x(MILA.w * 1.4), ['--foot' as string]: POSES.neutral.foot }}
          />
          {clock.slot === 'night' && (
            <span className="ch-zz" style={{ left: pct.x(MILA.x + 12), top: pct.y(MILA.y - 52) }} aria-hidden>
              z z
            </span>
          )}

          {SPOTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={cn('ch-spot', focus.kind === 'spot' && focus.spot === s.id && 'is-active')}
              style={{ left: pct.x(s.hit.x), top: pct.y(s.hit.y), width: pct.x(s.hit.w), height: pct.y(s.hit.h) }}
              onClick={() => openSpot(s.id)}
              aria-label={views[s.id].unread ? `${s.label}，有新内容` : s.label}
            />
          ))}
          {SPOTS.filter((s) => views[s.id].unread).map((s) => (
            <span key={`dot-${s.id}`} className="ch-dot" style={{ left: pct.x(s.dot.x), top: pct.y(s.dot.y) }} aria-hidden />
          ))}

          <button
            type="button"
            className="ch-cozie"
            style={{ left: pct.x(stand.x), top: pct.y(stand.y), width: pct.x(width), ['--foot' as string]: poseArt.foot }}
            onClick={() => {
              setFocus({ kind: 'cozie' });
              react('encourage');
            }}
            aria-label="Cozie"
          >
            <span className="ch-cozie__shadow" aria-hidden />
            <img key={pose} className="ch-cozie__img" src={poseArt.src} alt="" draggable={false} />
          </button>

          <button type="button" className="ch-clock" onClick={() => setClockOpen(true)}>
            <Clock3 size={14} strokeWidth={2} />
            {SLOT_LABELS[clock.slot]}
          </button>
        </div>
      </div>

      <section className="ch-say" aria-live="polite">
        {renderSay()}
      </section>

      <form className="ch-input" onSubmit={send}>
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
                  <span className="ch-mail__seal">{(l.letter.from ?? 'Cozie').slice(0, 1)}</span>
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
                setFocus({ kind: 'cozie' });
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
              setFocus({ kind: 'cozie' });
              setTalk(null);
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
              setFocus({ kind: 'cozie' });
              setTalk(null);
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

  function renderSay() {
    if (focus.kind === 'talk' && talk) {
      return (
        <>
          <p className="ch-say__you">{talk.you}</p>
          <p className="ch-say__who">Cozie</p>
          <p className="ch-say__text">
            {talk.status === 'thinking' ? <span className="ch-say__dots">…</span> : talk.reply}
          </p>
          {talk.status === 'done' && (
            <div className="ch-chips">
              <button type="button" className={cn('ch-chip', talk.urgent && 'is-primary')} onClick={() => onTalk(talk.you)}>
                {talk.urgent ? '现在就去聊天' : '去聊天里继续说'}
              </button>
            </div>
          )}
        </>
      );
    }

    if (focus.kind === 'spot') {
      const v = views[focus.spot];
      const ev = v.event;
      const picked = ev ? life.state.answers?.[ev.id] : undefined;
      const choice = ev?.choices?.find((c) => c.id === picked);
      return (
        <>
          <p className="ch-say__who">{v.title}</p>
          <p className="ch-say__text">{v.text}</p>
          {choice && <p className="ch-say__reply">{fill(choice.reply, persona)}</p>}
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
        <p className="ch-say__who">Cozie</p>
        <p className="ch-say__text">{cozieLine(clock, persona)}</p>
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

function newLabel(spot: SpotId) {
  switch (spot) {
    case 'fridge':
      return '冰箱上的便条';
    case 'crib':
      return 'Mila 有新动态';
    case 'calendar':
      return '日历';
    case 'shelf':
      return '新的读书笔记';
    case 'table':
      return '小边桌';
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
