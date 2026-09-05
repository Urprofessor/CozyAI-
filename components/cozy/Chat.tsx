'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Mic, Moon } from 'lucide-react';
import { useCozyChat } from '@/hooks/useCozyChat';
import { useProfile } from '@/hooks/useProfile';
import { SARAH_INTRO } from '@/lib/cozy/constants';
import type { CozyProfile } from '@/lib/cozy/profile';
import { Bubble } from './Bubble';
import { CozyTopbar } from './CozyTopbar';
import { HandoffCard } from './HandoffCard';
import { HistoryDrawer } from './HistoryDrawer';
import { InputBar } from './InputBar';
import { Lightbox } from './Lightbox';
import { LoadingIndicator } from './LoadingIndicator';
import { WelcomeGate } from './WelcomeGate';
import { LactationSkillMessage } from './skill/LactationSkillMessage';
import { PlanCard } from './skill/PlanCard';
import { LactationDashboard } from './skill/LactationDashboard';

interface SkillHandlers {
  plan: CozyProfile['lactationPlan'];
  onStart: () => void;
  onStartTracking: () => void;
  onViewDetail: () => void;
}

const WELCOMED_KEY = 'cozyWelcomed';

/** Cozy AI tab — the AI home IS the conversation. The greeting is the stream's
 *  opening element and scrolls away with it. */
export function CozyChat() {
  const router = useRouter();
  const profile = useProfile();
  const chat = useCozyChat({ onProfilePatch: profile.applyPatch });
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  // null = localStorage not read yet; true/false once known.
  const [welcomed, setWelcomed] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWelcomed(localStorage.getItem(WELCOMED_KEY) === '1');
  }, []);

  // Follow the bottom as the conversation updates (including when the skill
  // card re-anchors below a new reply), unless the user scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 160) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.streaming]);

  const introQueuedRef = useRef(false);
  function handleSarahIntro() {
    if (introQueuedRef.current) return;
    introQueuedRef.current = true;
    chat.appendAssistant(SARAH_INTRO, 'support');
  }

  const skill: SkillHandlers = {
    plan: profile.profile.lactationPlan,
    onStart: () => router.push('/cozy/lactation'),
    onStartTracking: () => profile.applyPatch({ lactationPlan: { trackingStarted: true } }),
    onViewDetail: chat.showDashboard,
  };

  // Surface the generated plan card once the questionnaire completes (the
  // offer card above stays initial so the user can re-make a plan). Wait for
  // history hydration so the load doesn't wipe the inserted card.
  const planStatus = profile.profile.lactationPlan?.status;
  useEffect(() => {
    if (chat.hydrated && planStatus === 'completed') chat.showPlanCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.hydrated, planStatus]);

  // Wait until we know both the welcomed flag and the loaded history before
  // choosing a view, so neither the welcome nor the chat flashes first.
  const decided = welcomed !== null && chat.hydrated;
  if (!decided) return <div className="cozy-page" />;

  if (!welcomed && chat.sessions.length === 0) {
    return (
      <WelcomeGate
        onStart={() => {
          localStorage.setItem(WELCOMED_KEY, '1');
          setWelcomed(true);
        }}
      />
    );
  }

  // Empty (first-entry) state: mascot + greeting + suggested chips + quick pills.
  const isEmpty = !chat.messages.some((m) => m.role === 'user' || m.role === 'assistant');

  return (
    <div className={isEmpty ? 'cozy-page cozy-page--empty' : 'cozy-page'}>
      <CozyTopbar
        onOpenHistory={() => setHistoryOpen(true)}
        onNewSession={() => {
          setHistoryOpen(false);
          chat.newSession();
        }}
      />

      {isEmpty ? (
        <EmptyHome onSend={chat.send} />
      ) : (
        /* Conversation stream — the only scroll area */
        <div ref={scrollRef} className="cozy-stream">
          {renderStream(chat, setLightboxSrc, handleSarahIntro, skill)}

          {/* Dots only for the pre-first-token gap; once the reply starts, the
              streaming bunny caret trails the text instead. */}
          {chat.streaming &&
            chat.messages[chat.messages.length - 1]?.role !== 'assistant' && (
              <LoadingIndicator persona={chat.persona} supportAvatar={chat.supportAvatar} />
            )}
        </div>
      )}

      <InputBar
        streaming={chat.streaming}
        pendingImages={chat.pendingImages}
        onAddImages={chat.addImages}
        onRemoveImage={chat.removeImage}
        onSend={chat.send}
        onStop={chat.stop}
        onSkill={chat.startSkill}
      />

      <HistoryDrawer
        open={historyOpen}
        sessions={chat.sessions}
        currentSessionId={chat.currentSessionId}
        onClose={() => setHistoryOpen(false)}
        onSelect={(id) => {
          chat.loadSession(id);
          setHistoryOpen(false);
        }}
        onDelete={chat.deleteSession}
      />

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}

