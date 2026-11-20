'use client';

import { useEffect, useRef, useState } from 'react';
import type { ImportItem } from '@/lib/cozy/memory-import';
import { FILE_ACCEPT, FileImportError, prepareFile, type FileProblem } from '@/lib/cozy/file-import';
import { FILE_PRIVACY_POINTS } from '@/lib/cozy/import-privacy';
import { markFileImported } from '@/lib/cozy/connections';
import { BottomSheet, CZ, showToast } from '../ui';
import { ImportReview, PrivacyCard, defaultPicks, togglePick } from './ImportParts';

/* "Add a file or report": a PDF or Word report, a CSV export from Huckleberry
 * or another baby tracker, or a photo of a report. lib/cozy/file-import.ts
 * gets the file ready in the browser (tracker CSVs are totalled there),
 * /api/import-file picks out what to remember, and mom reviews every item
 * before Cozie keeps it. Opened from the letter's card and the memory profile. */

const OPEN_EVENT = 'cozie:open-file-import';
const MIN_READING_MS = 900;

export function openFileImport() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Stage = 'pick' | 'reading' | 'review';

const PROBLEMS: Record<FileProblem | 'server' | 'not_configured' | 'rate_limited' | 'nothing', string> = {
  unsupported: 'Cozie can read PDF, Word (.docx), CSV and photos. Try saving the file in one of those.',
  too_big: 'That file is over 4 MB. Try a smaller export, or a photo of the page you need.',
  image: 'Couldn’t open that photo. Try a JPG or PNG, or a screenshot of it.',
  empty: 'That file looks empty.',
  server: 'Cozie couldn’t read that file just now. Check your connection and try again.',
  not_configured: 'Reading files isn’t switched on in this demo yet.',
  rate_limited: 'That’s a lot of files for one day. Try again tomorrow.',
  nothing: 'Cozie didn’t find anything about you or your baby in that file.',
};

interface Props {
  babyName: string;
  onSave: (items: ImportItem[], from: string) => void;
}

