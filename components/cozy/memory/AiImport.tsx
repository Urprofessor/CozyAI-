'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { IMPORT_PROMPT, isEmail, type ImportItem } from '@/lib/cozy/memory-import';
import { AI_LINKS } from '@/lib/cozy/import-privacy';
import { markAiImported, markAiPending } from '@/lib/cozy/connections';
import { BottomSheet, CZ, showToast } from '../ui';
import { ImportReview, PrivacyCard, ShieldIcon, defaultPicks, togglePick } from './ImportParts';

/* "Bring what your AI already knows". "Email me the prompt" sends it through
 * /api/import-email (Gmail first, Resend as fallback) and moves straight on
 * to the paste box; if the email can't go out, the prompt can be copied
 * here instead. The email's link opens Cozie at the paste step
 * (/cozy?import=paste). "Ask Claude / ChatGPT" open the AI with the prompt
 * already filled in. /api/import-parse reads the pasted answer (DeepSeek,
 * with a local fallback) and mom reviews every item before Cozie keeps it. */

const OPEN_EVENT = 'cozie:open-ai-import';

type Stage = 'email' | 'paste' | 'reading' | 'review';

/** Open the import sheet from anywhere inside Cozie — at the start, or
 *  straight at the paste box once the email is out. */
export function openAiImport(at: 'email' | 'paste' = 'email') {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: at }));
}
/** What happened to the email on the way to the paste step. */
type Delivery = 'sent' | 'unsent' | null;
const SOURCES = ['Claude', 'ChatGPT', 'Gemini', 'Grok', 'Other'] as const;
const MIN_READING_MS = 900;

interface Props {
  /** Baby the "baby" items belong to (the demo has Noah first). */
  babyName: string;
  onSave: (items: ImportItem[], from: string) => void;
}

