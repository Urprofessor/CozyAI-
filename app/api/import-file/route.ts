// POST /api/import-file  (multipart form)
//   name  — the file's name, for the review screen
//   text  — already-prepared text (a tracker CSV totalled on the phone), or
//   file  — a PDF, Word (.docx), plain-text file or image (JPEG/PNG/WebP/GIF)
// → { items: ImportItem[], via } or { items: [], error }
//
// Picks out what Cozie should remember from a file mom uploads. Same split as
// /api/chat: plain text goes to DeepSeek; PDFs (scanned ones too) and photos
// go to Claude, which can see them. Nothing is stored here — the file lives
// only for this request, and mom reviews every item before Cozie keeps it.

import Anthropic from '@anthropic-ai/sdk';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import mammoth from 'mammoth';
import { FILE_SYSTEM, toItems } from '@/lib/cozy/import-extract';
import { redisConfigured, redisHit } from '@/lib/redis';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Vercel caps request bodies at 4.5 MB; the client checks this first. */
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_CHARS = 12000;
const PER_IP_PER_DAY = 20;
const CLAUDE_MODEL = 'claude-opus-5-5';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

type Content =
  | { kind: 'text'; text: string }
  | { kind: 'pdf'; data: string }
  | { kind: 'image'; data: string; mediaType: ImageType };

const fail = (error: string, status: number) => Response.json({ items: [], error }, { status });

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('bad_request', 400);
  }
  const name = String(form.get('name') ?? 'your file').slice(0, 80);

  let content: Content;
  try {
    const prepared = await toContent(form);
    if (typeof prepared === 'string') return fail(prepared, prepared === 'too_big' ? 413 : 415);
    content = prepared;
  } catch (e) {
    console.error('[import-file] could not open file:', e instanceof Error ? e.message : e);
    return fail('unreadable', 422);
  }
  if (content.kind === 'text' && !content.text.trim()) return fail('empty', 422);

  const useClaude = content.kind !== 'text' || !process.env.DEEPSEEK_API_KEY;
  if (useClaude && !process.env.ANTHROPIC_API_KEY) return fail('not_configured', 503);

  if (redisConfigured()) {
    try {
      const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
      if ((await redisHit(`cozyai:import-file:ip:${ip}`, 60 * 60 * 24)) > PER_IP_PER_DAY) {
        return fail('rate_limited', 429);
      }
    } catch {
      // Best effort.
    }
  }

  try {
    if (useClaude) return Response.json({ items: toItems(await readWithClaude(content, name)), via: 'claude' });
    const { text: out } = await generateText({
      model: deepseek('deepseek-chat'),
      system: FILE_SYSTEM,
      prompt: `File "${name}":\n"""\n${(content as { text: string }).text}\n"""\n\nReturn the JSON now.`,
      temperature: 0.1,
      maxTokens: 1500,
    });
    return Response.json({ items: toItems(out), via: 'deepseek' });
  } catch (e) {
    console.error('[import-file] model failed:', e instanceof Error ? e.message : e);
    return fail('read_failed', 502);
  }
}

/** Turn the form into something a model can read, or an error code. */
async function toContent(form: FormData): Promise<Content | string> {
  const text = form.get('text');
  if (typeof text === 'string') return { kind: 'text', text: text.slice(0, MAX_CHARS) };

  const file = form.get('file');
  if (!(file instanceof Blob)) return 'bad_request';
  if (file.size > MAX_BYTES) return 'too_big';

  const fileName = file instanceof File ? file.name.toLowerCase() : '';
  const type = file.type.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());

  if (type === 'application/pdf' || fileName.endsWith('.pdf')) {
    return { kind: 'pdf', data: bytes.toString('base64') };
  }
  if ((IMAGE_TYPES as readonly string[]).includes(type)) {
    return { kind: 'image', data: bytes.toString('base64'), mediaType: type as ImageType };
  }
  if (fileName.endsWith('.docx') || type.includes('wordprocessingml')) {
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    return { kind: 'text', text: value.slice(0, MAX_CHARS) };
  }
  if (type.startsWith('text/') || /\.(txt|md)$/.test(fileName)) {
    return { kind: 'text', text: bytes.toString('utf8').slice(0, MAX_CHARS) };
  }
  return 'unsupported';
}

async function readWithClaude(content: Content, name: string): Promise<string> {
  const client = new Anthropic();
  const file: Anthropic.ContentBlockParam =
    content.kind === 'pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: content.data } }
      : content.kind === 'image'
        ? { type: 'image', source: { type: 'base64', media_type: content.mediaType, data: content.data } }
        : { type: 'text', text: `"""\n${content.text}\n"""` };

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system: FILE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [file, { type: 'text', text: `That is the file "${name}". Return the JSON now.` }],
      },
    ],
  });
  return response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}
