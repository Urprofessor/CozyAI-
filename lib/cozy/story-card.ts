/* Story cards: the pastel, editorial cards used for the letter's
 * observation and for card blocks in Cozie's replies.
 *
 * In a reply, the model writes a fenced block the chat turns into a card:
 *
 *   ```card
 *   type: steps            steps | checklist | tips | number | compare
 *   title: Pumping at work, week one
 *   - Pump about every 3 hours you're away
 *   - Do a trial run at home this week
 *   note: Milk volume can vary across the day.
 *   ```
 *
 * or asks for a card drawn from her own data, which the app renders from
 * the Momcozy account so the model never writes those numbers:
 *
 *   ```card
 *   data: pumping-week     pumping-week | sleep-week | growth-log
 *   ```
 *
 * The block is read line by line, so a half-streamed card still shows
 * whatever has arrived. */

export type CardTone = 'pink' | 'green' | 'yellow' | 'lavender' | 'cream';
export type SummaryType = 'steps' | 'checklist' | 'tips' | 'number' | 'compare';
export type DataKey = 'pumping-week' | 'sleep-week' | 'growth-log';

export type CardSpec =
  | {
      kind: 'summary';
      type: SummaryType;
      title?: string;
      tone?: CardTone;
      number?: string;
      unit?: string;
      items: string[];
      columns?: [string, string];
      rows: [string, string, string][];
      note?: string;
    }
  | { kind: 'data'; key: DataKey };

const TYPES: SummaryType[] = ['steps', 'checklist', 'tips', 'number', 'compare'];
const TONES: CardTone[] = ['pink', 'green', 'yellow', 'lavender', 'cream'];
const DATA_KEYS: DataKey[] = ['pumping-week', 'sleep-week', 'growth-log'];
/** A card type's colour when the model doesn't pick one. */
export const TYPE_TONE: Record<SummaryType, CardTone> = {
  steps: 'lavender',
  checklist: 'green',
  tips: 'yellow',
  number: 'pink',
  compare: 'cream',
};

export type Segment = { kind: 'text'; text: string } | { kind: 'card'; spec: CardSpec | null; open: boolean };

const FENCE = /```card[^\n]*\n([\s\S]*?)(```|$)/g;

/** Split a reply into markdown text and card blocks (the last may still be
 *  streaming in, `open`). */
export function splitCards(content: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of content.matchAll(FENCE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: 'text', text: content.slice(last, at) });
    out.push({ kind: 'card', spec: parseCard(m[1]), open: m[2] !== '```' });
    last = at + m[0].length;
  }
  if (last < content.length) out.push({ kind: 'text', text: content.slice(last) });
  return out.filter((s) => s.kind === 'card' || s.text.trim());
}

/** Read a card block; null when nothing usable has arrived yet. */
export function parseCard(body: string): CardSpec | null {
  const fields: Record<string, string> = {};
  const items: string[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      if (item[1].trim()) items.push(item[1].trim());
      continue;
    }
    const kv = line.match(/^([a-z]+)\s*:\s*(.*)$/i);
    if (kv) fields[kv[1].toLowerCase()] = kv[2].trim();
  }

  if (fields.data) {
    const key = fields.data as DataKey;
    return DATA_KEYS.includes(key) ? { kind: 'data', key } : null;
  }

  const type = (TYPES.includes(fields.type as SummaryType) ? fields.type : items.length ? 'tips' : 'number') as SummaryType;
  const tone = TONES.includes(fields.tone as CardTone) ? (fields.tone as CardTone) : undefined;
  const columns = fields.columns?.split('|').map((c) => c.trim());
  const rows =
    type === 'compare'
      ? items
          .map((i) => i.split('|').map((c) => c.trim()))
          .filter((r) => r.length >= 3)
          .map((r) => [r[0], r[1], r[2]] as [string, string, string])
      : [];
  const spec: CardSpec = {
    kind: 'summary',
    type,
    title: fields.title,
    tone,
    number: fields.number,
    unit: fields.unit,
    items: type === 'compare' ? [] : items.slice(0, 8),
    columns: columns && columns.length >= 2 ? [columns[0], columns[1]] : undefined,
    rows: rows.slice(0, 6),
    note: fields.note,
  };
  return spec.title || spec.items.length || spec.number || spec.rows.length ? spec : null;
}
