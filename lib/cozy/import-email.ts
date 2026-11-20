import { IMPORT_PROMPT } from './memory-import';
import { AI_LINKS, PRIVACY_POINTS, PRIVACY_TITLE } from './import-privacy';

/* The "Bring what your AI knows" email (sent by Gmail or Resend). The
 * buttons open Claude / ChatGPT with the prompt already filled in (email
 * clients can't run a copy button); the prompt is also shown for any other
 * AI. The answer comes back by pasting it in Cozie — the last button opens
 * the paste step. Privacy copy is shared with the app (import-privacy.ts). */

export const IMPORT_EMAIL_SUBJECT = 'Bring what your AI knows to Cozie';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function importEmailText(pasteUrl: string) {
  return [
    'Hi there,',
    '',
    'Here’s how to bring what your AI already knows about you and your baby into Cozie:',
    '',
    '1. Open your AI with the prompt already filled in, and send it:',
    ...AI_LINKS.map((l) => `   ${l.name}: ${l.href}`),
    '   If the prompt doesn’t show up, or you use another AI, copy it from below.',
    `2. Copy its answer and paste it back in Cozie: ${pasteUrl}`,
    '3. Pick what Cozie should remember.',
    '',
    '----- Prompt -----',
    IMPORT_PROMPT,
    '------------------',
    '',
    `${PRIVACY_TITLE}`,
    ...PRIVACY_POINTS.map((p) => `- ${p.title}: ${p.text}`),
    '',
    'If you didn’t ask for this, you can ignore this email.',
    'Cozie by Momcozy',
  ].join('\n');
}

export function importEmailHtml(pasteUrl: string) {
  const btn = (href: string, label: string, primary = false) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 6px 8px 0;padding:10px 16px;border-radius:20px;font-size:14px;font-weight:600;text-decoration:none;${
      primary ? 'background:#790a30;color:#ffffff;' : 'background:#ffffff;border:1px solid #790a30;color:#790a30;'
    }">${label}</a>`;
  const step = (n: number, html: string) =>
    `<tr><td style="width:28px;vertical-align:top;padding:0 0 14px;"><div style="width:22px;height:22px;border-radius:11px;background:#fbeef2;color:#790a30;font-size:12px;font-weight:700;line-height:22px;text-align:center;">${n}</div></td><td style="vertical-align:top;padding:1px 0 14px;">${html}</td></tr>`;

  const privacy = PRIVACY_POINTS.map(
    (p) =>
      `<tr><td style="width:20px;vertical-align:top;padding:0 0 8px;color:#1f6b3a;font-weight:700;">✓</td><td style="vertical-align:top;padding:0 0 8px;font-size:13px;line-height:19px;"><b>${esc(p.title)}.</b> ${esc(p.text)}</td></tr>`
  ).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#f7f4f5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#240f1b;">
<div style="max-width:520px;margin:0 auto;padding:24px;border-radius:20px;background:#ffffff;font-size:14px;line-height:21px;">
  <p style="margin:0 0 4px;font-size:12px;color:#8a7b82;">Cozie by Momcozy</p>
  <h1 style="margin:0 0 16px;font-size:21px;line-height:27px;font-weight:600;">${esc(IMPORT_EMAIL_SUBJECT)}</h1>
  <p style="margin:0 0 16px;">Here’s how to bring what Claude, ChatGPT, Gemini or Grok already knows about you and your baby into Cozie.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
    ${step(
      1,
      `<b>Open your AI with the prompt already filled in</b>, then send it.<div style="margin-top:10px;">${AI_LINKS.map((l) =>
        btn(l.href, `Open in ${l.name}`)
      ).join('')}</div><div style="font-size:12px;color:#8a7b82;">If the prompt doesn’t show up, or you use another AI, copy it from the bottom of this email.</div>`
    )}
    ${step(2, `<b>Copy its answer and paste it back in Cozie.</b><div style="margin-top:10px;">${btn(pasteUrl, 'Paste the answer in Cozie', true)}</div>`)}
    ${step(3, `<b>Pick what Cozie should remember.</b> Nothing is saved until you say so.`)}
  </table>

  <div style="margin:6px 0 18px;padding:16px;border-radius:16px;background:#f1f8f3;">
    <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#1f4d2f;">🛡️ ${esc(PRIVACY_TITLE)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;color:#2b3b30;">${privacy}</table>
  </div>

  <p style="margin:0 0 6px;font-size:12px;color:#8a7b82;">The prompt, for any other AI:</p>
  <pre style="margin:0 0 16px;padding:12px 14px;border-radius:12px;background:#f7f4f5;font-family:Menlo,Consolas,monospace;font-size:12px;line-height:18px;white-space:pre-wrap;">${esc(IMPORT_PROMPT)}</pre>
  <p style="margin:0;font-size:12px;line-height:17px;color:#8a7b82;">If you didn’t ask for this, you can ignore this email.</p>
</div>
</body></html>`;
}
