import type { GuidanceKind } from './first-guidance';

/* The three chips under the first guidance card, written by the model each
 * time (/api/suggest, mode "first"). Asked for while she's still reading the
 * letter, so they're usually ready when she taps "Talk to Cozie". Anything
 * missing is filled from the opener's built-in chips, so there are always
 * three. */

const TIMEOUT_MS = 8000;
const MAX_LEN = 60;

interface Entry {
  promise: Promise<string[]>;
  /** Set once the request settles: the model's chips ([] on failure). */
  result?: string[];
}

const cache = new Map<string, Entry>();

export interface FirstChipsInput {
  kind: GuidanceKind;
  context: string;
  opener: string;
}

/** Start generating for this card, or reuse the request already made for it.
 *  Keyed by card only: ticking tags while she reads nudges the context a
 *  little but shouldn't throw the prefetch away. A failed request isn't kept,
 *  so the next letter tries again. */
export function prefetchFirstChips(input: FirstChipsInput): Entry {
  const hit = cache.get(input.kind);
  if (hit) return hit;
  const entry: Entry = { promise: request(input) };
  entry.promise.then((r) => {
    entry.result = r;
    if (!r.length && cache.get(input.kind) === entry) cache.delete(input.kind);
  });
  cache.set(input.kind, entry);
  return entry;
}

/** Forget generated chips, e.g. when the demo switches to another account. */
export function clearFirstChips() {
  cache.clear();
}

async function request({ kind, context, opener }: FirstChipsInput): Promise<string[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'first', kind, context, opener }),
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { suggestions?: unknown };
    return Array.isArray(data.suggestions)
      ? data.suggestions.filter((s): s is string => typeof s === 'string')
      : [];
  } catch {
    return []; // offline, not configured, or too slow
  } finally {
    clearTimeout(timer);
  }
}

/** The model's chips, cleaned and topped up to three from the fallback. */
export function fillChips(generated: string[], fallback: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...generated, ...fallback]) {
    const q = raw.trim();
    const k = q.toLowerCase();
    if (!q || q.length > MAX_LEN || seen.has(k)) continue;
    seen.add(k);
    out.push(q);
    if (out.length === 3) break;
  }
  return out;
}
