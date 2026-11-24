'use client';

// Central chat controller. Conversations are grouped into sessions:
//   • a session boundary occurs after 30 min of inactivity, or when the user
//     taps "new chat" in the topbar
//   • only sessions with at least one message get archived into history
//   • the history drawer lists archived sessions (newest first), titled from
//     the first user message
//
// Persistence: one array of sessions per device in Upstash (see /api/history).

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COZY_DEFAULT_FOLLOWUPS,
  COZY_MAX_IMAGES_PER_MSG,
  COZY_MAX_MSGS_PER_SESSION,
  COZY_MAX_SESSIONS,
  COZY_PAGE_SIZE,
  COZY_SESSION_TIMEOUT_MS,
} from '@/lib/cozy/constants';
import { HANDOFF_TAG, EXIT_TAG, PROFILE_TAG_RE, PUMP_TAG_RE, SKILL_TAG_RE } from '@/lib/cozy/prompts';
import { detectHandoffTrigger, detectSkillTrigger, type CardSkill } from '@/lib/cozy/keywords';
import { ASK_TAG_RE, ASK_TAG_RE_G, WORKDAY_ASK, detectClarifyTrigger, parseAsk } from '@/lib/cozy/clarify';
import { pickRandomSupportAvatar } from '@/lib/cozy/support-avatars';
import type { CozyMessage, CozySession, HandoffState, Persona } from '@/lib/cozy/types';
import type { CozyProfile } from '@/lib/cozy/profile';
import { useDeviceId } from './useDeviceId';

interface Options {
  initialPersona?: Persona;
  /** Extraction seam: called post-stream with any profile facts the model
   *  emitted via a [[PROFILE:{...}]] tag. Swappable for a dedicated call later. */
  onProfilePatch?: (patch: Partial<CozyProfile>) => void;
  /** Picks the card message for a skill from current plan state (e.g. the
   *  setup card vs the plan dashboard). Returns the card sentinel. */
  resolveCard?: (skill: CardSkill) => string;
  /** Called post-stream with a pumping log the model emitted via [[PUMP:{...}]]. */
  onPumpLog?: (entry: { oz: number; time?: string }) => void;
  /** What Cozie knows about mom and baby (account + memory), sent with Q&A
   *  requests so answers fit her. Read at send time. */
  getContext?: () => string;
}

const QUESTIONNAIRE_CARD = '__SKILL_LACTATION__';

