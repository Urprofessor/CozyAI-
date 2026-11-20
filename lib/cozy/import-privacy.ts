import { IMPORT_PROMPT } from './memory-import';

/* Shared by the import sheet (components/cozy/memory/AiImport.tsx) and the
 * email (lib/cozy/import-email.ts) so both promise exactly the same thing.
 *
 * Every line must stay true of the shipping product. Today: the pasted answer
 * goes over HTTPS to /api/import-parse, is read once and not stored; only the
 * lines mom approves are saved; any of them can be forgotten from the memory
 * profile. "Never sold / never used for ads" is a policy promise — confirm it
 * with Momcozy legal before launch, and add stronger claims (encryption at
 * rest, certifications) only once the backend actually has them. */

export const PRIVACY_TITLE = 'We protect you and your baby';

export const PRIVACY_POINTS: { title: string; text: string }[] = [
  {
    title: 'Only for Cozie’s answers',
    text: 'Used only to tailor Cozie’s help for you and your baby. Never sold, never used for ads.',
  },
  {
    title: 'You decide what’s kept',
    text: 'You approve every line first. Health details stay off unless you turn them on.',
  },
  {
    title: 'Your AI’s answer isn’t stored',
    text: 'It’s read once over an encrypted connection, then discarded. Only the lines you approve are saved.',
  },
  {
    title: 'Delete anytime',
    text: 'Edit or delete anything Cozie remembers, whenever you like, in your memory profile.',
  },
];

/** Same promises for an uploaded file (components/cozy/memory/FileImport.tsx).
 *  True today: /api/import-file keeps nothing, and tracker CSVs are totalled
 *  in the browser (lib/cozy/file-import.ts) so only the averages are sent. */
export const FILE_PRIVACY_POINTS: { title: string; text: string }[] = PRIVACY_POINTS.map((p, i) =>
  i === 2
    ? {
        title: 'Your file isn’t kept',
        text: 'Cozie reads it once over an encrypted connection and doesn’t store it. Tracker exports are totalled on your phone, so only the averages are sent.',
      }
    : p,
);

/** Open the AI with the prompt already typed in, so there's nothing to copy.
 *  Prefill via ?q= is a web-only convenience: a site or native app that
 *  ignores it still opens, which is why the prompt is also copied (in the
 *  app) and shown in full (in the email). */
const q = encodeURIComponent(IMPORT_PROMPT);
export const AI_LINKS = [
  { name: 'Claude', href: `https://claude.ai/new?q=${q}` },
  { name: 'ChatGPT', href: `https://chatgpt.com/?q=${q}` },
  { name: 'Gemini', href: `https://gemini.google.com/app?q=${q}` },
  { name: 'Grok', href: `https://grok.com/?q=${q}` },
] as const;