export function FileImportHost({ babyName, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('pick');
  const [fileName, setFileName] = useState('');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const readId = useRef(0);

  useEffect(() => {
    const onOpen = () => {
      setStage('pick');
      setError('');
      setItems([]);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const close = () => {
    readId.current++; // drop a read still in flight
    setOpen(false);
  };

  async function read(file: File) {
    const id = ++readId.current;
    setError('');
    setFileName(file.name);
    setStage('reading');
    const started = Date.now();

    let found: ImportItem[] | null = null;
    let problem: keyof typeof PROBLEMS = 'server';
    try {
      const { form, localItems } = await prepareFile(file);
      try {
        const res = await fetch('/api/import-file', { method: 'POST', body: form });
        const data = (await res.json()) as { items?: ImportItem[]; error?: string };
        if (res.ok) found = data.items ?? [];
        else if (data.error && data.error in PROBLEMS) problem = data.error as keyof typeof PROBLEMS;
        else if (data.error === 'unreadable') problem = 'nothing';
      } catch {
        // Network error: handled below.
      }
      // Tracker totals worked out on the phone stand in when the server can't help.
      if (!found?.length && localItems.length) found = localItems;
    } catch (e) {
      problem = e instanceof FileImportError ? e.problem : 'server';
    }

    const wait = MIN_READING_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (id !== readId.current) return;

    if (found === null || !found.length) {
      setError(PROBLEMS[found ? 'nothing' : problem]);
      setStage('pick');
      return;
    }
    setItems(found);
    setPicked(defaultPicks(found));
    setStage('review');
  }

  function save() {
    const chosen = items.filter((i) => picked.has(i.id));
    onSave(chosen, fileName);
    markFileImported(chosen.length, fileName);
    setOpen(false);
    showToast(`Cozie will remember ${chosen.length} new ${chosen.length === 1 ? 'thing' : 'things'}.`);
  }

  return (
    <div className="cz-import-layer">
      <BottomSheet open={open} onClose={close} label="Add a file or report" className="cz-import">
        <span className="cz-sheet__grabber" aria-hidden />
        <button type="button" className="cz-glass-btn cz-import__close" onClick={close} aria-label="Close">
          <img src={`${CZ}/icons/settings_close.svg`} alt="" />
        </button>

        {stage === 'pick' && (
          <>
            <div className="cz-import__scroll">
              <FileArt />
              <h2 className="cz-import__title">Add a file or report</h2>
              <p className="cz-import__lead">
                Cozie reads it and suggests what to remember about you and your baby. You choose what stays.
              </p>
              <ul className="cz-import__kinds">
                <li>
                  <KindIcon kind="report" />
                  <span>
                    <b>Reports and letters</b>
                    PDF or Word — a check-up, scan or discharge summary
                  </span>
                </li>
                <li>
                  <KindIcon kind="tracker" />
                  <span>
                    <b>Baby tracker exports</b>
                    CSV from Huckleberry or another tracking app
                  </span>
                </li>
                <li>
                  <KindIcon kind="photo" />
                  <span>
                    <b>Photos and screenshots</b>
                    A picture of a report, a growth chart or a feeding plan
                  </span>
                </li>
              </ul>
              <PrivacyCard points={FILE_PRIVACY_POINTS} />
              {error && (
                <p className="cz-import__error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="cz-import__footer">
              <label className="cz-primary-btn cz-import__file">
                Choose a file
                <input
                  type="file"
                  accept={FILE_ACCEPT}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = ''; // the same file can be picked again
                    if (file) read(file);
                  }}
                />
              </label>
              <p className="cz-import__demo">PDF, Word, CSV or a photo · up to 4 MB</p>
            </div>
          </>
        )}

        {stage === 'reading' && (
          <div className="cz-import__reading" role="status">
            <img src={`${CZ}/ip/Cozie_Thinking_Light.webp`} alt="" />
            <p>Cozie is reading {fileName}…</p>
          </div>
        )}

        {stage === 'review' && (
          <ImportReview
            items={items}
            picked={picked}
            onToggle={(id) => setPicked((prev) => togglePick(prev, id))}
            babyName={babyName}
            lead={`${items.length} ${items.length === 1 ? 'thing' : 'things'} from ${fileName}.`}
            onSave={save}
            backLabel="Choose another file"
            onBack={() => setStage('pick')}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function KindIcon({ kind }: { kind: 'report' | 'tracker' | 'photo' }) {
  return (
    <i aria-hidden>
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'report' ? (
          <>
            <path d="M5.5 2.5h6l3.5 3.5v10a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 16V4a1.5 1.5 0 0 1 1.5-1.5Z" />
            <path d="M11.5 2.5V6H15M7 10h6M7 13h4" />
          </>
        ) : kind === 'tracker' ? (
          <>
            <rect x="3" y="3" width="14" height="14" rx="2" />
            <path d="M3 8h14M8 8v9" />
          </>
        ) : (
          <>
            <rect x="2.5" y="4.5" width="15" height="12" rx="2" />
            <circle cx="10" cy="10.5" r="3" />
            <path d="M7 4.5 8 2.8h4l1 1.7" />
          </>
        )}
      </svg>
    </i>
  );
}

function FileArt() {
  return (
    <div className="cz-import__art" aria-hidden>
      <span className="cz-import__bubble is-left">PDF</span>
      <span className="cz-import__envelope">
        <svg viewBox="0 0 24 30" width="22" height="28">
          <path d="M3 1.5h12l7.5 7.5v18a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 27V3A1.5 1.5 0 0 1 3 1.5Z" fill="#fff" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M15 1.5V9h7.5M6 15h12M6 20h8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <img className="cz-import__cozie" src={`${CZ}/ip/Cozy_Magic_Light.webp`} alt="" />
    </div>
  );
}
