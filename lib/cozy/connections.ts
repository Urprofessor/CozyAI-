'use client';

import { useEffect, useState } from 'react';

/** What mom has connected from the letter's "Make it personal" cards.
 *  - ai is real: 'pending' once the prompt email goes out, 'done' once she
 *    saves imported items (count adds up across imports).
 *  - files is real: 'done' once she saves items read from an uploaded file
 *    (count and file names add up).
 *  - health has no connect flow yet; reviewers flip it from the desktop demo
 *    panel to see the connected state. */
export type SourceId = 'health' | 'files' | 'ai';
export type SourceStatus = 'idle' | 'pending' | 'done';

export interface Connections {
  health: 'idle' | 'done';
  files: { status: 'idle' | 'done'; count: number; names: string[] };
  ai: { status: SourceStatus; count: number; from?: string };
}

const KEY = 'cozyConnections';
const CHANGE_EVENT = 'cozie:connections';
const EMPTY: Connections = {
  health: 'idle',
  files: { status: 'idle', count: 0, names: [] },
  ai: { status: 'idle', count: 0 },
};

function read(): Connections {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Connections> | null;
    if (!raw) return EMPTY;
    return {
      health: raw.health === 'done' ? 'done' : 'idle',
      files: { ...EMPTY.files, ...raw.files },
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

export function setHealthConnected(on: boolean) {
  write({ ...read(), health: on ? 'done' : 'idle' });
}

/** Items from an uploaded file were saved. The last few names are kept for the card. */
export function markFileImported(count: number, name: string) {
  const c = read();
  const names = [...c.files.names.filter((n) => n !== name), name].slice(-5);
  write({ ...c, files: { status: 'done', count: c.files.count + count, names } });
}

export function resetFiles() {
  write({ ...read(), files: EMPTY.files });
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
  return id === 'health' ? c.health : c[id].status;
}

/** How much each source adds to how well Cozie knows the family, in percent.
 *  Fixed for the demo; the real figure would count which of the things Cozie
 *  wants to know a source actually filled. The rest (25%) comes from chatting
 *  and Momcozy devices. */
export const SOURCE_SHARE: Record<SourceId, number> = { health: 15, files: 15, ai: 45 };

export function knownPercent(c: Connections) {
  return (Object.keys(SOURCE_SHARE) as SourceId[]).reduce(
    (sum, id) => sum + (statusOf(c, id) === 'done' ? SOURCE_SHARE[id] : 0),
    0,
  );
}

export function connectedCount(c: Connections) {
  return (['health', 'files', 'ai'] as const).filter((id) => statusOf(c, id) === 'done').length;
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
