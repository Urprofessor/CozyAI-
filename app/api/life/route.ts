// GET  /api/life?deviceId=xxx  → { state: LifeState }
// POST /api/life  { deviceId, state } → { ok, persisted }
//
// Progress in Cozie's home (which day, what was answered and seen). Same
// storage pattern as /api/profile: Upstash Redis keyed per device, and a
// graceful no-op when Redis isn't configured.

import { redisConfigured, redisGet, redisSetJson } from '@/lib/redis';
import type { LifeState } from '@/lib/cozy/life/engine';

export const runtime = 'edge';

function keyFor(deviceId: string) {
  return `cozyai:life:${deviceId}`;
}

export async function GET(req: Request) {
  const deviceId = new URL(req.url).searchParams.get('deviceId');
  if (!deviceId) return json({ error: 'Missing deviceId' }, 400);
  if (!redisConfigured()) return json({ state: {} });

  try {
    const raw = await redisGet(keyFor(deviceId));
    return json({ state: raw ? (JSON.parse(raw) as LifeState) : {} });
  } catch (e) {
    return json({ state: {}, error: String(e) });
  }
}

export async function POST(req: Request) {
  let body: { deviceId?: string; state?: LifeState };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { deviceId, state } = body;
  if (!deviceId || typeof state !== 'object' || state === null) {
    return json({ error: 'Missing deviceId or state' }, 400);
  }
  if (!redisConfigured()) return json({ ok: true, persisted: false });

  try {
    await redisSetJson(keyFor(deviceId), state);
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