/** Render the message stream. */
function renderStream(
  chat: ReturnType<typeof useCozyChat>,
  onOpenImage: (src: string) => void,
  onSarahIntro: () => void,
  skill: SkillHandlers
): ReactNode[] {
  const out: ReactNode[] = [];

  // Follow-up chips ride only on the newest reply: the last user-or-assistant
  // message. Older replies keep their chips collapsed (not rendered), and the
  // chips drop away the moment the user sends anything after the reply.
  let lastTurnId: string | null = null;
  for (const m of chat.messages) {
    if (m.role === 'user' || m.role === 'assistant') lastTurnId = m.id;
  }

  for (const m of chat.messages) {
    if (m.content === '__SKILL_LACTATION__') {
      out.push(<LactationSkillMessage key={m.id} onStart={skill.onStart} />);
      continue;
    }
    if (m.content === '__PLAN_LACTATION__') {
      if (skill.plan) {
        out.push(
          <div key={m.id} className="self-start w-[92%] max-w-[92%]">
            <PlanCard
              plan={skill.plan}
              onStartTracking={skill.onStartTracking}
              onViewDetail={skill.onViewDetail}
            />
          </div>
        );
      }
      continue;
    }
    if (m.content === '__DASHBOARD_LACTATION__') {
      if (skill.plan) {
        out.push(
          <div key={m.id} className="self-start w-[92%] max-w-[92%]">
            <LactationDashboard plan={skill.plan} />
          </div>
        );
      }
      continue;
    }
    if (m.content === '__HANDOFF_CARD__') {
      out.push(
        <HandoffCard
          key={m.id}
          state={chat.handoffState}
          supportAvatar={chat.supportAvatar}
          onConfirm={chat.confirmHandoff}
          onCancel={chat.cancelHandoff}
          onAdvance={chat.advanceHandoff}
          onJoined={() => {
            chat.finishHandoff();
            chat.appendSystem('Sarah joined the conversation.');
          }}
          onSarahIntro={onSarahIntro}
        />
      );
      continue;
    }

    // Hide the action row on the reply that's still streaming in.
    const isLast = m.id === chat.messages[chat.messages.length - 1]?.id;
    const midStream = chat.streaming && isLast && m.role === 'assistant';
    const showActions = !midStream;
    // Follow-up chips only on the latest turn's reply, and never mid-stream.
    const showSuggestions = m.id === lastTurnId && !midStream;
    out.push(
      <Bubble
        key={m.id}
        msg={m}
        onOpenImage={onOpenImage}
        showActions={showActions}
        showSuggestions={showSuggestions}
        onSuggest={chat.send}
        streaming={midStream}
        onRetry={() => chat.regenerate(m.id)}
      />
    );
  }

  return out;
}

// Demo content for the first-entry state (static for now; wired to logs later).
const SUGGESTED = [
  'Bonnie slept from 1:10 to 2:05 pm.',
  'How much should my baby be eating?',
  'I pumped 5 oz total just now.',
];
const QUICK_PILLS = [
  { label: 'Lactation Plan', icon: <Tag size={15} strokeWidth={1.9} /> },
  { label: 'Voice Log', icon: <Mic size={15} strokeWidth={1.9} /> },
  { label: 'BB Sleep Forecast', icon: <Moon size={15} strokeWidth={1.9} /> },
];

/** First-entry / empty-conversation home: mascot + greeting, then a "Suggested
 *  for you" list and quick-action pills above the composer. The hero collapses
 *  and the pills hide when the keyboard is up (via the .kb-open root class). */
function EmptyHome({ onSend }: { onSend: (text: string) => void }) {
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);
  const part = hour === null ? '' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';

  return (
    <div className="cozy-empty">
      <div className="cozy-empty__hero">
        {/* TODO: swap for the new mascot asset when provided. */}
        <img
          className="cozy-empty__mascot"
          src="/images/IP_%E9%AB%98%E5%85%B4.png"
          alt=""
          draggable={false}
        />
        <h1 className="cozy-greeting cozy-greeting--center">Good {part || 'Day'}</h1>
      </div>

      <div className="cozy-empty__suggest">
        <p className="cozy-suggest-label">Suggested for you</p>
        <div className="cozy-suggest-chips">
          {SUGGESTED.map((q) => (
            <button key={q} type="button" className="cozy-suggest-chip" onClick={() => onSend(q)}>
              {q}
            </button>
          ))}
        </div>
        <div className="cozy-quick-pills">
          {QUICK_PILLS.map((p) => (
            <button key={p.label} type="button" className="cozy-quick-pill">
              {p.icon}
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
