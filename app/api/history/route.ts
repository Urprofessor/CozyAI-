// GET  /api/history?deviceId=xxx  → { sessions: CozySession[] } (newest first)
// POST /api/history  { deviceId, sessions } → { ok, persisted }
//
// Sessions are stored as one array per device. Base64 image payloads are
// stripped by the client before POSTing (session-only, see useCozyChat).

import { redisConfigured, redisGet, redisSetJson } from '@/lib/redis';
import type { CozySession } from '@/lib/cozy/types';

export const runtime = 'edge';

function keyFor(deviceId: string) {
  return `cozyai:sessions:${deviceId}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('deviceId');
  if (!deviceId) return json({ error: 'Missing deviceId' }, 400);

  if (!redisConfigured()) return json({ sessions: [] });

  try {
    const raw = await redisGet(keyFor(deviceId));
    const sessions: CozySession[] = raw ? (JSON.parse(raw) as CozySession[]) : [];
    return json({ sessions });
  } catch (e) {
    return json({ sessions: [], error: String(e) });
  }
}

export async function POST(req: Request) {
  let body: { deviceId?: string; sessions?: CozySession[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { deviceId, sessions } = body;
  if (!deviceId || !Array.isArray(sessions)) {
    return json({ error: 'Missing deviceId or sessions' }, 400);
  }

  if (!redisConfigured()) return json({ ok: true, persisted: false });

  try {
    await redisSetJson(keyFor(deviceId), sessions.slice(0, 30));
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