export function useCozyChat(opts: Options = {}) {
  const deviceId = useDeviceId();
  const [messages, setMessages] = useState<CozyMessage[]>([]);
  const [sessions, setSessions] = useState<CozySession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [persona, setPersona] = useState<Persona>(opts.initialPersona ?? 'qa');
  const [streaming, setStreaming] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [handoffState, setHandoffState] = useState<HandoffState>('idle');
  const [supportAvatar, setSupportAvatar] = useState<string | null>(null);
  const [inQueue, setInQueue] = useState(false);
  const [hydrated, setHydrated] = useState(false); // sessions loaded from server yet?

  const getContextRef = useRef(opts.getContext);
  getContextRef.current = opts.getContext;
  const abortRef = useRef<AbortController | null>(null);
  // Set when a stream is aborted because the conversation is being swapped out
  // (new chat / load session) — that abort must not leave a "stopped" reply.
  const discardStreamRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  const currentIdRef = useRef<string | null>(null);
  const sessionsRef = useRef<CozySession[]>([]);
  const deviceIdRef = useRef<string | null>(null);
  const onProfilePatchRef = useRef(opts.onProfilePatch);
  const resolveCardRef = useRef(opts.resolveCard);
  const onPumpLogRef = useRef(opts.onPumpLog);

  useEffect(() => {
    onProfilePatchRef.current = opts.onProfilePatch;
    resolveCardRef.current = opts.resolveCard;
    onPumpLogRef.current = opts.onPumpLog;
  });
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);
  useEffect(() => {
    currentIdRef.current = currentSessionId;
  }, [currentSessionId]);
  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  // ---------- load sessions + resume active one ----------

  useEffect(() => {
    if (!deviceId || loadedRef.current) return;
    (async () => {
      let loaded: CozySession[] = [];
      try {
        const res = await fetch('/api/history?deviceId=' + encodeURIComponent(deviceId));
        if (res.ok) {
          const data = (await res.json()) as { sessions?: CozySession[] };
          if (Array.isArray(data.sessions)) loaded = data.sessions;
        }
      } catch {
        /* offline / not configured — silent */
      }
      loaded.sort((a, b) => b.updatedAt - a.updatedAt);
      setSessions(loaded);
      sessionsRef.current = loaded;

      // Resume the latest session only if it's still within the 30-min window.
      const latest = loaded[0];
      if (latest && Date.now() - latest.updatedAt <= COZY_SESSION_TIMEOUT_MS) {
        currentIdRef.current = latest.id;
        setCurrentSessionId(latest.id);
        setMessages(latest.messages || []);
      } else {
        currentIdRef.current = null;
        setCurrentSessionId(null);
        setMessages([]);
      }
      loadedRef.current = true;
      setHydrated(true);
    })();
  }, [deviceId]);

  // Upsert the current session whenever messages change, then persist.
  useEffect(() => {
    if (!loadedRef.current || !messages.length) return;

    let id = currentIdRef.current;
    if (!id) {
      id = newId();
      currentIdRef.current = id;
      setCurrentSessionId(id);
    }

    const now = Date.now();
    const prev = sessionsRef.current;
    const existing = prev.find((s) => s.id === id);
    const updated: CozySession = {
      id,
      title: existing?.title || deriveTitle(messages),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      messages,
    };
    const next = [updated, ...prev.filter((s) => s.id !== id)]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, COZY_MAX_SESSIONS);

    sessionsRef.current = next;
    setSessions(next);
    persistSessions(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const persistSessions = useCallback((list: CozySession[]) => {
    const id = deviceIdRef.current;
    if (!id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: id, sessions: sanitizeSessions(list) }),
        });
      } catch {
        /* best-effort */
      }
    }, 400);
  }, []);

  /** Manual restart from the topbar — the current session is already archived. */
  const newSession = useCallback(() => {
    if (abortRef.current) discardStreamRef.current = true;
    stopInternal(abortRef);
    currentIdRef.current = null;
    setCurrentSessionId(null);
    setMessages([]);
    setPersona('qa');
    setSupportAvatar(null);
    setInQueue(false);
    setHandoffState('idle');
    setPendingImages([]);
  }, []);

  /** Load an archived session from the history drawer. */
  const loadSession = useCallback((id: string) => {
    const s = sessionsRef.current.find((x) => x.id === id);
    if (!s) return;
    if (abortRef.current) discardStreamRef.current = true;
    stopInternal(abortRef);
    currentIdRef.current = id;
    setCurrentSessionId(id);
    setMessages(s.messages || []);
    setPersona('qa');
    setSupportAvatar(null);
    setInQueue(false);
    setHandoffState('idle');
    setPendingImages([]);
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      const next = sessionsRef.current.filter((s) => s.id !== id);
      sessionsRef.current = next;
      setSessions(next);
      persistSessions(next);
      if (currentIdRef.current === id) {
        currentIdRef.current = null;
        setCurrentSessionId(null);
        setMessages([]);
      }
    },
    [persistSessions]
  );

  const deleteAllSessions = useCallback(() => {
    sessionsRef.current = [];
    setSessions([]);
    persistSessions([]);
    currentIdRef.current = null;
    setCurrentSessionId(null);
    setMessages([]);
  }, [persistSessions]);

  // ---------- image pool ----------

  const addImages = useCallback(
    (files: File[]) => {
      const room = COZY_MAX_IMAGES_PER_MSG - pendingImages.length;
      if (room <= 0) return;
      const accepted = files.slice(0, room);
      Promise.all(
        accepted.map(
          (f) =>
            new Promise<string | null>((resolve) => {
              if (!f.type.startsWith('image/')) return resolve(null);
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(f);
            })
        )
      ).then((urls) => {
        setPendingImages((prev) => [...prev, ...(urls.filter(Boolean) as string[])]);
      });
    },
    [pendingImages.length]
  );

  const removeImage = useCallback((idx: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ---------- sending ----------

  const send = useCallback(
    async (text: string, opts?: { answering?: boolean }) => {
      const cleaned = text.trim();
      const images = pendingImages.slice();
      if (!cleaned && !images.length) return;
      if (streaming) return;

      const userMsg: CozyMessage = {
        id: newId(),
        role: 'user',
        content: cleaned,
        persona,
        createdAt: Date.now(),
        ...(images.length ? { images } : {}),
      };
      setMessages((prev) => [...prev, userMsg]);
      setPendingImages([]);

      if (inQueue) {
        return;
      }

      if (persona === 'qa' && cleaned && detectHandoffTrigger(cleaned)) {
        beginHandoffCard();
        return;
      }

      // Demo backstop for the model's [[ASK]] tag: the workday-schedule
      // request always asks its two questions first (lib/cozy/clarify.ts).
      if (persona === 'qa' && cleaned && !images.length && !opts?.answering && detectClarifyTrigger(cleaned)) {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'assistant',
            content: WORKDAY_ASK.lead,
            persona,
            scripted: true,
            ask: structuredClone(WORKDAY_ASK.ask),
            createdAt: Date.now(),
          },
        ]);
        return;
      }

      await streamReply(persona, [...messages, userMsg]);

      // Keyword backstop for the model's [[SKILL:*]] tag: surface the card
      // after the reply. Otherwise keep an existing setup card anchored below
      // the latest reply so it doesn't scroll away.
      const keywordSkill = cleaned ? detectSkillTrigger(cleaned) : null;
      if (keywordSkill) {
        insertCard(keywordSkill);
      } else {
        setMessages((prev) =>
          prev.some((m) => m.content === QUESTIONNAIRE_CARD)
            ? [
                ...prev.filter((m) => m.content !== QUESTIONNAIRE_CARD),
                { id: newId(), role: 'system', content: QUESTIONNAIRE_CARD, createdAt: Date.now() },
              ]
            : prev
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingImages, streaming, persona, inQueue, messages]
  );

  // Re-generate an existing reply in place: re-run the model on the same prompt
  // and stream the fresh answer back into the same message (never deleted).
  const regenerate = useCallback(
    (assistantId: string) => {
      if (streaming) return;
      const idx = messages.findIndex((m) => m.id === assistantId);
      if (idx < 0 || messages[idx].role !== 'assistant' || messages[idx].scripted) return;
      const target = messages[idx];
      const history = messages.slice(0, idx); // everything up to the prompting user message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: '', reference: undefined, suggestions: undefined, stopped: false }
            : m
        )
      );
      void streamReply(target.persona ?? persona, history, assistantId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, streaming, persona]
  );

  const stop = useCallback(() => {
    stopInternal(abortRef);
  }, []);

  // ---------- streaming to /api/chat ----------

  async function streamReply(
    personaAtStart: Persona,
    history: CozyMessage[],
    targetId?: string
  ) {
    setStreaming(true);
    abortRef.current = new AbortController();
    let text = '';
    let aborted = false;
    const isRegen = !!targetId; // rewrite an existing reply in place vs. append a new one
    const assistantId = targetId ?? newId();

    let bubbleAdded = isRegen; // regen updates the existing message instead of appending
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          persona: personaAtStart,
          ...(personaAtStart === 'qa' && getContextRef.current ? { context: getContextRef.current() } : {}),
          messages: history
            // Stopped-before-first-token replies are empty; the model APIs reject those.
            .filter((m) => (m.role === 'user' || m.role === 'assistant') && (m.content || m.images?.length))
            .map((m) => {
              const base: { role: 'user' | 'assistant'; content: string; images?: string[] } = {
                role: m.role as 'user' | 'assistant',
                content: m.content || '',
              };
              if (m.images?.length) base.images = m.images;
              return base;
            }),
        }),
      });

      if (!res.ok || !res.body) throw new Error('AI request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line) continue;
          const colon = line.indexOf(':');
          if (colon < 0) continue;
          const kind = line.slice(0, colon);
          const raw = line.slice(colon + 1);
          if (kind === '0') {
            try {
              const t = JSON.parse(raw) as string;
              text += t;
              const stripped = cleanForDisplay(text);
              if (!bubbleAdded && stripped.trim()) {
                bubbleAdded = true;
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantId,
                    role: 'assistant',
                    content: stripped,
                    persona: personaAtStart,
                    createdAt: Date.now(),
                  },
                ]);
              } else if (bubbleAdded) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: stripped } : m))
                );
              }
            } catch {
              /* skip malformed */
            }
          }
        }
      }
    } catch (err: unknown) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      if (isAbort && discardStreamRef.current) {
        discardStreamRef.current = false;
        aborted = true;
      } else if (isAbort) {
        // Keep whatever streamed in and mark the reply as stopped (the list
        // renders "Response stopped" + regenerate under it, as in the App).
        aborted = true;
        const partial = cleanForDisplay(text).trim();
        setMessages((prev) =>
          bubbleAdded
            ? prev.map((m) => (m.id === assistantId ? { ...m, content: partial, stopped: true } : m))
            : [
                ...prev,
                {
                  id: assistantId,
                  role: 'assistant',
                  content: partial,
                  persona: personaAtStart,
                  stopped: true,
                  createdAt: Date.now(),
                },
              ]
        );
      } else {
        const errText = "Sorry, I couldn't reach the assistant right now. Please try again.";
        setMessages((prev) =>
          isRegen
            ? prev.map((m) => (m.id === assistantId ? { ...m, content: errText } : m))
            : [
                ...prev,
                {
                  id: assistantId,
                  role: 'assistant',
                  content: errText,
                  persona: personaAtStart,
                  createdAt: Date.now(),
                },
              ]
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
    if (aborted) return;

    // Extract the silent profile tag (if any) and hand the patch to the store.
    const profileMatch = text.match(PROFILE_TAG_RE);
    if (profileMatch) {
      try {
        const patch = JSON.parse(profileMatch[1]) as Partial<CozyProfile>;
        onProfilePatchRef.current?.(patch);
      } catch {
        /* malformed tag — ignore */
      }
    }

    // Skill offer: append a skill card message (deduped) if the model asked.
    const skillMatch = text.match(SKILL_TAG_RE);
    if (skillMatch && (skillMatch[1] === 'lactation' || skillMatch[1] === 'schedule')) {
      insertCard(skillMatch[1]);
    }

    // Pumping log → plan data (sessions / today's volume).
    const pumpMatch = text.match(PUMP_TAG_RE);
    if (pumpMatch) {
      try {
        const entry = JSON.parse(pumpMatch[1]) as { oz?: number; time?: string };
        if (typeof entry.oz === 'number' && entry.oz > 0) {
          onPumpLogRef.current?.({ oz: entry.oz, time: entry.time });
        }
      } catch {
        /* malformed tag — ignore */
      }
    }

    // Clarifying questions: the card docks above the input; no follow-up
    // chips while it's open (the questions are the next step).
    const askMatch = personaAtStart === 'qa' ? text.match(ASK_TAG_RE) : null;
    const ask = askMatch ? parseAsk(askMatch[1]) : null;

    const hasHandoff = text.includes(HANDOFF_TAG);
    const hasExit = text.includes(EXIT_TAG);
    const clean = cleanForDisplay(text).trim() || (ask ? 'A couple of quick questions first:' : '');

    if (personaAtStart === 'qa' && hasHandoff) {
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      beginHandoffCard();
      return;
    }

    if (clean && personaAtStart === 'qa' && ask) {
      // A reply that is only the tag never got a bubble while streaming.
      setMessages((prev) =>
        prev.some((m) => m.id === assistantId)
          ? prev.map((m) => (m.id === assistantId ? { ...m, content: clean, ask } : m))
          : [...prev, { id: assistantId, role: 'assistant', content: clean, persona: personaAtStart, ask, createdAt: Date.now() }]
      );
    } else if (clean && personaAtStart === 'qa') {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: clean } : m))
      );
      // Generate the follow-up chips in a separate call so they're contextual
      // and reliable (see /api/suggest). Fire-and-forget; attaches when ready.
      void fetchSuggestions([...history, { id: assistantId, role: 'assistant', content: clean }], assistantId);
    }

    if (personaAtStart === 'support' && hasExit) {
      setPersona('qa');
      setSupportAvatar(null);
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'system', content: 'Conversation ended' },
      ]);
    }
  }

  /** Ask /api/suggest for two contextual follow-up chips and attach them to the
   *  reply once they arrive. Falls back to a fixed pair on any failure so every
   *  QA reply ends up with chips. */
  async function fetchSuggestions(history: CozyMessage[], msgId: string) {
    let suggestions: string[] = [];
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content || '' })),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { suggestions?: unknown };
        if (Array.isArray(data.suggestions)) {
          suggestions = data.suggestions
            .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
            .slice(0, 2);
        }
      }
    } catch {
      /* offline / not configured — fall through to defaults */
    }
    if (!suggestions.length) suggestions = [...COZY_DEFAULT_FOLLOWUPS];
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, suggestions } : m)));
  }

  // ---------- handoff flow ----------

  function beginHandoffCard() {
    setHandoffState('idle');
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: 'system', content: '__HANDOFF_CARD__' }, // sentinel
    ]);
  }

  const confirmHandoff = useCallback(() => {
    const av = pickRandomSupportAvatar();
    setSupportAvatar(av);
    setInQueue(true);
    setHandoffState('connecting');
  }, []);

  const cancelHandoff = useCallback(() => {
    setInQueue(false);
    setHandoffState('idle');
    setMessages((prev) => prev.filter((m) => m.content !== '__HANDOFF_CARD__'));
  }, []);

  const advanceHandoff = useCallback((next: HandoffState) => {
    setHandoffState(next);
  }, []);

  const finishHandoff = useCallback(() => {
    setInQueue(false);
    setHandoffState('joined');
    setPersona('support');
  }, []);

  /** Close an open clarify card and send its answers as her next message. */
  const answerAsk = useCallback(
    (msgId: string, summary: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId && m.ask ? { ...m, ask: { ...m.ask, status: 'answered' } } : m))
      );
      void send(summary, { answering: true });
    },
    [send]
  );

  const appendSystem = useCallback((content: string) => {
    setMessages((prev) => [...prev, { id: newId(), role: 'system', content }]);
  }, []);

  // Surface a skill card; the card kind comes from plan state (resolveCard).
  // Re-poppable: an existing card of the same kind moves to the bottom.
  function insertCard(skill: CardSkill) {
    const sentinel = resolveCardRef.current?.(skill) ?? QUESTIONNAIRE_CARD;
    setMessages((prev) => [
      ...prev.filter((m) => m.content !== sentinel),
      { id: newId(), role: 'system', content: sentinel, createdAt: Date.now() },
    ]);
  }

  /** Offer a skill card. With `userText`, first post it as the user's turn —
   *  the App's quick-access "Lactation plan" sends "Check my lactation plan". */
  const startSkill = useCallback((skill: CardSkill, userText?: string) => {
    if (userText) {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'user', content: userText, createdAt: Date.now() },
      ]);
    }
    insertCard(skill);
  }, []);

  // Surface the generated plan card (deduped) — inserted once the questionnaire
  // completes. Distinct from the always-initial offer card.
  const showPlanCard = useCallback(() => {
    const sentinel = '__PLAN_LACTATION__';
    setMessages((prev) =>
      prev.some((m) => m.content === sentinel)
        ? prev
        : [...prev, { id: newId(), role: 'system', content: sentinel, createdAt: Date.now() }]
    );
  }, []);


  /** Deliver a letter into the conversation: its card, then Cozie's fixed
   *  opener for whichever reply mom picked. Returns the opener's id. */
  const deliverLetter = useCallback(
    (sentinel: string, opener: { content: string; suggestions?: string[] }) => {
      const now = Date.now();
      const id = newId();
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'system', content: sentinel, createdAt: now },
        {
          id,
          role: 'assistant',
          content: opener.content,
          persona: 'qa',
          createdAt: now,
          scripted: true,
          ...(opener.suggestions ? { suggestions: opener.suggestions } : {}),
        },
      ]);
      return id;
    },
    []
  );

  /** Cozie's scripted opener on its own (no letter card), e.g. after a hub.
   *  Returns its id. */
  const deliverOpener = useCallback((opener: { content: string; suggestions?: string[] }) => {
    const id = newId();
    setMessages((prev) => [
      ...prev,
      {
        id,
        role: 'assistant',
        content: opener.content,
        persona: 'qa',
        createdAt: Date.now(),
        scripted: true,
        ...(opener.suggestions ? { suggestions: opener.suggestions } : {}),
      },
    ]);
    return id;
  }, []);

  /** Attach follow-up chips to a message once they arrive (e.g. the first
   *  guidance chips, generated while she read the letter). */
  const setSuggestions = useCallback((msgId: string, suggestions: string[]) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, suggestions } : m)));
  }, []);

  const appendAssistant = useCallback(
    (content: string, personaOverride?: Persona) => {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          content,
          persona: personaOverride ?? persona,
          createdAt: Date.now(),
          ...(personaOverride === 'support' && supportAvatar ? { avatar: supportAvatar } : {}),
        },
      ]);
    },
    [persona, supportAvatar]
  );

  return {
    // state
    messages,
    sessions,
    hydrated,
    currentSessionId,
    persona,
    streaming,
    pendingImages,
    handoffState,
    supportAvatar,
    inQueue,
    // actions
    send,
    regenerate,
    stop,
    newSession,
    loadSession,
    deleteSession,
    deleteAllSessions,
    addImages,
    removeImage,
    confirmHandoff,
    cancelHandoff,
    advanceHandoff,
    finishHandoff,
    appendSystem,
    answerAsk,
    appendAssistant,
    deliverLetter,
    deliverOpener,
    setSuggestions,
    startSkill,
    showPlanCard,
    pageSize: COZY_PAGE_SIZE,
  };
}

