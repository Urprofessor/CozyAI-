import type { ImportItem, ImportTarget } from './memory-import';
import { importItemId } from './import-extract';

/* Getting an uploaded file ready for /api/import-file, in the browser:
 * - CSV (Huckleberry or any baby tracker): totalled here, so only a few lines
 *   of averages leave the phone — never the raw log. The same totals also
 *   give ready-made items in case the server can't read them.
 * - Photos: shrunk to a JPEG that fits the upload limit.
 * - PDF / Word / text: sent as they are. */

export const FILE_ACCEPT =
  '.pdf,.docx,.csv,.txt,.md,image/*,application/pdf,text/csv,text/plain,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Kept under Vercel's 4.5 MB request cap. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2000;

export type FileProblem = 'unsupported' | 'too_big' | 'image' | 'empty';

export class FileImportError extends Error {
  constructor(public problem: FileProblem) {
    super(problem);
  }
}

export interface PreparedFile {
  form: FormData;
  /** Items worked out on the phone (tracker CSVs), used if the server can't help. */
  localItems: ImportItem[];
}

export async function prepareFile(file: File): Promise<PreparedFile> {
  const name = file.name.toLowerCase();
  const form = new FormData();
  form.set('name', file.name);

  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const summary = summarizeTrackerCsv(await file.text(), file.name);
    if (!summary) throw new FileImportError('empty');
    form.set('text', summary.text);
    return { form, localItems: summary.items };
  }

  if (file.type.startsWith('image/') || /\.(heic|heif)$/.test(name)) {
    form.set('file', await shrinkImage(file), 'photo.jpg');
    return { form, localItems: [] };
  }

  const known = /\.(pdf|docx|txt|md)$/.test(name) || file.type === 'application/pdf';
  if (!known) throw new FileImportError('unsupported');
  if (file.size > MAX_UPLOAD_BYTES) throw new FileImportError('too_big');
  if (!file.size) throw new FileImportError('empty');
  form.set('file', file, file.name);
  return { form, localItems: [] };
}

/** Phone photos run 3–10 MB; Claude reads a 2000px JPEG just as well. */
async function shrinkImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new FileImportError('image'); // e.g. HEIC outside Safari
  }
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new FileImportError('image');
  ctx.fillStyle = '#fff'; // transparent screenshots stay readable
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.85, 0.7, 0.5]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
  }
  throw new FileImportError('too_big');
}

/* ---------- Tracker CSVs ----------
 * Exports differ by app, so columns are found by name: an activity/type
 * column, a start time, and an end time or duration. Rows are grouped into
 * feeds, sleep, diapers and pumping, and averaged over the last 14 days that
 * have entries. A file we can't make sense of still goes to the model as its
 * header plus a few rows. */

type Activity = 'feed' | 'sleep' | 'diaper' | 'pump';

const ACTIVITY: { id: Activity; match: RegExp }[] = [
  { id: 'pump', match: /pump/i },
  { id: 'feed', match: /feed|nurs|breast|bottle|formula|solid|food|meal/i },
  { id: 'sleep', match: /sleep|nap/i },
  { id: 'diaper', match: /diaper|nappy|potty|pee|poo|wet|dirty/i },
];

const WINDOW_DAYS = 14;
const DAY_MS = 86_400_000;

interface Row {
  activity: Activity;
  start: number;
  minutes: number | null;
  amount: number | null;
}

