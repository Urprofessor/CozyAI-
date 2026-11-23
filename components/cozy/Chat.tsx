'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCozyChat } from '@/hooks/useCozyChat';
import { useCozyClose } from '@/components/shell/cozyClose';
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
import { GuidedIntroSheet } from './GuidedIntro';
import { REPLAY_INTRO_EVENT, useIntroVariant } from '@/lib/cozy/introVariant';
import { CozieLetter, LetterCard } from './CozieLetter';
import { FIRST_LETTER, LETTER_CARD, personaSeed } from '@/lib/cozy/letters';
import { PlanCard, QuestionnaireCard, ScheduleCard } from './cards/LactationCards';
import { logPump, toggleSession } from '@/lib/cozy/lactation';
import type { CardSkill } from '@/lib/cozy/keywords';
import { useCozieLife } from '@/hooks/useCozieLife';
import { CozieHomePage, hasNewAtCozies } from './home/CozieHomePage';
import { useMemoryProfile } from '@/hooks/useMemoryProfile';
import { MemoryProfilePage } from './memory/MemoryProfilePage';
import { AiImportHost } from './memory/AiImport';
import { FileImportHost } from './memory/FileImport';
import { FocusHub } from './focus/FocusHub';
import { accountContext, useDemoAccount } from '@/lib/cozy/account-demo';
import { focusOpener, type FocusId } from '@/lib/cozy/focus';
import { memoryContext } from '@/lib/cozy/memory-context';

// Card messages in the stream (system messages with a sentinel body).
const CARD = {
  questionnaire: '__SKILL_LACTATION__',
  plan: '__PLAN_LACTATION__',
  schedule: '__SCHEDULE_LACTATION__',
} as const;

interface SkillHandlers {
  plan: CozyProfile['lactationPlan'];
  onOpenQuestionnaire: () => void;
  onToggleSession: (index: number) => void;
  onComingSoon: (label: string) => void;
}

interface RowHandlers {
  onOpenImage: (src: string) => void;
  onSarahIntro: () => void;
  ratings: Record<string, Rating>;
  onRate: (id: string, rating: Rating) => void;
  onNegativeFeedback: (id: string) => void;
  onOpenSources: () => void;
  onOpenLetter: () => void;
}

const WELCOMED_KEY = 'cozyWelcomed';
const HISTORY_OPEN_CLASS = 'cz-history-open';

/** Cozie AI tab, laid out like the App's AgentChatViewController: top bar,
 *  home (IP + greeting) or the chat list, the suggestion / quick-access panel
 *  and the input pill, over the #F9F7F5 page with its pink header wash. */
