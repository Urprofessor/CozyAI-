// POST /api/import-parse  { text } → { items: ImportItem[], via: 'deepseek' | 'local' }
//
// Reads the answer mom pasted from Claude / ChatGPT and picks out what Cozie
// should remember, sorted into memory-profile dimensions. DeepSeek does the
// reading so free-form answers work too; without a key, or if the call
// fails, the local heading parser (lib/cozy/memory-import.ts) takes over.
// Nothing is saved here — mom reviews every item first.

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { parseImport } from '@/lib/cozy/memory-import';
import { ANSWER_SYSTEM, toItems } from '@/lib/cozy/import-extract';
import { redisConfigured, redisHit } from '@/lib/redis';

export const runtime = 'edge';

const MAX_CHARS = 12000;
const PER_IP_PER_DAY = 30;

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

export async function POST(req: Request) {
  let text = '';
  try {
    text = String(((await req.json()) as { text?: unknown }).text ?? '').trim();
  } catch {
    return Response.json({ items: [], error: 'bad_request' }, { status: 400 });
  }
  if (!text) return Response.json({ items: [], error: 'empty' }, { status: 400 });
  text = text.slice(0, MAX_CHARS);

  const local = () => Response.json({ items: parseImport(text), via: 'local' });
  if (!process.env.DEEPSEEK_API_KEY) return local();

  if (redisConfigured()) {
    try {
      const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
      if ((await redisHit(`cozyai:import-parse:ip:${ip}`, 60 * 60 * 24)) > PER_IP_PER_DAY) return local();
    } catch {
      // Best effort.
    }
  }

  try {
    const { text: out } = await generateText({
      model: deepseek('deepseek-chat'),
      system: ANSWER_SYSTEM,
      prompt: `Summary to read:\n"""\n${text}\n"""\n\nReturn the JSON now.`,
      temperature: 0.1,
      maxTokens: 1500,
    });
    const items = toItems(out);
    // An empty result from the model on an answer that kept our headings is
    // more likely a model slip than a truly empty answer.
    if (!items.length) {
      const fallback = parseImport(text);
      if (fallback.length) return Response.json({ items: fallback, via: 'local' });
    }
    return Response.json({ items, via: 'deepseek' });
  } catch (e) {
    console.error('[import-parse] DeepSeek failed:', e instanceof Error ? e.message : e);
    return local();
  }
}
