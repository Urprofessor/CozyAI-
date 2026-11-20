// POST /api/import-email  { email } → { sent: true, via } | { sent: false, reason }
//
// Sends the "Bring what your AI knows" email. Gmail goes first (SMTP with an
// app password: GMAIL_USER + GMAIL_APP_PASSWORD); if it isn't set up or the
// send fails, Resend is the fallback (RESEND_API_KEY). With neither, it
// answers { sent: false, reason: 'not_configured' } and the sheet shows the
// in-app preview. Each address and each IP is capped per day (Upstash Redis)
// because the demo is public.

import nodemailer from 'nodemailer';
import { isEmail } from '@/lib/cozy/memory-import';
import { IMPORT_EMAIL_SUBJECT, importEmailHtml, importEmailText } from '@/lib/cozy/import-email';
import { redisConfigured, redisHit } from '@/lib/redis';

// SMTP needs raw sockets, which the edge runtime doesn't have.
export const runtime = 'nodejs';
export const maxDuration = 30;

const DAY = 60 * 60 * 24;
const PER_EMAIL = 3;
const PER_IP = 10;
const SENDER_NAME = 'Cozie by Momcozy';
// Resend's shared test sender until a domain is verified; it can only
// deliver to the Resend account's own address.
const RESEND_DEFAULT_FROM = `${SENDER_NAME} <onboarding@resend.dev>`;

interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}
type Result = { ok: true } | { ok: false; reason: 'sender_restricted' | 'send_failed' };

export async function POST(req: Request) {
  let email = '';
  try {
    email = String(((await req.json()) as { email?: unknown }).email ?? '').trim().toLowerCase();
  } catch {
    return json({ sent: false, reason: 'bad_request' }, 400);
  }
  if (!isEmail(email) || email.length > 254) return json({ sent: false, reason: 'bad_email' }, 400);

  const gmail = gmailConfig();
  const resendKey = process.env.RESEND_API_KEY;
  if (!gmail && !resendKey) return json({ sent: false, reason: 'not_configured' });

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
  const mail: Mail = {
    to: email,
    subject: IMPORT_EMAIL_SUBJECT,
    html: importEmailHtml(pasteUrl),
    text: importEmailText(pasteUrl),
  };

  if (gmail) {
    const r = await sendWithGmail(gmail, mail);
    if (r.ok) return json({ sent: true, via: 'gmail' });
  }
  if (resendKey) {
    const r = await sendWithResend(resendKey, mail);
    if (r.ok) return json({ sent: true, via: 'resend' });
    return json({ sent: false, reason: r.reason }, 502);
  }
  return json({ sent: false, reason: 'send_failed' }, 502);
}

function gmailConfig() {
  const user = process.env.GMAIL_USER;
  // Google shows app passwords in groups of four; spaces are optional.
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  return user && pass ? { user, pass } : null;
}

async function sendWithGmail(auth: { user: string; pass: string }, mail: Mail): Promise<Result> {
  try {
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });
    await transport.sendMail({ from: { name: SENDER_NAME, address: auth.user }, ...mail });
    return { ok: true };
  } catch (e) {
    console.error('[import-email] Gmail failed, trying Resend:', e instanceof Error ? e.message : e);
    return { ok: false, reason: 'send_failed' };
  }
}

async function sendWithResend(key: string, mail: Mail): Promise<Result> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM || RESEND_DEFAULT_FROM, ...mail, to: [mail.to] }),
    });
    if (res.ok) return { ok: true };
    console.error('[import-email] Resend', res.status, await res.text().catch(() => ''));
    // 403 almost always means the test sender was asked to email someone
    // other than the account owner — a domain needs verifying first.
    return { ok: false, reason: res.status === 403 ? 'sender_restricted' : 'send_failed' };
  } catch (e) {
    console.error('[import-email] Resend failed:', e instanceof Error ? e.message : e);
    return { ok: false, reason: 'send_failed' };
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
