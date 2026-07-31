'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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
import { NextUpBar } from './NextUpBar';
import { WelcomeGate } from './WelcomeGate';
import { LactationSkillMessage } from './skill/LactationSkillMessage';

interface SkillHandlers {
  plan: CozyProfile['lactationPlan'];
  onStart: () => void;
  onStartTracking: () => void;
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

  // Auto-scroll to bottom as messages grow.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length, chat.streaming]);

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
  };

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

  return (
    <div className="cozy-page">
      <CozyTopbar
        onOpenHistory={() => setHistoryOpen(true)}
        onNewSession={() => {
          setHistoryOpen(false);
          chat.newSession();
        }}
      />

      <NextUpBar profile={profile.profile} />

      {/* Conversation stream — the only scroll area */}
      <div ref={scrollRef} className="cozy-stream">
        <Greeting />

        {renderStream(chat, setLightboxSrc, handleSarahIntro, skill)}

        {chat.streaming && (
          <LoadingIndicator persona={chat.persona} supportAvatar={chat.supportAvatar} />
        )}
      </div>

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

/** Render the message stream, inserting a system-style timestamp divider
 *  whenever more than a minute passes between consecutive messages. */
function renderStream(
  chat: ReturnType<typeof useCozyChat>,
  onOpenImage: (src: string) => void,
  onSarahIntro: () => void,
  skill: SkillHandlers
): ReactNode[] {
  const out: ReactNode[] = [];
  let lastTs: number | null = null;
  const GAP_MS = 60_000;

  for (const m of chat.messages) {
    if (m.content === '__SKILL_LACTATION__') {
      out.push(
        <LactationSkillMessage
          key={m.id}
          plan={skill.plan}
          onStart={skill.onStart}
          onStartTracking={skill.onStartTracking}
        />
      );
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

    const ts = m.role === 'user' || m.role === 'assistant' ? m.createdAt : undefined;
    if (ts) {
      if (lastTs === null || ts - lastTs > GAP_MS) {
        out.push(
          <div
            key={`ts-${m.id}`}
            className="cozy-tier-3 self-center max-w-[90%] px-3 py-0.5 my-1"
          >
            {formatTimestamp(ts)}
          </div>
        );
      }
      lastTs = ts;
    }

    out.push(<Bubble key={m.id} msg={m} onOpenImage={onOpenImage} />);
  }

  return out;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === new Date().toDateString()) return time;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${time}`;
}

function Greeting() {
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);

  const part = hour === null ? '' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  return (
    <h1 className="cozy-greeting">
      Good {part || 'day'}, <em>Clare</em>
    </h1>
  );
}
