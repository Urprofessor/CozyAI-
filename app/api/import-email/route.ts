// POST /api/import-email  { email } → { sent: true } | { sent: false, reason }
//
// Sends the "Bring what your AI knows" email through Resend. Without
// RESEND_API_KEY it answers { sent: false, reason: 'not_configured' } and the
// sheet falls back to the in-app preview. Each address and each IP is capped
// per day (Upstash Redis) because the demo is public.

import { isEmail } from '@/lib/cozy/memory-import';
import { IMPORT_EMAIL_SUBJECT, importEmailHtml, importEmailText } from '@/lib/cozy/import-email';
import { redisConfigured, redisHit } from '@/lib/redis';

export const runtime = 'edge';

const DAY = 60 * 60 * 24;
const PER_EMAIL = 3;
const PER_IP = 10;
// Resend's shared test sender until a domain is verified; it can only
// deliver to the Resend account's own address.
const DEFAULT_FROM = 'Cozie by Momcozy <onboarding@resend.dev>';

export async function POST(req: Request) {
  let email = '';
  try {
    email = String(((await req.json()) as { email?: unknown }).email ?? '').trim().toLowerCase();
  } catch {
    return json({ sent: false, reason: 'bad_request' }, 400);
  }
  if (!isEmail(email) || email.length > 254) return json({ sent: false, reason: 'bad_email' }, 400);

  const key = process.env.RESEND_API_KEY;
  if (!key) return json({ sent: false, reason: 'not_configured' });

  if (redisConfigured()) {
    try {
      const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
      const [byEmail, byIp] = await Promise.all([
        redisHit(`cozyai:import-email:to:${email}`, DAY),
        redisHit(`cozyai:import-email:ip:${ip}`, DAY),
      ]);
      if (byEmail > PER_EMAIL || byIp > PER_IP) return json({ sent: false, reason: 'rate_limited' }, 429);
    } catch {
      // Rate limiting is best effort; don't block sending on a Redis hiccup.
    }
  }

  const pasteUrl = `${new URL(req.url).origin}/cozy?import=paste`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || DEFAULT_FROM,
      to: [email],
      subject: IMPORT_EMAIL_SUBJECT,
      html: importEmailHtml(pasteUrl),
      text: importEmailText(pasteUrl),
    }),
  });

  if (res.ok) return json({ sent: true });
  // 403 here almost always means the test sender was asked to email someone
  // other than the account owner — a domain needs verifying first.
  const reason = res.status === 403 ? 'sender_restricted' : 'send_failed';
  console.error('[import-email] Resend', res.status, await res.text().catch(() => ''));
  return json({ sent: false, reason }, 502);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