export function CozyChat() {
  const router = useRouter();
  const closeCozy = useCozyClose();
  const profile = useProfile();
  // Latest plan for the hook's post-stream callbacks.
  const planRef = useRef(profile.profile.lactationPlan);
  planRef.current = profile.profile.lactationPlan;
  // What Cozie knows (Momcozy account + memory), sent with every Q&A request
  // so answers get more specific as mom shares more. Filled in below.
  const contextRef = useRef<() => string>(() => '');
  const chat = useCozyChat({
    getContext: () => contextRef.current(),
    onProfilePatch: profile.applyPatch,
    // Same request, different card by plan state — as the App's agent does.
    resolveCard: (skill: CardSkill) => {
      const hasPlan = planRef.current?.status === 'completed';
      if (!hasPlan) return CARD.questionnaire;
      return skill === 'schedule' ? CARD.schedule : CARD.plan;
    },
    onPumpLog: ({ oz, time }) => {
      const plan = planRef.current;
      if (plan?.status === 'completed') profile.applyPatch({ lactationPlan: logPump(plan, oz, time) });
    },
  });
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [heroReplay, setHeroReplay] = useState(0);
  // null = localStorage not read yet; true/false once known.
  const [welcomed, setWelcomed] = useState<boolean | null>(null);
  // "From Cozie" overlay: arriving after Get started, or reopened from its card.
  const [letter, setLetter] = useState<'arrive' | 'reread' | null>(null);
  // Cozie's home: a second-level page over the chat. Mounted on first visit.
  const life = useCozieLife();
  const [homeOpen, setHomeOpen] = useState(false);
  const [homeMounted, setHomeMounted] = useState(false);
  // Memory profile: a second-level page opened from the history drawer. The
  // drawer stays open underneath, so Back returns to it.
  const memory = useMemoryProfile();
  const account = useDemoAccount();
  contextRef.current = () => `${accountContext(account)}
${memoryContext(memory.profile)}`;
  // A direction hub opened from the letter's cards, over the letter.
  const [focus, setFocus] = useState<FocusId | null>(null);
  // A question picked in a hub, sent once the chat has the letter and opener.
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memoryMounted, setMemoryMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWelcomed(localStorage.getItem(WELCOMED_KEY) === '1');
  }, []);

  // Demo panel: which intro to show, and "Replay intro" even after onboarding.
  const introVariant = useIntroVariant();
  const [replaying, setReplaying] = useState(false);
  useEffect(() => {
    const onReplay = () => {
      setLetter(null);
      setReplaying(true);
    };
    window.addEventListener(REPLAY_INTRO_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_INTRO_EVENT, onReplay);
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
    onOpenQuestionnaire: () => router.push('/cozy/lactation'),
    onToggleSession: (index) => {
      const plan = profile.profile.lactationPlan;
      if (plan) profile.applyPatch({ lactationPlan: toggleSession(plan, index) });
    },
    onComingSoon: (label) => showToast(`${label} is coming soon.`),
  };

  // Surface the generated plan card once the questionnaire completes. Wait for
  // history hydration so the load doesn't wipe the inserted card.
  const planStatus = profile.profile.lactationPlan?.status;
  useEffect(() => {
    if (chat.hydrated && planStatus === 'completed') chat.showPlanCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.hydrated, planStatus]);

  useEffect(() => {
    if (!pendingQuestion || chat.streaming || letter || focus) return;
    setPendingQuestion(null);
    chat.send(pendingQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuestion, chat.messages, letter, focus]);

  // Wait until we know both the welcomed flag and the loaded history before
  // choosing a view, so neither the welcome nor the chat flashes first.
  const decided = welcomed !== null && chat.hydrated;
  if (!decided) return <div className="cz-page" />;

  const firstRun = !welcomed && chat.sessions.length === 0;
  const introOn = firstRun || replaying;
  const closeIntro = () => {
    setReplaying(false);
    closeCozy();
  };
  // Every intro ends in the From Cozie letter. It arrives over the (blurred)
  // intro, which stays mounted underneath so the film isn't restarted.
  /** Leave a hub for the chat: Cozie opens on that direction, then her
   *  question (if she picked one) is sent. */
  function chatFromFocus(id: FocusId, question?: string) {
    const opener = focusOpener(account, id);
    if (letter === 'arrive' && firstRun) {
      localStorage.setItem(WELCOMED_KEY, '1');
      profile.applyPatch(personaSeed());
      chat.deliverLetter(LETTER_CARD, opener);
      setWelcomed(true);
    } else {
      // Replayed intro or a reread letter: no second letter in the chat.
      chat.deliverOpener(opener);
    }
    setReplaying(false);
    setLetter(null);
    setFocus(null);
    if (question) setPendingQuestion(question);
  }
  const focusHub = focus && (
    <div className="fh-layer">
      <FocusHub id={focus} account={account} onBack={() => setFocus(null)} onChat={(q) => chatFromFocus(focus, q)} />
    </div>
  );

  const arrivingLetter = letter === 'arrive' && (
    <CozieLetter
      letter={FIRST_LETTER}
      mode="arrive"
      account={account}
      onOpenFocus={setFocus}
      onAction={(action) => {
        setReplaying(false);
        // A replay after onboarding is just a preview: don't seed the
        // persona or post the letter into the chat a second time.
        if (!firstRun) {
          setLetter(null);
          return;
        }
        localStorage.setItem(WELCOMED_KEY, '1');
        profile.applyPatch(personaSeed());
        chat.deliverLetter(LETTER_CARD, action.opener);
        setLetter(null);
        setWelcomed(true);
      }}
    />
  );
  // "Bring what your AI already knows" and "Add a file or report": opened from
  // the letter or the memory profile; confirmed items land in the memory profile.
  const babyName = memory.profile.babies[0]?.displayName ?? 'your baby';
  const importHost = (
    <>
      <AiImportHost babyName={babyName} onSave={memory.addImported} />
      <FileImportHost babyName={babyName} onSave={memory.addImported} />
    </>
  );
  if (introOn) {
    return (
      <>
        {introVariant === 'guide' ? (
          // B · a 75% sheet over whichever tab Cozie was opened from — no chat
          // page behind it, so the tab shows through the dimmed top.
          <GuidedIntroSheet onStart={() => setLetter('arrive')} onClose={closeIntro} />
        ) : (
          // A · the film takes the whole screen.
          <WelcomeGate onStart={() => setLetter('arrive')} onClose={closeIntro} />
        )}
        {arrivingLetter}
        {focusHub}
        {importHost}
        {/* The film brings its own toast host; the sheet doesn't. */}
        {introVariant === 'guide' && <ToastHost />}
      </>
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
    onOpenLetter: () => setLetter('reread'),
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
        onOpenMemory={() => {
          setMemoryMounted(true);
          setMemoryOpen(true);
        }}
        memoryPortrait={{ name: memory.profile.mom.displayName, src: memory.profile.mom.portraitUrl }}
      />

      <div className={cn('cz-page', isHome ? 'is-home' : 'is-chat')}>
        <img className="cz-page__wash" src={`${CZ}/icons/header_background.png`} alt="" aria-hidden />
        {!isHome && <div className="cz-page__bottom-fade" aria-hidden />}

        <CozyTopbar
          title={title}
          canSelectBaby={false}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenHome={() => {
            setHomeMounted(true);
            setHomeOpen(true);
          }}
          homeBadge={hasNewAtCozies(life, profile.profile)}
          onClose={closeCozy}
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

      {letter === 'reread' && (
        <CozieLetter
          letter={FIRST_LETTER}
          mode="reread"
          onClose={() => setLetter(null)}
          account={account}
          onOpenFocus={setFocus}
        />
      )}
      {focusHub}

      {homeMounted && (
        <div className={cn('ch-panel', homeOpen && 'is-open')} inert={!homeOpen} aria-hidden={!homeOpen}>
          <CozieHomePage
            life={life}
            profile={profile.profile}
            onBack={() => setHomeOpen(false)}
          />
        </div>
      )}

      {memoryMounted && (
        <div className={cn('ch-panel', memoryOpen && 'is-open')} inert={!memoryOpen} aria-hidden={!memoryOpen}>
          <MemoryProfilePage memory={memory} onBack={() => setMemoryOpen(false)} />
        </div>
      )}

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {importHost}
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
    if (m.createdAt && (m.role === 'user' || m.role === 'assistant' || m.content === LETTER_CARD)) {
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

    if (m.content === CARD.questionnaire) {
      const plan = skill.plan;
      const inProgress = plan?.status === 'in_progress' && plan.progress;
      out.push(
        <div key={m.id} className="cz-row cz-row--card">
          <QuestionnaireCard
            status={inProgress ? 'process' : 'start'}
            completed={plan?.progress?.current}
            total={plan?.progress?.total}
            disabled={plan?.status === 'completed'}
            onPrimary={skill.onOpenQuestionnaire}
          />
        </div>
      );
      continue;
    }
    if (m.content === CARD.plan || m.content === CARD.schedule) {
      if (skill.plan?.status === 'completed') {
        out.push(
          <div key={m.id} className="cz-row cz-row--card">
            {m.content === CARD.plan ? (
              <PlanCard
                plan={skill.plan}
                onHeader={() => skill.onComingSoon('Plan details')}
                onViewData={() => skill.onComingSoon('Pumping data')}
                onBar={() => skill.onComingSoon('Session logging')}
              />
            ) : (
              <ScheduleCard plan={skill.plan} onToggle={skill.onToggleSession} />
            )}
          </div>
        );
      }
      continue;
    }
    if (m.content === LETTER_CARD) {
      out.push(
        <div key={m.id} className="cz-row cz-row--card">
          <LetterCard letter={FIRST_LETTER} onOpen={rows.onOpenLetter} />
        </div>
      );
      continue;
    }
    // Retired card from older histories.
    if (m.content === '__DASHBOARD_LACTATION__') continue;
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
        onRetry={m.scripted ? undefined : () => chat.regenerate(m.id)}
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
