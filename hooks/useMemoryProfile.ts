'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyOverrides,
  buildDemoMemoryProfile,
  EMPTY_OVERRIDES,
  peopleOf,
  type EntryEdit,
  type MemoryOverrides,
} from '@/lib/cozy/memory-profile-demo';

// Kept apart from `cozyProfile` so the demo's manual edits never touch the
// profile that chat and the lactation plan read.
const LS_KEY = 'cozyMemoryOverrides';

function readLocal(): MemoryOverrides {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return EMPTY_OVERRIDES;
    const parsed = JSON.parse(raw) as Partial<MemoryOverrides>;
    return { edits: parsed.edits ?? {}, forgotten: parsed.forgotten ?? [] };
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
        return { edits, forgotten: o.forgotten.includes(id) ? o.forgotten : [...o.forgotten, id] };
      }),
    [update]
  );

  const profile = useMemo(() => applyOverrides(seed, overrides), [seed, overrides]);
  const people = useMemo(() => peopleOf(profile), [profile]);

  return { profile, people, editEntry, forgetEntry };
}
