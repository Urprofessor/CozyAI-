import { IMPORT_PROMPT } from './memory-import';

/* The "Bring what your AI knows" email (sent by Gmail or Resend). Same copy as EmailPreview in
 * components/cozy/memory/AiImport.tsx — keep the two in step. The answer
 * comes back by pasting it in Cozie (the link opens the paste step), not by
 * replying to the email. */

export const IMPORT_EMAIL_SUBJECT = 'Bring what your AI knows to Cozie';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function importEmailText(pasteUrl: string) {
  return [
    'Hi there,',
    '',
    'Here’s how to bring what Claude or ChatGPT already knows about you and your baby into Cozie:',
    '',
    '1. Copy the prompt below.',
    '2. Paste it into a chat with your AI and send it.',
    `3. Copy its answer and paste it back in Cozie: ${pasteUrl}`,
    '',
    '----- Prompt -----',
    IMPORT_PROMPT,
    '------------------',
    '',
    'You’ll review everything in Cozie before it’s saved, and you can delete it anytime in your memory profile.',
    '',
    'Cozie by Momcozy',
  ].join('\n');
}

export function importEmailHtml(pasteUrl: string) {
  const btn = (href: string, label: string, primary = false) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 6px 8px 0;padding:9px 16px;border-radius:18px;font-size:13px;font-weight:600;text-decoration:none;${
      primary ? 'background:#790a30;color:#ffffff;' : 'border:1px solid #e6dfe2;color:#240f1b;'
    }">${label}</a>`;

  return `<!doctype html>
<html><body style="margin:0;padding:24px 12px;background:#f7f4f5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#240f1b;">
<div style="max-width:520px;margin:0 auto;padding:24px;border-radius:20px;background:#ffffff;font-size:14px;line-height:21px;">
  <p style="margin:0 0 4px;font-size:12px;color:#8a7b82;">Cozie by Momcozy</p>
  <h1 style="margin:0 0 16px;font-size:21px;line-height:27px;font-weight:600;">${esc(IMPORT_EMAIL_SUBJECT)}</h1>
  <p style="margin:0 0 10px;">Hi there,</p>
  <p style="margin:0 0 10px;">Here’s how to bring what Claude or ChatGPT already knows about you and your baby into Cozie:</p>
  <ol style="margin:0 0 14px;padding-left:20px;">
    <li>Copy the prompt below.</li>
    <li>Paste it into a chat with your AI and send it.</li>
    <li><b>Copy its answer and paste it back in Cozie.</b></li>
  </ol>
  <pre style="margin:0 0 14px;padding:12px 14px;border-radius:12px;background:#f7f4f5;font-family:Menlo,Consolas,monospace;font-size:12px;line-height:18px;white-space:pre-wrap;">${esc(IMPORT_PROMPT)}</pre>
  <div style="margin:0 0 8px;">
    ${btn('https://claude.ai/new', 'Open Claude')}${btn('https://chatgpt.com/', 'Open ChatGPT')}
  </div>
  <div style="margin:0 0 14px;">${btn(pasteUrl, 'Paste the answer in Cozie', true)}</div>
  <p style="margin:0;font-size:12px;line-height:17px;color:#8a7b82;">You’ll review everything in Cozie before it’s saved, and you can delete it anytime in your memory profile. If you didn’t ask for this, you can ignore this email.</p>
</div>
</body></html>`;
}
