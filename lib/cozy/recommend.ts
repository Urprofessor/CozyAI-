import type { DemoAccount } from './account-demo';
import { stageMeta, type LifeStage, type Phase } from './lifecycle';
import type { CardTone } from './story-card';
import type { IllustrationTopic } from './illustrations';

/* What Cozie recommends first, for the stage she's in. Each stage gets a few
 * high-frequency questions (the chips under her opener) and one main task card
 * — the thing she can do for mom right now. Content is grounded in the
 * cross-lifecycle pain-point study: early pregnancy wants the line between
 * normal and "go in now"; mid wants results in plain words; late wants to know
 * when to go to the hospital; postpartum wants help recording, calculating and
 * planning. The pump-plan card (postpartum 1–3 m) is the one bespoke, data-
 * driven card and lives in components/cozy/cards/FirstTaskCard.tsx; every other
 * stage renders from the StageTaskSpec here. */

export type TaskCardKind =
  | 'red-lines' // 孕早：就医红线
  | 'report' //    孕中：报告翻译
  | 'hospital-bag' // 孕晚：待产 + 去医院信号
  | 'quick-log' // 产后 0–4w：一句话入库
  | 'pump-plan' // 产后 1–3m：排吸奶计划（FirstTaskCard）
  | 'milestones' // 产后 3–12m：月龄里程碑 + 就医线
  | 'wean-plan'; // 离乳：降频计划

export interface TaskSection {
  heading: string;
  /** 'alert' sections are the red lines — styled to stand out. */
  tone?: 'alert' | 'normal';
  items: string[];
}

export type TaskBody =
  | { kind: 'sections'; sections: TaskSection[] }
  | { kind: 'translate'; pairs: [string, string][] }
  | { kind: 'steps'; items: string[] };

/** Everything a generic stage task card needs to render (StageTaskCard). */
export interface StageTaskSpec {
  kind: TaskCardKind;
  tone: CardTone;
  art: IllustrationTopic;
  eyebrow: string;
  title: string;
  intro: string;
  body: TaskBody;
  note?: string;
  primary: { label: string; savedTitle: string; savedNote: string; toast: string };
}

export interface StageRecommendation {
  phase: Phase;
  opener: { content: string; suggestions: string[] };
  taskCard: TaskCardKind;
}

const STAGE_TO_KIND: Record<LifeStage, TaskCardKind> = {
  'pre-early': 'red-lines',
  'pre-mid': 'report',
  'pre-late': 'hospital-bag',
  'pp-survival': 'quick-log',
  'pp-order': 'pump-plan',
  'pp-develop': 'milestones',
  'pp-wean': 'wean-plan',
};

/* ---------- Sentinels (system messages in the chat stream) ---------- */

const TASK_PREFIX = '__TASK__:';
export const taskSentinel = (kind: TaskCardKind) => `${TASK_PREFIX}${kind}`;
const ALL_KINDS = Object.values(STAGE_TO_KIND);
export function taskKindOf(content: string): TaskCardKind | null {
  if (!content.startsWith(TASK_PREFIX)) return null;
  const kind = content.slice(TASK_PREFIX.length) as TaskCardKind;
  return ALL_KINDS.includes(kind) ? kind : null;
}

/* ---------- Small helpers for the dynamic bits of copy ---------- */

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const months = (a: DemoAccount) => Math.max(1, Math.round((a.baby.weeks * 7) / 30));

/* ---------- Openers (the recommended questions live in `suggestions`) ---------- */

