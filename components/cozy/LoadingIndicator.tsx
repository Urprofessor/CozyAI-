'use client';

import { useEffect, useState } from 'react';
import {
  COZY_LOADING_ICON,
  COZY_SUPPORT_THINKING_TEXTS,
  COZY_THINKING_TEXTS,
} from '@/lib/cozy/constants';
import { COZY_SUPPORT_AVATAR_FALLBACK } from '@/lib/cozy/support-avatars';
import type { Persona } from '@/lib/cozy/types';

interface Props {
  persona: Persona;
  supportAvatar?: string | null;
}

/** Rotating text loading indicator — opacity swap every 1s. */
export function LoadingIndicator({ persona, supportAvatar }: Props) {
  const pool = persona === 'support' ? COZY_SUPPORT_THINKING_TEXTS : COZY_THINKING_TEXTS;
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % pool.length);
        setFade(false);
      }, 200);
    }, 1000);
    return () => clearInterval(id);
  }, [pool.length]);

  const isSupport = persona === 'support';

  return (
    <div className="flex flex-col self-start items-start max-w-[86%]">
      {isSupport && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <img
            src={supportAvatar || COZY_SUPPORT_AVATAR_FALLBACK}
            alt=""
            className="w-6 h-6 object-contain rounded-full"
          />
          <span className="text-xs font-semibold text-brand-rose-700 opacity-80">Sarah</span>
        </div>
      )}
      <div className="flex items-center gap-2 py-1 px-0.5">
        <img src={COZY_LOADING_ICON} alt="" className="w-[18px] h-[18px] animate-cozy-spin" />
        <span
          className="text-sm text-text-muted transition-opacity duration-200"
          style={{ opacity: fade ? 0 : 1 }}
        >
          {pool[idx]}
        </span>
      </div>
    </div>
  );
}
