'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyOverrides,
  blockKey,
  buildDemoMemoryProfile,
  EMPTY_OVERRIDES,
  peopleOf,
  type AddedEntry,
  type AnyEntry,
  type AnySection,
  type Dimension,
  type EntryEdit,
  type MemoryOverrides,
} from '@/lib/cozy/memory-profile-demo';
import type { ImportItem } from '@/lib/cozy/memory-import';
import type { MemoryProfile } from '@/lib/cozy/memory-profile';
import { useSourcesOff } from '@/lib/cozy/sources';

// Kept apart from `cozyProfile` so the demo's manual edits never touch the
// profile that chat and the lactation plan read.
const LS_KEY = 'cozyMemoryOverrides';

function readLocal(): MemoryOverrides {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return EMPTY_OVERRIDES;
    const parsed = JSON.parse(raw) as Partial<MemoryOverrides>;
    return {
      edits: parsed.edits ?? {},
      forgotten: parsed.forgotten ?? [],
      added: parsed.added ?? [],
      blocked: parsed.blocked ?? [],
    };
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

/** Every entry in one person's section, before any display filtering. */
export function sectionEntries(profile: MemoryProfile, person: string, dim: Dimension): AnyEntry[] {
  const sections = (person === 'mom' ? profile.mom : profile.babies.find((b) => b.babyId === person))?.sections as
    | Partial<Record<Dimension, AnySection>>
    | undefined;
  return sections?.[dim]?.entries ?? [];
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

  /** Save confirmed import items, each tagged with where it came from. Items
   *  for a topic she asked Cozie not to remember are dropped. */
  const addImported = useCallback(
    (items: ImportItem[], from: string) => {
      const now = new Date().toISOString();
      const firstBaby = seed.babies[0]?.babyId ?? 'baby';
      const allowed = items.filter(
        (item) => !blockedRef.current.has(blockKey(item.target.who === 'mom' ? 'mom' : firstBaby, item.target.dim))
      );
      const added: AddedEntry[] = allowed.map((item) => ({
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
    [seed, update]
  );

  /** "Stop remembering" a topic: forget what Cozie saved there and keep it
   *  out from now on. Fields from the Momcozy profile can't be forgotten
   *  here; they're only hidden while the topic is off. */
  const blockSection = useCallback(
    (person: string, dim: Dimension) =>
      update((o) => {
        const entries = sectionEntries(applyOverrides(seed, o), person, dim);
        const ids = entries.filter((e) => e.source.kind !== 'momcozyProfile').map((e) => e.id);
        const edits = { ...o.edits };
        for (const id of ids) delete edits[id];
        const key = blockKey(person, dim);
        return {
          ...o,
          edits,
          forgotten: [...new Set([...o.forgotten, ...ids])],
          blocked: o.blocked.includes(key) ? o.blocked : [...o.blocked, key],
        };
      }),
    [seed, update]
  );

  const unblockSection = useCallback(
    (person: string, dim: Dimension) =>
      update((o) => ({ ...o, blocked: o.blocked.filter((k) => k !== blockKey(person, dim)) })),
    [update]
  );

  const off = useSourcesOff();
  const blocked = useMemo(() => new Set(overrides.blocked), [overrides.blocked]);
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const profile = useMemo(() => applyOverrides(seed, overrides), [seed, overrides]);
  // What the page shows: sources switched off and stopped topics left out.
  const people = useMemo(() => peopleOf(profile, new Date(), { off, blocked }), [profile, off, blocked]);

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

  return { profile, people, blocked, editEntry, forgetEntry, forgetEntries, addImported, blockSection, unblockSection };
}