export function AiImportHost({ babyName, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [answer, setAnswer] = useState('');
  const [from, setFrom] = useState<string | null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [delivery, setDelivery] = useState<Delivery>(null);
  const readId = useRef(0);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setStage((e as CustomEvent<Stage>).detail === 'paste' ? 'paste' : 'email');
      setAnswer('');
      setError('');
      setItems([]);
      setDelivery(null);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);

    // Arrived from the email's "Paste the answer in Cozie" link.
    const url = new URL(window.location.href);
    if (url.searchParams.get('import') === 'paste') {
      url.searchParams.delete('import');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      setStage('paste');
      setOpen(true);
    }

    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const close = () => {
    readId.current++; // drop a read still in flight
    setOpen(false);
  };

  async function sendEmail() {
    setSending(true);
    setError('');
    let reason = 'send_failed';
    try {
      const res = await fetch('/api/import-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as { sent?: boolean; reason?: string };
      reason = data.sent ? 'sent' : (data.reason ?? 'send_failed');
    } catch {
      // Network error: treated as not sent.
    }
    setSending(false);
    if (reason === 'rate_limited') {
      setError('That’s a few emails already today. Try again tomorrow, or copy the prompt instead.');
      return;
    }
    setDelivery(reason === 'sent' ? 'sent' : 'unsent');
    if (reason === 'sent') markAiPending();
    setStage('paste');
  }

  async function read() {
    const id = ++readId.current;
    setError('');
    setStage('reading');
    const started = Date.now();
    let found: ImportItem[] | null = null;
    try {
      const res = await fetch('/api/import-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: answer }),
      });
      if (res.ok) found = ((await res.json()) as { items?: ImportItem[] }).items ?? [];
    } catch {
      // Handled below.
    }
    const wait = MIN_READING_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (id !== readId.current) return;

    if (found === null) {
      setError('Cozie couldn’t read that just now. Check your connection and try again.');
      setStage('paste');
      return;
    }
    if (!found.length) {
      setError('Cozie didn’t find anything about you or your baby in that answer. Make sure you pasted the whole reply.');
      setStage('paste');
      return;
    }
    setItems(found);
    setPicked(defaultPicks(found));
    setStage('review');
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT);
      showToast('Prompt copied. Paste it into your AI.');
    } catch {
      showToast('Couldn’t copy. Use the prompt in the email instead.');
    }
  }

  function save() {
    const chosen = items.filter((i) => picked.has(i.id));
    onSave(chosen, from ?? 'your AI');
    markAiImported(chosen.length, from ?? 'your AI');
    setOpen(false);
    showToast(`Cozie will remember ${chosen.length} new ${chosen.length === 1 ? 'thing' : 'things'}.`);
  }

  return (
    <div className="cz-import-layer">
      <BottomSheet open={open} onClose={close} label="Import from another AI" className="cz-import">
        <span className="cz-sheet__grabber" aria-hidden />
        <button type="button" className="cz-glass-btn cz-import__close" onClick={close} aria-label="Close">
          <img src={`${CZ}/icons/settings_close.svg`} alt="" />
        </button>

        {stage === 'email' && (
          <>
            <div className="cz-import__scroll">
              <ImportArt />
              <h2 className="cz-import__title">Bring what your AI already knows</h2>
              <p className="cz-import__lead">
                If you’ve talked to Claude, ChatGPT, Gemini or Grok about your pregnancy or baby, Cozie can pick up
                from there.
              </p>
              <ol className="cz-import__steps">
                <li>
                  <b>We email you a short prompt</b>
                  <span>Open it wherever you use your AI — phone or laptop.</span>
                </li>
                <li>
                  <b>Run it in your AI</b>
                  <span>It writes down only what it knows about your baby, feeding and sleep.</span>
                </li>
                <li>
                  <b>Paste the answer back here</b>
                  <span>You check every line before Cozie keeps it.</span>
                </li>
              </ol>
              <PrivacyCard />
              <label className="cz-import__field">
                <span>Your email</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              {error ? (
                <p className="cz-import__error">{error}</p>
              ) : (
                <p className="cz-import__demo">We only use your email to send the prompt — never for marketing.</p>
              )}
            </div>
            <div className="cz-import__footer">
              <button
                type="button"
                className="cz-primary-btn"
                disabled={!isEmail(email) || sending}
                onClick={sendEmail}
              >
                {sending ? 'Sending…' : 'Email me the prompt'}
              </button>
              <button type="button" className="cz-import__secondary" onClick={() => setStage('paste')}>
                I already have an answer
              </button>
            </div>
          </>
        )}

        {stage === 'paste' && (
          <>
            <div className="cz-import__scroll">
              <button type="button" className="cz-import__back" onClick={() => setStage('email')}>
                ‹ Back
              </button>
              {delivery && (
                <p className={cn('cz-import__notice', delivery === 'sent' && 'is-sent')} role="status">
                  {delivery === 'sent'
                    ? `Sent to ${email.trim()}. Run the prompt in your AI, then paste its answer below.`
                    : `We couldn’t email ${email.trim()} just now. Copy the prompt here instead.`}
                </p>
              )}
              <h2 className="cz-import__title">Paste your AI’s answer</h2>
              <div className="cz-import__tools">
                {AI_LINKS.map((l) => (
                  <a
                    key={l.name}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      // Also on the clipboard, in case this AI ignores the prefill.
                      navigator.clipboard?.writeText(IMPORT_PROMPT).catch(() => {});
                      setFrom(l.name);
                    }}
                  >
                    Ask {l.name} ↗
                  </a>
                ))}
                <button type="button" onClick={copyPrompt}>
                  Copy the prompt
                </button>
              </div>
              <p className="cz-import__hint">
                “Ask” opens your AI with the prompt filled in and copies it too — if it doesn’t show up, just paste.
              </p>
              <textarea
                className="cz-import__paste"
                aria-label="Your AI’s answer"
                placeholder="Paste the whole answer here. Cozie picks out what matters for you and your baby."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <p className="cz-import__label">Which AI wrote it? (optional)</p>
              <div className="cz-import__chips" role="radiogroup" aria-label="Which AI wrote it">
                {SOURCES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={from === s}
                    onClick={() => setFrom(from === s ? null : s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {error && <p className="cz-import__error">{error}</p>}
              <p className="cz-import__safe">
                <ShieldIcon />
                Your answer is read once, then discarded. Only the lines you approve are saved, and you can delete them
                anytime.
              </p>
            </div>
            <div className="cz-import__footer">
              <button type="button" className="cz-primary-btn" disabled={!answer.trim()} onClick={read}>
                Read my answer
              </button>
            </div>
          </>
        )}

        {stage === 'reading' && (
          <div className="cz-import__reading" role="status">
            <img src={`${CZ}/ip/Cozie_Thinking_Light.webp`} alt="" />
            <p>Cozie is reading your answer…</p>
          </div>
        )}

        {stage === 'review' && (
          <ImportReview
            items={items}
            picked={picked}
            onToggle={(id) => setPicked((prev) => togglePick(prev, id))}
            babyName={babyName}
            lead={`${items.length} ${items.length === 1 ? 'thing' : 'things'} from ${from ? `${from}’s` : 'your'} answer.`}
            onSave={save}
            backLabel="Back to my answer"
            onBack={() => setStage('paste')}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function ImportArt() {
  return (
    <div className="cz-import__art" aria-hidden>
      <span className="cz-import__bubble is-left">AI</span>
      <span className="cz-import__envelope">
        <svg viewBox="0 0 32 24" width="30" height="22">
          <rect x="1.5" y="1.5" width="29" height="21" rx="4" fill="#fff" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 4l13 9 13-9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </span>
      <img className="cz-import__cozie" src={`${CZ}/ip/Cozy_Magic_Light.webp`} alt="" />
    </div>
  );
}
