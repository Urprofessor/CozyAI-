// GET  /api/profile?deviceId=xxx  → { profile: CozyProfile }
// POST /api/profile  { deviceId, profile } → { ok, persisted }
//
// Same storage pattern as /api/history (Upstash Redis, keyed per device, with
// a graceful no-op when Redis isn't configured).

import { redisConfigured, redisGet, redisSetJson } from '@/lib/redis';
import type { CozyProfile } from '@/lib/cozy/profile';

export const runtime = 'edge';

function keyFor(deviceId: string) {
  return `cozyai:profile:${deviceId}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('deviceId');
  if (!deviceId) return json({ error: 'Missing deviceId' }, 400);

  if (!redisConfigured()) return json({ profile: {} });

  try {
    const raw = await redisGet(keyFor(deviceId));
    const profile: CozyProfile = raw ? (JSON.parse(raw) as CozyProfile) : {};
    return json({ profile });
  } catch (e) {
    return json({ profile: {}, error: String(e) });
  }
}

export async function POST(req: Request) {
  let body: { deviceId?: string; profile?: CozyProfile };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { deviceId, profile } = body;
  if (!deviceId || typeof profile !== 'object' || profile === null) {
    return json({ error: 'Missing deviceId or profile' }, 400);
  }

  if (!redisConfigured()) return json({ ok: true, persisted: false });

  try {
    await redisSetJson(keyFor(deviceId), profile);
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
