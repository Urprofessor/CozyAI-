'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyOverrides,
  buildDemoMemoryProfile,
  EMPTY_OVERRIDES,
  peopleOf,
  type AddedEntry,
  type EntryEdit,
  type MemoryOverrides,
} from '@/lib/cozy/memory-profile-demo';
import type { ImportItem } from '@/lib/cozy/memory-import';

// Kept apart from `cozyProfile` so the demo's manual edits never touch the
// profile that chat and the lactation plan read.
const LS_KEY = 'cozyMemoryOverrides';

function readLocal(): MemoryOverrides {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return EMPTY_OVERRIDES;
    const parsed = JSON.parse(raw) as Partial<MemoryOverrides>;
    return { edits: parsed.edits ?? {}, forgotten: parsed.forgotten ?? [], added: parsed.added ?? [] };
  } catch {
    return EMPTY_OVERRIDES;
  }
}

function writeLocal(o: MemoryOverrides) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(o));
  } catch {
    /* quota / private mode — edits last for this visit only */
  }
}

/** The demo Memory Profile: seed data plus the edits and forgets saved on
 *  this device. */
export function useMemoryProfile() {
  const seed = useMemo(() => buildDemoMemoryProfile(), []);
  const [overrides, setOverrides] = useState<MemoryOverrides>(EMPTY_OVERRIDES);

  useEffect(() => {
    setOverrides(readLocal());
  }, []);

  const update = useCallback((fn: (o: MemoryOverrides) => MemoryOverrides) => {
    setOverrides((prev) => {
      const next = fn(prev);
      writeLocal(next);
      return next;
    });
  }, []);

  const editEntry = useCallback(
    (id: string, patch: Omit<EntryEdit, 'updatedAt'>) =>
      update((o) => ({
        ...o,
        edits: { ...o.edits, [id]: { ...patch, updatedAt: new Date().toISOString() } },
      })),
    [update]
  );

  const forgetEntry = useCallback(
    (id: string) =>
      update((o) => {
        const { [id]: _dropped, ...edits } = o.edits;
        return { ...o, edits, forgotten: o.forgotten.includes(id) ? o.forgotten : [...o.forgotten, id] };
      }),
    [update]
  );

  /** Save confirmed import items, each tagged with where it came from. */
  const addImported = useCallback(
    (items: ImportItem[], from: string) => {
      const now = new Date().toISOString();
      const added: AddedEntry[] = items.map((item) => ({
        who: item.target.who,
        dim: item.target.dim,
        entry: {
          id: `${item.id}-${Date.now().toString(36)}`,
          kind: 'memory',
          memoryType:
            item.target.dim === 'carePreferences' ? 'preference' : item.target.dim === 'recentConcerns' ? 'event' : 'fact',
          content: item.text,
          source: { kind: 'imported', from },
          createdAt: now,
        },
      }));
      update((o) => ({ ...o, added: [...o.added, ...added] }));
    },
    [update]
  );

  const profile = useMemo(() => applyOverrides(seed, overrides), [seed, overrides]);
  const people = useMemo(() => peopleOf(profile), [profile]);

  /** Forget several entries at once (e.g. everything one import brought). */
  const forgetEntries = useCallback(
    (ids: string[]) =>
      update((o) => {
        const edits = { ...o.edits };
        for (const id of ids) delete edits[id];
        return { ...o, edits, forgotten: [...new Set([...o.forgotten, ...ids])] };
      }),
    [update]
  );

  return { profile, people, editEntry, forgetEntry, forgetEntries, addImported };
}
