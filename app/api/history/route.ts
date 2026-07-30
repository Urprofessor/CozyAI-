// GET  /api/history?deviceId=xxx  → { messages: CozyMessage[] }
// POST /api/history  { deviceId, messages } → { ok, persisted }
//
// Base64 image payloads should be stripped by the client before calling this
// (see useCozyChat).

import { redisConfigured, redisGet, redisSetJson } from '@/lib/redis';
import type { CozyMessage } from '@/lib/cozy/types';

export const runtime = 'edge';

function keyFor(deviceId: string) {
  return `cozyai:history:${deviceId}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('deviceId');
  if (!deviceId) return json({ error: 'Missing deviceId' }, 400);

  if (!redisConfigured()) return json({ messages: [] });

  try {
    const raw = await redisGet(keyFor(deviceId));
    const messages: CozyMessage[] = raw ? (JSON.parse(raw) as CozyMessage[]) : [];
    return json({ messages });
  } catch (e) {
    return json({ messages: [], error: String(e) });
  }
}

export async function POST(req: Request) {
  let body: { deviceId?: string; messages?: CozyMessage[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { deviceId, messages } = body;
  if (!deviceId || !Array.isArray(messages)) {
    return json({ error: 'Missing deviceId or messages' }, 400);
  }

  if (!redisConfigured()) return json({ ok: true, persisted: false });

  try {
    await redisSetJson(keyFor(deviceId), messages.slice(-100));
    return json({ ok: true, persisted: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 502);
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
