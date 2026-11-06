'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Drawing {
  id: string;
  title: string;
  day: number;
  createdAt: number;
  /** JPEG data URL, ~600px wide. */
  src: string;
}

const KEY = 'cozieDrawings';
const MAX = 20;

function read(): Drawing[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Drawing[]) : [];
  } catch {
    return [];
  }
}

/** Drawings made on the prenatal device, pinned to the wall board. Demo
 *  storage: this browser only (localStorage), newest first, at most 20. */
export function useDrawings() {
  const [drawings, setDrawings] = useState<Drawing[]>([]);

  useEffect(() => setDrawings(read()), []);

  const persist = useCallback((next: Drawing[]) => {
    // If the browser is out of room, drop the oldest until it fits.
    let list = next;
    for (;;) {
      try {
        localStorage.setItem(KEY, JSON.stringify(list));
        break;
      } catch {
        if (list.length <= 1) break;
        list = list.slice(0, -1);
      }
    }
    setDrawings(list);
    return list;
  }, []);

  const add = useCallback(
    (d: Omit<Drawing, 'id' | 'createdAt'>) => {
      const drawing: Drawing = { ...d, id: `d${Date.now().toString(36)}`, createdAt: Date.now() };
      persist([drawing, ...read()].slice(0, MAX));
      return drawing;
    },
    [persist]
  );

  const remove = useCallback((id: string) => persist(read().filter((d) => d.id !== id)), [persist]);

  return { drawings, add, remove };
}
