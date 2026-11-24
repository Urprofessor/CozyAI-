'use client';

import { useEffect } from 'react';
import { originInfo } from '@/lib/origin';

/** Leaves a signature in the browser console and on window.__cozyOrigin. */
export function OriginMark() {
  useEffect(() => {
    const o = originInfo();
    (window as unknown as { __cozyOrigin: unknown }).__cozyOrigin = Object.freeze(o);
    console.log(
      `%c${o.project}%c by ${o.tag} · ${o.build}`,
      'font: 600 13px Georgia, serif; color: #770523',
      'font: 12px system-ui, sans-serif; color: #9f969b',
    );
  }, []);
  return null;
}
