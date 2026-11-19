'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { IMPORT_PROMPT, isEmail, parseImport, SAMPLE_REPLY, type ImportItem } from '@/lib/cozy/memory-import';
import { DIMENSION_LABELS } from '@/lib/cozy/memory-profile-demo';
import { BottomSheet, CZ, showToast } from '../ui';

/* "Bring what your AI already knows" — demo mode. Nothing is emailed: after
 * "Email me the steps" the email mom would get is previewed here, and
 * "Simulate Claude's reply" stands in for her answer coming back. Pasting a
 * real answer works too. Every item is reviewed before Cozie keeps it. */

const OPEN_EVENT = 'cozie:open-ai-import';

/** Open the import sheet from anywhere inside Cozie. */
export function openAiImport() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Stage = 'email' | 'sent' | 'paste' | 'reading' | 'review';
const SOURCES = ['Claude', 'ChatGPT', 'another AI'] as const;

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
  const [from, setFrom] = useState<string>('Claude');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const readTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onOpen = () => {
      setStage('email');
      setAnswer('');
      setError('');
      setItems([]);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.clearTimeout(readTimer.current);
    };
  }, []);

  function read(text: string, source: string) {
    const found = parseImport(text);
    if (!found.length) {
      setError('Cozie couldn’t find the headings. Make sure the answer keeps lines like “## Feeding”.');
      setStage('paste');
      return;
    }
    setFrom(source);
    setItems(found);
    setPicked(new Set(found.map((i) => i.id)));
    setError('');
    setStage('reading');
    readTimer.current = window.setTimeout(() => setStage('review'), 1400);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT);
      showToast('Prompt copied.');
    } catch {
      showToast('Select the prompt and copy it.');
    }
  }

  function save() {
    const chosen = items.filter((i) => picked.has(i.id));
    onSave(chosen, from);
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
      <BottomSheet open={open} onClose={() => setOpen(false)} label="Import from another AI" className="cz-import">
        <span className="cz-sheet__grabber" aria-hidden />
        <button type="button" className="cz-glass-btn cz-import__close" onClick={() => setOpen(false)} aria-label="Close">
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
                  <b>Reply with the answer</b>
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
              <p className="cz-import__demo">Demo mode — no email is sent. You’ll see a preview here.</p>
            </div>
            <div className="cz-import__footer">
              <button
                type="button"
                className="cz-primary-btn"
                disabled={!isEmail(email)}
                onClick={() => setStage('sent')}
              >
                Email me the steps
              </button>
            </div>
          </>
        )}

        {stage === 'sent' && (
          <>
            <div className="cz-import__scroll">
              <p className="cz-import__badge">Demo preview</p>
              <h2 className="cz-import__title">Check your inbox</h2>
              <p className="cz-import__lead">This is the email we’d send to {email.trim()}.</p>
              <EmailPreview to={email.trim()} onCopy={copyPrompt} />
            </div>
            <div className="cz-import__footer">
              <button type="button" className="cz-primary-btn" onClick={() => read(SAMPLE_REPLY, 'Claude')}>
                Simulate Claude’s reply
              </button>
              <button type="button" className="cz-import__secondary" onClick={() => setStage('paste')}>
                Paste an answer instead
              </button>
            </div>
          </>
        )}

        {stage === 'paste' && (
          <>
            <div className="cz-import__scroll">
              <button type="button" className="cz-import__back" onClick={() => setStage('sent')}>
                ‹ Back to the email
              </button>
              <h2 className="cz-import__title">Paste your AI’s answer</h2>
              <div className="cz-import__chips" role="radiogroup" aria-label="Which AI wrote it">
                {SOURCES.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={from === s} onClick={() => setFrom(s)}>
                    {s === 'another AI' ? 'Other' : s}
                  </button>
                ))}
              </div>
              <textarea
                className="cz-import__paste"
                placeholder={'## About me\n- …\n\n## Feeding\n- …'}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              {error && <p className="cz-import__error">{error}</p>}
            </div>
            <div className="cz-import__footer">
              <button
                type="button"
                className="cz-primary-btn"
                disabled={!answer.trim()}
                onClick={() => read(answer, from)}
              >
                Read my answer
              </button>
            </div>
          </>
        )}

        {stage === 'reading' && (
          <div className="cz-import__reading" role="status">
            <img src={`${CZ}/ip/Cozie_Thinking_Light.webp`} alt="" />
            <p>Reading what {from} shared…</p>
          </div>
        )}

        {stage === 'review' && (
          <>
            <div className="cz-import__scroll">
              <h2 className="cz-import__title">Here’s what {from} shared</h2>
              <p className="cz-import__lead">Untick anything you don’t want Cozie to remember.</p>
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
                              <small>{DIMENSION_LABELS[item.target.dim]}</small>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              <p className="cz-import__demo">Each item is marked “Imported from {from}” in your memory profile.</p>
            </div>
            <div className="cz-import__footer">
              <button type="button" className="cz-primary-btn" disabled={!picked.size} onClick={save}>
                Remember {picked.size} {picked.size === 1 ? 'thing' : 'things'}
              </button>
              <button type="button" className="cz-import__secondary" onClick={() => setOpen(false)}>
                Not now
              </button>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  );
}

/** The email as mom would see it in her inbox. */
function EmailPreview({ to, onCopy }: { to: string; onCopy: () => void }) {
  return (
    <article className="cz-mail" aria-label="Email preview">
      <header className="cz-mail__head">
        <img src={`${CZ}/icons/cozie_tab.png`} alt="" />
        <span>
          <b>Cozie by Momcozy</b>
          <small>to {to}</small>
        </span>
        <em>now</em>
      </header>
      <h3 className="cz-mail__subject">Bring what your AI knows to Cozie</h3>
      <div className="cz-mail__body">
        <p>Hi there,</p>
        <p>Here’s how to bring what Claude or ChatGPT already knows about you and your baby into Cozie:</p>
        <ol>
          <li>Copy the prompt below.</li>
          <li>Paste it into a chat with your AI and send it.</li>
          <li>
            <b>Reply to this email</b> with its answer. Delete anything you’d rather not share first.
          </li>
        </ol>
        <pre className="cz-mail__prompt">{IMPORT_PROMPT}</pre>
        <div className="cz-mail__actions">
          <button type="button" onClick={onCopy}>
            Copy prompt
          </button>
          <a href="https://claude.ai/new" target="_blank" rel="noreferrer">
            Open Claude ↗
          </a>
          <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">
            Open ChatGPT ↗
          </a>
        </div>
        <p className="cz-mail__fine">
          You’ll review everything in Cozie before it’s saved, and you can delete it anytime in your memory profile.
          Replies to this email are accepted for 7 days.
        </p>
      </div>
    </article>
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