// ---------- helpers ----------

function deriveTitle(messages: CozyMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  const t = (firstUser?.content || '').trim();
  if (t) return t.length > 30 ? t.slice(0, 30) + '…' : t;
  if (firstUser?.images?.length) return 'Photo message';
  return 'New chat';
}

/** Strip base64 image data and cap message count before persisting. */
function sanitizeSessions(list: CozySession[]): CozySession[] {
  return list.slice(0, COZY_MAX_SESSIONS).map((s) => ({
    ...s,
    messages: s.messages
      .map((m) => {
        if (!m.images?.length) return m;
        const { images, ...rest } = m;
        return { ...rest, imageCount: images.length } as CozyMessage & { imageCount: number };
      })
      .slice(-COZY_MAX_MSGS_PER_SESSION),
  }));
}

function stopInternal(abortRef: React.MutableRefObject<AbortController | null>) {
  if (abortRef.current) {
    try {
      abortRef.current.abort();
    } catch {
      /* ignore */
    }
  }
}

function newId() {
  return 'm_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Remove silent tags for display, including a trailing partial tag still being
 *  streamed (so half-written JSON never flashes on screen). */
function cleanForDisplay(text: string): string {
  let t = text
    .replace(/\[\[PROFILE:[\s\S]*?\]\]/g, '')
    .replace(/\[\[SKILL:[a-z_]+\]\]/g, '')
    .replace(/\[\[PUMP:[\s\S]*?\]\]/g, '')
    .replace(ASK_TAG_RE_G, '')
    .replaceAll(HANDOFF_TAG, '')
    .replaceAll(EXIT_TAG, '');
  const open = t.lastIndexOf('[[');
  if (open !== -1 && t.indexOf(']]', open) === -1) t = t.slice(0, open);
  return t;
}
