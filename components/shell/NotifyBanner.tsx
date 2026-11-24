'use client';

import { useEffect, useState } from 'react';
import { useDemoAccount } from '@/lib/cozy/account-demo';
import { NOTIFY_EVENT, nextStepsPlan, type NotifyDetail } from '@/lib/cozy/next-steps';

/* A phone notification for a first-task promise that has come due with its
 * reminder on (lib/cozy/next-steps.ts). The demo can't send real push yet, so
 * this draws one at the top of the phone frame; tapping it opens Cozie, where
 * the promised card is waiting. */

const SHOW_MS = 12000;

export function NotifyBanner({ onOpen }: { onOpen: () => void }) {
  const account = useDemoAccount();
  const [note, setNote] = useState<(NotifyDetail & { key: number }) | null>(null);

  useEffect(() => {
    const onNotify = (e: Event) => setNote({ ...(e as CustomEvent<NotifyDetail>).detail, key: Date.now() });
    window.addEventListener(NOTIFY_EVENT, onNotify);
    return () => window.removeEventListener(NOTIFY_EVENT, onNotify);
  }, []);

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), SHOW_MS);
    return () => window.clearTimeout(t);
  }, [note]);

  if (!note) return null;
  const plan = nextStepsPlan(account, note.kind);
  const step = plan.steps.find((s) => s.day === note.day);

  return (
    <button
      key={note.key}
      type="button"
      className="notify-banner"
      onClick={() => {
        setNote(null);
        onOpen();
      }}
    >
      <img className="notify-banner__icon" src="/cozie/icons/cozie_tab.png" alt="" aria-hidden />
      <span className="notify-banner__body">
        <span className="notify-banner__top">
          <strong>Cozie</strong>
          <small>now</small>
        </span>
        <strong className="notify-banner__title">{step?.title}</strong>
        <span className="notify-banner__text">{plan.opener[note.day].replace(/:$/, '.')}</span>
      </span>
    </button>
  );
}
