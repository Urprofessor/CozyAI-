'use client';

import { useEffect, useState } from 'react';

const KEY = 'cozyDeviceId';

/** Stable per-browser id, used to key persisted chat history in Upstash. */
export function useDeviceId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let stored = localStorage.getItem(KEY);
    if (!stored) {
      stored = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, stored);
    }
    setId(stored);
  }, []);
  return id;
}
