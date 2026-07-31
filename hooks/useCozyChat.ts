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
  COZY_MAX_IMAGES_PER_MSG,
  COZY_MAX_MSGS_PER_SESSION,
  COZY_MAX_SESSIONS,
  COZY_PAGE_SIZE,
  COZY_SESSION_TIMEOUT_MS,
} from '@/lib/cozy/constants';
import { HANDOFF_TAG, EXIT_TAG, PROFILE_TAG_RE, SKILL_TAG_RE } from '@/lib/cozy/prompts';
import { detectHandoffTrigger, detectSkillTrigger } from '@/lib/cozy/keywords';
import { pickRandomSupportAvatar } from '@/lib/cozy/support-avatars';
import type { CozyMessage, CozySession, HandoffState, Persona } from '@/lib/cozy/types';
import type { CozyProfile } from '@/lib/cozy/profile';
import { useDeviceId } from './useDeviceId';

interface Options {
  initialPersona?: Persona;
  /** Extraction seam: called post-stream with any profile facts the model
   *  emitted via a [[PROFILE:{...}]] tag. Swappable for a dedicated call later. */
  onProfilePatch?: (patch: Partial<CozyProfile>) => void;
}

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

  const abortRef = useRef<AbortController | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  const currentIdRef = useRef<string | null>(null);
  const sessionsRef = useRef<CozySession[]>([]);
  const deviceIdRef = useRef<string | null>(null);
  const onProfilePatchRef = useRef(opts.onProfilePatch);

  useEffect(() => {
    onProfilePatchRef.current = opts.onProfilePatch;
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
    async (text: string) => {
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

      // Keyword surfaces the pumping-plan skill card (in addition to the reply).
      if (cleaned) {
        const skill = detectSkillTrigger(cleaned);
        if (skill) insertSkillMessage(skill);
      }

      if (inQueue) {
        return;
      }

      if (persona === 'qa' && cleaned && detectHandoffTrigger(cleaned)) {
        beginHandoffCard();
        return;
      }

      await streamReply(persona, [...messages, userMsg]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingImages, streaming, persona, inQueue, messages]
  );

  const stop = useCallback(() => {
    stopInternal(abortRef);
  }, []);

  // ---------- streaming to /api/chat ----------

  async function streamReply(personaAtStart: Persona, history: CozyMessage[]) {
    setStreaming(true);
    abortRef.current = new AbortController();
    let text = '';
    const assistantId = newId();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          persona: personaAtStart,
          messages: history
            .filter((m) => m.role === 'user' || m.role === 'assistant')
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
      let bubbleAdded = false;

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
      if (!isAbort) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: 'assistant',
            content: "Sorry, I couldn't reach the assistant right now. Please try again.",
            persona: personaAtStart,
            createdAt: Date.now(),
          },
        ]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }

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
    if (skillMatch) insertSkillMessage(skillMatch[1]);

    const hasHandoff = text.includes(HANDOFF_TAG);
    const hasExit = text.includes(EXIT_TAG);
    const clean = cleanForDisplay(text).trim();

    if (personaAtStart === 'qa' && hasHandoff) {
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      beginHandoffCard();
      return;
    }

    if (clean && personaAtStart === 'qa') {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: clean, reference: 'From Professional literature' }
            : m
        )
      );
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

  const appendSystem = useCallback((content: string) => {
    setMessages((prev) => [...prev, { id: newId(), role: 'system', content }]);
  }, []);

  // Surface the skill card in the chat. Re-poppable: any existing card is
  // moved to the bottom so chips / keyword / AI-tag always pop a fresh one.
  function insertSkillMessage(skill: string) {
    if (skill !== 'lactation') return;
    const sentinel = '__SKILL_LACTATION__';
    setMessages((prev) => [
      ...prev.filter((m) => m.content !== sentinel),
      { id: newId(), role: 'system', content: sentinel, createdAt: Date.now() },
    ]);
  }

  const startSkill = useCallback((skill: string) => insertSkillMessage(skill), []);

  // Append the tracking dashboard inline in the chat (deduped) — "查看详情".
  const showDashboard = useCallback(() => {
    const sentinel = '__DASHBOARD_LACTATION__';
    setMessages((prev) =>
      prev.some((m) => m.content === sentinel)
        ? prev
        : [...prev, { id: newId(), role: 'system', content: sentinel, createdAt: Date.now() }]
    );
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
    stop,
    newSession,
    loadSession,
    deleteSession,
    addImages,
    removeImage,
    confirmHandoff,
    cancelHandoff,
    advanceHandoff,
    finishHandoff,
    appendSystem,
    appendAssistant,
    startSkill,
    showDashboard,
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
    .replaceAll(HANDOFF_TAG, '')
    .replaceAll(EXIT_TAG, '');
  const open = t.lastIndexOf('[[');
  if (open !== -1 && t.indexOf(']]', open) === -1) t = t.slice(0, open);
  return t;
}
