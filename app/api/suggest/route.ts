// POST /api/suggest — generates follow-up ("猜你想问") chips. Runs as a
// separate, non-streaming DeepSeek call so the chips are contextual and
// reliable instead of riding on a trailing tag in the main reply.
//
// Two modes:
//   default  — two chips under a QA reply, from the conversation tail.
//   "first"  — three chips under the first guidance card after the letter,
//              from her account context and the card's direction.

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

import { FIRST_SUGGEST_SYSTEM_PROMPT, FIRST_SUGGEST_TOPICS, SUGGEST_SYSTEM_PROMPT } from '@/lib/cozy/prompts';

export const runtime = 'edge';

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

interface SuggestMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SuggestBody {
  mode?: 'first';
  messages?: SuggestMessage[];
  /** mode "first": her account / focus / memory context, as the chat gets it. */
  context?: string;
  /** mode "first": the landing card (lib/cozy/first-guidance.ts GuidanceKind). */
  kind?: string;
  /** mode "first": Cozie's first message, which introduces the card. */
  opener?: string;
}

export async function POST(req: Request) {
  let body: SuggestBody;
  try {
    body = (await req.json()) as SuggestBody;
  } catch {
    return Response.json({ suggestions: [] }, { status: 400 });
  }
  if (!process.env.DEEPSEEK_API_KEY) return Response.json({ suggestions: [] });

  if (body.mode === 'first') return first(body);

  const msgs = Array.isArray(body.messages) ? body.messages : [];
  if (msgs.length === 0) return Response.json({ suggestions: [] });

  // Only the tail matters for "what next" — keep the call small.
  const convo = msgs
    .slice(-6)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  try {
    const { text } = await generateText({
      model: deepseek('deepseek-chat'),
      system: SUGGEST_SYSTEM_PROMPT,
      prompt: `Conversation so far:\n${convo}\n\nReturn the JSON array of two follow-up questions now.`,
      temperature: 0.8,
      maxTokens: 120,
    });
    return Response.json({ suggestions: parseList(text, 2) });
  } catch {
    return Response.json({ suggestions: [] });
  }
}

async function first(body: SuggestBody) {
  const kind = typeof body.kind === 'string' ? body.kind : '';
  const topics = FIRST_SUGGEST_TOPICS[kind];
  if (!topics) return Response.json({ suggestions: [] }, { status: 400 });
  const context = (body.context ?? '').slice(0, 4000);
  const opener = (body.opener ?? '').slice(0, 600);

  try {
    const { text } = await generateText({
      model: deepseek('deepseek-chat'),
      system: FIRST_SUGGEST_SYSTEM_PROMPT,
      prompt: [
        `Her context:\n${context || '(nothing known yet)'}`,
        `Direction of the guidance card: ${kind}`,
        `Cozie's first message: ${opener}`,
        `Topic pool for this direction:\n${topics.map((t) => `- ${t}`).join('\n')}`,
        'Return the JSON array of three questions now.',
      ].join('\n\n'),
      temperature: 0.9,
      maxTokens: 160,
    });
    return Response.json({ suggestions: parseList(text, 3) });
  } catch {
    return Response.json({ suggestions: [] });
  }
}

/** Pull a string array out of the model's output, tolerating code fences or
 *  stray prose around the JSON. Returns [] if nothing usable is found. */
function parseList(text: string, max: number): string[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, max);
  } catch {
    return [];
  }
}
