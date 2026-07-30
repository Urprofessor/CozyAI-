// Upstash Redis REST client. Reads env vars from either the direct Upstash
// naming (UPSTASH_REDIS_REST_*) or Vercel's Marketplace injection (KV_REST_API_*).

const url = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export function redisConfigured(): boolean {
  return Boolean(url() && token());
}

async function redisCommand(parts: (string | number)[]): Promise<unknown> {
  const u = url();
  const t = token();
  if (!u || !t) throw new Error('Redis not configured');
  const res = await fetch(
    `${u}/${parts.map((p) => encodeURIComponent(String(p))).join('/')}`,
    { headers: { Authorization: `Bearer ${t}` } }
  );
  if (!res.ok) throw new Error(`Redis request failed: ${res.status}`);
  return res.json();
}

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function redisGet(key: string): Promise<string | null> {
  const data = (await redisCommand(['GET', key])) as { result?: string | null };
  return data?.result ?? null;
}

export async function redisSetJson(key: string, value: unknown): Promise<void> {
  await redisCommand(['SET', key, JSON.stringify(value), 'EX', TTL_SECONDS]);
}
