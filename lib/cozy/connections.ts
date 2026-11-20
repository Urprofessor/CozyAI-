'use client';

import { useEffect, useState } from 'react';

/** What mom has connected from the letter's "Make it personal" cards.
 *  - ai is real: 'pending' once the prompt email goes out, 'done' once she
 *    saves imported items (count adds up across imports).
 *  - health / devices have no connect flow yet; reviewers flip them from the
 *    desktop demo panel to see the connected state. */
export type SourceId = 'health' | 'devices' | 'ai';
export type SourceStatus = 'idle' | 'pending' | 'done';

export interface Connections {
  health: 'idle' | 'done';
  devices: 'idle' | 'done';
  ai: { status: SourceStatus; count: number; from?: string };
}

const KEY = 'cozyConnections';
const CHANGE_EVENT = 'cozie:connections';
const EMPTY: Connections = { health: 'idle', devices: 'idle', ai: { status: 'idle', count: 0 } };

function read(): Connections {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Connections> | null;
    if (!raw) return EMPTY;
    return {
      health: raw.health === 'done' ? 'done' : 'idle',
      devices: raw.devices === 'done' ? 'done' : 'idle',
      ai: { ...EMPTY.ai, ...raw.ai },
    };
  } catch {
    return EMPTY;
  }
}

function write(next: Connections) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode — the event below still updates this tab */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
}

export function setSourceConnected(id: 'health' | 'devices', on: boolean) {
  write({ ...read(), [id]: on ? 'done' : 'idle' });
}

/** The prompt email went out. An earlier import stays "done". */
export function markAiPending() {
  const c = read();
  if (c.ai.status !== 'done') write({ ...c, ai: { ...c.ai, status: 'pending' } });
}

export function markAiImported(count: number, from: string) {
  const c = read();
  write({ ...c, ai: { status: 'done', count: c.ai.count + count, from } });
}

export function resetAi() {
  write({ ...read(), ai: EMPTY.ai });
}

export function statusOf(c: Connections, id: SourceId): SourceStatus {
  return id === 'ai' ? c.ai.status : c[id];
}

export function connectedCount(c: Connections) {
  return (['health', 'devices', 'ai'] as const).filter((id) => statusOf(c, id) === 'done').length;
}

/** Current connections; follows changes from anywhere in the app (and other tabs). */
export function useConnections(): Connections {
  const [c, setC] = useState<Connections>(EMPTY);
  useEffect(() => {
    setC(read());
    const sync = () => setC(read());
    const onChange = (e: Event) => setC((e as CustomEvent<Connections>).detail);
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return c;
}
