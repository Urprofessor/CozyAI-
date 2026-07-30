// POST /api/chat — streams an assistant reply.
//
// Provider routing:
//   • any user message with images attached  → Claude Haiku 4.5 (vision)
//   • text-only                              → DeepSeek Chat via OpenAI-compat

import { streamText, type CoreMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

import { QA_SYSTEM_PROMPT, SUPPORT_SYSTEM_PROMPT } from '@/lib/cozy/prompts';
import type { Persona } from '@/lib/cozy/types';

export const runtime = 'edge';

// DeepSeek exposes an OpenAI-compatible endpoint.
const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

interface ClientMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[]; // data URLs
}

interface ChatRequestBody {
  persona?: Persona;
  messages?: ClientMessage[];
}

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return errJson(400, 'Invalid JSON body');
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  if (raw.length === 0) return errJson(400, 'Empty messages');

  const persona: Persona = body.persona === 'support' ? 'support' : 'qa';
  const systemPrompt = persona === 'support' ? SUPPORT_SYSTEM_PROMPT : QA_SYSTEM_PROMPT;

  // Any image at all? Route the whole conversation to Claude vision.
  const hasImages = raw.some((m) => Array.isArray(m.images) && m.images.length > 0);

  const messages: CoreMessage[] = toCoreMessages(raw);

  if (hasImages) {
    if (!process.env.ANTHROPIC_API_KEY) return errJson(500, 'ANTHROPIC_API_KEY not configured');
    const result = streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: systemPrompt,
      messages,
      maxTokens: 800,
    });
    return result.toDataStreamResponse();
  }

  if (!process.env.DEEPSEEK_API_KEY) return errJson(500, 'DEEPSEEK_API_KEY not configured');
  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: systemPrompt,
    messages,
    temperature: 0.7,
    maxTokens: 800,
  });
  return result.toDataStreamResponse();
}

// ---------- helpers ----------

function toCoreMessages(raw: ClientMessage[]): CoreMessage[] {
  return raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map<CoreMessage>((m) => {
      const hasImgs = Array.isArray(m.images) && m.images.length > 0;
      if (m.role === 'user' && hasImgs) {
        const parts: Array<
          { type: 'text'; text: string } | { type: 'image'; image: URL | string }
        > = [];
        for (const url of m.images!) parts.push({ type: 'image', image: url });
        if (m.content) parts.push({ type: 'text', text: m.content });
        else parts.push({ type: 'text', text: 'Please look at the attached image(s).' });
        return { role: 'user', content: parts };
      }
      return { role: m.role as 'user' | 'assistant', content: m.content ?? '' };
    });
}

function errJson(status: number, error: string, detail?: string) {
  return new Response(JSON.stringify(detail ? { error, detail } : { error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
