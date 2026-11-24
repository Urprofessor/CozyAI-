// Clarifying questions ("Two quick questions so it fits your day").
//
// The model asks with a silent tag at the end of a short lead-in:
//   [[ASK:{"questions":[{"id":"return","label":"Back to work","text":"When do you go back to work?","multi":false,"options":["…","…"]}]}]]
// The client strips the tag, keeps the lead-in as Cozie's message, and docks a
// card above the input that walks through the questions one at a time. The
// answers go back as one plain user message, so the model needs no extra
// protocol to read them.

export interface ClarifyQuestion {
  id: string;
  /** Short name for the summary line ("Back to work"). */
  label: string;
  /** The question as shown ("When do you go back to work?"). */
  text: string;
  multi: boolean;
  options: string[];
}

export interface ClarifyAsk {
  questions: ClarifyQuestion[];
  /** open → the card is docked; answered → the summary message was sent. */
  status: 'open' | 'answered';
}

/** One answer: picked options, or what she typed instead, or nothing (skipped). */
export interface ClarifyAnswer {
  picked: string[];
  typed?: string;
}

export const MAX_QUESTIONS = 3;
export const MAX_OPTIONS = 4;

/** Complete ASK tag; group 1 is the JSON body. The body ends with `}` and the
 *  schema never nests `}]]`, so the first `}]]` closes the tag. */
export const ASK_TAG_RE = /\[\[ASK:(\{[\s\S]*?\})\]\]/;
export const ASK_TAG_RE_G = /\[\[ASK:\{[\s\S]*?\}\]\]/g;

/** Validate the model's JSON. Anything off → null, and the reply shows as
 *  plain text (never an error). */
export function parseAsk(raw: string): ClarifyAsk | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const list = (data as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) return null;
  const questions: ClarifyQuestion[] = [];
  for (const [i, q] of list.slice(0, MAX_QUESTIONS).entries()) {
    const o = q as Partial<Record<keyof ClarifyQuestion, unknown>>;
    const text = str(o.text);
    const options = Array.isArray(o.options)
      ? Array.from(new Set(o.options.map(str).filter(Boolean))).slice(0, MAX_OPTIONS)
      : [];
    if (!text || options.length < 2) continue;
    questions.push({
      id: str(o.id) || `q${i + 1}`,
      label: str(o.label) || text.replace(/\?$/, ''),
      text,
      multi: o.multi === true,
      options,
    });
  }
  return questions.length ? { questions, status: 'open' } : null;
}

/** The user message the answers become. One line per question so it reads
 *  naturally in the chat and the model gets every answer by name. */
export function summarizeAnswers(qs: ClarifyQuestion[], answers: Record<string, ClarifyAnswer>): string {
  const lines = qs.map((q) => {
    const a = answers[q.id];
    const value = a?.typed?.trim() || a?.picked.join(', ');
    return `${q.label}: ${value || 'skipped'}`;
  });
  return qs.every((q) => !answers[q.id]?.typed?.trim() && !answers[q.id]?.picked.length)
    ? 'Skip the questions — go with what you already know.'
    : lines.join('\n');
}

// ---------- demo backstop ----------
//
// The demo can't count on the model asking at the right moment (and has no
// key locally), so the headline request asks a fixed pair. Her account already
// says how often she pumps, so Cozie doesn't ask that again.

const WORK_WORDS = ['workday', 'work day', 'back to work', 'return to work', 'at work', '复工', '上班', '返岗'];
const PLAN_WORDS = ['pump', 'schedule', 'plan', '吸奶', '泵奶', '安排', '计划'];

export function detectClarifyTrigger(text: string): boolean {
  const low = text.toLowerCase();
  return WORK_WORDS.some((w) => low.includes(w)) && PLAN_WORDS.some((w) => low.includes(w));
}

export const WORKDAY_ASK = {
  lead: 'Happy to. Two quick questions so it fits your day:',
  ask: {
    status: 'open',
    questions: [
      {
        id: 'return',
        label: 'Back to work',
        text: 'When do you go back to work?',
        multi: false,
        options: ['Within 2 weeks', 'In about a month', 'I’m already back'],
      },
      {
        id: 'breaks',
        label: 'Breaks to pump',
        text: 'Which breaks could you use to pump?',
        multi: true,
        options: ['Mid-morning', 'Lunch', 'Mid-afternoon', 'Whenever I need'],
      },
    ],
  } satisfies ClarifyAsk,
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim().slice(0, 80) : '';
}
