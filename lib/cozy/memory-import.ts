import type { BabyDimension, MomDimension } from './memory-profile';

/* Import what another AI assistant already knows (method 1 of "inherit the
 * user's context"): we email mom a prompt, she runs it in Claude / ChatGPT,
 * and the answer comes back to us. The prompt asks for fixed headings, so
 * the answer can be read here without a model; the real backend can add a
 * model pass for answers that lose the format. */

export type ImportTarget =
  | { who: 'mom'; dim: MomDimension }
  | { who: 'baby'; dim: BabyDimension };

export interface ImportItem {
  id: string;
  target: ImportTarget;
  text: string;
}

/** Heading in the answer → where it lands in the memory profile. Health is
 *  deliberately not asked for. */
const HEADINGS: { heading: string; match: RegExp; target: ImportTarget }[] = [
  { heading: 'About me', match: /^about me/i, target: { who: 'mom', dim: 'about' } },
  { heading: 'How I like help', match: /^how i like/i, target: { who: 'mom', dim: 'carePreferences' } },
  { heading: "What's on my mind", match: /^what.s on my mind/i, target: { who: 'mom', dim: 'recentConcerns' } },
  { heading: 'My baby', match: /^my baby/i, target: { who: 'baby', dim: 'basics' } },
  { heading: 'Feeding', match: /^feeding/i, target: { who: 'baby', dim: 'feeding' } },
  { heading: 'Sleep', match: /^sleep/i, target: { who: 'baby', dim: 'sleep' } },
];

export const IMPORT_PROMPT = `I'm setting up Cozie, the parenting assistant in the Momcozy app. Using only what you already know about me from our past conversations and your memory, write a short summary under the headings below.

Rules:
- One fact per line, each starting with "- ".
- Only include things that help with my pregnancy, my baby, feeding, sleep, and how I like to get help.
- Leave out anything else: work details, other people's private information, and any health condition you're not sure about.
- If you don't know anything for a heading, write "- Nothing yet". Don't guess.

${HEADINGS.map((h) => `## ${h.heading}`).join('\n')}`;

/** Demo: what Clara's Claude might send back (fictional persona). */
export const SAMPLE_REPLY = `Here's what I know from our conversations:

## About me
- Lives in Portland with her partner Sam, who does the evening bottle
- Plans to go back to work in January

## How I like help
- Prefers bullet points over long paragraphs
- Likes evidence-based tips with a short "why"

## What's on my mind
- Wants to build a freezer stash before going back to work
- Unsure when to start Noah on a regular bottle

## My baby
- Noah, born in early October

## Feeding
- Mostly breastfed, plus one bottle of pumped milk in the evening
- Pumps about 6 times a day; mornings give the most milk

## Sleep
- Longest stretch is about 3.5 hours, usually after the 10 p.m. feed
- Daytime naps are short, around 30–40 minutes`;

const NOTHING = /^nothing( yet)?\.?$/i;

/** Read an answer that kept the headings. Quoted email lines and anything
 *  outside a known heading are ignored. */
export function parseImport(raw: string): ImportItem[] {
  const items: ImportItem[] = [];
  let target: ImportTarget | null = null;
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('>')) continue;
    const heading = line.match(/^#{1,6}\s*(.+?)\s*:?$/) ?? line.match(/^\*\*(.+?)\*\*:?$/);
    if (heading) {
      target = HEADINGS.find((h) => h.match.test(heading[1]))?.target ?? null;
      continue;
    }
    if (!target) continue;
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    const text = (bullet ? bullet[1] : line).trim().replace(/\s+/g, ' ');
    if (!text || NOTHING.test(text) || text.length > 240) continue;
    items.push({ id: `imp-${items.length}-${hash(text)}`, target, text });
  }
  return items;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}
