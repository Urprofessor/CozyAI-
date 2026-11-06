'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Song } from '@/lib/cozy/home/music';

const KEY = 'cozieSongs';
const MAX = 20;

function read(): Song[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Song[]) : [];
  } catch {
    return [];
  }
}

/** Songs written on the prenatal device, hung on the crib mobile. Demo
 *  storage: this browser only, newest first, at most 20. Melodies are a few
 *  hundred bytes; the optional humming is the bulk. */
export function useSongs() {
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => setSongs(read()), []);

  const persist = useCallback((next: Song[]) => {
    let list = next;
    for (;;) {
      try {
        localStorage.setItem(KEY, JSON.stringify(list));
        break;
      } catch {
        if (list.length <= 1) {
          // Still too big: keep the melody, drop the humming.
          list = list.map((s) => ({ ...s, voice: undefined, voiceSec: undefined }));
          try {
            localStorage.setItem(KEY, JSON.stringify(list));
          } catch {
            /* give up quietly */
          }
          break;
        }
        list = list.slice(0, -1);
      }
    }
    setSongs(list);
    return list;
  }, []);

  const add = useCallback(
    (s: Omit<Song, 'id' | 'createdAt'>) => {
      const song: Song = { ...s, id: `s${Date.now().toString(36)}`, createdAt: Date.now() };
      persist([song, ...read()].slice(0, MAX));
      return song;
    },
    [persist]
  );

  const remove = useCallback((id: string) => persist(read().filter((s) => s.id !== id)), [persist]);

  return { songs, add, remove };
}
