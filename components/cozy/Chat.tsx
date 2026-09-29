'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCozyChat } from '@/hooks/useCozyChat';
import { useProfile } from '@/hooks/useProfile';
import { SARAH_INTRO } from '@/lib/cozy/constants';
import type { CozyMessage } from '@/lib/cozy/types';
import type { CozyProfile } from '@/lib/cozy/profile';
import { Bubble, RunStatus, type Rating } from './Bubble';
import { CozieHero, SuggestionPanel } from './CozieHome';
import { CozyTopbar } from './CozyTopbar';
import { FeedbackSheet } from './FeedbackSheet';
import { HandoffCard } from './HandoffCard';
import { HistoryDrawer } from './HistoryDrawer';
import { InputBar } from './InputBar';
import { Lightbox } from './Lightbox';
import { LoadingIndicator } from './LoadingIndicator';
import { SettingsSheet } from './SettingsSheet';
import { SourcesSheet } from './SourcesSheet';
import { CZ, showToast, ToastHost } from './ui';
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

interface RowHandlers {
  onOpenImage: (src: string) => void;
  onSarahIntro: () => void;
  ratings: Record<string, Rating>;
  onRate: (id: string, rating: Rating) => void;
  onNegativeFeedback: (id: string) => void;
  onOpenSources: () => void;
}

const WELCOMED_KEY = 'cozyWelcomed';
const HISTORY_OPEN_CLASS = 'cz-history-open';

/** Cozie AI tab, laid out like the App's AgentChatViewController: top bar,
 *  home (IP + greeting) or the chat list, the suggestion / quick-access panel
 *  and the input pill, over the #F9F7F5 page with its pink header wash. */
export function CozyChat() {
  const router = useRouter();
  const profile = useProfile();
  const chat = useCozyChat({ onProfilePatch: profile.applyPatch });
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [heroReplay, setHeroReplay] = useState(0);
  // null = localStorage not read yet; true/false once known.
  const [welcomed, setWelcomed] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWelcomed(localStorage.getItem(WELCOMED_KEY) === '1');
  }, []);

  // The drawer slides the whole tab page (including the tab bar) to the right,
  // so the open state lives on <html> where the shared shell can see it.
  useEffect(() => {
    document.documentElement.classList.toggle(HISTORY_OPEN_CLASS, historyOpen);
  }, [historyOpen]);
  useEffect(() => () => document.documentElement.classList.remove(HISTORY_OPEN_CLASS), []);

  // Follow the bottom as the conversation updates, unless the user scrolled up.
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

  // Surface the generated plan card once the questionnaire completes. Wait for
  // history hydration so the load doesn't wipe the inserted card.
  const planStatus = profile.profile.lactationPlan?.status;
  useEffect(() => {
    if (chat.hydrated && planStatus === 'completed') chat.showPlanCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.hydrated, planStatus]);

  // Wait until we know both the welcomed flag and the loaded history before
  // choosing a view, so neither the welcome nor the chat flashes first.
  const decided = welcomed !== null && chat.hydrated;
  if (!decided) return <div className="cz-page" />;

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

  const isHome = !chat.messages.some((m) => m.role === 'user' || m.role === 'assistant');
  const title = profileTitle(profile.profile);

  function startNewChat() {
    setHistoryOpen(false);
    chat.newSession();
    setHeroReplay((n) => n + 1);
  }

  const rows: RowHandlers = {
    onOpenImage: setLightboxSrc,
    onSarahIntro: handleSarahIntro,
    ratings,
    onRate: (id, rating) => setRatings((r) => ({ ...r, [id]: rating })),
    onNegativeFeedback: setFeedbackFor,
    onOpenSources: () => setSourcesOpen(true),
  };

  return (
    <>
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
        onNewChat={startNewChat}
        onOpenSettings={() => {
          // The App shows settings once the drawer has closed.
          setHistoryOpen(false);
          setTimeout(() => setSettingsOpen(true), 280);
        }}
      />

      <div className={cn('cz-page', isHome ? 'is-home' : 'is-chat')}>
        <img className="cz-page__wash" src={`${CZ}/icons/header_background.png`} alt="" aria-hidden />
        {!isHome && <div className="cz-page__bottom-fade" aria-hidden />}

        <CozyTopbar
          title={title}
          canSelectBaby={false}
          onOpenHistory={() => setHistoryOpen(true)}
          onNewSession={startNewChat}
          newSessionEnabled={!isHome}
        />

        {isHome ? (
          <CozieHero replayKey={heroReplay} />
        ) : (
          <div ref={scrollRef} className="cz-stream">
            {renderStream(chat, skill, rows)}
          </div>
        )}

        <SuggestionPanel
          showSuggestions={isHome}
          onSend={chat.send}
          onLactationPlan={() => chat.startSkill('lactation', 'Check my lactation plan')}
          lactationActive={planStatus === 'completed'}
        />

        <InputBar
          streaming={chat.streaming}
          pendingImages={chat.pendingImages}
          onAddImages={chat.addImages}
          onRemoveImage={chat.removeImage}
          onSend={chat.send}
          onStop={chat.stop}
        />
      </div>

      <SettingsSheet
        open={settingsOpen}
        title={title}
        onClose={() => setSettingsOpen(false)}
        onResetMemory={profile.reset}
        onDeleteHistory={() => {
          chat.deleteAllSessions();
          setSettingsOpen(false);
        }}
      />

      <FeedbackSheet
        open={feedbackFor !== null}
        onClose={() => setFeedbackFor(null)}
        onSubmit={() => {
          if (feedbackFor) setRatings((r) => ({ ...r, [feedbackFor]: 'down' }));
          setFeedbackFor(null);
          showToast('Thanks for the feedback.');
        }}
      />

      <SourcesSheet open={sourcesOpen} onClose={() => setSourcesOpen(false)} />

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      <ToastHost />
    </>
  );
}