function openerFor(a: DemoAccount): { content: string; suggestions: string[] } {
  switch (a.stage) {
    case 'pre-early':
      return {
        content:
          "Early pregnancy is a lot of waiting and wondering. The most useful thing I can do is make the line between normal and “go in now” clear — so you don’t have to keep searching.",
        suggestions: [
          'Is this spotting something to worry about?',
          'Which early symptoms are normal — and which aren’t?',
          'Can I eat or take this while pregnant?',
          'What does my NT result mean?',
        ],
      };
    case 'pre-mid':
      return {
        content:
          'The mid-pregnancy scans come with a lot of numbers and words. I can turn any of them into plain language — and remind you what a screen can and can’t tell you.',
        suggestions: [
          'Help me read my Down-screen / NIPT result',
          'What does each line of my anomaly scan mean?',
          'My doctor said “let’s just watch” — is that bad?',
          'Post-meal sugar was 7.1 — is that okay?',
        ],
      };
    case 'pre-late':
      return {
        content: `You’re close now${
          a.pregnancy ? ` — due around ${fmtDate(a.pregnancy.edd)}` : ''
        }. The two things worth having ready: a clear “when to go to the hospital” line, and a packed bag. I can set both up.`,
        suggestions: [
          'Is this a real contraction or a false one?',
          'My water broke / I saw blood — do I go in now?',
          'Fewer kicks today — should I go in?',
          'C-section or vaginal — help me think it through',
        ],
      };
    case 'pp-survival':
      return {
        content:
          'The newborn weeks are survival. You shouldn’t have to tap through four screens to log a feed — just tell me in a line, or a voice note, and I’ll keep the record for you.',
        suggestions: [
          'It hurts when I pump — what can I change?',
          'Is my baby getting enough milk?',
          'My pump won’t connect / only one side works',
          'How do I log feeds when my hands are full?',
        ],
      };
    case 'pp-order':
      return {
        content:
          'Your 3 a.m. session is doing a lot of work. Let’s set your day around it — I can do it now:',
        suggestions: [
          'Can you predict my baby’s nap windows?',
          'How do I space pumping around feeds?',
          'Keep my supply up when I go back to work?',
          'Why does my pump change levels on its own?',
        ],
      };
    case 'pp-develop':
      return {
        content:
          'Around now it’s less about not knowing what to do, and more about wanting a clear line between “normal” and “worth asking about”. I can give you that for your baby’s age.',
        suggestions: [
          'Is this a sleep regression — what do I do?',
          'What should my baby be doing at this age?',
          'How do I start solids?',
          'Is this normal, or should I see a doctor?',
        ],
      };
    case 'pp-wean':
      return {
        content:
          'Weaning goes better one feed at a time, with a plan rather than by feel. I can build a gentle step-down from where you are now.',
        suggestions: [
          'Which feed should I drop first?',
          'How do I feed after weaning?',
          'I’m engorged — what helps?',
          'I feel sad about weaning — is that normal?',
        ],
      };
    default:
      return { content: '', suggestions: [] };
  }
}

/* ---------- The main task card for each stage ---------- */

/** The StageTaskSpec for a card kind. Returns null for `pump-plan`, which has
 *  its own data-driven component (FirstTaskCard). */
