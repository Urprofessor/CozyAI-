'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { IMPORT_PROMPT, isEmail, type ImportItem } from '@/lib/cozy/memory-import';
import { DIMENSION_LABELS } from '@/lib/cozy/memory-profile-demo';
import { BottomSheet, CZ, showToast } from '../ui';

/* "Bring what your AI already knows". "Email me the prompt" sends it through
 * /api/import-email (Gmail first, Resend as fallback) and moves straight on
 * to the paste box; if the email can't go out, the prompt can be copied
 * here instead. The email's link opens Cozie at the paste step
 * (/cozy?import=paste). /api/import-parse reads the pasted answer (DeepSeek,
 * with a local fallback) and mom reviews every item before Cozie keeps it. */

const OPEN_EVENT = 'cozie:open-ai-import';

/** Open the import sheet from anywhere inside Cozie. */
export function openAiImport() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Stage = 'email' | 'paste' | 'reading' | 'review';
/** What happened to the email on the way to the paste step. */
type Delivery = 'sent' | 'unsent' | null;
const SOURCES = ['Claude', 'ChatGPT', 'Gemini', 'Other'] as const;
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
    const onOpen = () => {
      setStage('email');
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
    setPicked(new Set(found.filter((i) => !i.sensitive).map((i) => i.id)));
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
    setOpen(false);
    showToast(`Cozie will remember ${chosen.length} new ${chosen.length === 1 ? 'thing' : 'things'}.`);
  }

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const groups = [
    { key: 'mom', title: 'About you', items: items.filter((i) => i.target.who === 'mom') },
    { key: 'baby', title: `About ${babyName}`, items: items.filter((i) => i.target.who === 'baby') },
  ].filter((g) => g.items.length);

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
                If you’ve talked to Claude or ChatGPT about your pregnancy or baby, Cozie can pick up from there.
              </p>
              <ol className="cz-import__steps">
                <li>
                  <b>We email you a short prompt</b>
                  <span>Open it wherever you use your AI — phone or laptop.</span>
                </li>
                <li>
                  <b>Run it in Claude or ChatGPT</b>
                  <span>It writes down only what it knows about your baby, feeding and sleep.</span>
                </li>
                <li>
                  <b>Paste the answer back here</b>
                  <span>You check every line before Cozie keeps it.</span>
                </li>
              </ol>
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
                <p className="cz-import__demo">We only use your email to send the prompt.</p>
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
                <button type="button" onClick={copyPrompt}>
                  Copy the prompt
                </button>
                <a href="https://claude.ai/new" target="_blank" rel="noreferrer">
                  Open Claude ↗
                </a>
                <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">
                  Open ChatGPT ↗
                </a>
              </div>
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
          <>
            <div className="cz-import__scroll">
              <h2 className="cz-import__title">Here’s what Cozie found</h2>
              <p className="cz-import__lead">
                {items.length} {items.length === 1 ? 'thing' : 'things'} from {from ? `${from}’s` : 'your'} answer.
                Untick anything you don’t want Cozie to remember.
              </p>
              {groups.map((g) => (
                <section key={g.key} className="cz-import__group">
                  <h3>{g.title}</h3>
                  <ul>
                    {g.items.map((item) => {
                      const on = picked.has(item.id);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            className={cn('cz-import__item', !on && 'is-off')}
                            onClick={() => toggle(item.id)}
                          >
                            <i aria-hidden />
                            <span>
                              {item.text}
                              <small>
                                {DIMENSION_LABELS[item.target.dim]}
                                {item.sensitive && <em className="cz-import__tag">Sensitive · off by default</em>}
                              </small>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              <p className="cz-import__demo">You can edit or delete any of these later in your memory profile.</p>
            </div>
            <div className="cz-import__footer">
              <button type="button" className="cz-primary-btn" disabled={!picked.size} onClick={save}>
                Remember {picked.size} {picked.size === 1 ? 'thing' : 'things'}
              </button>
              <button type="button" className="cz-import__secondary" onClick={() => setStage('paste')}>
                Back to my answer
              </button>
            </div>
          </>
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
