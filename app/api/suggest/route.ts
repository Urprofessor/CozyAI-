// POST /api/suggest — generates the two follow-up ("猜你想问") chips shown under
// a QA reply. Runs as a separate, non-streaming DeepSeek call so the chips are
// contextual and reliable instead of riding on a trailing tag in the main reply.

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

import { SUGGEST_SYSTEM_PROMPT } from '@/lib/cozy/prompts';

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
  messages?: SuggestMessage[];
}

export async function POST(req: Request) {
  let body: SuggestBody;
  try {
    body = (await req.json()) as SuggestBody;
  } catch {
    return Response.json({ suggestions: [] }, { status: 400 });
  }

  const msgs = Array.isArray(body.messages) ? body.messages : [];
  if (msgs.length === 0 || !process.env.DEEPSEEK_API_KEY) {
    return Response.json({ suggestions: [] });
  }

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
    return Response.json({ suggestions: parseTwo(text) });
  } catch {
    return Response.json({ suggestions: [] });
  }
}

/** Pull a two-string array out of the model's output, tolerating code fences
 *  or stray prose around the JSON. Returns [] if nothing usable is found. */
function parseTwo(text: string): string[] {
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
      .slice(0, 2);
  } catch {
    return [];
  }
}