/** App agent_chat_profile_*: "Mom and Baby", one of them, or "Cozie". */
function profileTitle(p: CozyProfile) {
  const mom = p.name?.trim();
  const baby = p.baby?.name?.trim();
  if (mom && baby) return `${mom} and ${baby}`;
  return mom || baby || 'Cozie';
}

/** Render the message stream as App ChatList rows. */
function renderStream(
  chat: ReturnType<typeof useCozyChat>,
  skill: SkillHandlers,
  rows: RowHandlers
): ReactNode[] {
  const out: ReactNode[] = [];
  const last = chat.messages[chat.messages.length - 1];

  // The response tail, retry and follow-up chips belong to the newest reply
  // only; a new user message takes them away (App: AgentResponseTail rule).
  let lastTurn: CozyMessage | null = null;
  for (const m of chat.messages) {
    if (m.role === 'user' || m.role === 'assistant') lastTurn = m;
  }
  const latestReplyId = lastTurn?.role === 'assistant' ? lastTurn.id : null;

  let lastDay = '';
  for (const m of chat.messages) {
    // Date separator before the first message of each local day.
    if (m.createdAt && (m.role === 'user' || m.role === 'assistant')) {
      const day = new Date(m.createdAt).toDateString();
      if (day !== lastDay) {
        lastDay = day;
        out.push(
          <div key={`sep-${m.id}`} className="cz-date">
            {formatSeparator(m.createdAt)}
          </div>
        );
      }
    }

    if (m.content === '__SKILL_LACTATION__') {
      out.push(
        <div key={m.id} className="cz-row cz-row--card">
          <LactationSkillMessage onStart={skill.onStart} />
        </div>
      );
      continue;
    }
    if (m.content === '__PLAN_LACTATION__') {
      if (skill.plan) {
        out.push(
          <div key={m.id} className="cz-row cz-row--card">
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
          <div key={m.id} className="cz-row cz-row--card">
            <LactationDashboard plan={skill.plan} />
          </div>
        );
      }
      continue;
    }
    if (m.content === '__HANDOFF_CARD__') {
      out.push(
        <div key={m.id} className="cz-row cz-row--card">
          <HandoffCard
            state={chat.handoffState}
            supportAvatar={chat.supportAvatar}
            onConfirm={chat.confirmHandoff}
            onCancel={chat.cancelHandoff}
            onAdvance={chat.advanceHandoff}
            onJoined={() => {
              chat.finishHandoff();
              chat.appendSystem('Sarah joined the conversation.');
            }}
            onSarahIntro={rows.onSarahIntro}
          />
        </div>
      );
      continue;
    }

    const midStream = chat.streaming && m.id === last?.id && m.role === 'assistant';
    // A reply being regenerated is empty until its first token: show the run
    // status in its place.
    if (midStream && !m.content) {
      out.push(<RunStatus key={m.id} />);
      continue;
    }

    out.push(
      <Bubble
        key={m.id}
        msg={m}
        onOpenImage={rows.onOpenImage}
        streaming={midStream}
        isLatestReply={m.id === latestReplyId}
        showSuggestions={m.id === latestReplyId && !midStream}
        onSuggest={chat.send}
        onRetry={() => chat.regenerate(m.id)}
        rating={rows.ratings[m.id] ?? null}
        onRate={(r) => rows.onRate(m.id, r)}
        onNegativeFeedback={() => rows.onNegativeFeedback(m.id)}
        onOpenSources={rows.onOpenSources}
      />
    );
  }

  // Pre-first-token gap: Cozie's run status (Sarah keeps her typing indicator).
  if (chat.streaming && last?.role !== 'assistant') {
    out.push(
      chat.persona === 'support' ? (
        <div key="loading" className="cz-row cz-row--agent">
          <LoadingIndicator persona={chat.persona} supportAvatar={chat.supportAvatar} />
        </div>
      ) : (
        <RunStatus key="loading" />
      )
    );
  }

  return out;
}

/** Today HH:mm / Yesterday HH:mm / MMM d, HH:mm / MMM d, yyyy, HH:mm. */
function formatSeparator(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (dayDiff === 0) return `Today ${time}`;
  if (dayDiff === 1) return `Yesterday ${time}`;
  const month = d.toLocaleString('en-US', { month: 'short' });
  return d.getFullYear() === now.getFullYear()
    ? `${month} ${d.getDate()}, ${time}`
    : `${month} ${d.getDate()}, ${d.getFullYear()}, ${time}`;
}
