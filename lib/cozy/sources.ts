'use client';

import { useEffect, useState } from 'react';
import type { DemoAccount, DeviceKind } from './account-demo';
import type { MemoryProfile, MemorySection } from './memory-profile';

/* Data sources: where Cozie's knowledge comes from, managed in Settings →
 * Data sources (components/cozy/DataSources.tsx), apart from the memory
 * profile, which shows what Cozie remembers.
 *
 * - account:   the Momcozy account (baby profile, growth log, check-ups)
 * - device:*   each paired Momcozy device's data
 * - health:    Apple Health (preview only)
 * - import:*   one-off imports — an answer from another AI or a file — read
 *              straight from the memories they brought, so counts stay true
 *
 * Every source has a "Use in answers" switch. Turning one off really keeps
 * its data out of what the chat model is given (see filterAccount and
 * memoryContext); nothing is deleted. */

export type SourceKey = string; // 'account' | `device:${DeviceKind}` | 'health' | `import:${from}`

export const deviceKey = (kind: DeviceKind) => `device:${kind}`;
export const importKey = (from: string) => `import:${from}`;

const KEY = 'cozySourcesOff';
const CHANGE_EVENT = 'cozie:sources';

export function readSourcesOff(): Set<SourceKey> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as SourceKey[]);
  } catch {
    return new Set();
  }
}

export function setSourceOn(key: SourceKey, on: boolean) {
  const off = readSourcesOff();
  if (on) off.delete(key);
  else off.add(key);
  try {
    localStorage.setItem(KEY, JSON.stringify([...off]));
  } catch {
    /* private mode — the event below still updates this tab */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: [...off] }));
}

/** Which sources are switched off; follows changes from anywhere. */
export function useSourcesOff(): Set<SourceKey> {
  const [off, setOff] = useState<Set<SourceKey>>(new Set());
  useEffect(() => {
    setOff(readSourcesOff());
    const sync = () => setOff(readSourcesOff());
    const onChange = (e: Event) => setOff(new Set((e as CustomEvent<SourceKey[]>).detail));
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return off;
}

/** The account as the chat may use it: devices and the growth log that are
 *  switched off are left out. */
export function filterAccount(a: DemoAccount, off: Set<SourceKey>): DemoAccount {
  const useDevice = (k: DeviceKind) => !off.has(deviceKey(k));
  const useAccount = !off.has('account');
  return {
    ...a,
    devices: a.devices.filter((d) => useDevice(d.kind)),
    pumping: useDevice('pump') ? a.pumping : undefined,
    sleep: useDevice('monitor') ? a.sleep : undefined,
    growth: useAccount ? a.growth : [],
    vaccines: useAccount ? a.vaccines : [],
  };
}

/* ---------- One-off imports ---------- */

export interface ImportSource {
  key: SourceKey;
  /** What it was imported from: an AI's name, or a file name. */
  from: string;
  kind: 'ai' | 'file';
  entryIds: string[];
  /** When the first of its memories was saved. */
  at: string;
}

/** Every import that still has memories, newest first. */
export function importSources(profile: MemoryProfile): ImportSource[] {
  const byFrom = new Map<string, ImportSource>();
  const visit = (sections: Record<string, MemorySection<never> | undefined>) => {
    for (const section of Object.values(sections)) {
      for (const e of section?.entries ?? []) {
        if (e.source.kind !== 'imported') continue;
        const from = e.source.from;
        const at = e.kind === 'memory' ? e.createdAt : (e.updatedAt ?? '');
        const s = byFrom.get(from) ?? {
          key: importKey(from),
          from,
          kind: /\.[a-z0-9]{2,4}$/i.test(from) ? ('file' as const) : ('ai' as const),
          entryIds: [],
          at,
        };
        s.entryIds.push(e.id);
        if (at && (!s.at || at < s.at)) s.at = at;
        byFrom.set(from, s);
      }
    }
  };
  visit(profile.mom.sections as Record<string, MemorySection<never>>);
  for (const b of profile.babies) visit(b.sections as Record<string, MemorySection<never>>);
  return [...byFrom.values()].sort((x, y) => y.at.localeCompare(x.at));
}

/* ---------- Opening Settings → Data sources from anywhere ---------- */

export const OPEN_SOURCES_EVENT = 'cozie:open-sources';
export function openDataSources() {
  window.dispatchEvent(new Event(OPEN_SOURCES_EVENT));
}