export function taskSpec(kind: TaskCardKind, a: DemoAccount): StageTaskSpec | null {
  switch (kind) {
    case 'red-lines':
      return {
        kind,
        tone: 'pink',
        art: 'checklist',
        eyebrow: 'Let’s make one thing clear',
        title: 'Your “call the doctor now” lines',
        intro: `For about where you are${
          a.pregnancy ? ` (${a.pregnancy.gestWeek} weeks)` : ''
        }, here’s what’s worth a call right away — and what’s usually just your body adjusting.`,
        body: {
          kind: 'sections',
          sections: [
            {
              heading: 'Call or go in now',
              tone: 'alert',
              items: [
                'Bright-red bleeding, like a period',
                'Constant, severe belly pain',
                'Fainting, or feeling you might',
                'A racing heart that won’t settle',
              ],
            },
            {
              heading: 'Usually just your body',
              items: ['Light spotting', 'Mild cramping', 'Nausea and food aversions', 'Deep tiredness'],
            },
          ],
        },
        note: 'Most of the second list is uncomfortable, not dangerous. When in doubt, it’s always okay to call.',
        primary: {
          label: 'Save these to my notes',
          savedTitle: 'Saved to your notes',
          savedNote: 'Your “call now” lines are saved — open them any time instead of searching.',
          toast: 'Saved. You can find these any time.',
        },
      };
    case 'report':
      return {
        kind,
        tone: 'lavender',
        art: 'compare',
        eyebrow: 'Let me translate it',
        title: 'Your report, in plain words',
        intro:
          'Paste or pick a report and I’ll say what each line means. Here’s a common anomaly-scan report — tap to read it in plain words.',
        body: {
          kind: 'translate',
          pairs: [
            ['Biparietal diameter (BPD)', 'The width of baby’s head — used with other measures to estimate size and age.'],
            ['Amniotic fluid index (AFI)', 'How much fluid is around the baby. Yours is in the normal range.'],
            ['Placenta, anterior', 'The placenta is on the front wall of your uterus — common, and completely fine.'],
            ['“No obvious abnormality seen”', 'The scan checked the parts it can see and found nothing of concern. It’s a screen, not a guarantee.'],
          ],
        },
        note: 'Remember: a screen lowers worry, it doesn’t hand down a verdict. Any line you don’t recognise, ask me.',
        primary: {
          label: 'Read it in plain words',
          savedTitle: 'Here it is, in plain words',
          savedNote: 'This is a screening, not a diagnosis. Ask me about any line.',
          toast: 'Translated. Ask me about any line.',
        },
      };
    case 'hospital-bag':
      return {
        kind,
        tone: 'pink',
        art: 'checklist',
        eyebrow: 'Let’s get you ready',
        title: 'Go-in signs + hospital bag',
        intro: `Due around ${
          a.pregnancy ? fmtDate(a.pregnancy.edd) : 'your date'
        }. Keep this where you can find it in the middle of the night.`,
        body: {
          kind: 'sections',
          sections: [
            {
              heading: 'Go to the hospital if',
              tone: 'alert',
              items: [
                'Your water breaks',
                'Bright-red bleeding',
                'Contractions about 5 minutes apart for an hour',
                'A clear drop in your baby’s movements',
              ],
            },
            {
              heading: 'In your bag',
              items: ['ID, records and birth plan', 'Loose clothes + going-home outfit', 'Phone and charger', 'Going-home outfit for baby'],
            },
          ],
        },
        primary: {
          label: 'Save my checklist',
          savedTitle: 'Your checklist is saved',
          savedNote: 'Go-in signs and your bag list are saved — easy to reach when it’s go time.',
          toast: 'Saved. Easy to reach when it’s time.',
        },
      };
    case 'quick-log':
      return {
        kind,
        tone: 'green',
        art: 'number',
        eyebrow: 'Let me take the admin',
        title: 'Log it in one line',
        intro: 'Hands full? Say it or type it once and it’s in — no forms.',
        body: {
          kind: 'sections',
          sections: [
            {
              heading: 'Just tell me, like',
              items: ['“Fed left 15 min” → feed logged', '“Wet diaper” → diaper logged', '“Down for a nap” → sleep started'],
            },
          ],
        },
        note: 'Everything lands in your log, so the sleep and feeding insights can build themselves.',
        primary: {
          label: 'Turn on quick log',
          savedTitle: 'Quick log is on',
          savedNote: 'Tell me about any feed, diaper or nap and I’ll record it — one line is enough.',
          toast: 'Quick log is on.',
        },
      };
    case 'milestones':
      return {
        kind,
        tone: 'green',
        art: 'checklist',
        eyebrow: 'For your baby’s age',
        title: 'This month: what’s typical, what to watch',
        intro: `Around ${months(a)} months — a steadier guide than scrolling other people’s babies.`,
        body: {
          kind: 'sections',
          sections: [
            {
              heading: 'Many babies around now',
              items: ['Sit with a little support', 'Babble and turn to your voice', 'Reach for and mouth toys', 'Start on first purées'],
            },
            {
              heading: 'Worth asking a doctor',
              tone: 'alert',
              items: ['Not responding to sounds or faces', 'Not bearing any weight on legs', 'Losing skills they had'],
            },
          ],
        },
        note: 'A guide, not a scorecard — babies reach these in their own time. The second list is worth a question, not a panic.',
        primary: {
          label: 'Save for this month',
          savedTitle: 'Saved for this month',
          savedNote: 'I’ll refresh it as your baby grows, and keep the “ask a doctor” lines handy.',
          toast: 'Saved for this month.',
        },
      };
    case 'wean-plan':
      return {
        kind,
        tone: 'pink',
        art: 'steps',
        eyebrow: 'One feed at a time',
        title: 'Your step-down weaning plan',
        intro: 'A gentle pace your supply and your baby can follow — about one change every few days.',
        body: {
          kind: 'steps',
          items: [
            'Drop the mid-day feed first — it’s usually the easiest.',
            'Hold there 3–4 days; let your body adjust before the next change.',
            'Replace it with a solid meal or a cup; keep comfort feeds for now.',
            'Drop the next daytime feed; keep morning and bedtime longest.',
            'Ease the last feeds when you and your baby both feel ready.',
          ],
        },
        note: 'If you get engorged, hand-express just enough for comfort. Feeling tearful as feeds end is normal — it’s a real goodbye.',
        primary: {
          label: 'Save this plan',
          savedTitle: 'Your weaning plan is saved',
          savedNote: 'Take it one step at a time — I’ll check in as you go.',
          toast: 'Saved. One step at a time.',
        },
      };
    case 'pump-plan':
      return null; // FirstTaskCard handles this stage.
    default:
      return null;
  }
}

export function recommendedForStage(a: DemoAccount): StageRecommendation {
  return {
    phase: stageMeta(a.stage).phase,
    opener: openerFor(a),
    taskCard: STAGE_TO_KIND[a.stage],
  };
}
