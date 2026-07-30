'use client';

import { useEffect, useRef, useState } from 'react';
import { useCozyChat } from '@/hooks/useCozyChat';
import { SARAH_INTRO } from '@/lib/cozy/constants';
import { Bubble } from './Bubble';
import { CozyTopbar } from './CozyTopbar';
import { HandoffCard } from './HandoffCard';
import { HistoryDrawer } from './HistoryDrawer';
import { InputBar } from './InputBar';
import { Lightbox } from './Lightbox';
import { LoadingIndicator } from './LoadingIndicator';

/** Cozy AI tab — the AI home IS the conversation. The greeting is the stream's
 *  opening element and scrolls away with it. */
export function CozyChat() {
  const chat = useCozyChat();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="cozy-page">
      <CozyTopbar
        onOpenHistory={() => setHistoryOpen(true)}
        onNewSession={() => {
          setHistoryOpen(false);
          chat.newSession();
        }}
      />

      {/* Conversation stream — the only scroll area */}
      <div ref={scrollRef} className="cozy-stream">
        <Greeting />

        {chat.messages.map((m) =>
          m.content === '__HANDOFF_CARD__' ? (
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
              onSarahIntro={handleSarahIntro}
            />
          ) : (
            <Bubble key={m.id} msg={m} onOpenImage={setLightboxSrc} />
          )
        )}
        {chat.streaming && (
          <LoadingIndicator persona={chat.persona} supportAvatar={chat.supportAvatar} />
        )}
      </div>

      <div className="cozy-fade" aria-hidden />

      <InputBar
        streaming={chat.streaming}
        pendingImages={chat.pendingImages}
        onAddImages={chat.addImages}
        onRemoveImage={chat.removeImage}
        onSend={chat.send}
        onStop={chat.stop}
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
