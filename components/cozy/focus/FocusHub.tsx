'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { daysUntil, type DemoAccount } from '@/lib/cozy/account-demo';
import { focusAsks, focusDef, focusQuestions, type FocusId, type SharperAsk } from '@/lib/cozy/focus';
import { showToast } from '../ui';
import { openAiImport } from '../memory/AiImport';
import { openFileImport } from '../memory/FileImport';
import { ShieldIcon } from '../memory/ImportParts';
import { InsightStoryCard } from '../cards/StoryCard';

/* The hub between the letter and the chat, for every direction mom ticked
 * (a switcher on top when there's more than one). Per direction: what Cozie
 * already knows (from the Momcozy account, with its source named), one thing
 * it noticed, questions to start with, and what would make answers sharper.
 * Every way forward leads into the chat. */

const MOODS = ['Calm', 'Tired', 'Overwhelmed', 'Low'];
const TAB: Record<FocusId, string> = {
  lactation: 'Pumping',
  sleep: 'Sleep',
  growth: 'Growth',
  mood: 'Feelings',
};
const CTA: Record<FocusId, string> = {
  lactation: 'Chat about pumping',
  sleep: 'Chat about sleep',
  growth: 'Chat about Noah’s growth',
  mood: 'Talk to Cozie',
};

interface Props {
  /** The directions she ticked, in card order. */
  ids: FocusId[];
  account: DemoAccount;
  onBack: () => void;
  /** Into the chat on one direction, optionally with a question to send. */
  onChat: (id: FocusId, question?: string) => void;
}

export function FocusHub({ ids, account, onBack, onChat: chatOn }: Props) {
  const [active, setActive] = useState<FocusId>(ids[0]);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ids.includes(active)) setActive(ids[0]);
  }, [ids, active]);
  const id = ids.includes(active) ? active : ids[0];
  const onChat = (question?: string) => chatOn(id, question);
  function pick(next: FocusId) {
    setActive(next);
    scrollRef.current?.scrollTo({ top: 0 });
  }
  const def = focusDef(id);
  const questions = focusQuestions(account, id);
  const asks = focusAsks(account, id);

  function ask(a: SharperAsk) {
    if (a.id === 'file') openFileImport();
    else if (a.id === 'ai') openAiImport();
    else showToast('Apple Health is preview only in this demo.');
  }

  return (
    <div className={cn('fh', `fh--${id}`)} role="dialog" aria-label={def.title}>
      <header className="fh-top">
        <button type="button" className="cz-glass-btn" onClick={onBack} aria-label="Back to the letter">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {ids.length > 1 && (
          <div className="fh-tabs" role="tablist" aria-label="Your directions">
            {ids.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={t === id}
                className={`is-${t}`}
                onClick={() => pick(t)}
              >
                {TAB[t]}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className={cn('fh-scroll', ids.length > 1 && 'has-tabs')} ref={scrollRef} key={id}>
        <div className="fh-hero">
          <FocusIcon id={id} />
          <h2>{def.title}</h2>
          <p>{def.helpers}</p>
        </div>

        <InsightStoryCard account={account} id={id} />

        {id === 'growth' && <GrowthLog account={account} />}

        {id === 'mood' && (
          <section className="fh-section">
            <h3>Today I feel…</h3>
            <div className="fh-moods">
              {MOODS.map((m) => (
                <button key={m} type="button" onClick={() => onChat(`Today I feel ${m.toLowerCase()}.`)}>
                  {m}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="fh-section">
          <h3>Make answers sharper</h3>
          <p className="fh-section__lead">
            The more Cozie knows, the more its answers fit you and Noah. Each is optional.
          </p>
          <ul className="fh-asks">
            {asks.map((a) => (
              <li key={a.id + a.title}>
                <button type="button" onClick={() => ask(a)}>
                  <span className={cn('fh-asks__icon', `is-${a.id}`)} aria-hidden>
                    {a.id === 'file' ? 'PDF' : a.id === 'ai' ? 'AI' : '♥'}
                  </span>
                  <span>
                    <strong>{a.title}</strong>
                    <small>{a.gain}</small>
                  </span>
                  <span className="fh-asks__go" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="fh-safe">
            <ShieldIcon />
            You review everything before Cozie keeps it, and can delete it anytime.
          </p>
        </section>

        <section className="fh-section">
          <h3>Ask Cozie</h3>
          <ul className="fh-questions">
            {questions.map((q) => (
              <li key={q}>
                <button type="button" onClick={() => onChat(q)}>
                  {q}
                  <span aria-hidden>↗</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="fh-footer">
        <button type="button" className="cz-primary-btn" onClick={() => onChat()}>
          {CTA[id]}
        </button>
      </footer>
    </div>
  );
}

function Source({ children }: { children: ReactNode }) {
  return <p className="fh-source">From {children}</p>;
}

export function GrowthLog({ account }: { account: DemoAccount }) {
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  // Measurements and vaccines in one list, oldest first.
  const rows = [
    ...account.growth.map((g) => ({
      key: g.label,
      date: g.date,
      title: g.label,
      detail: [g.weightKg && `${g.weightKg} kg`, g.lengthCm && `${g.lengthCm} cm`].filter(Boolean).join(' · '),
    })),
    ...account.vaccines.map((v) => ({ key: v.label, date: v.date, title: 'Vaccine', detail: v.label })),
  ].sort((x, y) => x.date.localeCompare(y.date));
  return (
    <section className="fh-section">
      <h3>Noah’s log</h3>
      <ol className="fh-log">
        {rows.map((r) => (
          <li key={r.key}>
            <time>{fmt(r.date)}</time>
            <span>
              <b>{r.title}</b>
              {r.detail}
            </span>
          </li>
        ))}
        <li className="is-next">
          <time>{fmt(account.nextCheckup.date)}</time>
          <span>
            <b>Coming up · in {daysUntil(account.nextCheckup.date)} days</b>
            {account.nextCheckup.label}
          </span>
        </li>
      </ol>
      <Source>Noah’s profile in the Momcozy app</Source>
    </section>
  );
}

export function FocusIcon({ id }: { id: FocusId }) {
  return (
    <span className={cn('fh-icon', `is-${id}`)} aria-hidden>
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {id === 'lactation' ? (
          <>
            <path d="M9 3h6v3l2 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-3V3Z" />
            <path d="M7 12h10" />
          </>
        ) : id === 'sleep' ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        ) : id === 'growth' ? (
          <>
            <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
          </>
        ) : (
          <path d="M12 20s-7-4.4-7-9.6C5 7.9 6.9 6 9.2 6c1.2 0 2.2.6 2.8 1.5C12.6 6.6 13.6 6 14.8 6 17.1 6 19 7.9 19 10.4 19 15.6 12 20 12 20Z" />
        )}
      </svg>
    </span>
  );
}
