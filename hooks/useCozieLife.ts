'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LifeState } from '@/lib/cozy/life/engine';
import { useDeviceId } from './useDeviceId';

const LS_KEY = 'cozieLife';

function readLocal(): LifeState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LifeState) : {};
  } catch {
    return {};
  }
}

function writeLocal(s: LifeState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Progress in Cozie's home. Same persistence as useProfile: localStorage for
 *  an instant start, Redis (via /api/life) as the durable copy when set up. */
export function useCozieLife() {
  const deviceId = useDeviceId();
  const [state, setState] = useState<LifeState>({});
  const [ready, setReady] = useState(false);
  const deviceRef = useRef<string | null>(null);

  useEffect(() => {
    deviceRef.current = deviceId;
  }, [deviceId]);

  useEffect(() => {
    setState(readLocal());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/life?deviceId=' + encodeURIComponent(deviceId));
        if (!res.ok) return;
        const data = (await res.json()) as { state?: LifeState };
        if (!cancelled && data.state && Object.keys(data.state).length) {
          setState(data.state);
          writeLocal(data.state);
        }
      } catch {
        /* offline / not configured */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  const save = useCallback((next: LifeState) => {
    writeLocal(next);
    const id = deviceRef.current;
    if (id) {
      fetch('/api/life', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: id, state: next }),
      }).catch(() => {});
    }
  }, []);

  const update = useCallback(
    (fn: (s: LifeState) => LifeState) => {
      setState((cur) => {
        const next = fn(cur);
        if (next !== cur) save(next);
        return next;
      });
    },
    [save]
  );

  /** Day 1 starts the first time the mom walks in. */
  const begin = useCallback(
    () => update((s) => (s.startedAt ? s : { ...s, startedAt: Date.now() })),
    [update]
  );

  const markSeen = useCallback(
    (id: string) => update((s) => (s.seen?.includes(id) ? s : { ...s, seen: [...(s.seen ?? []), id] })),
    [update]
  );

  const answer = useCallback(
    (id: string, choice: string) =>
      update((s) => ({
        ...s,
        answers: { ...s.answers, [id]: choice },
        seen: s.seen?.includes(id) ? s.seen : [...(s.seen ?? []), id],
      })),
    [update]
  );

  const skipDay = useCallback(() => update((s) => ({ ...s, dayOffset: (s.dayOffset ?? 0) + 1 })), [update]);

  const restart = useCallback(
    () => update((s) => ({ startedAt: Date.now(), device: s.device })),
    [update]
  );

  const setDevice = useCallback(
    (device: 'pump' | 'prenatal') => update((s) => ({ ...s, device })),
    [update]
  );

  return { state, ready, begin, markSeen, answer, skipDay, restart, setDevice };
}

export type CozieLife = ReturnType<typeof useCozieLife>;