export function summarizeTrackerCsv(raw: string, fileName: string): { text: string; items: ImportItem[] } | null {
  const table = parseCsv(raw);
  if (table.length < 2) return null;
  const header = table[0].map((h) => h.trim().toLowerCase());
  const body = table.slice(1).filter((r) => r.some((c) => c.trim()));
  if (!body.length) return null;

  const col = (re: RegExp, not?: RegExp) => header.findIndex((h) => re.test(h) && !(not && not.test(h)));
  const typeCol = col(/^(type|activity|category|event|kind|entry)\b|type$/);
  const startCol = col(/start|begin/) >= 0 ? col(/start|begin/) : col(/time|date/, /end|duration/);
  const endCol = col(/end|stop|finish/);
  const durCol = col(/duration|length|minutes|mins?\b/);
  const amountCol = col(/amount|quantity|volume|\bml\b|\boz\b/);
  const unit = /\boz\b/.test(header[amountCol] ?? '') ? 'oz' : /\bml\b/.test(header[amountCol] ?? '') ? 'ml' : '';
  const fileActivity = ACTIVITY.find((a) => a.match.test(fileName))?.id;

  const rows: Row[] = [];
  for (const r of body) {
    const label = typeCol >= 0 ? r[typeCol] ?? '' : '';
    const activity = ACTIVITY.find((a) => a.match.test(label))?.id ?? (typeCol < 0 ? fileActivity : undefined);
    const start = startCol >= 0 ? parseDate(r[startCol]) : null;
    if (!activity || start === null) continue;
    const end = endCol >= 0 ? parseDate(r[endCol]) : null;
    let minutes = durCol >= 0 ? parseMinutes(r[durCol], header[durCol]) : null;
    if (minutes === null && end !== null && end > start) minutes = (end - start) / 60000;
    if (minutes !== null && (minutes <= 0 || minutes > 24 * 60)) minutes = null;
    const amount = amountCol >= 0 ? parseFloat((r[amountCol] ?? '').replace(',', '.')) : NaN;
    rows.push({ activity, start, minutes, amount: Number.isFinite(amount) && amount > 0 ? amount : null });
  }

  const fallback = () => ({
    text:
      `A spreadsheet the parent uploaded ("${fileName}"); Cozie couldn't total it, so here are its first rows:\n` +
      table
        .slice(0, 40)
        .map((r) => r.join(', '))
        .join('\n')
        .slice(0, 6000),
    items: [],
  });
  if (!rows.length) return fallback();

  const last = Math.max(...rows.map((r) => r.start));
  const from = last - WINDOW_DAYS * DAY_MS;
  const recent = rows.filter((r) => r.start > from);
  const days = new Set(recent.map((r) => dayKey(r.start))).size || 1;
  const period = `${fmtDay(Math.max(from + DAY_MS, Math.min(...recent.map((r) => r.start))))}–${fmtDay(last)}`;

  const lines: string[] = [];
  const items: ImportItem[] = [];
  const add = (target: ImportTarget, text: string) =>
    items.push({ id: importItemId(items.length, text), target, text: `${text} (tracker, ${period})` });

  const of = (a: Activity) => recent.filter((r) => r.activity === a);
  const perDay = (n: number) => Math.round((n / days) * 10) / 10;
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

  const feeds = of('feed');
  if (feeds.length) {
    const amounts = feeds.flatMap((r) => (r.amount ? [r.amount] : []));
    const mins = feeds.flatMap((r) => (r.minutes ? [r.minutes] : []));
    lines.push(
      `Feeds: ${perDay(feeds.length)} per day` +
        (mins.length ? `, about ${Math.round(avg(mins))} min each` : '') +
        (amounts.length && unit ? `, bottles about ${Math.round(avg(amounts))} ${unit}` : ''),
    );
    add({ who: 'baby', dim: 'feeding' }, `Feeds about ${Math.round(feeds.length / days)} times a day`);
    if (amounts.length && unit) add({ who: 'baby', dim: 'feeding' }, `Bottles about ${Math.round(avg(amounts))} ${unit}`);
  }

  const sleeps = of('sleep');
  if (sleeps.length) {
    const mins = sleeps.flatMap((r) => (r.minutes ? [r.minutes] : []));
    const total = mins.reduce((s, m) => s + m, 0) / days;
    lines.push(
      `Sleep: ${perDay(sleeps.length)} stretches per day` +
        (mins.length ? `, about ${fmtDuration(avg(mins))} each, about ${fmtDuration(total)} in total per day` : ''),
    );
    if (mins.length) add({ who: 'baby', dim: 'sleep' }, `Sleeps about ${fmtDuration(total)} a day in total`);
    add({ who: 'baby', dim: 'sleep' }, `About ${Math.round(sleeps.length / days)} sleeps or naps a day`);
  }

  const diapers = of('diaper');
  if (diapers.length) {
    lines.push(`Diapers: ${perDay(diapers.length)} per day`);
    add({ who: 'baby', dim: 'basics' }, `About ${Math.round(diapers.length / days)} diaper changes a day`);
  }

  const pumps = of('pump');
  if (pumps.length) {
    const amounts = pumps.flatMap((r) => (r.amount ? [r.amount] : []));
    lines.push(
      `Pumping: ${perDay(pumps.length)} sessions per day` +
        (amounts.length && unit ? `, about ${Math.round(avg(amounts))} ${unit} each` : ''),
    );
    add({ who: 'baby', dim: 'feeding' }, `Pumps about ${Math.round(pumps.length / days)} times a day`);
  }

  if (!lines.length) return fallback();
  return {
    text:
      `Summary of a baby-tracker export ("${fileName}"), totalled on the parent's phone.\n` +
      `Period: ${period} (${days} days with entries, ${rows.length} entries in the whole file).\n` +
      lines.map((l) => `- ${l}`).join('\n'),
    items,
  };
}

/** Small CSV reader: quotes, escaped quotes, comma / semicolon / tab. */
function parseCsv(raw: string): string[][] {
  const text = raw.replace(/^﻿/, '');
  const firstLine = text.slice(0, text.indexOf('\n') >>> 0);
  const delim = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

function parseDate(value: string | undefined): number | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  // "2025-10-02 14:30" isn't ISO; Safari rejects it without the T.
  const t = Date.parse(/^\d{4}-\d{2}-\d{2} \d/.test(v) ? v.replace(' ', 'T') : v);
  return Number.isFinite(t) ? t : null;
}

/** "01:30", "1:30:00", "1h 30m", "45 min", or a bare number of minutes. */
function parseMinutes(value: string | undefined, header = ''): number | null {
  const v = (value ?? '').trim().toLowerCase();
  if (!v) return null;
  const clock = v.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (clock) return +clock[1] * 60 + +clock[2] + (clock[3] ? +clock[3] / 60 : 0);
  const h = v.match(/(\d+(?:\.\d+)?)\s*h/);
  const m = v.match(/(\d+(?:\.\d+)?)\s*m(?!s)/);
  if (h || m) return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  if (/sec/.test(header)) return n / 60;
  if (/hour|hrs?\b/.test(header)) return n * 60;
  return n;
}

const dayKey = (t: number) => new Date(t).toDateString();
const fmtDay = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}
